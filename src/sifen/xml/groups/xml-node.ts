import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';

// Alias corto reutilizado por todos los builders de grupo -- cada uno recibe
// el nodo padre ya creado y le cuelga sus propios elementos, en vez de
// devolver un fragmento aparte (mas facil de componer en xml-builder.ts).
export type XmlNode = XMLBuilder;

// Los grupos del Manual Tecnico SIFEN v150 son puramente numericos con cero
// o dos decimales fijos segun el campo -- esta forma evita que un valor como
// 100000.0 salga como "100000" en vez de "100000.00" (o viceversa un entero
// que SIFEN espera sin decimales). Acepta tambien Prisma.Decimal (los
// campos Decimal del schema no son number/string en TS, pero Number()
// los coerciona correctamente via su propio toString()).
export function num(value: number | string | { toString(): string }, decimales = 0): string {
  return Number(value.toString()).toFixed(decimales);
}

// Los campos de tipo fecHhmmss (dFecFirma, dFeEmiDE) exigen exactamente
// "YYYY-MM-DDThh:mm:ss" -- sin milisegundos ni sufijo de zona horaria (ver
// DE_Types_v150.xsd: xs:pattern "\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d"). Un
// Date.toISOString() crudo incluye ".SSSZ" y SIFEN lo rechaza como
// invalido (error real recibido en una ronda de pruebas: "El valor
// ...Z del elemento: dFecFirma es invalido"). Se formatea ademas en hora
// local de Paraguay (America/Asuncion), no UTC -- son 4hs de diferencia que
// podrian hacer caer una emision real fuera de la ventana de tolerancia que
// SIFEN valida contra su propio reloj.
export function fechaHoraSifen(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Asuncion',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(fecha);
  const parte = (tipo: string) => {
    const valor = partes.find((p) => p.type === tipo)?.value ?? '00';
    return valor === '24' ? '00' : valor; // algunas ICU devuelven "24" para medianoche con hour12:false
  };
  return `${parte('year')}-${parte('month')}-${parte('day')}T${parte('hour')}:${parte('minute')}:${parte('second')}`;
}
