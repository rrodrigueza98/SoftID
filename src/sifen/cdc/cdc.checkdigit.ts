// Digito verificador modulo 11 usado tanto por el RUC paraguayo como por el
// CDC del Documento Electronico (Manual Tecnico SIFEN v150, Anexo G "Calculo
// del Digito Verificador"): se pondera cada digito -- de derecha a izquierda
// -- con pesos que ciclan 2,3,4,...,11,2,3,..., se suman los productos, y el
// DV sale de 11 menos el resto de esa suma modulo 11 (con los casos
// especiales resto 0 o 1 -> DV 0).
//
// ADVERTENCIA: esta es la implementacion "de manual" del algoritmo -- antes
// de firmar y enviar un DE real, hay que confirmarla contra CDCs de ejemplo
// conocidos-buenos del Manual Tecnico o de un caso de prueba real de SET
// (ver plan de implementacion, seccion "Cosas a verificar"). Un DV mal
// calculado rechaza el 100% de los documentos.
const PESO_MINIMO = 2;
const PESO_MAXIMO = 11;

export function calcularDigitoVerificador(base: string): number {
  if (!/^\d+$/.test(base)) {
    throw new Error(`calcularDigitoVerificador: la base debe ser solo digitos, recibido "${base}"`);
  }

  let peso = PESO_MINIMO;
  let suma = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    suma += Number(base[i]) * peso;
    peso = peso === PESO_MAXIMO ? PESO_MINIMO : peso + 1;
  }

  const resto = suma % 11;
  if (resto === 0 || resto === 1) return 0;
  return 11 - resto;
}
