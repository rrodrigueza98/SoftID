-- DropIndex
DROP INDEX "comprobantes_puntoExpedicionId_tipoDocumento_numero_key";

-- CreateIndex
CREATE UNIQUE INDEX "comprobantes_timbradoId_numero_key" ON "comprobantes"("timbradoId", "numero");
