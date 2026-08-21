import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EstadoDocumentoElectronico, TipoDocumentoElectronico } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CertificadosSifenService } from './certificados-sifen/certificados-sifen.service';
import { buildCdc } from './cdc/cdc.builder';
import { buildXmlDe, type ComprobanteParaXml } from './xml/xml-builder';
import { extraerCertificado } from './signing/p12.util';
import { firmarXmlDe } from './signing/xades.signer';
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
  items: { include: { unidadMedida: true } },
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

    const xmlSinFirmar = buildXmlDe({
      comprobante: comprobante as ComprobanteParaXml,
      cdc,
      codigoSeguridad,
      cdcComprobanteAsociado,
    });

    let credenciales;
    try {
      credenciales = await this.certificadosSifenService.obtenerCredenciales(empresa.id);
    } catch (err) {
      await this.marcarPendiente(documentoElectronico.id, xmlSinFirmar);
      throw err;
    }

    // gCamFuFD/dCarQR (el QR) es OBLIGATORIO en el propio XML que se manda a
    // SIFEN (verificado contra DE_v150.xsd el 2026-08-21) -- no es solo un
    // dato para mostrar en el KUDE impreso, como se habia asumido antes. Sin
    // CSC no hay forma de construirlo, asi que sin CSC no se puede emitir
    // ningun DE electronico para esta empresa.
    if (!credenciales.csc || !credenciales.idCsc) {
      await this.marcarPendiente(documentoElectronico.id, xmlSinFirmar);
      throw new BadRequestException(
        'Esta empresa no tiene CSC (Código de Seguridad del Contribuyente) cargado -- es obligatorio para generar el código QR que exige SIFEN en todo Documento Electrónico. Cargalo en Configuración → Firma digital SIFEN.',
      );
    }

    const certificado = extraerCertificado(credenciales.p12Buffer, credenciales.password);
    const xmlFirmadoSinQr = firmarXmlDe(xmlSinFirmar, {
      privateKeyPem: certificado.privateKeyPem,
      certPem: certificado.certPem,
      certDerBase64: certificado.certDerBase64,
    });

    // El digest del QR es el mismo DigestValue que la firma ya calculo para
    // la Referencia sobre <DE> -- se reutiliza en vez de recalcularlo. Se
    // extrae por regex porque en este punto solo tenemos el XML como string
    // (xml-crypto no expone el digest calculado como valor aparte).
    const digestMatch = xmlFirmadoSinQr.match(new RegExp(`URI="#${cdc}"[\\s\\S]*?<ds:DigestValue>([^<]+)</ds:DigestValue>`));
    const digestValueDe = digestMatch?.[1] ?? '';

    const qrUrl = buildQrUrl(
      {
        cdc,
        fechaEmision: comprobante.fechaEmision,
        rucReceptor: (comprobante.cliente ?? comprobante.proveedor)?.numeroDocumento ?? '',
        totalGeneral: Number(comprobante.total),
        totalIva: Number(comprobante.iva5) + Number(comprobante.iva10),
        cantidadItems: comprobante.items.length,
        digestValueDe,
        csc: credenciales.csc,
        idCsc: credenciales.idCsc,
      },
      credenciales.ambiente === 'PRODUCCION',
    );

    // gCamFuFD va DESPUES de ds:Signature dentro de <rDE> (hermano de <DE>,
    // no parte de lo firmado) -- se agrega recien aca, sobre el XML ya
    // firmado, sin invalidar ninguna referencia de la firma.
    const gCamFuFD = `<gCamFuFD><dCarQR>${qrUrl}</dCarQR></gCamFuFD>`;
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
    const xmlEventoFirmado = firmarXmlDe(xmlEvento, {
      privateKeyPem: certificado.privateKeyPem,
      certPem: certificado.certPem,
      certDerBase64: certificado.certDerBase64,
    });

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
