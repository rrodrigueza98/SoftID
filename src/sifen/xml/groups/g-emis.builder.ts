import type { AmbienteSifen, Empresa, Establecimiento } from '@prisma/client';
import { codigoDepartamento, codigoDistritoCiudad, ITIPCONT_POR_TIPO } from '../catalogos';
import { type XmlNode } from './xml-node';

export interface DatosGEmis {
  empresa: Pick<
    Empresa,
    | 'ruc'
    | 'dvRuc'
    | 'tipoContribuyente'
    | 'razonSocial'
    | 'nombreFantasia'
    | 'telefono'
    | 'email'
    | 'actividadEconomicaCodigo'
    | 'actividadEconomicaDescripcion'
  >;
  establecimiento: Pick<Establecimiento, 'direccion' | 'ciudad' | 'departamento' | 'telefono' | 'email'>;
  ambiente: AmbienteSifen;
}

// Texto fijo que SIFEN exige en dNomEmi para todo DE emitido en ambiente de
// TEST/homologacion -- el literal exacto sale de la fuente oficial (DNIT,
// "Guia de Pruebas Fase de Voluntariedad Abierta para el SIFEN", seccion
// "Set de datos de prueba: Datos del emisor"), no de aproximarlo contra un
// DE real (que traia una redaccion parecida pero no identica). La razon
// social real va en dNomFanEmi en su lugar.
const NOMBRE_EMISOR_AMBIENTE_TEST = 'DOCUMENTO ELECTRÓNICO SIN VALOR COMERCIAL NI FISCAL - GENERADO EN AMBIENTE DE PRUEBA';

// gEmis -- datos del emisor (Manual Tecnico SIFEN v150, E3).
//
// cDepEmi/cCiuEmi/cDisEmi salen de catalogos reales de SIFEN (ver
// catalogos.ts) -- confirmado 2026-08-21 tras rechazos reales de SIFEN y
// contra un DE real ya aprobado para esta empresa.
export function buildGEmis(parent: XmlNode, datos: DatosGEmis): void {
  const gEmis = parent
    .ele('gEmis')
    .ele('dRucEm')
    .txt(datos.empresa.ruc)
    .up()
    .ele('dDVEmi')
    .txt(datos.empresa.dvRuc)
    .up()
    .ele('iTipCont')
    .txt(ITIPCONT_POR_TIPO[datos.empresa.tipoContribuyente])
    .up()
    .ele('dNomEmi')
    .txt(datos.ambiente === 'TEST' ? NOMBRE_EMISOR_AMBIENTE_TEST : datos.empresa.razonSocial)
    .up();

  const nombreFantasia = datos.ambiente === 'TEST' ? datos.empresa.razonSocial : datos.empresa.nombreFantasia;
  if (nombreFantasia) {
    gEmis.ele('dNomFanEmi').txt(nombreFantasia).up();
  }

  const { distrito, ciudad } = codigoDistritoCiudad(datos.establecimiento.ciudad);

  gEmis
    .ele('dDirEmi')
    .txt(datos.establecimiento.direccion)
    .up()
    .ele('dNumCas')
    .txt('0') // PENDIENTE: Establecimiento no separa numero de casa de la direccion
    .up()
    .ele('cDepEmi')
    .txt(codigoDepartamento(datos.establecimiento.departamento))
    .up()
    .ele('dDesDepEmi')
    .txt(datos.establecimiento.departamento)
    .up()
    .ele('cDisEmi')
    .txt(distrito)
    .up()
    .ele('dDesDisEmi')
    .txt(datos.establecimiento.ciudad)
    .up()
    .ele('cCiuEmi')
    .txt(ciudad)
    .up()
    .ele('dDesCiuEmi')
    .txt(datos.establecimiento.ciudad)
    .up();

  // dTelEmi resulto ser obligatorio en la practica (rechazo real de SIFEN:
  // "Elemento esperado: dTelEmi dentro de: gEmis" -- el DE_v150.xsd lo
  // marca opcional, pero SIFEN igual lo exige). Se usa el telefono del
  // establecimiento si esta cargado, si no el de la empresa; si ninguno
  // esta cargado se corta ahi con un error claro en vez de mandar un DE que
  // SIFEN va a rechazar de nuevo.
  const telefono = datos.establecimiento.telefono ?? datos.empresa.telefono;
  if (!telefono) {
    throw new Error(
      'buildGEmis: falta el telefono del establecimiento/empresa emisora -- SIFEN lo exige (dTelEmi). Cargalo en Configuración → Establecimientos o en los datos de la empresa.',
    );
  }
  gEmis.ele('dTelEmi').txt(telefono).up();

  // dEmailE resulto ser obligatorio tambien (mismo hallazgo que dTelEmi, ver
  // comentario arriba -- rechazo real: "Elemento esperado: dEmailE dentro
  // de: gEmis").
  const email = datos.establecimiento.email ?? datos.empresa.email;
  if (!email) {
    throw new Error(
      'buildGEmis: falta el email del establecimiento/empresa emisora -- SIFEN lo exige (dEmailE). Cargalo en Configuración → Establecimientos o en los datos de la empresa.',
    );
  }
  gEmis.ele('dEmailE').txt(email).up();

  // gActEco (Clasificador de Actividades Economicas de SET) tambien resulto
  // obligatorio (rechazo real: "Elemento esperado: gActEco dentro de:
  // gEmis") -- va DESPUES de dEmailE, verificado contra DE_v150.xsd
  // 2026-08-21. Empresa solo guarda una actividad (el XSD permite hasta 9,
  // pero una alcanza para el minOccurs=1 que exige).
  if (!datos.empresa.actividadEconomicaCodigo || !datos.empresa.actividadEconomicaDescripcion) {
    throw new Error(
      'buildGEmis: falta la actividad económica de la empresa emisora -- SIFEN lo exige (gActEco). Cargala en Configuración → Datos de la empresa.',
    );
  }
  gEmis
    .ele('gActEco')
    .ele('cActEco')
    .txt(datos.empresa.actividadEconomicaCodigo)
    .up()
    .ele('dDesActEco')
    .txt(datos.empresa.actividadEconomicaDescripcion)
    .up()
    .up();

  gEmis.up();
}
