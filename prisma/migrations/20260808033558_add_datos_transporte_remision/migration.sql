-- CreateEnum
CREATE TYPE "MotivoEmisionNotaRemision" AS ENUM ('TRASLADO_POR_VENTA', 'TRASLADO_POR_CONSIGNACION', 'EXPORTACION', 'TRASLADO_POR_COMPRA', 'IMPORTACION', 'TRASLADO_POR_DEVOLUCION', 'TRASLADO_ENTRE_LOCALES', 'TRASLADO_POR_TRANSFORMACION', 'TRASLADO_POR_REPARACION', 'TRASLADO_POR_EMISOR_MOVIL', 'EXHIBICION_O_DEMOSTRACION', 'PARTICIPACION_EN_FERIAS', 'TRASLADO_DE_ENCOMIENDA', 'DECOMISO', 'OTRO');

-- CreateEnum
CREATE TYPE "ResponsableEmisionNotaRemision" AS ENUM ('EMISOR_FACTURA', 'POSEEDOR_FACTURA_Y_BIENES', 'EMPRESA_TRANSPORTISTA', 'DESPACHANTE_ADUANAS', 'AGENTE_TRANSPORTE');

-- CreateEnum
CREATE TYPE "TipoTransporte" AS ENUM ('PROPIO', 'TERCERO');

-- CreateEnum
CREATE TYPE "ModalidadTransporte" AS ENUM ('TERRESTRE', 'FLUVIAL', 'AEREO', 'MULTIMODAL');

-- CreateEnum
CREATE TYPE "ResponsableFlete" AS ENUM ('EMISOR_FACTURA', 'RECEPTOR_FACTURA', 'TERCERO', 'AGENTE_INTERMEDIARIO', 'TRANSPORTE_PROPIO');

-- CreateEnum
CREATE TYPE "TipoIdentificacionVehiculo" AS ENUM ('NUMERO_IDENTIFICACION', 'MATRICULA');

-- CreateEnum
CREATE TYPE "NaturalezaTransportista" AS ENUM ('CONTRIBUYENTE', 'NO_CONTRIBUYENTE');

-- CreateTable
CREATE TABLE "datos_transporte_remision" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "motivoEmision" "MotivoEmisionNotaRemision" NOT NULL,
    "motivoEmisionOtro" TEXT,
    "responsableEmision" "ResponsableEmisionNotaRemision" NOT NULL,
    "kmEstimados" INTEGER,
    "fechaEmisionFacturaFutura" TIMESTAMP(3),
    "tipoTransporte" "TipoTransporte" NOT NULL,
    "modalidadTransporte" "ModalidadTransporte" NOT NULL,
    "responsableFlete" "ResponsableFlete" NOT NULL,
    "fechaInicioTraslado" TIMESTAMP(3) NOT NULL,
    "fechaFinTraslado" TIMESTAMP(3) NOT NULL,
    "direccionSalida" TEXT NOT NULL,
    "numeroCasaSalida" TEXT NOT NULL,
    "ciudadSalida" TEXT NOT NULL,
    "departamentoSalida" TEXT NOT NULL,
    "direccionEntrega" TEXT NOT NULL,
    "numeroCasaEntrega" TEXT NOT NULL,
    "ciudadEntrega" TEXT NOT NULL,
    "departamentoEntrega" TEXT NOT NULL,
    "tipoVehiculo" TEXT NOT NULL,
    "marcaVehiculo" TEXT NOT NULL,
    "tipoIdentificacionVehiculo" "TipoIdentificacionVehiculo" NOT NULL,
    "numeroIdentificacionVehiculo" TEXT,
    "numeroMatriculaVehiculo" TEXT,
    "numeroVuelo" TEXT,
    "naturalezaTransportista" "NaturalezaTransportista" NOT NULL,
    "nombreTransportista" TEXT NOT NULL,
    "rucTransportista" TEXT,
    "dvRucTransportista" TEXT,
    "tipoDocIdentidadTransportista" "TipoDocumentoIdentidad",
    "numeroDocIdentidadTransportista" TEXT,
    "numeroDocIdentidadChofer" TEXT NOT NULL,
    "nombreChofer" TEXT NOT NULL,

    CONSTRAINT "datos_transporte_remision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "datos_transporte_remision_comprobanteId_key" ON "datos_transporte_remision"("comprobanteId");

-- AddForeignKey
ALTER TABLE "datos_transporte_remision" ADD CONSTRAINT "datos_transporte_remision_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
