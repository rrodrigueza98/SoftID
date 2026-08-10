import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { UpdateCuentaBancariaDto } from './dto/update-cuenta-bancaria.dto';

@Injectable()
export class CuentasBancariasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCuentaBancariaDto) {
    return this.prisma.cuentaBancaria.create({
      data: {
        empresaId: dto.empresaId,
        banco: dto.banco,
        nombre: dto.nombre,
        numeroCuenta: dto.numeroCuenta,
        tipoCuenta: dto.tipoCuenta,
        moneda: dto.moneda,
        cuentaContableId: dto.cuentaContableId,
        saldoInicial: dto.saldoInicial ?? 0,
        fechaSaldoInicial: new Date(dto.fechaSaldoInicial),
      },
    });
  }

  findAll(empresaId: string) {
    return this.prisma.cuentaBancaria.findMany({
      where: { empresaId },
      include: { cuentaContable: { select: { codigo: true, nombre: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const cuenta = await this.prisma.cuentaBancaria.findUnique({
      where: { id },
      include: { cuentaContable: { select: { codigo: true, nombre: true } } },
    });
    if (!cuenta) throw new NotFoundException(`Cuenta bancaria ${id} no encontrada`);
    return cuenta;
  }

  async update(id: string, dto: UpdateCuentaBancariaDto) {
    await this.findOne(id);
    return this.prisma.cuentaBancaria.update({
      where: { id },
      data: { ...dto, fechaSaldoInicial: dto.fechaSaldoInicial ? new Date(dto.fechaSaldoInicial) : undefined },
    });
  }

  // Si la cuenta ya tiene movimientos cargados, la FK con ON DELETE RESTRICT
  // hace que el PrismaExceptionFilter global devuelva un 400 legible en vez
  // de dejar borrar una cuenta con historial.
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.cuentaBancaria.delete({ where: { id } });
  }

  // Saldo segun libros: saldo inicial mas el neto de todos los movimientos
  // cargados hasta (e incluyendo) la fecha de corte. Se usa tanto para
  // mostrar el saldo actual de la cuenta como para armar una conciliacion.
  async calcularSaldo(cuentaBancariaId: string, hasta?: Date) {
    const cuenta = await this.findOne(cuentaBancariaId);
    const where: Prisma.MovimientoBancarioWhereInput = {
      cuentaBancariaId,
      ...(hasta ? { fecha: { lte: hasta } } : {}),
    };
    const [creditos, debitos] = await Promise.all([
      this.prisma.movimientoBancario.aggregate({ where: { ...where, tipo: 'CREDITO' }, _sum: { monto: true } }),
      this.prisma.movimientoBancario.aggregate({ where: { ...where, tipo: 'DEBITO' }, _sum: { monto: true } }),
    ]);
    const neto = Number(creditos._sum.monto ?? 0) - Number(debitos._sum.monto ?? 0);
    return Number(cuenta.saldoInicial) + neto;
  }
}
