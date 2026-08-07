import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoComprobante, EstadoSesionCaja } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbrirSesionCajaDto } from './dto/abrir-sesion-caja.dto';
import { CerrarSesionCajaDto } from './dto/cerrar-sesion-caja.dto';

@Injectable()
export class CajaService {
  constructor(private readonly prisma: PrismaService) {}

  async abrirSesion(dto: AbrirSesionCajaDto, usuarioAperturaId: string) {
    const sesionAbierta = await this.prisma.sesionCaja.findFirst({
      where: { puntoExpedicionId: dto.puntoExpedicionId, estado: EstadoSesionCaja.ABIERTA },
      include: { usuarioApertura: true },
    });
    if (sesionAbierta) {
      throw new BadRequestException(
        `Ya hay una caja abierta en este punto de expedición (por ${sesionAbierta.usuarioApertura.nombre} desde ${sesionAbierta.fechaApertura.toLocaleString('es-PY')})`,
      );
    }

    return this.prisma.sesionCaja.create({
      data: {
        empresaId: dto.empresaId,
        puntoExpedicionId: dto.puntoExpedicionId,
        usuarioAperturaId,
        montoInicial: dto.montoInicial,
      },
    });
  }

  async obtenerActual(puntoExpedicionId: string) {
    const sesion = await this.prisma.sesionCaja.findFirst({
      where: { puntoExpedicionId, estado: EstadoSesionCaja.ABIERTA },
      include: { usuarioApertura: true },
    });
    if (!sesion) return null;
    return { ...sesion, resumenPagos: await this.resumenPorFormaPago(sesion.id) };
  }

  async findOne(id: string) {
    const sesion = await this.prisma.sesionCaja.findUnique({
      where: { id },
      include: {
        usuarioApertura: true,
        usuarioCierre: true,
        ventas: { include: { pagos: true, cliente: true }, orderBy: { fechaEmision: 'desc' } },
      },
    });
    if (!sesion) throw new NotFoundException(`Sesión de caja ${id} no encontrada`);
    return { ...sesion, resumenPagos: await this.resumenPorFormaPago(id) };
  }

  findAll(params: { empresaId: string; puntoExpedicionId?: string }) {
    return this.prisma.sesionCaja.findMany({
      where: { empresaId: params.empresaId, puntoExpedicionId: params.puntoExpedicionId },
      include: { usuarioApertura: true, usuarioCierre: true },
      orderBy: { fechaApertura: 'desc' },
    });
  }

  async cerrarSesion(id: string, dto: CerrarSesionCajaDto, usuarioCierreId: string) {
    const sesion = await this.prisma.sesionCaja.findUnique({ where: { id } });
    if (!sesion) throw new NotFoundException(`Sesión de caja ${id} no encontrada`);
    if (sesion.estado === EstadoSesionCaja.CERRADA) {
      throw new BadRequestException('Esta sesión de caja ya está cerrada');
    }

    const efectivoVentas = await this.totalEfectivo(id);
    const montoFinalCalculado = Number(sesion.montoInicial) + efectivoVentas;
    const diferencia = dto.montoFinalDeclarado - montoFinalCalculado;

    return this.prisma.sesionCaja.update({
      where: { id },
      data: {
        estado: EstadoSesionCaja.CERRADA,
        usuarioCierreId,
        fechaCierre: new Date(),
        montoFinalDeclarado: dto.montoFinalDeclarado,
        montoFinalCalculado,
        diferencia,
        observacionCierre: dto.observacion,
      },
    });
  }

  private async totalEfectivo(sesionId: string) {
    const resultado = await this.prisma.comprobantePago.aggregate({
      where: {
        formaPago: 'EFECTIVO',
        comprobante: { sesionCajaId: sesionId, estado: { not: EstadoComprobante.ANULADO } },
      },
      _sum: { monto: true },
    });
    return Number(resultado._sum.monto ?? 0);
  }

  // Desglose de lo cobrado en el turno por cada forma de pago -- ayuda al
  // cajero a ver de un vistazo cuanto deberia haber en efectivo antes de
  // arquear, y cuanto se cobro por otros medios (que no se cuentan a mano).
  private async resumenPorFormaPago(sesionId: string) {
    const grupos = await this.prisma.comprobantePago.groupBy({
      by: ['formaPago'],
      where: { comprobante: { sesionCajaId: sesionId, estado: { not: EstadoComprobante.ANULADO } } },
      _sum: { monto: true },
    });
    return grupos.map((g) => ({ formaPago: g.formaPago, total: Number(g._sum.monto ?? 0) }));
  }
}
