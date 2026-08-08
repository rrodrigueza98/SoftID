-- AlterEnum
ALTER TYPE "OrigenAsiento" ADD VALUE 'COMPRA';

-- AlterTable
ALTER TABLE "asientos_contables" ADD COLUMN     "compraId" TEXT;

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "numeroComprobante" TEXT NOT NULL,
    "timbradoProveedor" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concepto" TEXT NOT NULL,
    "cuentaContableId" TEXT NOT NULL,
    "condicionCompra" "CondicionVenta" NOT NULL DEFAULT 'CONTADO',
    "formaPago" "FormaPago",
    "montoExenta" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montoGravada10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montoGravada5" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "iva10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "iva5" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "observacion" TEXT,
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'EMITIDO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos_contables" ADD CONSTRAINT "asientos_contables_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
