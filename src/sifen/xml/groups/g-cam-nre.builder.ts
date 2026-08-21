import {
  ModalidadTransporte,
  MotivoEmisionNotaRemision,
  NaturalezaTransportista,
  ResponsableEmisionNotaRemision,
  ResponsableFlete,
  TipoIdentificacionVehiculo,
  TipoTransporte,
  type DatosTransporteRemision,
} from '@prisma/client';
import { codigoPorPosicion } from '../catalogos';
import { type XmlNode } from './xml-node';

// gCamNRE -- datos de la Nota de Remision Electronica (Manual Tecnico SIFEN
// v150, E5/E9), armado 1:1 desde DatosTransporteRemision.
export function buildGCamNre(parent: XmlNode, datos: DatosTransporteRemision): void {
  const gCamNRE = parent
    .ele('gCamNRE')
    .ele('iMotEmiNR')
    .txt(codigoPorPosicion(MotivoEmisionNotaRemision, datos.motivoEmision))
    .up();
  if (datos.motivoEmisionOtro) {
    gCamNRE.ele('dMotEmiNROt').txt(datos.motivoEmisionOtro).up();
  }
  gCamNRE.ele('iRespEmiNR').txt(codigoPorPosicion(ResponsableEmisionNotaRemision, datos.responsableEmision)).up();
  if (datos.kmEstimados != null) {
    gCamNRE.ele('dKmR').txt(String(datos.kmEstimados)).up();
  }
  if (datos.fechaEmisionFacturaFutura) {
    gCamNRE.ele('dFecEmiFactu').txt(datos.fechaEmisionFacturaFutura.toISOString().slice(0, 10)).up();
  }
  gCamNRE.up();

  const gTransp = parent
    .ele('gTransp')
    .ele('iTipTrans')
    .txt(codigoPorPosicion(TipoTransporte, datos.tipoTransporte))
    .up()
    .ele('iModTrans')
    .txt(codigoPorPosicion(ModalidadTransporte, datos.modalidadTransporte))
    .up()
    .ele('iRespFlete')
    .txt(codigoPorPosicion(ResponsableFlete, datos.responsableFlete))
    .up()
    .ele('dFecIniTrasl')
    .txt(datos.fechaInicioTraslado.toISOString().slice(0, 10))
    .up()
    .ele('dFecFinTrasl')
    .txt(datos.fechaFinTraslado.toISOString().slice(0, 10))
    .up();

  gTransp
    .ele('gCamEntSal')
    .ele('dDirLocSal')
    .txt(datos.direccionSalida)
    .up()
    .ele('dNumCasSal')
    .txt(datos.numeroCasaSalida)
    .up()
    .ele('dDesCiuSal')
    .txt(datos.ciudadSalida)
    .up()
    .ele('dDesDepSal')
    .txt(datos.departamentoSalida)
    .up()
    .ele('dDirLocEnt')
    .txt(datos.direccionEntrega)
    .up()
    .ele('dNumCasEnt')
    .txt(datos.numeroCasaEntrega)
    .up()
    .ele('dDesCiuEnt')
    .txt(datos.ciudadEntrega)
    .up()
    .ele('dDesDepEnt')
    .txt(datos.departamentoEntrega)
    .up()
    .up();

  const gVehTras = gTransp
    .ele('gVehTras')
    .ele('dTipVeh')
    .txt(datos.tipoVehiculo)
    .up()
    .ele('dMarVeh')
    .txt(datos.marcaVehiculo)
    .up()
    .ele('dTipIdenVeh')
    .txt(codigoPorPosicion(TipoIdentificacionVehiculo, datos.tipoIdentificacionVehiculo))
    .up();
  if (datos.numeroIdentificacionVehiculo) gVehTras.ele('dNroIdVeh').txt(datos.numeroIdentificacionVehiculo).up();
  if (datos.numeroMatriculaVehiculo) gVehTras.ele('dNroMatVeh').txt(datos.numeroMatriculaVehiculo).up();
  if (datos.numeroVuelo) gVehTras.ele('dNroVuelo').txt(datos.numeroVuelo).up();
  gVehTras.up();

  const gTranspor = gTransp
    .ele('gTranspor')
    .ele('iNatTrans')
    .txt(codigoPorPosicion(NaturalezaTransportista, datos.naturalezaTransportista))
    .up()
    .ele('dNomTrans')
    .txt(datos.nombreTransportista)
    .up();
  if (datos.rucTransportista) {
    gTranspor.ele('dRucTrans').txt(datos.rucTransportista).up().ele('dDVTrans').txt(datos.dvRucTransportista ?? '').up();
  }
  if (datos.numeroDocIdentidadTransportista) {
    gTranspor.ele('dNumIDTrans').txt(datos.numeroDocIdentidadTransportista).up();
  }
  gTranspor
    .ele('dNumIDChof')
    .txt(datos.numeroDocIdentidadChofer)
    .up()
    .ele('dNomChof')
    .txt(datos.nombreChofer)
    .up()
    .up();

  gTransp.up();
}
