-- CreateEnum
CREATE TYPE "TipoCuentaContable" AS ENUM ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "NaturalezaCuenta" AS ENUM ('DEUDORA', 'ACREEDORA');

-- CreateEnum
CREATE TYPE "OrigenAsiento" AS ENUM ('MANUAL', 'VENTA', 'COBRO');

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "mapeoContable" JSONB,
ADD COLUMN     "proximoNumeroAsiento" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "cuentas_contables" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCuentaContable" NOT NULL,
    "naturaleza" "NaturalezaCuenta" NOT NULL,
    "imputable" BOOLEAN NOT NULL DEFAULT true,
    "cuentaPadreId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_contables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asientos_contables" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concepto" TEXT NOT NULL,
    "origen" "OrigenAsiento" NOT NULL DEFAULT 'MANUAL',
    "comprobanteId" TEXT,
    "reciboId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asientos_contables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asiento_contable_detalles" (
    "id" TEXT NOT NULL,
    "asientoId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "debe" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "haber" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "glosa" TEXT,

    CONSTRAINT "asiento_contable_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_contables_empresaId_codigo_key" ON "cuentas_contables"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "asientos_contables_empresaId_numero_key" ON "asientos_contables"("empresaId", "numero");

-- AddForeignKey
ALTER TABLE "cuentas_contables" ADD CONSTRAINT "cuentas_contables_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_contables" ADD CONSTRAINT "cuentas_contables_cuentaPadreId_fkey" FOREIGN KEY ("cuentaPadreId") REFERENCES "cuentas_contables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos_contables" ADD CONSTRAINT "asientos_contables_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos_contables" ADD CONSTRAINT "asientos_contables_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos_contables" ADD CONSTRAINT "asientos_contables_reciboId_fkey" FOREIGN KEY ("reciboId") REFERENCES "recibos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_contable_detalles" ADD CONSTRAINT "asiento_contable_detalles_asientoId_fkey" FOREIGN KEY ("asientoId") REFERENCES "asientos_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_contable_detalles" ADD CONSTRAINT "asiento_contable_detalles_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
