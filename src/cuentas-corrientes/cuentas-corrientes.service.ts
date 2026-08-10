import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoMovimientoCuentaCorriente } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovimientoCCDto } from './dto/create-movimiento-cc.dto';

type TxClient = Prisma.TransactionClient;

export interface RegistrarMovimientoCCParams {
  cuentaCorrienteId: string;
  tipo: TipoMovimientoCuentaCorriente;
  monto: number;
  concepto: string;
  comprobanteId?: string;
  compraId?: string;
  reciboId?: string;
  ordenPagoId?: string;
  fechaVencimiento?: Date | string;
  usuarioId?: string;
}

@Injectable()
export class CuentasCorrientesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTercero(terceroId: string) {
    const cuenta = await this.prisma.cuentaCorriente.findUnique({
      where: { terceroId },
      include: { tercero: true },
    });
    if (!cuenta) throw new NotFoundException(`El tercero ${terceroId} no tiene cuenta corriente`);
    return cuenta;
  }

  findMovimientos(cuentaCorrienteId: string) {
    return this.prisma.movimientoCuentaCorriente.findMany({
      where: { cuentaCorrienteId },
      include: { comprobante: true, compra: true, recibo: true, ordenPago: true },
      orderBy: { fecha: 'desc' },
    });
  }

  registrarMovimientoManual(dto: CreateMovimientoCCDto) {
    return this.registrarMovimiento(dto);
  }

  // DEBITO aumenta lo que el tercero nos debe (factura a credito).
  // CREDITO lo reduce (cobro, nota de credito). Reusable dentro de otras
  // transacciones (Comprobantes, Recibos) pasando `tx`.
  async registrarMovimiento(params: RegistrarMovimientoCCParams, tx?: TxClient) {
    const client = tx ?? this.prisma;
    const run = async (c: TxClient | PrismaService) => {
      const cuenta = await c.cuentaCorriente.findUniqueOrThrow({
        where: { id: params.cuentaCorrienteId },
      });
      const saldoAnterior = Number(cuenta.saldo);
      const signo = params.tipo === TipoMovimientoCuentaCorriente.DEBITO ? 1 : -1;
      const saldoNuevo = saldoAnterior + signo * params.monto;

      await c.cuentaCorriente.update({
        where: { id: params.cuentaCorrienteId },
        data: { saldo: saldoNuevo },
      });

      return c.movimientoCuentaCorriente.create({
        data: {
          cuentaCorrienteId: params.cuentaCorrienteId,
          tipo: params.tipo,
          monto: params.monto,
          saldoAnterior,
          saldoNuevo,
          concepto: params.concepto,
          comprobanteId: params.comprobanteId,
          compraId: params.compraId,
          reciboId: params.reciboId,
          ordenPagoId: params.ordenPagoId,
          fechaVencimiento: params.fechaVencimiento ? new Date(params.fechaVencimiento) : undefined,
          usuarioId: params.usuarioId,
        },
      });
    };

    if (tx) return run(client);
    return this.prisma.$transaction((trx) => run(trx));
  }
}
