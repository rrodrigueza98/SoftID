import type { AfectacionIVA } from './types';

// Espejo de src/comprobantes/comprobantes.util.ts (backend) para poder
// mostrar el total en vivo mientras se carga la factura, sin pegarle a la
// API en cada tecla. El calculo definitivo y el que persiste siempre lo hace
// el backend -- esto es solo una previsualización.

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

export function calcularItem(item: ItemInput): ItemCalculado {
  const total = round2(item.cantidad * item.precioUnitario - (item.descuento ?? 0));
  const tasaIva = item.tasaIva ?? 10;

  if (item.afectacionIva === 'EXENTO' || item.afectacionIva === 'EXONERADO') {
    return { total, montoExenta: total, montoGravado: 0, liquidacionIva: 0, tasaIva: 0 };
  }

  const proporcion = item.afectacionIva === 'GRAVADO_PARCIAL' ? (item.proporcionGravada ?? 100) : 100;
  const montoGravadoBruto = round2(total * (proporcion / 100));
  const montoExenta = round2(total - montoGravadoBruto);
  const base = montoGravadoBruto / (1 + tasaIva / 100);
  const liquidacionIva = round2(montoGravadoBruto - base);

  return { total, montoExenta, montoGravado: montoGravadoBruto, liquidacionIva, tasaIva };
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
