// Backfill de una sola vez: corrige el "monto gravado" ya guardado en items
// y comprobantes emitidos antes del fix del calculo (ver comprobantes.util.ts).
// Antes se guardaba el monto gravado bruto (con IVA incluido); ahora es la
// base imponible (sin IVA), que es lo que exige el formato del Libro de
// Ventas RG 90 (Total = Exenta + Gravada + IVA).
//
// La base correcta se deriva de dos valores que YA estaban guardados
// correctamente y no cambian con el fix: base = montoGravado_viejo (bruto) -
// liquidacionIva. Asi evitamos volver a asumir una tasaIva y el resultado es
// exacto centavo a centavo respecto de lo que se emitio.
//
// Uso: npx ts-node scripts/backfill-monto-gravado.ts

import { AfectacionIVA, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function main() {
  const items = await prisma.comprobanteItem.findMany({
    where: { afectacionIva: { in: [AfectacionIVA.GRAVADO, AfectacionIVA.GRAVADO_PARCIAL] } },
  });

  console.log(`Encontrados ${items.length} items gravados a revisar.`);

  const comprobanteIds = new Set<string>();
  let corregidos = 0;

  for (const item of items) {
    const montoGravadoBruto = Number(item.montoGravado);
    const liquidacionIva = Number(item.liquidacionIva);
    const baseCorrecta = round2(montoGravadoBruto - liquidacionIva);

    if (baseCorrecta < 0 || baseCorrecta > montoGravadoBruto) {
      console.warn(`  ! item ${item.id}: valores raros (bruto=${montoGravadoBruto}, iva=${liquidacionIva}), lo salteo.`);
      continue;
    }
    if (Math.abs(baseCorrecta - montoGravadoBruto) < 0.005) continue; // liquidacionIva ~0, nada que corregir

    await prisma.comprobanteItem.update({ where: { id: item.id }, data: { montoGravado: baseCorrecta } });
    comprobanteIds.add(item.comprobanteId);
    corregidos++;
  }

  console.log(`Items corregidos: ${corregidos}. Recalculando subtotales de ${comprobanteIds.size} comprobantes...`);

  for (const comprobanteId of comprobanteIds) {
    const items = await prisma.comprobanteItem.findMany({ where: { comprobanteId } });
    let subtotalGravada10 = 0;
    let subtotalGravada5 = 0;
    for (const item of items) {
      if (item.tasaIva === 10) subtotalGravada10 = round2(subtotalGravada10 + Number(item.montoGravado));
      else if (item.tasaIva === 5) subtotalGravada5 = round2(subtotalGravada5 + Number(item.montoGravado));
    }
    await prisma.comprobante.update({ where: { id: comprobanteId }, data: { subtotalGravada10, subtotalGravada5 } });
  }

  console.log('Listo.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
