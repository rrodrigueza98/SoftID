import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CreateConciliacionDto } from './dto/create-conciliacion.dto';

@Injectable()
export class ConciliacionesBancariasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasBancariasService: CuentasBancariasService,
  ) {}

  async create(dto: CreateConciliacionDto) {
    const fechaCorte = new Date(dto.fechaCorte);
    const saldoLibros = await this.cuentasBancariasService.calcularSaldo(dto.cuentaBancariaId, fechaCorte);
    const diferencia = saldoLibros - dto.saldoExtracto;
    return this.prisma.conciliacionBancaria.create({
      data: {
        cuentaBancariaId: dto.cuentaBancariaId,
        fechaCorte,
        saldoLibros,
        saldoExtracto: dto.saldoExtracto,
        diferencia,
        observacion: dto.observacion,
      },
    });
  }

  findAll(cuentaBancariaId: string) {
    return this.prisma.conciliacionBancaria.findMany({
      where: { cuentaBancariaId },
      orderBy: { fechaCorte: 'desc' },
    });
  }
}
