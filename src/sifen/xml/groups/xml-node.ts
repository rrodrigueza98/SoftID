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
