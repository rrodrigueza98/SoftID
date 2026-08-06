-- CreateEnum
CREATE TYPE "TipoContribuyente" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "RegimenTributario" AS ENUM ('IRE_GENERAL', 'IRE_SIMPLE', 'IRE_RESIT');

-- CreateEnum
CREATE TYPE "TipoDocumentoIdentidad" AS ENUM ('RUC', 'CEDULA_PARAGUAYA', 'PASAPORTE', 'CEDULA_EXTRANJERA', 'CARNET_RESIDENCIA', 'INNOMINADO', 'TARJETA_DIPLOMATICA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoTercero" AS ENUM ('CLIENTE', 'PROVEEDOR', 'AMBOS');

-- CreateEnum
CREATE TYPE "AfectacionIVA" AS ENUM ('GRAVADO', 'EXONERADO', 'EXENTO', 'GRAVADO_PARCIAL');

-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('COMPRA', 'VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_ENTRADA', 'DEVOLUCION_COMPRA', 'DEVOLUCION_VENTA', 'INVENTARIO_INICIAL');

-- CreateEnum
CREATE TYPE "TipoMovimientoCuentaCorriente" AS ENUM ('DEBITO', 'CREDITO');

-- CreateEnum
CREATE TYPE "CondicionVenta" AS ENUM ('CONTADO', 'CREDITO');

-- CreateEnum
CREATE TYPE "FormaPago" AS ENUM ('EFECTIVO', 'CHEQUE', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'GIRO', 'BILLETERA_ELECTRONICA', 'TARJETA_EMPRESARIAL', 'VALE', 'RETENCION', 'PAGO_ANTICIPO', 'VALOR_FISCAL', 'VALOR_COMERCIAL', 'COMPENSACION', 'PERMUTA', 'PAGO_BANCARIO', 'PAGO_MOVIL', 'DONACION', 'PROMOCION', 'CONSUMO_INTERNO', 'PAGO_ELECTRONICO', 'OTRO');

-- CreateEnum
CREATE TYPE "MotivoEmisionNotaCD" AS ENUM ('DEVOLUCION_Y_AJUSTE_PRECIOS', 'DEVOLUCION', 'DESCUENTO', 'BONIFICACION', 'CREDITO_INCOBRABLE', 'RECUPERO_DE_COSTO', 'RECUPERO_DE_GASTO', 'AJUSTE_DE_PRECIO');

-- CreateEnum
CREATE TYPE "RegimenEspecialSifen" AS ENUM ('TURISMO', 'IMPORTADOR', 'EXPORTADOR', 'MAQUILA', 'LEY_60_90', 'PEQUENO_PRODUCTOR', 'MEDIANO_PRODUCTOR', 'REGIMEN_CONTABLE');

-- CreateEnum
CREATE TYPE "TipoEmisionDE" AS ENUM ('NORMAL', 'CONTINGENCIA');

-- CreateEnum
CREATE TYPE "TipoDocumentoElectronico" AS ENUM ('FACTURA_ELECTRONICA', 'AUTOFACTURA_ELECTRONICA', 'NOTA_CREDITO_ELECTRONICA', 'NOTA_DEBITO_ELECTRONICA', 'NOTA_REMISION_ELECTRONICA', 'COMPROBANTE_RETENCION_ELECTRONICO');

-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('BORRADOR', 'EMITIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EstadoDocumentoElectronico" AS ENUM ('BORRADOR', 'PENDIENTE_ENVIO', 'ENVIADO', 'APROBADO', 'APROBADO_CON_OBSERVACION', 'RECHAZADO', 'CANCELADO', 'INUTILIZADO');

-- CreateEnum
CREATE TYPE "TipoEventoDocumentoElectronico" AS ENUM ('CANCELACION', 'INUTILIZACION', 'CONFORMIDAD', 'DISCONFORMIDAD', 'DESCONOCIMIENTO', 'NOTIFICACION', 'NOMINACION');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "dvRuc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreFantasia" TEXT,
    "tipoContribuyente" "TipoContribuyente" NOT NULL,
    "regimenTributario" "RegimenTributario" NOT NULL DEFAULT 'IRE_GENERAL',
    "regimenEspecialSifen" "RegimenEspecialSifen",
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "establecimientos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "esCasaMatriz" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establecimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puntos_expedicion" (
    "id" TEXT NOT NULL,
    "establecimientoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puntos_expedicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timbrados" (
    "id" TEXT NOT NULL,
    "puntoExpedicionId" TEXT NOT NULL,
    "numeroTimbrado" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumentoElectronico" NOT NULL,
    "numeroDesde" INTEGER NOT NULL,
    "numeroHasta" INTEGER NOT NULL,
    "proximoNumero" INTEGER NOT NULL DEFAULT 1,
    "fechaInicioVigencia" TIMESTAMP(3) NOT NULL,
    "fechaFinVigencia" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timbrados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "permisos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terceros" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "TipoTercero" NOT NULL,
    "tipoDocumento" "TipoDocumentoIdentidad" NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "dvRuc" TEXT,
    "razonSocial" TEXT NOT NULL,
    "nombreFantasia" TEXT,
    "tipoContribuyente" "TipoContribuyente",
    "direccion" TEXT,
    "ciudad" TEXT,
    "departamento" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'PY',
    "telefono" TEXT,
    "email" TEXT,
    "condicionPagoId" TEXT,
    "limiteCredito" DECIMAL(15,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terceros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos_tercero" (
    "id" TEXT NOT NULL,
    "terceroId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_tercero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_producto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoriaPadreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_medida" (
    "id" TEXT NOT NULL,
    "codigoSifen" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "unidades_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigoBarra" TEXT,
    "descripcion" TEXT NOT NULL,
    "categoriaId" TEXT,
    "unidadMedidaId" TEXT NOT NULL,
    "afectacionIva" "AfectacionIVA" NOT NULL DEFAULT 'GRAVADO',
    "tasaIva" INTEGER NOT NULL DEFAULT 10,
    "precioCosto" DECIMAL(15,2) NOT NULL,
    "precioVenta" DECIMAL(15,2) NOT NULL,
    "controlaStock" BOOLEAN NOT NULL DEFAULT true,
    "stockMinimo" DECIMAL(15,3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depositos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "establecimientoId" TEXT,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depositos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "depositoId" TEXT NOT NULL,
    "cantidad" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "depositoId" TEXT NOT NULL,
    "depositoDestinoId" TEXT,
    "tipo" "TipoMovimientoStock" NOT NULL,
    "cantidad" DECIMAL(15,3) NOT NULL,
    "cantidadAnterior" DECIMAL(15,3) NOT NULL,
    "cantidadNueva" DECIMAL(15,3) NOT NULL,
    "costoUnitario" DECIMAL(15,2),
    "comprobanteId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "observacion" TEXT,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condiciones_pago" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "diasPlazo" INTEGER NOT NULL DEFAULT 0,
    "cantidadCuotas" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "condiciones_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_corrientes" (
    "id" TEXT NOT NULL,
    "terceroId" TEXT NOT NULL,
    "saldo" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "limiteCredito" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_corrientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_cuenta_corriente" (
    "id" TEXT NOT NULL,
    "cuentaCorrienteId" TEXT NOT NULL,
    "tipo" "TipoMovimientoCuentaCorriente" NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "saldoAnterior" DECIMAL(15,2) NOT NULL,
    "saldoNuevo" DECIMAL(15,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "comprobanteId" TEXT,
    "reciboId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "usuarioId" TEXT,

    CONSTRAINT "movimientos_cuenta_corriente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recibos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "terceroId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(15,2) NOT NULL,
    "formaPago" "FormaPago" NOT NULL,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recibos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recibo_aplicaciones" (
    "id" TEXT NOT NULL,
    "reciboId" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "montoAplicado" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "recibo_aplicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobantes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "puntoExpedicionId" TEXT NOT NULL,
    "timbradoId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumentoElectronico" NOT NULL,
    "numero" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT,
    "proveedorId" TEXT,
    "condicionVenta" "CondicionVenta" NOT NULL DEFAULT 'CONTADO',
    "condicionPagoId" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'PYG',
    "tipoCambio" DECIMAL(15,4),
    "subtotalExenta" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "subtotalGravada10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "subtotalGravada5" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "iva10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "iva5" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "comprobanteAsociadoId" TEXT,
    "motivoEmision" "MotivoEmisionNotaCD",
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'BORRADOR',
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobante_items" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "productoId" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(15,3) NOT NULL,
    "unidadMedidaId" TEXT NOT NULL,
    "precioUnitario" DECIMAL(15,2) NOT NULL,
    "descuento" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "afectacionIva" "AfectacionIVA" NOT NULL,
    "tasaIva" INTEGER NOT NULL DEFAULT 10,
    "proporcionGravada" DECIMAL(5,2),
    "montoExenta" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montoGravado" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "liquidacionIva" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "comprobante_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobante_pagos" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "formaPago" "FormaPago" NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "banco" TEXT,
    "numeroCheque" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprobante_pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_electronicos" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "cdc" TEXT NOT NULL,
    "codigoSeguridad" TEXT NOT NULL,
    "tipoEmision" "TipoEmisionDE" NOT NULL DEFAULT 'NORMAL',
    "xmlGenerado" TEXT,
    "xmlFirmado" TEXT,
    "xmlRespuestaSet" TEXT,
    "estado" "EstadoDocumentoElectronico" NOT NULL DEFAULT 'BORRADOR',
    "numeroLote" TEXT,
    "protocoloAutorizacion" TEXT,
    "motivoRechazo" TEXT,
    "qrUrl" TEXT,
    "fechaFirma" TIMESTAMP(3),
    "fechaEnvio" TIMESTAMP(3),
    "fechaProceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_electronicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_documento_electronico" (
    "id" TEXT NOT NULL,
    "documentoElectronicoId" TEXT NOT NULL,
    "tipo" "TipoEventoDocumentoElectronico" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "xmlEvento" TEXT,
    "xmlRespuesta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_documento_electronico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_ruc_key" ON "empresas"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "establecimientos_empresaId_codigo_key" ON "establecimientos"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "puntos_expedicion_establecimientoId_codigo_key" ON "puntos_expedicion"("establecimientoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "roles_empresaId_nombre_key" ON "roles"("empresaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "terceros_empresaId_razonSocial_idx" ON "terceros"("empresaId", "razonSocial");

-- CreateIndex
CREATE UNIQUE INDEX "terceros_empresaId_tipoDocumento_numeroDocumento_key" ON "terceros"("empresaId", "tipoDocumento", "numeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_medida_codigoSifen_key" ON "unidades_medida"("codigoSifen");

-- CreateIndex
CREATE INDEX "productos_empresaId_descripcion_idx" ON "productos"("empresaId", "descripcion");

-- CreateIndex
CREATE UNIQUE INDEX "productos_empresaId_codigo_key" ON "productos"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "stock_productoId_depositoId_key" ON "stock"("productoId", "depositoId");

-- CreateIndex
CREATE INDEX "movimientos_stock_productoId_depositoId_fecha_idx" ON "movimientos_stock"("productoId", "depositoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_corrientes_terceroId_key" ON "cuentas_corrientes"("terceroId");

-- CreateIndex
CREATE INDEX "movimientos_cuenta_corriente_cuentaCorrienteId_fecha_idx" ON "movimientos_cuenta_corriente"("cuentaCorrienteId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "recibos_empresaId_numero_key" ON "recibos"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "comprobantes_empresaId_fechaEmision_idx" ON "comprobantes"("empresaId", "fechaEmision");

-- CreateIndex
CREATE UNIQUE INDEX "comprobantes_puntoExpedicionId_tipoDocumento_numero_key" ON "comprobantes"("puntoExpedicionId", "tipoDocumento", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_electronicos_comprobanteId_key" ON "documentos_electronicos"("comprobanteId");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_electronicos_cdc_key" ON "documentos_electronicos"("cdc");

-- AddForeignKey
ALTER TABLE "establecimientos" ADD CONSTRAINT "establecimientos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntos_expedicion" ADD CONSTRAINT "puntos_expedicion_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "establecimientos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timbrados" ADD CONSTRAINT "timbrados_puntoExpedicionId_fkey" FOREIGN KEY ("puntoExpedicionId") REFERENCES "puntos_expedicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terceros" ADD CONSTRAINT "terceros_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terceros" ADD CONSTRAINT "terceros_condicionPagoId_fkey" FOREIGN KEY ("condicionPagoId") REFERENCES "condiciones_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos_tercero" ADD CONSTRAINT "contactos_tercero_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_producto" ADD CONSTRAINT "categorias_producto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_producto" ADD CONSTRAINT "categorias_producto_categoriaPadreId_fkey" FOREIGN KEY ("categoriaPadreId") REFERENCES "categorias_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidades_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depositos" ADD CONSTRAINT "depositos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depositos" ADD CONSTRAINT "depositos_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "establecimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "depositos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "depositos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_depositoDestinoId_fkey" FOREIGN KEY ("depositoDestinoId") REFERENCES "depositos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condiciones_pago" ADD CONSTRAINT "condiciones_pago_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_corrientes" ADD CONSTRAINT "cuentas_corrientes_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_cuentaCorrienteId_fkey" FOREIGN KEY ("cuentaCorrienteId") REFERENCES "cuentas_corrientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_reciboId_fkey" FOREIGN KEY ("reciboId") REFERENCES "recibos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibo_aplicaciones" ADD CONSTRAINT "recibo_aplicaciones_reciboId_fkey" FOREIGN KEY ("reciboId") REFERENCES "recibos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibo_aplicaciones" ADD CONSTRAINT "recibo_aplicaciones_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_puntoExpedicionId_fkey" FOREIGN KEY ("puntoExpedicionId") REFERENCES "puntos_expedicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_timbradoId_fkey" FOREIGN KEY ("timbradoId") REFERENCES "timbrados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_condicionPagoId_fkey" FOREIGN KEY ("condicionPagoId") REFERENCES "condiciones_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_comprobanteAsociadoId_fkey" FOREIGN KEY ("comprobanteAsociadoId") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_items" ADD CONSTRAINT "comprobante_items_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_items" ADD CONSTRAINT "comprobante_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_items" ADD CONSTRAINT "comprobante_items_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidades_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_pagos" ADD CONSTRAINT "comprobante_pagos_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_electronicos" ADD CONSTRAINT "documentos_electronicos_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_documento_electronico" ADD CONSTRAINT "eventos_documento_electronico_documentoElectronicoId_fkey" FOREIGN KEY ("documentoElectronicoId") REFERENCES "documentos_electronicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
