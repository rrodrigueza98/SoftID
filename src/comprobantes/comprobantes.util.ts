import { AfectacionIVA } from '@prisma/client';

interface ItemInput {
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  afectacionIva: AfectacionIVA;
  tasaIva?: number;
  proporcionGravada?: number;
}

export interface ItemCalculado {
  total: number;
  montoExenta: number;
  montoGravado: number;
  liquidacionIva: number;
  tasaIva: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Calcula el desglose exento/gravado/IVA de un item. El monto de cada linea
// (`total`) se maneja siempre IVA incluido, igual que en el KuDE.
// GRAVADO_PARCIAL reparte el total entre una porcion gravada y una exenta
// segun `proporcionGravada` (E733 del Manual Tecnico SIFEN), tal como lo
// documentan las Notas Tecnicas 010/013.
export function calcularItem(item: ItemInput): ItemCalculado {
  const total = round2(item.cantidad * item.precioUnitario - (item.descuento ?? 0));
  const tasaIva = item.tasaIva ?? 10;

  if (item.afectacionIva === AfectacionIVA.EXENTO || item.afectacionIva === AfectacionIVA.EXONERADO) {
    return { total, montoExenta: total, montoGravado: 0, liquidacionIva: 0, tasaIva: 0 };
  }

  const proporcion = item.afectacionIva === AfectacionIVA.GRAVADO_PARCIAL ? (item.proporcionGravada ?? 100) : 100;
  const montoGravadoBruto = round2(total * (proporcion / 100));
  const montoExenta = round2(total - montoGravadoBruto);
  // montoGravado es la base imponible (sin IVA) -- asi el Libro de Ventas
  // (RG 90) cuadra: Total = Exenta + Gravada + IVA. Antes se guardaba el
  // monto bruto (con IVA incluido), lo que duplicaba el IVA en esa suma.
  const base = round2(montoGravadoBruto / (1 + tasaIva / 100));
  const liquidacionIva = round2(montoGravadoBruto - base);

  return { total, montoExenta, montoGravado: base, liquidacionIva, tasaIva };
}

export interface Subtotales {
  subtotalExenta: number;
  subtotalGravada10: number;
  subtotalGravada5: number;
  iva10: number;
  iva5: number;
  total: number;
}

export function calcularSubtotales(items: ItemCalculado[]): Subtotales {
  const subtotales: Subtotales = {
    subtotalExenta: 0,
    subtotalGravada10: 0,
    subtotalGravada5: 0,
    iva10: 0,
    iva5: 0,
    total: 0,
  };

  for (const item of items) {
    subtotales.subtotalExenta = round2(subtotales.subtotalExenta + item.montoExenta);
    if (item.tasaIva === 10) {
      subtotales.subtotalGravada10 = round2(subtotales.subtotalGravada10 + item.montoGravado);
      subtotales.iva10 = round2(subtotales.iva10 + item.liquidacionIva);
    } else if (item.tasaIva === 5) {
      subtotales.subtotalGravada5 = round2(subtotales.subtotalGravada5 + item.montoGravado);
      subtotales.iva5 = round2(subtotales.iva5 + item.liquidacionIva);
    }
    subtotales.total = round2(subtotales.total + item.total);
  }

  return subtotales;
}
