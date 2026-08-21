-- CreateEnum
CREATE TYPE "AmbienteSifen" AS ENUM ('TEST', 'PRODUCCION');

-- CreateTable
CREATE TABLE "certificados_sifen" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ambiente" "AmbienteSifen" NOT NULL DEFAULT 'TEST',
    "p12Cifrado" BYTEA NOT NULL,
    "p12Iv" BYTEA NOT NULL,
    "p12AuthTag" BYTEA NOT NULL,
    "passwordCifrada" BYTEA NOT NULL,
    "passwordIv" BYTEA NOT NULL,
    "passwordAuthTag" BYTEA NOT NULL,
    "cscCifrado" BYTEA,
    "cscIv" BYTEA,
    "cscAuthTag" BYTEA,
    "idCsc" TEXT,
    "subjectCn" TEXT,
    "numeroSerie" TEXT,
    "fechaEmisionCert" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificados_sifen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificados_sifen_empresaId_key" ON "certificados_sifen"("empresaId");

-- AddForeignKey
ALTER TABLE "certificados_sifen" ADD CONSTRAINT "certificados_sifen_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

