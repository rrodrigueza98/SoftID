-- CreateEnum
CREATE TYPE "Modulo" AS ENUM ('VENTAS', 'COMPRAS', 'INVENTARIO', 'CONTABILIDAD');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "modulosPermitidos" "Modulo"[] DEFAULT ARRAY[]::"Modulo"[];
