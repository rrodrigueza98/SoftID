import { NaturalezaVendedorAutofactura, TipoDocumentoIdentidad, type DatosVendedorAutofactura } from '@prisma/client';
import { codigoPorPosicion } from '../catalogos';
import { type XmlNode } from './xml-node';

// gCamAE -- datos del vendedor en una Autofactura Electronica (Manual
// Tecnico SIFEN v150, E3/E4), armado 1:1 desde DatosVendedorAutofactura.
export function buildGCamAe(parent: XmlNode, datos: DatosVendedorAutofactura): void {
  parent
    .ele('gCamAE')
    .ele('iNatVen')
    .txt(codigoPorPosicion(NaturalezaVendedorAutofactura, datos.naturalezaVendedor))
    .up()
    .ele('iTipIDVen')
    .txt(codigoPorPosicion(TipoDocumentoIdentidad, datos.tipoDocIdentidadVendedor))
    .up()
    .ele('dNumIDVen')
    .txt(datos.numeroDocIdentidadVendedor)
    .up()
    .ele('dNomVen')
    .txt(datos.nombreVendedor)
    .up()
    .ele('dDirVen')
    .txt(datos.direccionVendedor)
    .up()
    .ele('dNumCasVen')
    .txt(datos.numeroCasaVendedor)
    .up()
    .ele('dDesCiuVen')
    .txt(datos.ciudadVendedor)
    .up()
    .ele('dDesDepVen')
    .txt(datos.departamentoVendedor)
    .up()
    .ele('dDirLugTrans')
    .txt(datos.direccionTransaccion)
    .up()
    .ele('dDesCiuLugTrans')
    .txt(datos.ciudadTransaccion)
    .up()
    .ele('dDesDepLugTrans')
    .txt(datos.departamentoTransaccion)
    .up()
    .up();
}
