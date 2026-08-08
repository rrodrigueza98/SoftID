-- CreateEnum
CREATE TYPE "NaturalezaVendedorAutofactura" AS ENUM ('NO_CONTRIBUYENTE', 'EXTRANJERO');

-- CreateTable
CREATE TABLE "datos_vendedor_autofactura" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "naturalezaVendedor" "NaturalezaVendedorAutofactura" NOT NULL,
    "tipoDocIdentidadVendedor" "TipoDocumentoIdentidad" NOT NULL,
    "numeroDocIdentidadVendedor" TEXT NOT NULL,
    "nombreVendedor" TEXT NOT NULL,
    "direccionVendedor" TEXT NOT NULL,
    "numeroCasaVendedor" TEXT NOT NULL,
    "ciudadVendedor" TEXT NOT NULL,
    "departamentoVendedor" TEXT NOT NULL,
    "direccionTransaccion" TEXT NOT NULL,
    "ciudadTransaccion" TEXT NOT NULL,
    "departamentoTransaccion" TEXT NOT NULL,

    CONSTRAINT "datos_vendedor_autofactura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "datos_vendedor_autofactura_comprobanteId_key" ON "datos_vendedor_autofactura"("comprobanteId");

-- AddForeignKey
ALTER TABLE "datos_vendedor_autofactura" ADD CONSTRAINT "datos_vendedor_autofactura_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
