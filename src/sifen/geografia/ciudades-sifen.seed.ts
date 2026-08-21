import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Carga la tabla ciudades_sifen desde prisma/seed-data/ciudades-sifen.json
// (6764 filas, exportadas del "Codigo de Referencia Geografica" oficial de
// la DNIT/INE -- ver el comentario en el modelo CiudadSifen en
// schema.prisma). Idempotente: si la tabla ya tiene datos, no hace nada, asi
// que correrlo de nuevo por error no duplica filas.
//
// Uso: npx ts-node src/sifen/geografia/ciudades-sifen.seed.ts
async function main() {
  const prisma = new PrismaClient();
  try {
    const yaCargado = await prisma.ciudadSifen.count();
    if (yaCargado > 0) {
      console.log(`ciudades_sifen ya tiene ${yaCargado} filas, no se vuelve a cargar.`);
      return;
    }

    const ruta = join(__dirname, '../../../prisma/seed-data/ciudades-sifen.json');
    const filas: { codigoDepartamento: string; departamento: string; codigoDistrito: string; distrito: string; codigoCiudad: string; ciudad: string }[] =
      JSON.parse(readFileSync(ruta, 'utf8'));

    const LOTE = 500;
    for (let i = 0; i < filas.length; i += LOTE) {
      await prisma.ciudadSifen.createMany({ data: filas.slice(i, i + LOTE) });
    }

    const total = await prisma.ciudadSifen.count();
    console.log(`ciudades_sifen cargado: ${total} filas.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
