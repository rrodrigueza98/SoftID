-- AlterEnum
ALTER TYPE "OrigenAsiento" ADD VALUE 'PAGO';

-- AlterTable
ALTER TABLE "asientos_contables" ADD COLUMN     "ordenPagoId" TEXT;

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "proximoNumeroOrdenPago" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "movimientos_bancarios" ADD COLUMN     "ordenPagoId" TEXT;

-- AlterTable
ALTER TABLE "movimientos_cuenta_corriente" ADD COLUMN     "ordenPagoId" TEXT;

-- CreateTable
CREATE TABLE "ordenes_pago" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(15,2) NOT NULL,
    "formaPago" "FormaPago" NOT NULL,
    "observacion" TEXT,
    "cuentaBancariaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_pago_aplicaciones" (
    "id" TEXT NOT NULL,
    "ordenPagoId" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "montoAplicado" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "orden_pago_aplicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_pago_empresaId_numero_key" ON "ordenes_pago"("empresaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_bancarios_ordenPagoId_key" ON "movimientos_bancarios"("ordenPagoId");

-- AddForeignKey
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_ordenPagoId_fkey" FOREIGN KEY ("ordenPagoId") REFERENCES "ordenes_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pago" ADD CONSTRAINT "ordenes_pago_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pago" ADD CONSTRAINT "ordenes_pago_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pago" ADD CONSTRAINT "ordenes_pago_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_pago_aplicaciones" ADD CONSTRAINT "orden_pago_aplicaciones_ordenPagoId_fkey" FOREIGN KEY ("ordenPagoId") REFERENCES "ordenes_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_pago_aplicaciones" ADD CONSTRAINT "orden_pago_aplicaciones_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos_contables" ADD CONSTRAINT "asientos_contables_ordenPagoId_fkey" FOREIGN KEY ("ordenPagoId") REFERENCES "ordenes_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_ordenPagoId_fkey" FOREIGN KEY ("ordenPagoId") REFERENCES "ordenes_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;
