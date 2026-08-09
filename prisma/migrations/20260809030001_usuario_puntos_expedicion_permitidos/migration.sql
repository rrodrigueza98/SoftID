-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "puntosExpedicionPermitidos" TEXT[] DEFAULT ARRAY[]::TEXT[];
