import { AmbienteSifen } from '@prisma/client';

// URLs de los web services de SIFEN. VERIFICAR contra la documentacion
// vigente de SET antes de habilitar envios reales -- estas URLs cambian
// entre fases del rollout de SIFEN y no fueron confirmadas contra una fuente
// oficial actualizada en el momento de escribir este modulo (ver plan de
// implementacion, "Cosas a verificar").
const ENDPOINTS: Record<AmbienteSifen, { recepcionDe: string; recepcionEvento: string; consultaDe: string }> = {
  TEST: {
    recepcionDe: 'https://sifen-test.set.gov.py/de/ws/sync/recibe.wsdl',
    recepcionEvento: 'https://sifen-test.set.gov.py/de/ws/eventos/evento.wsdl',
    consultaDe: 'https://sifen-test.set.gov.py/de/ws/consultas/consulta.wsdl',
  },
  PRODUCCION: {
    recepcionDe: 'https://sifen.set.gov.py/de/ws/sync/recibe.wsdl',
    recepcionEvento: 'https://sifen.set.gov.py/de/ws/eventos/evento.wsdl',
    consultaDe: 'https://sifen.set.gov.py/de/ws/consultas/consulta.wsdl',
  },
};

export function endpointsPara(ambiente: AmbienteSifen) {
  return ENDPOINTS[ambiente];
}
