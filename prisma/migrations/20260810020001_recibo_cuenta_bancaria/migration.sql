-- AlterTable
ALTER TABLE "movimientos_bancarios" ADD COLUMN     "reciboId" TEXT;

-- AlterTable
ALTER TABLE "recibos" ADD COLUMN     "cuentaBancariaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_bancarios_reciboId_key" ON "movimientos_bancarios"("reciboId");

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_reciboId_fkey" FOREIGN KEY ("reciboId") REFERENCES "recibos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
