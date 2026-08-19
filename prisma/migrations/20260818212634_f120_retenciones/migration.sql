-- CreateEnum
CREATE TYPE "AtribucionCreditoF120" AS ENUM ('DIRECTA_GRAVADA', 'INDISTINTA', 'VINCULADA_EXONERADA');

-- CreateEnum
CREATE TYPE "TipoRetencionIva" AS ENUM ('IVA', 'PERCEPCION_IVA');

-- CreateEnum
CREATE TYPE "TipoDeclaracionF120" AS ENUM ('ORIGINAL', 'RECTIFICATIVA');

-- CreateEnum
CREATE TYPE "EstadoDeclaracionF120" AS ENUM ('GENERADA', 'ANULADA');

-- AlterTable
ALTER TABLE "compras" ADD COLUMN     "atribucionCredito" "AtribucionCreditoF120" NOT NULL DEFAULT 'DIRECTA_GRAVADA';

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "periodoInicialF120" TEXT,
ADD COLUMN     "saldoFinancieroFavorInicialF120" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "saldoTecnicoFavorInicialF120" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "retenciones_iva" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "TipoRetencionIva" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "periodoTributario" TEXT NOT NULL,
    "agenteRetentorRuc" TEXT NOT NULL,
    "agenteRetentorNombre" TEXT NOT NULL,
    "numeroComprobanteRetencion" TEXT,
    "monto" DECIMAL(15,2) NOT NULL,
    "comprobanteId" TEXT,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retenciones_iva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "declaraciones_f120" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "periodoTributario" TEXT NOT NULL,
    "tipoDeclaracion" "TipoDeclaracionF120" NOT NULL DEFAULT 'ORIGINAL',
    "numeroOrdenRectificada" INTEGER,
    "estado" "EstadoDeclaracionF120" NOT NULL DEFAULT 'GENERADA',
    "ivaDebito" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ivaCredito" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldoTecnicoFavorAnterior" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldoTecnicoFavorContrib" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldoTecnicoRemitidoFisco" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldoTecnicoFavorTrasladar" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldoTecnicoFavorFisco" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ivaCreditoExportacionUsado" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deduccionDiscapacidad" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "impuestoDeterminado" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldoFinancieroFavorAnterior" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "retencionesComputables" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "percepcionesComputables" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "multa" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "subtotalFavorContribuyente" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "subtotalFavorFisco" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldoFinancieroFavorContrib" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldoAPagarFisco" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "detalleJson" JSONB NOT NULL,
    "generadaEn" TIMESTAMP(3),
    "generadaPorUsuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "declaraciones_f120_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "declaraciones_f120_empresaId_periodoTributario_key" ON "declaraciones_f120"("empresaId", "periodoTributario");

-- AddForeignKey
ALTER TABLE "retenciones_iva" ADD CONSTRAINT "retenciones_iva_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retenciones_iva" ADD CONSTRAINT "retenciones_iva_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declaraciones_f120" ADD CONSTRAINT "declaraciones_f120_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

