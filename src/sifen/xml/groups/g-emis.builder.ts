import type { Empresa, Establecimiento } from '@prisma/client';
import { ITIPCONT_POR_TIPO } from '../catalogos';
import { type XmlNode } from './xml-node';

export interface DatosGEmis {
  empresa: Pick<Empresa, 'ruc' | 'dvRuc' | 'tipoContribuyente' | 'razonSocial' | 'nombreFantasia' | 'telefono' | 'email'>;
  establecimiento: Pick<Establecimiento, 'direccion' | 'ciudad' | 'departamento'>;
}

// gEmis -- datos del emisor (Manual Tecnico SIFEN v150, E3).
//
// PENDIENTE: cDepEmi/cCiuEmi son codigos numericos de la Tabla de Ciudades y
// Departamentos de SIFEN, no texto libre -- Establecimiento hoy solo guarda
// "ciudad"/"departamento" como strings libres (igual que Tercero para el
// receptor). Hasta que se agregue un catalogo real (mismo patron que
// UnidadMedida.codigoSifen), estos campos salen con codigo "0" como
// placeholder: SIFEN va a rechazar el DE por esto hasta resolverlo. gActEco
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
    .txt('0') // PENDIENTE: catalogo Tabla de Departamentos SIFEN
    .up()
    .ele('dDesDepEmi')
    .txt(datos.establecimiento.departamento)
    .up()
    .ele('cCiuEmi')
    .txt('0') // PENDIENTE: catalogo Tabla de Ciudades SIFEN
    .up()
    .ele('dDesCiuEmi')
    .txt(datos.establecimiento.ciudad)
    .up();

  if (datos.empresa.telefono) {
    gEmis.ele('dTelEmi').txt(datos.empresa.telefono).up();
  }
  if (datos.empresa.email) {
    gEmis.ele('dEmailE').txt(datos.empresa.email).up();
  }

  gEmis.up();
}
