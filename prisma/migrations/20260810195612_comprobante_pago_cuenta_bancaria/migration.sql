-- AlterTable
ALTER TABLE "comprobante_pagos" ADD COLUMN     "cuentaBancariaId" TEXT;

-- AlterTable
ALTER TABLE "movimientos_bancarios" ADD COLUMN     "comprobantePagoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_bancarios_comprobantePagoId_key" ON "movimientos_bancarios"("comprobantePagoId");

-- AddForeignKey
ALTER TABLE "comprobante_pagos" ADD CONSTRAINT "comprobante_pagos_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_comprobantePagoId_fkey" FOREIGN KEY ("comprobantePagoId") REFERENCES "comprobante_pagos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

