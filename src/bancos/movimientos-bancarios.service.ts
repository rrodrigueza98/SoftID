import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoMovimientoBancario } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovimientoBancarioDto } from './dto/create-movimiento-bancario.dto';

// Un movimiento del libro puede aparecer en el extracto varios dias
// despues (cheques que tardan en acreditarse, transferencias de fin de
// semana) -- se acepta como candidato de match si la fecha del extracto
// cae dentro de esta ventana alrededor de la fecha del libro.
const TOLERANCIA_DIAS_EXTRACTO = 5;

const ENCABEZADOS_EXTRACTO = [
  { clave: 'fecha', texto: 'Fecha', requerido: true },
  { clave: 'concepto', texto: 'Concepto', requerido: true },
  { clave: 'debito', texto: 'Débito', requerido: false },
  { clave: 'credito', texto: 'Crédito', requerido: false },
  { clave: 'referencia', texto: 'Referencia', requerido: false },
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
  if (v instanceof Date) return v.toISOString();
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

// Excel entrega una celda de fecha como Date nativo cuando la columna esta
// formateada como fecha; si el usuario tipeo texto a mano, se acepta
// dd/mm/aaaa o aaaa-mm-dd. Siempre se normaliza a medianoche UTC (mismo
// criterio que el resto del sistema para "fechas calendario").
function celdaFecha(cell: ExcelJS.Cell | undefined): Date | null {
  if (!cell) return null;
  const v = cell.value;
  if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  const texto = celdaTexto(cell);
  if (!texto) return null;
  const ddmmyyyy = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  const yyyymmdd = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  return null;
}

function diferenciaDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

interface LineaExtracto {
  fecha: string;
  concepto: string;
  tipo: TipoMovimientoBancario;
  monto: number;
  referencia?: string;
}

@Injectable()
export class MovimientosBancariosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMovimientoBancarioDto) {
    return this.prisma.movimientoBancario.create({
      data: {
        cuentaBancariaId: dto.cuentaBancariaId,
        fecha: new Date(dto.fecha),
        concepto: dto.concepto,
        tipo: dto.tipo,
        monto: dto.monto,
        referencia: dto.referencia,
      },
    });
  }

  findAll(
    cuentaBancariaId: string,
    filtros: { desde?: string; hasta?: string; conciliado?: boolean; tipo?: TipoMovimientoBancario } = {},
  ) {
    const where: Prisma.MovimientoBancarioWhereInput = {
      cuentaBancariaId,
      ...(filtros.desde || filtros.hasta
        ? { fecha: { ...(filtros.desde ? { gte: new Date(filtros.desde) } : {}), ...(filtros.hasta ? { lte: new Date(filtros.hasta) } : {}) } }
        : {}),
      ...(filtros.conciliado !== undefined ? { conciliado: filtros.conciliado } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    };
    return this.prisma.movimientoBancario.findMany({ where, orderBy: { fecha: 'desc' } });
  }

  async findOne(id: string) {
    const movimiento = await this.prisma.movimientoBancario.findUnique({ where: { id } });
    if (!movimiento) throw new NotFoundException(`Movimiento bancario ${id} no encontrado`);
    return movimiento;
  }

  async setConciliado(id: string, conciliado: boolean) {
    await this.findOne(id);
    return this.prisma.movimientoBancario.update({
      where: { id },
      data: { conciliado, fechaConciliacion: conciliado ? new Date() : null },
    });
  }

  // Un movimiento ya conciliado no se puede borrar sin mas -- dejaria el
  // historial de ConciliacionBancaria imposible de reconstruir (el saldo
  // segun libros que se guardo ahi ya no coincidiria con los movimientos
  // reales). Tampoco uno generado automaticamente desde un Recibo/Orden de
  // Pago -- borrarlo a mano dejaria ese cobro/pago sin su rastro bancario.
  async remove(id: string) {
    const movimiento = await this.findOne(id);
    if (movimiento.conciliado) {
      throw new BadRequestException('Este movimiento ya está conciliado -- desconcilialo primero si necesitás borrarlo');
    }
    if (movimiento.reciboId || movimiento.ordenPagoId) {
      throw new BadRequestException(
        'Este movimiento se generó automáticamente desde un recibo o una orden de pago -- no se puede borrar a mano',
      );
    }
    return this.prisma.movimientoBancario.delete({ where: { id } });
  }

  async generarPlantillaExtracto(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Extracto');

    sheet.columns = ENCABEZADOS_EXTRACTO.map((h) => ({
      header: h.texto + (h.requerido ? ' *' : ''),
      key: h.clave,
      width: Math.max(h.texto.length + 4, 16),
    }));
    sheet.getRow(1).font = { bold: true };

    sheet.addRow({ fecha: '01/08/2026', concepto: 'Transferencia recibida', debito: '', credito: 500000, referencia: '' });
    sheet.addRow({ fecha: '03/08/2026', concepto: 'Pago a proveedor', debito: 110000, credito: '', referencia: 'CHQ 0001' });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // No escribe nada en la base -- devuelve una vista previa de los matches
  // encontrados para que el usuario los confirme desde el dialogo de
  // conciliacion antes de tildar nada.
  async importarExtracto(
    cuentaBancariaId: string,
    buffer: Buffer,
  ): Promise<{
    matches: { movimiento: Awaited<ReturnType<typeof this.findOne>>; linea: LineaExtracto; diferenciaDias: number }[];
    sinCoincidencia: LineaExtracto[];
    errores: { fila: number; mensaje: string }[];
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('El archivo no tiene ninguna hoja.');

    const columnaPorClave = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const texto = normalizar(celdaTexto(cell));
      const match = ENCABEZADOS_EXTRACTO.find((h) => normalizar(h.texto) === texto);
      if (match) columnaPorClave.set(match.clave, colNumber);
    });
    const faltantes = ENCABEZADOS_EXTRACTO.filter((h) => h.requerido && !columnaPorClave.has(h.clave));
    if (faltantes.length > 0) {
      throw new BadRequestException(`Faltan columnas obligatorias: ${faltantes.map((h) => h.texto).join(', ')}`);
    }

    const get = (row: ExcelJS.Row, clave: string) => {
      const col = columnaPorClave.get(clave);
      return col ? row.getCell(col) : undefined;
    };

    const lineas: LineaExtracto[] = [];
    const errores: { fila: number; mensaje: string }[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const fechaTexto = get(row, 'fecha') ? celdaTexto(get(row, 'fecha')!) : '';
      const concepto = get(row, 'concepto') ? celdaTexto(get(row, 'concepto')!) : '';
      if (!fechaTexto && !concepto) return; // fila vacia, se ignora sin avisar

      const fecha = celdaFecha(get(row, 'fecha'));
      const debito = celdaNumero(get(row, 'debito')) ?? 0;
      const credito = celdaNumero(get(row, 'credito')) ?? 0;
      const referencia = get(row, 'referencia') ? celdaTexto(get(row, 'referencia')!) : '';

      if (!fecha) {
        errores.push({ fila: rowNumber, mensaje: 'Fecha inválida o vacía.' });
        return;
      }
      if (!concepto) {
        errores.push({ fila: rowNumber, mensaje: 'Concepto vacío.' });
        return;
      }
      if (debito > 0 && credito > 0) {
        errores.push({ fila: rowNumber, mensaje: 'No puede tener Débito y Crédito a la vez.' });
        return;
      }
      if (debito <= 0 && credito <= 0) {
        errores.push({ fila: rowNumber, mensaje: 'Debe cargar un monto en Débito o en Crédito.' });
        return;
      }

      lineas.push({
        fecha: fecha.toISOString(),
        concepto,
        tipo: debito > 0 ? 'DEBITO' : 'CREDITO',
        monto: debito > 0 ? debito : credito,
        referencia: referencia || undefined,
      });
    });

    if (errores.length > 0) {
      return { matches: [], sinCoincidencia: [], errores };
    }

    const pendientes = await this.prisma.movimientoBancario.findMany({
      where: { cuentaBancariaId, conciliado: false },
    });

    const usados = new Set<string>();
    const matches: { movimiento: (typeof pendientes)[number]; linea: LineaExtracto; diferenciaDias: number }[] = [];
    const sinCoincidencia: LineaExtracto[] = [];

    for (const linea of lineas) {
      const fechaLinea = new Date(linea.fecha);
      const candidatos = pendientes
        .filter(
          (m) =>
            !usados.has(m.id) &&
            m.tipo === linea.tipo &&
            Number(m.monto) === linea.monto &&
            Math.abs(diferenciaDias(m.fecha, fechaLinea)) <= TOLERANCIA_DIAS_EXTRACTO,
        )
        .sort((a, b) => Math.abs(diferenciaDias(a.fecha, fechaLinea)) - Math.abs(diferenciaDias(b.fecha, fechaLinea)));

      const elegido = candidatos[0];
      if (elegido) {
        usados.add(elegido.id);
        matches.push({ movimiento: elegido, linea, diferenciaDias: diferenciaDias(elegido.fecha, fechaLinea) });
      } else {
        sinCoincidencia.push(linea);
      }
    }

    return { matches, sinCoincidencia, errores: [] };
  }

  async confirmarConciliacionExtracto(ids: string[]) {
    const { count } = await this.prisma.movimientoBancario.updateMany({
      where: { id: { in: ids }, conciliado: false },
      data: { conciliado: true, fechaConciliacion: new Date() },
    });
    return { conciliados: count };
  }
}
