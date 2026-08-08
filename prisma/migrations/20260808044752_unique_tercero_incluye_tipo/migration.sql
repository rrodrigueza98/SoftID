-- DropIndex
DROP INDEX "terceros_empresaId_tipoDocumento_numeroDocumento_key";

-- CreateIndex
CREATE UNIQUE INDEX "terceros_empresaId_tipo_tipoDocumento_numeroDocumento_key" ON "terceros"("empresaId", "tipo", "tipoDocumento", "numeroDocumento");
