import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EstadoDocumentoElectronico, TipoDocumentoElectronico } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CertificadosSifenService } from './certificados-sifen/certificados-sifen.service';
import { buildCdc } from './cdc/cdc.builder';
import { buildXmlDe, type ComprobanteParaXml } from './xml/xml-builder';
import { extraerCertificado } from './signing/p12.util';
import { firmarXmlDe } from './signing/xml.signer';
import { buildQrUrl } from './qr/qr-url.builder';
import { buildSoapEnvelopeRecepcionDe } from './transport/soap-envelope.builder';
import { buildHttpsAgent, postSoapEnvelope } from './transport/sifen.http-client';
import { endpointsPara } from './transport/sifen.endpoints';
import { parseRespuestaSifen } from './transport/sifen-response.parser';

const TIPOS_CON_DE_SOPORTADOS: TipoDocumentoElectronico[] = [
  TipoDocumentoElectronico.FACTURA_ELECTRONICA,
  TipoDocumentoElectronico.AUTOFACTURA_ELECTRONICA,
  TipoDocumentoElectronico.NOTA_CREDITO_ELECTRONICA,
  TipoDocumentoElectronico.NOTA_DEBITO_ELECTRONICA,
  TipoDocumentoElectronico.NOTA_REMISION_ELECTRONICA,
];

const INCLUDE_COMPROBANTE_PARA_XML = {
  items: { include: { unidadMedida: true, producto: { select: { codigo: true } } } },
  pagos: { select: { formaPago: true, monto: true } },
  timbrado: { include: { puntoExpedicion: { include: { establecimiento: { include: { empresa: true } } } } } },
  cliente: true,
  proveedor: true,
  datosTransporteRemision: true,
  datosVendedorAutofactura: true,
} as const;

@Injectable()
export class SifenService {
  private readonly logger = new Logger(SifenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificadosSifenService: CertificadosSifenService,
  ) {}

  // Genera el CDC/XML/firma y lo envia a SIFEN (endpoint sincrono
  // individual, ver plan de implementacion -- v1 no usa lote/asincrono).
  //
  // Semantica de errores, a proposito distinta segun el tipo de falla:
  //  - Si SIFEN responde (aprobado, con observacion, o rechazado): nunca
  //    lanza. Es un resultado de negocio valido, no una falla del envio --
  //    el llamador inspecciona el DocumentoElectronico devuelto.
  //  - Si el envio en si falla (timeout, red caida, TLS, etc.): el DE queda
  //    persistido en PENDIENTE_ENVIO y SI se relanza el error, para que
  //    create() (que llama esto en best-effort) lo trague con .catch(), y
  //    el endpoint de reintentar (accion explicita del usuario) lo deje
  //    llegar como error HTTP.
  async generarYEnviar(comprobanteId: string) {
    const comprobante = await this.prisma.comprobante.findUniqueOrThrow({
      where: { id: comprobanteId },
      include: INCLUDE_COMPROBANTE_PARA_XML,
    });

    if (!TIPOS_CON_DE_SOPORTADOS.includes(comprobante.tipoDocumento)) {
      throw new Error(`SifenService: ${comprobante.tipoDocumento} no tiene Documento Electronico soportado`);
    }

    const puntoExpedicion = comprobante.timbrado.puntoExpedicion;
    const establecimiento = puntoExpedicion.establecimiento;
    const empresa = establecimiento.empresa;

    let cdcComprobanteAsociado: string | undefined;
    if (comprobante.comprobanteAsociadoId) {
      const asociado = await this.prisma.documentoElectronico.findUnique({
        where: { comprobanteId: comprobante.comprobanteAsociadoId },
      });
      cdcComprobanteAsociado = asociado?.cdc;
    }

    // Se reusa el CDC si ya existe (reintento de un envio previo) en vez de
    // generar uno nuevo -- un CDC nuevo por reintento dejaria "documentos
    // fantasma" con Id distintos para el mismo comprobante.
    let documentoElectronico = await this.prisma.documentoElectronico.findUnique({ where: { comprobanteId } });

    let cdc: string;
    let codigoSeguridad: string;
    if (documentoElectronico) {
      cdc = documentoElectronico.cdc;
      codigoSeguridad = documentoElectronico.codigoSeguridad;
    } else {
      const generado = buildCdc({
        tipoDocumento: comprobante.tipoDocumento,
        numero: comprobante.numero,
        fechaEmision: comprobante.fechaEmision,
        rucEmisor: empresa.ruc,
        dvRucEmisor: empresa.dvRuc,
        tipoContribuyenteEmisor: empresa.tipoContribuyente,
        codigoEstablecimiento: establecimiento.codigo,
        codigoPuntoExpedicion: puntoExpedicion.codigo,
      });
      cdc = generado.cdc;
      codigoSeguridad = generado.codigoSeguridad;
      documentoElectronico = await this.prisma.documentoElectronico.create({
        data: { comprobanteId, cdc, codigoSeguridad, estado: EstadoDocumentoElectronico.BORRADOR },
      });
    }

    // Credenciales (y por lo tanto el ambiente) se resuelven ANTES de armar
    // el XML: en TEST, dNomEmi tiene que salir con el texto fijo que exige
    // SIFEN para ambiente de pruebas (ver comentario en buildXmlDe), asi que
    // buildXmlDe necesita saber el ambiente de antemano.
    let credenciales;
    try {
      credenciales = await this.certificadosSifenService.obtenerCredenciales(empresa.id);
    } catch (err) {
      await this.marcarPendiente(documentoElectronico.id, '');
      throw err;
    }

    const xmlSinFirmar = buildXmlDe({
      comprobante: comprobante as ComprobanteParaXml,
      cdc,
      codigoSeguridad,
      cdcComprobanteAsociado,
      ambiente: credenciales.ambiente,
    });

    // gCamFuFD/dCarQR (el QR) es OBLIGATORIO en el propio XML que se manda a
    // SIFEN (verificado contra DE_v150.xsd el 2026-08-21) -- no es solo un
    // dato para mostrar en el KUDE impreso, como se habia asumido antes. En
    // PRODUCCION no hay forma de construirlo bien sin CSC real, asi que ahi
    // se exige. En el ambiente de TEST/homologacion, SIFEN no valida el
    // contenido del QR de forma estricta -- se arma igual con un CSC/idCSC
    // vacio (el campo solo necesita existir con el largo minimo del XSD).
    if ((!credenciales.csc || !credenciales.idCsc) && credenciales.ambiente === 'PRODUCCION') {
      await this.marcarPendiente(documentoElectronico.id, xmlSinFirmar);
      throw new BadRequestException(
        'Esta empresa no tiene CSC (Código de Seguridad del Contribuyente) cargado -- es obligatorio en producción para generar el código QR que exige SIFEN en todo Documento Electrónico. Cargalo en Configuración → Firma digital SIFEN.',
      );
    }

    const certificado = extraerCertificado(credenciales.p12Buffer, credenciales.password);
    const xmlFirmadoSinQr = firmarXmlDe(xmlSinFirmar, {
      privateKeyPem: certificado.privateKeyPem,
      certPem: certificado.certPem,
    });

    // El digest del QR es el mismo DigestValue que la firma ya calculo para
    // la Referencia sobre <DE> -- se reutiliza en vez de recalcularlo. Se
    // extrae por regex porque en este punto solo tenemos el XML como string
    // (xml-crypto no expone el digest calculado como valor aparte). La
    // Referencia sobre <DE> usa URI="#{cdc}"; xml-crypto (sin prefix
    // explicito, ver xml.signer.ts) escribe los elementos de la firma sin
    // prefijo de namespace (xmlns por defecto), por eso "DigestValue" y no
    // "ds:DigestValue" aca.
    const digestMatch = xmlFirmadoSinQr.match(
      new RegExp(`URI="#${cdc}"[\\s\\S]*?<DigestValue>([^<]+)</DigestValue>`),
    );
    const digestValueDe = digestMatch?.[1] ?? '';

    // En TEST no hay CSC propio -- SIFEN publica un CSC Generico comun a
    // todos los contribuyentes para el ambiente de pruebas (DNIT, "Guia de
    // Pruebas Fase de Voluntariedad Abierta para el SIFEN"): IdCSC=1,
    // CSC=ABCD0000000000000000000000000000. Sin esto, el hash del QR
    // (cHashQR) nunca podia coincidir del lado de SIFEN -- rechazo real:
    // "Cadena de caracteres correspondiente al codigo QR no es coincidente
    // con el archivo XML" (se mandaba con CSC/IdCSC vacios).
    const CSC_GENERICO_TEST = 'ABCD0000000000000000000000000000';
    const ID_CSC_GENERICO_TEST = '0001';
    const csc = credenciales.ambiente === 'PRODUCCION' ? (credenciales.csc ?? '') : CSC_GENERICO_TEST;
    const idCsc = credenciales.ambiente === 'PRODUCCION' ? (credenciales.idCsc ?? '') : ID_CSC_GENERICO_TEST;

    const qrUrl = buildQrUrl(
      {
        cdc,
        fechaEmision: comprobante.fechaEmision,
        rucReceptor: (comprobante.cliente ?? comprobante.proveedor)?.numeroDocumento ?? '',
        totalGeneral: Number(comprobante.total),
        totalIva: Number(comprobante.iva5) + Number(comprobante.iva10),
        cantidadItems: comprobante.items.length,
        digestValueDe,
        csc,
        idCsc,
      },
      credenciales.ambiente === 'PRODUCCION',
    );

    // gCamFuFD va DESPUES de ds:Signature dentro de <rDE> (hermano de <DE>,
    // no parte de lo firmado) -- se agrega recien aca, sobre el XML ya
    // firmado, sin invalidar ninguna referencia de la firma.
    //
    // dCarQR es la URL del QR con "&" separando los query params -- un "&"
    // suelto no es XML valido como contenido de texto (tiene que ir como
    // entidad &amp;). Se escapa antes de insertarlo: esto reprodujo el
    // mismo "XML Mal Formado" que ya se habia corregido antes, encontrado
    // en la siguiente ronda de pruebas contra SIFEN real.
    const qrUrlEscapado = qrUrl.replace(/&/g, '&amp;');
    const gCamFuFD = `<gCamFuFD><dCarQR>${qrUrlEscapado}</dCarQR></gCamFuFD>`;
    const xmlFirmado = xmlFirmadoSinQr.replace(/(<\/rDE>)/, `${gCamFuFD}$1`);

    await this.prisma.documentoElectronico.update({
      where: { id: documentoElectronico.id },
      data: { xmlGenerado: xmlSinFirmar, xmlFirmado, qrUrl, fechaFirma: new Date() },
    });

    const soapEnvelope = buildSoapEnvelopeRecepcionDe(xmlFirmado);
    const endpoint = endpointsPara(credenciales.ambiente).recepcionDe;

    let respuestaCruda: string;
    try {
      const agent = buildHttpsAgent(certificado.certPem, certificado.privateKeyPem);
      respuestaCruda = await postSoapEnvelope(endpoint, soapEnvelope, agent);
    } catch (err) {
      this.logger.warn(`Envío a SIFEN falló para comprobante ${comprobanteId}: ${err instanceof Error ? err.message : err}`);
      await this.marcarPendiente(documentoElectronico.id, xmlSinFirmar);
      throw err;
    }

    const respuesta = parseRespuestaSifen(respuestaCruda);
    const estadoFinal =
      respuesta.resultado === 'APROBADO'
        ? EstadoDocumentoElectronico.APROBADO
        : respuesta.resultado === 'APROBADO_CON_OBSERVACION'
          ? EstadoDocumentoElectronico.APROBADO_CON_OBSERVACION
          : EstadoDocumentoElectronico.RECHAZADO;

    return this.prisma.documentoElectronico.update({
      where: { id: documentoElectronico.id },
      data: {
        estado: estadoFinal,
        xmlRespuestaSet: respuesta.raw,
        protocoloAutorizacion: respuesta.protocoloAutorizacion,
        motivoRechazo: estadoFinal === EstadoDocumentoElectronico.RECHAZADO ? (respuesta.mensaje ?? 'Rechazado por SIFEN') : null,
        fechaEnvio: new Date(),
        fechaProceso: new Date(),
      },
    });
  }

  private async marcarPendiente(documentoElectronicoId: string, xmlGenerado: string) {
    await this.prisma.documentoElectronico.update({
      where: { id: documentoElectronicoId },
      data: { estado: EstadoDocumentoElectronico.PENDIENTE_ENVIO, xmlGenerado },
    });
  }

  // Evento de Cancelacion -- solo aplica a un DE ya APROBADO/APROBADO_CON_OBSERVACION.
  // A diferencia de generarYEnviar, esto SIEMPRE relanza en caso de falla: es
  // una accion explicita del usuario (anular un comprobante), que necesita
  // saber de inmediato si SIFEN la rechazo (ej. fuera de la ventana de
  // tiempo permitida) en vez de que el estado local diverja en silencio.
  async cancelar(documentoElectronicoId: string, motivo: string) {
    const documentoElectronico = await this.prisma.documentoElectronico.findUnique({
      where: { id: documentoElectronicoId },
      include: { comprobante: { include: INCLUDE_COMPROBANTE_PARA_XML } },
    });
    if (!documentoElectronico) throw new NotFoundException(`Documento electrónico ${documentoElectronicoId} no encontrado`);

    if (
      documentoElectronico.estado !== EstadoDocumentoElectronico.APROBADO &&
      documentoElectronico.estado !== EstadoDocumentoElectronico.APROBADO_CON_OBSERVACION
    ) {
      throw new Error(`No se puede cancelar un DE en estado ${documentoElectronico.estado} -- solo aplica a documentos aprobados`);
    }

    // PENDIENTE: la ventana de tiempo exacta en la que SIFEN acepta un
    // Evento de Cancelacion (168hs/7 dias segun el tipo de documento, a
    // confirmar contra el Manual Tecnico) todavia no se valida aca -- ver
    // plan de implementacion, "Cosas a verificar". Por ahora se intenta
    // siempre y se deja que sea SIFEN quien lo rechace si corresponde.

    const empresa = documentoElectronico.comprobante.timbrado.puntoExpedicion.establecimiento.empresa;
    const credenciales = await this.certificadosSifenService.obtenerCredenciales(empresa.id);
    const certificado = extraerCertificado(credenciales.p12Buffer, credenciales.password);

    const { buildXmlEventoCancelacion } = await import('./eventos/evento-cancelacion.builder');
    const { buildSoapEnvelopeEvento } = await import('./transport/soap-envelope.builder');

    const xmlEvento = buildXmlEventoCancelacion({ cdc: documentoElectronico.cdc, motivo });
    const xmlEventoFirmado = firmarXmlDe(
      xmlEvento,
      { privateKeyPem: certificado.privateKeyPem, certPem: certificado.certPem },
      'rEve',
    );

    const soapEnvelope = buildSoapEnvelopeEvento(xmlEventoFirmado);
    const endpoint = endpointsPara(credenciales.ambiente).recepcionEvento;
    const agent = buildHttpsAgent(certificado.certPem, certificado.privateKeyPem);
    const respuestaCruda = await postSoapEnvelope(endpoint, soapEnvelope, agent);
    const respuesta = parseRespuestaSifen(respuestaCruda);

    if (respuesta.resultado === 'RECHAZADO') {
      throw new Error(`SIFEN rechazó la cancelación: ${respuesta.mensaje ?? 'sin detalle'}`);
    }

    await this.prisma.eventoDocumentoElectronico.create({
      data: {
        documentoElectronicoId,
        tipo: 'CANCELACION',
        motivo,
        xmlEvento: xmlEventoFirmado,
        xmlRespuesta: respuesta.raw,
      },
    });

    return this.prisma.documentoElectronico.update({
      where: { id: documentoElectronicoId },
      data: { estado: EstadoDocumentoElectronico.CANCELADO },
    });
  }
}
