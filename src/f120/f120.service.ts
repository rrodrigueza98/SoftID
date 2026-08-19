import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoDocumentoElectronico, EstadoComprobante } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calcularRubro1,
  calcularRubro2,
  calcularRubro3,
  calcularRubro4,
  calcularRubro5,
  calcularRubro6,
  periodoAnterior,
  ultimos6Periodos,
  type CategoriaVentaF120,
  type LineaCompra,
  type LineaVenta,
  type TasaIvaCompra,
} from './f120.util';
import { GenerarF120Dto } from './dto/generar-f120.dto';

// Tipos de documento que representan una venta con IVA debito -- Nota de
// Remision (solo mueve mercaderia, no factura) y Comprobante de Retencion
// no participan del Rubro 1.
const TIPOS_VENTA_F120: TipoDocumentoElectronico[] = [
  TipoDocumentoElectronico.FACTURA_ELECTRONICA,
  TipoDocumentoElectronico.AUTOFACTURA_ELECTRONICA,
  TipoDocumentoElectronico.NOTA_CREDITO_ELECTRONICA,
  TipoDocumentoElectronico.NOTA_DEBITO_ELECTRONICA,
];

function rangoPeriodo(periodoTributario: string) {
  const [anio, mes] = periodoTributario.split('-').map(Number);
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1));
  return { desde, hasta };
}

// Un Comprobante trae hasta 3 subtotales (gravada10/gravada5/exenta) en un
// solo registro -- el F.120 necesita una "linea" por categoria, asi que se
// desdobla en hasta 3 LineaVenta. SoftID no distingue productos
// agropecuarios en estado natural, asi que todo lo gravado al 5% cae en
// OTROS_5 (ver nota en f120.util.ts).
function comprobanteALineasVenta(c: {
  subtotalGravada10: Prisma.Decimal;
  subtotalGravada5: Prisma.Decimal;
  subtotalExenta: Prisma.Decimal;
  estado: EstadoComprobante;
  tipoDocumento: TipoDocumentoElectronico;
}): LineaVenta[] {
  const lineas: LineaVenta[] = [];
  const anulado = c.estado === EstadoComprobante.ANULADO;
  const push = (categoriaF120: CategoriaVentaF120, monto: Prisma.Decimal) => {
    if (Number(monto) > 0) lineas.push({ categoriaF120, montoGravado: Number(monto), anulado, tipoComprobante: c.tipoDocumento });
  };
  push('GRAVADA_10', c.subtotalGravada10);
  push('OTROS_5', c.subtotalGravada5);
  push('EXONERADA', c.subtotalExenta);
  return lineas;
}

// Mismo desdoble que arriba pero para Compra (montoGravada10/5/Exenta a
// nivel cabecera, sin items). Nunca es un "ajuste" -- Compras todavia no
// modela notas de credito recibidas de un proveedor.
function compraALineasCompra(c: {
  montoGravada10: Prisma.Decimal;
  montoGravada5: Prisma.Decimal;
  montoExenta: Prisma.Decimal;
  estado: EstadoComprobante;
  atribucionCredito: LineaCompra['atribucionCredito'];
}): LineaCompra[] {
  const lineas: LineaCompra[] = [];
  const anulado = c.estado === EstadoComprobante.ANULADO;
  const push = (tasaIva: TasaIvaCompra, monto: Prisma.Decimal) => {
    if (Number(monto) > 0) {
      lineas.push({ tasaIva, montoGravado: Number(monto), anulado, atribucionCredito: c.atribucionCredito, tipoComprobante: 'COMPRA' });
    }
  };
  push('GRAVADA_10', c.montoGravada10);
  push('GRAVADA_5', c.montoGravada5);
  push('EXENTA', c.montoExenta);
  return lineas;
}

@Injectable()
export class F120Service {
  constructor(private readonly prisma: PrismaService) {}

  async generar(empresaId: string, usuarioId: string, dto: GenerarF120Dto) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException(`Empresa ${empresaId} no encontrada`);

    const { desde, hasta } = rangoPeriodo(dto.periodoTributario);
    const periodos6 = ultimos6Periodos(dto.periodoTributario);
    const { desde: desdeVentana } = rangoPeriodo(periodos6[0]);

    const [ventasPeriodo, ventasVentana, compras] = await Promise.all([
      this.prisma.comprobante.findMany({
        where: { empresaId, tipoDocumento: { in: TIPOS_VENTA_F120 }, fechaEmision: { gte: desde, lt: hasta } },
        select: { subtotalGravada10: true, subtotalGravada5: true, subtotalExenta: true, estado: true, tipoDocumento: true },
      }),
      this.prisma.comprobante.findMany({
        where: { empresaId, tipoDocumento: { in: TIPOS_VENTA_F120 }, fechaEmision: { gte: desdeVentana, lt: hasta } },
        select: { subtotalGravada10: true, subtotalGravada5: true, subtotalExenta: true, estado: true, tipoDocumento: true },
      }),
      this.prisma.compra.findMany({
        where: { empresaId, fechaEmision: { gte: desde, lt: hasta } },
        select: { montoGravada10: true, montoGravada5: true, montoExenta: true, estado: true, atribucionCredito: true },
      }),
    ]);

    const lineasVenta = ventasPeriodo.flatMap(comprobanteALineasVenta);
    const lineasVentaVentana = ventasVentana.flatMap(comprobanteALineasVenta);
    const lineasCompra = compras.flatMap(compraALineasCompra);

    const rubro1 = calcularRubro1(lineasVenta);
    const rubro2 = calcularRubro2(lineasVentaVentana, {
      mercadoInterno: dto.rubro2MercadoInternoOverride,
      agricola: dto.rubro2AgricolaOverride,
      exonerada: dto.rubro2ExoneradaOverride,
    });
    const rubro3 = calcularRubro3(lineasCompra, rubro2, 0); // casilla 165: fuera de alcance (Anexo Exportador)
    const rubro6 = calcularRubro6(lineasCompra, rubro3.b.iva, rubro3.c, dto.saldoTecnicoRemitidoFisco ?? 0);

    const [retencionesAgg, percepcionesAgg, anterior] = await Promise.all([
      this.prisma.retencionIva.aggregate({
        where: { empresaId, tipo: 'IVA', periodoTributario: dto.periodoTributario },
        _sum: { monto: true },
      }),
      this.prisma.retencionIva.aggregate({
        where: { empresaId, tipo: 'PERCEPCION_IVA', periodoTributario: dto.periodoTributario },
        _sum: { monto: true },
      }),
      this.prisma.declaracionF120.findUnique({
        where: { empresaId_periodoTributario: { empresaId, periodoTributario: periodoAnterior(dto.periodoTributario) } },
      }),
    ]);

    // Dos cadenas de arrastre INDEPENDIENTES entre si (ver f120.util.ts): el
    // saldo tecnico (Rubro 4, 46<-47) y el saldo financiero (Rubro 5,
    // 51<-54). Si no hay declaracion previa EN EL SISTEMA pero este es el
    // periodo en que la empresa migro a SoftID, se usa el saldo inicial
    // cargado a mano (viene del sistema anterior).
    let saldoTecnicoFavorAnterior = 0;
    let saldoFinancieroFavorAnterior = 0;
    if (anterior && anterior.estado === 'GENERADA') {
      saldoTecnicoFavorAnterior = Number(anterior.saldoTecnicoFavorTrasladar);
      saldoFinancieroFavorAnterior = Number(anterior.saldoFinancieroFavorContrib);
    } else if (empresa.periodoInicialF120 === dto.periodoTributario) {
      saldoTecnicoFavorAnterior = Number(empresa.saldoTecnicoFavorInicialF120);
      saldoFinancieroFavorAnterior = Number(empresa.saldoFinancieroFavorInicialF120);
    }

    const rubro4 = calcularRubro4(
      rubro1.totalIvaDebito5 + rubro1.totalIvaDebito10,
      rubro3.f,
      saldoTecnicoFavorAnterior,
      dto.saldoTecnicoRemitidoFisco ?? 0,
      dto.ivaCreditoExportacionUsado ?? 0,
      dto.deduccionDiscapacidad ?? 0,
    );

    const retencionesComputables = Number(retencionesAgg._sum.monto ?? 0);
    const percepcionesComputables = Number(percepcionesAgg._sum.monto ?? 0);
    const rubro5 = calcularRubro5(
      rubro4.impuestoDeterminado,
      saldoFinancieroFavorAnterior,
      retencionesComputables,
      percepcionesComputables,
      dto.multa ?? 0,
    );

    const detalleJson = { rubro1, rubro2, rubro3, rubro6 } as unknown as Prisma.InputJsonValue;

    const data = {
      empresaId,
      periodoTributario: dto.periodoTributario,
      tipoDeclaracion: dto.tipoDeclaracion ?? 'ORIGINAL',
      numeroOrdenRectificada: dto.numeroOrdenRectificada,
      estado: 'GENERADA' as const,
      ivaDebito: rubro4.ivaDebito,
      ivaCredito: rubro4.ivaCredito,
      saldoTecnicoFavorAnterior: rubro4.saldoTecnicoFavorAnterior,
      saldoTecnicoFavorContrib: rubro4.saldoTecnicoFavorContrib,
      saldoTecnicoRemitidoFisco: rubro4.saldoTecnicoRemitidoFisco,
      saldoTecnicoFavorTrasladar: rubro4.saldoTecnicoFavorTrasladar,
      saldoTecnicoFavorFisco: rubro4.saldoTecnicoFavorFisco,
      ivaCreditoExportacionUsado: rubro4.ivaCreditoExportacionUsado,
      deduccionDiscapacidad: rubro4.deduccionDiscapacidad,
      impuestoDeterminado: rubro4.impuestoDeterminado,
      saldoFinancieroFavorAnterior: rubro5.saldoFinancieroFavorAnterior,
      retencionesComputables: rubro5.retencionesComputables,
      percepcionesComputables: rubro5.percepcionesComputables,
      multa: rubro5.multa,
      subtotalFavorContribuyente: rubro5.subtotalFavorContribuyente,
      subtotalFavorFisco: rubro5.subtotalFavorFisco,
      saldoFinancieroFavorContrib: rubro5.saldoFinancieroFavorContrib,
      saldoAPagarFisco: rubro5.saldoAPagarFisco,
      detalleJson,
      generadaEn: new Date(),
      generadaPorUsuarioId: usuarioId,
    };

    return this.prisma.declaracionF120.upsert({
      where: { empresaId_periodoTributario: { empresaId, periodoTributario: dto.periodoTributario } },
      create: data,
      update: data,
      include: { empresa: true },
    });
  }

  findAll(empresaId: string) {
    return this.prisma.declaracionF120.findMany({
      where: { empresaId },
      orderBy: { periodoTributario: 'desc' },
    });
  }

  async findOne(id: string) {
    const declaracion = await this.prisma.declaracionF120.findUnique({ where: { id }, include: { empresa: true } });
    if (!declaracion) throw new NotFoundException(`Declaración F.120 ${id} no encontrada`);
    return declaracion;
  }

  async anular(id: string) {
    const declaracion = await this.findOne(id);
    if (declaracion.estado === 'ANULADA') {
      throw new BadRequestException('Esta declaración ya está anulada');
    }
    return this.prisma.declaracionF120.update({ where: { id }, data: { estado: 'ANULADA' } });
  }
}
