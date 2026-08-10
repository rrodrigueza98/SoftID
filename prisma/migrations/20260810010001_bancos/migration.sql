-- CreateEnum
CREATE TYPE "TipoCuentaBancaria" AS ENUM ('CUENTA_CORRIENTE', 'CAJA_AHORRO');

-- CreateEnum
CREATE TYPE "TipoMovimientoBancario" AS ENUM ('DEBITO', 'CREDITO');

-- AlterEnum
ALTER TYPE "Pantalla" ADD VALUE 'BANCOS';

-- CreateTable
CREATE TABLE "cuentas_bancarias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroCuenta" TEXT NOT NULL,
    "tipoCuenta" "TipoCuentaBancaria" NOT NULL DEFAULT 'CUENTA_CORRIENTE',
    "moneda" TEXT NOT NULL DEFAULT 'PYG',
    "cuentaContableId" TEXT NOT NULL,
    "saldoInicial" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "fechaSaldoInicial" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_bancarios" (
    "id" TEXT NOT NULL,
    "cuentaBancariaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "tipo" "TipoMovimientoBancario" NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "referencia" TEXT,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "fechaConciliacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_bancarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliaciones_bancarias" (
    "id" TEXT NOT NULL,
    "cuentaBancariaId" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "saldoLibros" DECIMAL(15,2) NOT NULL,
    "saldoExtracto" DECIMAL(15,2) NOT NULL,
    "diferencia" DECIMAL(15,2) NOT NULL,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciliaciones_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_bancarias_empresaId_numeroCuenta_key" ON "cuentas_bancarias"("empresaId", "numeroCuenta");

-- AddForeignKey
ALTER TABLE "cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliaciones_bancarias" ADD CONSTRAINT "conciliaciones_bancarias_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
