-- CreateEnum
CREATE TYPE "RolTipo" AS ENUM ('ADMIN', 'OPERADOR');

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "tipo" "RolTipo" NOT NULL DEFAULT 'OPERADOR';
