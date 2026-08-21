import type { Empresa, Establecimiento } from '@prisma/client';
import { codigoDepartamento, ITIPCONT_POR_TIPO } from '../catalogos';
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
}

// gEmis -- datos del emisor (Manual Tecnico SIFEN v150, E3).
//
// cDepEmi ya sale de la Tabla de Departamentos real de SIFEN (ver
// catalogos.ts, codigoDepartamento) -- confirmado 2026-08-21 tras un
// rechazo real de SIFEN ("El valor 0 del elemento: cDepEmi es invalido").
//
// PENDIENTE: cCiuEmi (codigo de CIUDAD, tabla distinta a la de
// departamentos, no publicada como XSD/enum por SIFEN) sigue con un
// placeholder -- Establecimiento solo guarda "ciudad" como texto libre y
// todavia no se encontro/incorporo el catalogo real. Se usa "1" (el minimo
// que el XSD acepta, tcCiuEmi exige >= 1) en vez de "0" para no fallar la
// validacion de formato con certeza, pero NO es el codigo real de la
// ciudad -- ver plan de implementacion, "Cosas a verificar". gActEco
// (actividad economica) tampoco esta modelado en Empresa todavia y se omite
// -- tambien pendiente.
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
    .txt(datos.empresa.razonSocial)
    .up();

  if (datos.empresa.nombreFantasia) {
    gEmis.ele('dNomFanEmi').txt(datos.empresa.nombreFantasia).up();
  }

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
    .ele('cCiuEmi')
    .txt('1') // PENDIENTE: catalogo Tabla de Ciudades SIFEN, ver comentario arriba
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
