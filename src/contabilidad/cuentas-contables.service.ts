import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCuentaContableDto } from './dto/create-cuenta-contable.dto';
import { CODIGO_SUGERIDO_POR_ROL, MapeoContable } from './mapeo-contable';
import { codigoPadre, PLAN_CUENTAS_DEFAULT } from './plan-cuentas-default';

@Injectable()
export class CuentasContablesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: string) {
    return this.prisma.cuentaContable.findMany({
      where: { empresaId },
      orderBy: { codigo: 'asc' },
    });
  }

  async create(dto: CreateCuentaContableDto) {
    if (dto.cuentaPadreId) {
      const padre = await this.prisma.cuentaContable.findUnique({ where: { id: dto.cuentaPadreId } });
      if (!padre) throw new NotFoundException(`Cuenta padre ${dto.cuentaPadreId} no encontrada`);
    }
    return this.prisma.cuentaContable.create({
      data: {
        empresaId: dto.empresaId,
        codigo: dto.codigo,
        nombre: dto.nombre,
        tipo: dto.tipo,
        naturaleza: dto.naturaleza,
        imputable: dto.imputable ?? true,
        cuentaPadreId: dto.cuentaPadreId,
      },
    });
  }

  // Crea de una el Plan de Cuentas estandar (modelo oficial DNIT) para la
  // empresa, si todavia no tiene ninguna cuenta cargada, y deja sugerido el
  // mapeo de roles (Caja/Clientes/Ventas/etc.) segun CODIGO_SUGERIDO_POR_ROL.
  // Idempotente: si ya hay cuentas, no hace nada (evita duplicar el plan si
  // el usuario aprieta el boton dos veces).
  async sembrarPlanEstandar(empresaId: string) {
    const existentes = await this.prisma.cuentaContable.count({ where: { empresaId } });
    if (existentes > 0) {
      throw new BadRequestException('La empresa ya tiene un Plan de Cuentas cargado');
    }

    const idPorCodigo = new Map<string, string>();
    // Se inserta en el orden del array, que ya esta armado padre-antes-que-hijo.
    for (const cuenta of PLAN_CUENTAS_DEFAULT) {
      const padreCodigo = codigoPadre(cuenta.codigo);
      const cuentaPadreId = padreCodigo ? idPorCodigo.get(padreCodigo) : undefined;
      const creada = await this.prisma.cuentaContable.create({
        data: {
          empresaId,
          codigo: cuenta.codigo,
          nombre: cuenta.nombre,
          tipo: cuenta.tipo,
          naturaleza: cuenta.naturaleza,
          imputable: cuenta.imputable,
          cuentaPadreId,
        },
      });
      idPorCodigo.set(cuenta.codigo, creada.id);
    }

    const mapeo: MapeoContable = {};
    for (const [rol, codigo] of Object.entries(CODIGO_SUGERIDO_POR_ROL)) {
      const id = idPorCodigo.get(codigo);
      if (id) mapeo[rol as keyof typeof CODIGO_SUGERIDO_POR_ROL] = id;
    }
    await this.prisma.empresa.update({ where: { id: empresaId }, data: { mapeoContable: mapeo } });

    return this.findAll(empresaId);
  }

  async obtenerMapeo(empresaId: string): Promise<MapeoContable> {
    const empresa = await this.prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
    return (empresa.mapeoContable as MapeoContable | null) ?? {};
  }

  async actualizarMapeo(empresaId: string, mapeo: MapeoContable) {
    await this.prisma.empresa.update({ where: { id: empresaId }, data: { mapeoContable: mapeo } });
    return this.obtenerMapeo(empresaId);
  }

  async obtenerCierre(empresaId: string) {
    const empresa = await this.prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: { fechaCierreContable: true },
    });
    return empresa;
  }

  async actualizarCierre(empresaId: string, fechaCierreContable: string | null) {
    await this.prisma.empresa.update({
      where: { id: empresaId },
      data: { fechaCierreContable: fechaCierreContable ? new Date(fechaCierreContable) : null },
    });
    return this.obtenerCierre(empresaId);
  }
}
