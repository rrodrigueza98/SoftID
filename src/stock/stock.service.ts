import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TipoMovimientoStock } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovimientoStockDto } from './dto/create-movimiento-stock.dto';

type TxClient = Prisma.TransactionClient;

const TIPOS_ENTRADA: TipoMovimientoStock[] = [
  TipoMovimientoStock.COMPRA,
  TipoMovimientoStock.AJUSTE_POSITIVO,
  TipoMovimientoStock.DEVOLUCION_VENTA,
  TipoMovimientoStock.INVENTARIO_INICIAL,
  TipoMovimientoStock.TRANSFERENCIA_ENTRADA,
];

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  findSaldo(params: { empresaId: string; productoId?: string; depositoId?: string }) {
    const { empresaId, productoId, depositoId } = params;
    return this.prisma.stock.findMany({
      where: {
        producto: { empresaId },
        ...(productoId ? { productoId } : {}),
        ...(depositoId ? { depositoId } : {}),
      },
      include: { producto: true, deposito: true },
      orderBy: { producto: { descripcion: 'asc' } },
    });
  }

  // empresaId siempre filtra (via producto.empresaId) -- sin esto, devolvia
  // los movimientos mas recientes de TODAS las empresas mezclados (fuga
  // entre tenants). productoId/depositoId solo acotan mas todavia.
  findMovimientos(params: { empresaId: string; productoId?: string; depositoId?: string; limit?: number }) {
    const { empresaId, productoId, depositoId, limit } = params;
    return this.prisma.movimientoStock.findMany({
      where: {
        producto: { empresaId },
        ...(productoId ? { productoId } : {}),
        ...(depositoId ? { depositoId } : {}),
      },
      include: { producto: true, deposito: true, depositoDestino: true },
      orderBy: { fecha: 'desc' },
      take: limit ?? 100,
    });
  }

  // Punto de entrada publico: abre su propia transaccion si no se le pasa una
  // (por ejemplo cuando ComprobantesService la compone dentro de la suya).
  registrarMovimiento(dto: CreateMovimientoStockDto, tx?: TxClient) {
    if (tx) return this.ejecutarMovimiento(dto, tx);
    return this.prisma.$transaction((trx) => this.ejecutarMovimiento(dto, trx));
  }

  private async ejecutarMovimiento(dto: CreateMovimientoStockDto, client: TxClient) {
    const producto = await client.producto.findUniqueOrThrow({ where: { id: dto.productoId } });
    if (!producto.controlaStock) {
      throw new BadRequestException('Este producto no controla stock');
    }

    const esEntrada = TIPOS_ENTRADA.includes(dto.tipo);
    const esTransferencia = dto.tipo === TipoMovimientoStock.TRANSFERENCIA_SALIDA;

    if (esTransferencia && !dto.depositoDestinoId) {
      throw new BadRequestException('Una transferencia requiere depositoDestinoId');
    }

    const deltaOrigen = esEntrada ? dto.cantidad : -dto.cantidad;
    const { cantidadAnterior, cantidadNueva } = await this.aplicarDelta(
      client,
      dto.productoId,
      dto.depositoId,
      deltaOrigen,
    );

    if (esTransferencia && dto.depositoDestinoId) {
      await this.aplicarDelta(client, dto.productoId, dto.depositoDestinoId, dto.cantidad);
    }

    return client.movimientoStock.create({
      data: {
        productoId: dto.productoId,
        depositoId: dto.depositoId,
        depositoDestinoId: dto.depositoDestinoId,
        tipo: dto.tipo,
        cantidad: dto.cantidad,
        cantidadAnterior,
        cantidadNueva,
        costoUnitario: dto.costoUnitario,
        comprobanteId: dto.comprobanteId,
        usuarioId: dto.usuarioId,
        observacion: dto.observacion,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
      },
    });
  }

  // Suma (o resta, si delta es negativo) el delta al saldo de un producto en
  // un deposito. Crea la fila de Stock si todavia no existe (primer movimiento
  // de ese producto en ese deposito). Lanza si el resultado quedaria negativo.
  private async aplicarDelta(client: TxClient, productoId: string, depositoId: string, delta: number) {
    const stockActual = await client.stock.findUnique({
      where: { productoId_depositoId: { productoId, depositoId } },
    });
    const cantidadAnterior = stockActual ? Number(stockActual.cantidad) : 0;
    const cantidadNueva = cantidadAnterior + delta;

    if (cantidadNueva < 0) {
      throw new BadRequestException(
        `Stock insuficiente: saldo actual ${cantidadAnterior}, se intento restar ${-delta}`,
      );
    }

    await client.stock.upsert({
      where: { productoId_depositoId: { productoId, depositoId } },
      create: { productoId, depositoId, cantidad: cantidadNueva },
      update: { cantidad: cantidadNueva },
    });

    return { cantidadAnterior, cantidadNueva };
  }
}
