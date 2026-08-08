import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoTercero } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTerceroDto } from './dto/create-tercero.dto';
import { UpdateTerceroDto } from './dto/update-tercero.dto';

interface ResultadoBusquedaRuc {
  ruc: string;
  dv: string;
  fullRuc: string;
  name: string;
  active: boolean;
  state: string;
}

@Injectable()
export class TercerosService {
  constructor(private readonly prisma: PrismaService) {}

  // Cada tercero nuevo recibe su cuenta corriente en el mismo alta -- es 1:1
  // y no tiene sentido operar un tercero sin ella.
  create(dto: CreateTerceroDto) {
    return this.prisma.tercero.create({
      data: {
        ...dto,
        cuentaCorriente: { create: { limiteCredito: dto.limiteCredito } },
      },
      include: { cuentaCorriente: true },
    });
  }

  findAll(params: { empresaId: string; tipo?: TipoTercero; search?: string }) {
    const { empresaId, tipo, search } = params;
    const where: Prisma.TerceroWhereInput = {
      empresaId,
      ...(tipo ? { tipo } : {}),
      ...(search
        ? {
            OR: [
              { razonSocial: { contains: search, mode: 'insensitive' } },
              { nombreFantasia: { contains: search, mode: 'insensitive' } },
              { numeroDocumento: { contains: search } },
            ],
          }
        : {}),
    };
    return this.prisma.tercero.findMany({
      where,
      include: { cuentaCorriente: true },
      orderBy: { razonSocial: 'asc' },
    });
  }

  async findOne(id: string) {
    const tercero = await this.prisma.tercero.findUnique({
      where: { id },
      include: { contactos: true, cuentaCorriente: true, condicionPago: true },
    });
    if (!tercero) throw new NotFoundException(`Tercero ${id} no encontrado`);
    return tercero;
  }

  async update(id: string, dto: UpdateTerceroDto) {
    await this.findOne(id);
    return this.prisma.tercero.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tercero.delete({ where: { id } });
  }

  // Busqueda de RUC contra ruc.sun.com.py -- NO es un servicio oficial de la
  // DNIT (que exige apiKey de Marangatu), es un tercero que indexa datos
  // publicos de la DNIT. Se usa server-side (nunca desde el navegador) para
  // no exponer la dependencia externa ni pelear con CORS, y con timeout
  // corto para que una caida de ese servicio no trabe el alta de terceros.
  async buscarEnDnit(query: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`https://ruc.sun.com.py/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`ruc.sun.com.py respondio ${res.status}`);
      const data = (await res.json()) as { results: ResultadoBusquedaRuc[] };
      return data.results.slice(0, 15).map((r) => ({
        ruc: r.ruc,
        dv: r.dv,
        razonSocial: r.name,
        activo: r.active,
        estado: r.state,
      }));
    } catch {
      throw new BadGatewayException('No se pudo consultar el RUC en este momento. Probá de nuevo en un rato.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
