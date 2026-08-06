import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Subconjunto de la Tabla 5 (Codificacion de Unidades de Medida) del Manual
// Tecnico SIFEN v150, pag. 211-212 -- las mas usadas. El resto de la tabla
// (ampliada por la Nota Tecnica 23) se puede cargar despues igual, vía POST
// /unidades-medida.
const UNIDADES_MEDIDA = [
  { codigoSifen: '77', descripcion: 'Unidad' },
  { codigoSifen: '83', descripcion: 'Kilogramos' },
  { codigoSifen: '86', descripcion: 'Gramos' },
  { codigoSifen: '89', descripcion: 'Litros' },
  { codigoSifen: '88', descripcion: 'Mililitros' },
  { codigoSifen: '110', descripcion: 'Metros cúbicos' },
  { codigoSifen: '108', descripcion: 'Metros' },
  { codigoSifen: '109', descripcion: 'Metros cuadrados' },
  { codigoSifen: '99', descripcion: 'Tonelada' },
  { codigoSifen: '100', descripcion: 'Hora' },
  { codigoSifen: '101', descripcion: 'Minuto' },
  { codigoSifen: '102', descripcion: 'Día' },
  { codigoSifen: '97', descripcion: 'Año' },
  { codigoSifen: '98', descripcion: 'Mes' },
  { codigoSifen: '113', descripcion: 'Docena' },
  { codigoSifen: '131', descripcion: 'Caja' },
  { codigoSifen: '134', descripcion: 'Bolsa' },
  { codigoSifen: '132', descripcion: 'Juego' },
];

async function main() {
  for (const unidad of UNIDADES_MEDIDA) {
    await prisma.unidadMedida.upsert({
      where: { codigoSifen: unidad.codigoSifen },
      update: { descripcion: unidad.descripcion },
      create: unidad,
    });
  }
  console.log(`Seed OK: ${UNIDADES_MEDIDA.length} unidades de medida.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
