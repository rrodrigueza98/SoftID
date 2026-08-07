-- CreateEnum
CREATE TYPE "EstadoSesionCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- AlterTable
ALTER TABLE "comprobantes" ADD COLUMN     "sesionCajaId" TEXT;

-- CreateTable
CREATE TABLE "sesiones_caja" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "puntoExpedicionId" TEXT NOT NULL,
    "usuarioAperturaId" TEXT NOT NULL,
    "usuarioCierreId" TEXT,
    "montoInicial" DECIMAL(15,2) NOT NULL,
    "montoFinalDeclarado" DECIMAL(15,2),
    "montoFinalCalculado" DECIMAL(15,2),
    "diferencia" DECIMAL(15,2),
    "estado" "EstadoSesionCaja" NOT NULL DEFAULT 'ABIERTA',
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "observacionCierre" TEXT,

    CONSTRAINT "sesiones_caja_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_puntoExpedicionId_fkey" FOREIGN KEY ("puntoExpedicionId") REFERENCES "puntos_expedicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_usuarioAperturaId_fkey" FOREIGN KEY ("usuarioAperturaId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_usuarioCierreId_fkey" FOREIGN KEY ("usuarioCierreId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
