// Bootstrap del primer usuario administrador de una empresa.
// A proposito NO existe un endpoint HTTP publico para esto -- crear el primer
// usuario es una operacion de una sola vez que corre quien tiene acceso al
// servidor/deploy, no algo expuesto a internet.
//
// Uso:
//   npx ts-node scripts/create-admin.ts --empresaId=<id> --nombre="Ada Admin" --email=ada@empresa.com --password="algo-largo-y-unico"
//
// Si no pasas --empresaId, lista las empresas existentes para que copies el id.

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function parseArgs() {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const { empresaId, nombre, email, password, rol: rolNombre = 'Administrador' } = parseArgs();

  if (!empresaId) {
    const empresas = await prisma.empresa.findMany({ select: { id: true, razonSocial: true, ruc: true } });
    console.log('Falta --empresaId. Empresas disponibles:');
    for (const e of empresas) console.log(`  ${e.id}  ${e.razonSocial} (RUC ${e.ruc})`);
    if (empresas.length === 0) console.log('  (ninguna: crea una empresa primero via POST /empresas)');
    process.exit(1);
  }

  if (!nombre || !email || !password) {
    console.log('Faltan argumentos. Uso:');
    console.log(
      '  npx ts-node scripts/create-admin.ts --empresaId=<id> --nombre="Ada Admin" --email=ada@empresa.com --password="..."',
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.log('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const rol = await prisma.rol.upsert({
    where: { empresaId_nombre: { empresaId, nombre: rolNombre } },
    update: {},
    create: { empresaId, nombre: rolNombre, permisos: ['*'] },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: { empresaId, rolId: rol.id, nombre, email, passwordHash },
    select: { id: true, nombre: true, email: true },
  });

  console.log(`Usuario creado: ${usuario.nombre} <${usuario.email}> (rol: ${rolNombre})`);
  console.log('Ya podes hacer login en POST /api/auth/login');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
