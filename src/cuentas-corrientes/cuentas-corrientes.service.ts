import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoDocumentoIdentidad, TipoMovimientoCuentaCorriente, TipoTercero } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovimientoCCDto } from './dto/create-movimiento-cc.dto';

type TxClient = Prisma.TransactionClient;

// Concepto fijo con el que se marca un saldo migrado desde otro sistema --
// sirve tanto para mostrarlo distinto en el Libro Mayor de la cuenta como
// para no dejar importar dos veces el saldo inicial del mismo tercero.
const CONCEPTO_SALDO_INICIAL = 'Saldo inicial (migración)';

const TIPO_DOC_LABEL: Record<TipoDocumentoIdentidad, string> = {
  RUC: 'RUC',
  CEDULA_PARAGUAYA: 'Cédula paraguaya',
  PASAPORTE: 'Pasaporte',
  CEDULA_EXTRANJERA: 'Cédula extranjera',
  CARNET_RESIDENCIA: 'Carnet de residencia',
  INNOMINADO: 'Consumidor final',
  TARJETA_DIPLOMATICA: 'Tarjeta diplomática',
  OTRO: 'Otro',
};

const ENCABEZADOS_SALDOS = [
  { clave: 'tipoDocumento', texto: 'Tipo de documento', requerido: false },
  { clave: 'numeroDocumento', texto: 'Número de documento', requerido: true },
  { clave: 'razonSocial', texto: 'Razón social', requerido: false },
  { clave: 'saldo', texto: 'Saldo inicial', requerido: true },
] as const;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\*/g, '')
    .trim()
    .toLowerCase();
}

function celdaTexto(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return '';
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in (v as object)) return String((v as { text: unknown }).text ?? '').trim();
  if (typeof v === 'object' && 'result' in (v as object)) return String((v as { result: unknown }).result ?? '').trim();
  return String(v).trim();
}

function celdaNumero(cell: ExcelJS.Cell | undefined): number | null {
  const texto = celdaTexto(cell);
  if (!texto) return null;
  const n = Number(texto.replace(/\./g, '').replace(',', '.')) || Number(texto);
  return Number.isFinite(n) ? n : null;
}

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

  // Plantilla pre-cargada con los clientes/proveedores que todavia no
  // recibieron un saldo inicial (para no listar de nuevo, importacion tras
  // importacion, a los que ya se migraron) -- el usuario solo tiene que
  // completar la columna "Saldo inicial".
  async generarPlantillaSaldosIniciales(empresaId: string, tipo: TipoTercero): Promise<Buffer> {
    const terceros = await this.prisma.tercero.findMany({
      where: { empresaId, tipo, activo: true },
      include: { cuentaCorriente: { include: { movimientos: { where: { concepto: CONCEPTO_SALDO_INICIAL } } } } },
      orderBy: { razonSocial: 'asc' },
    });
    const pendientes = terceros.filter((t) => (t.cuentaCorriente?.movimientos.length ?? 0) === 0);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Saldos iniciales');
    sheet.columns = ENCABEZADOS_SALDOS.map((h) => ({
      header: h.texto + (h.requerido ? ' *' : ''),
      key: h.clave,
      width: Math.max(h.texto.length + 4, 18),
    }));
    sheet.getRow(1).font = { bold: true };

    for (const t of pendientes) {
      sheet.addRow({
        tipoDocumento: TIPO_DOC_LABEL[t.tipoDocumento],
        numeroDocumento: t.numeroDocumento,
        razonSocial: t.razonSocial,
        saldo: '',
      });
    }

    const notaFila = pendientes.length + 3;
    sheet.getCell(notaFila, 1).value =
      tipo === 'CLIENTE'
        ? 'Saldo positivo = el cliente te debe. Saldo negativo = vos le debés (a favor del cliente). Dejá en blanco o en 0 los que no tengan saldo.'
        : 'Saldo positivo = le debés al proveedor. Saldo negativo = el proveedor te debe (a tu favor). Dejá en blanco o en 0 los que no tengan saldo.';
    sheet.getCell(notaFila, 1).font = { italic: true, size: 9 };
    sheet.mergeCells(notaFila, 1, notaFila, ENCABEZADOS_SALDOS.length);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importarSaldosIniciales(empresaId: string, tipo: TipoTercero, buffer: Buffer): Promise<{ creados: number }> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException('El archivo no es un Excel (.xlsx) válido.');
    }
    const sheet = workbook.getWorksheet('Saldos iniciales') ?? workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('El archivo no tiene ninguna hoja con datos.');

    const columnaPorClave = new Map<string, number>();
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const texto = normalizar(celdaTexto(cell));
      const match = ENCABEZADOS_SALDOS.find((h) => normalizar(h.texto) === texto);
      if (match) columnaPorClave.set(match.clave, colNumber);
    });
    const faltantes = ENCABEZADOS_SALDOS.filter((h) => h.requerido && !columnaPorClave.has(h.clave));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Al archivo le faltan columnas obligatorias: ${faltantes.map((h) => h.texto).join(', ')}. Descargá la plantilla de nuevo.`,
      );
    }

    const terceros = await this.prisma.tercero.findMany({
      where: { empresaId, tipo },
      include: { cuentaCorriente: { include: { movimientos: { where: { concepto: CONCEPTO_SALDO_INICIAL } } } } },
    });
    const terceroPorDocumento = new Map(terceros.map((t) => [normalizar(t.numeroDocumento), t]));

    const errores: { fila: number; mensaje: string }[] = [];
    type FilaLista = { cuentaCorrienteId: string; nombre: string; saldo: number };
    const filasListas: FilaLista[] = [];
    const documentosEnArchivo = new Set<string>();

    const get = (row: ExcelJS.Row, clave: string) => {
      const col = columnaPorClave.get(clave);
      return col ? row.getCell(col) : undefined;
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const cellDoc = get(row, 'numeroDocumento');
      const numeroDocumento = cellDoc ? celdaTexto(cellDoc) : '';
      if (!numeroDocumento && row.actualCellCount === 0) return;
      if (!numeroDocumento) return;

      const saldo = celdaNumero(get(row, 'saldo')) ?? 0;
      // Dejar el saldo en blanco/0 es la forma de decir "este no tenia
      // deuda" -- no es un error, simplemente no genera movimiento.
      if (saldo === 0) return;

      const erroresFila: string[] = [];
      const docNorm = normalizar(numeroDocumento);
      const tercero = terceroPorDocumento.get(docNorm);

      if (!tercero) {
        erroresFila.push(`No se encontró ${tipo === 'CLIENTE' ? 'un cliente' : 'un proveedor'} con ese documento`);
      } else if (!tercero.cuentaCorriente) {
        erroresFila.push('Este tercero no tiene cuenta corriente');
      } else if (tercero.cuentaCorriente.movimientos.length > 0) {
        erroresFila.push('Ya se cargó un saldo inicial para este tercero');
      } else if (documentosEnArchivo.has(docNorm)) {
        erroresFila.push('Este documento está repetido en el archivo');
      } else {
        documentosEnArchivo.add(docNorm);
      }

      if (erroresFila.length > 0) {
        errores.push({ fila: rowNumber, mensaje: erroresFila.join('; ') });
        return;
      }

      filasListas.push({ cuentaCorrienteId: tercero!.cuentaCorriente!.id, nombre: tercero!.razonSocial, saldo });
    });

    if (filasListas.length === 0 && errores.length === 0) {
      throw new BadRequestException('El archivo no tiene ningún saldo para importar.');
    }
    if (errores.length > 0) {
      throw new BadRequestException({
        message: `Hay ${errores.length} fila(s) con errores. Corregí el archivo y volvé a subirlo.`,
        errores,
      });
    }

    const creados = await this.prisma.$transaction(async (tx) => {
      for (const fila of filasListas) {
        await this.registrarMovimiento(
          {
            cuentaCorrienteId: fila.cuentaCorrienteId,
            tipo: fila.saldo > 0 ? TipoMovimientoCuentaCorriente.DEBITO : TipoMovimientoCuentaCorriente.CREDITO,
            monto: Math.abs(fila.saldo),
            concepto: CONCEPTO_SALDO_INICIAL,
          },
          tx,
        );
      }
      return filasListas.length;
    });

    return { creados };
  }
}
