-- CreateEnum
CREATE TYPE "CondicionCredito" AS ENUM ('PLAZO', 'CUOTA');

-- AlterTable
ALTER TABLE "comprobantes" ADD COLUMN     "cantidadCuotas" INTEGER,
ADD COLUMN     "condicionCredito" "CondicionCredito",
ADD COLUMN     "plazoCredito" TEXT;
