import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoContribuyente, TipoDocumentoIdentidad, TipoTercero } from '@prisma/client';
import * as ExcelJS from 'exceljs';
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
const LABEL_A_TIPO_DOC = new Map<string, TipoDocumentoIdentidad>(
  Object.entries(TIPO_DOC_LABEL).map(([enumValue, label]) => [normalizar(label), enumValue as TipoDocumentoIdentidad]),
);
for (const value of Object.keys(TIPO_DOC_LABEL) as TipoDocumentoIdentidad[]) {
  LABEL_A_TIPO_DOC.set(normalizar(value), value);
}

const TIPO_CONTRIB_LABEL: Record<TipoContribuyente, string> = { FISICA: 'Física', JURIDICA: 'Jurídica' };
const LABEL_A_TIPO_CONTRIB = new Map<string, TipoContribuyente>(
  Object.entries(TIPO_CONTRIB_LABEL).map(([enumValue, label]) => [normalizar(label), enumValue as TipoContribuyente]),
);
for (const value of Object.keys(TIPO_CONTRIB_LABEL) as TipoContribuyente[]) {
  LABEL_A_TIPO_CONTRIB.set(normalizar(value), value);
}

const ENCABEZADOS = [
  { clave: 'tipoDocumento', texto: 'Tipo de documento', requerido: true },
  { clave: 'numeroDocumento', texto: 'Número de documento', requerido: true },
  { clave: 'dvRuc', texto: 'DV', requerido: false },
  { clave: 'razonSocial', texto: 'Razón social', requerido: true },
  { clave: 'nombreFantasia', texto: 'Nombre de fantasía', requerido: false },
  { clave: 'tipoContribuyente', texto: 'Tipo de contribuyente', requerido: false },
  { clave: 'direccion', texto: 'Dirección', requerido: false },
  { clave: 'ciudad', texto: 'Ciudad', requerido: false },
  { clave: 'departamento', texto: 'Departamento', requerido: false },
  { clave: 'telefono', texto: 'Teléfono', requerido: false },
  { clave: 'email', texto: 'Email', requerido: false },
  { clave: 'condicionPago', texto: 'Condición de pago', requerido: false },
  { clave: 'limiteCredito', texto: 'Límite de crédito', requerido: false },
  { clave: 'activo', texto: 'Activo', requerido: false },
] as const;

// Normaliza para comparar texto tipeado por el usuario: minusculas, sin
// tildes, sin lo que este entre parentesis.
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

function celdaBooleana(cell: ExcelJS.Cell | undefined, porDefecto: boolean): boolean {
  const texto = normalizar(celdaTexto(cell));
  if (!texto) return porDefecto;
  if (['si', 'sí', 'true', '1', 'x'].includes(texto)) return true;
  if (['no', 'false', '0'].includes(texto)) return false;
  return porDefecto;
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

  // Plantilla descargable: encabezados + una fila de ejemplo + validacion de
  // datos (listas desplegables) para las columnas con catalogo cerrado --
  // mismo criterio que ProductosService.generarPlantillaExcel.
  async generarPlantillaExcel(empresaId: string, tipo: TipoTercero): Promise<Buffer> {
    const condicionesPago = await this.prisma.condicionPago.findMany({ where: { empresaId }, orderBy: { nombre: 'asc' } });

    const workbook = new ExcelJS.Workbook();
    const hoja = tipo === 'CLIENTE' ? 'Clientes' : 'Proveedores';
    const sheet = workbook.addWorksheet(hoja);

    sheet.columns = ENCABEZADOS.map((h) => ({
      header: h.texto + (h.requerido ? ' *' : ''),
      key: h.clave,
      width: Math.max(h.texto.length + 4, 16),
    }));
    sheet.getRow(1).font = { bold: true };

    sheet.addRow({
      tipoDocumento: TIPO_DOC_LABEL.RUC,
      numeroDocumento: '80012345',
      dvRuc: '6',
      razonSocial: tipo === 'CLIENTE' ? 'Ejemplo Cliente SA' : 'Ejemplo Proveedor SA',
      nombreFantasia: '',
      tipoContribuyente: TIPO_CONTRIB_LABEL.JURIDICA,
      direccion: '',
      ciudad: '',
      departamento: '',
      telefono: '',
      email: '',
      condicionPago: condicionesPago[0]?.nombre ?? '',
      limiteCredito: '',
      activo: 'Sí',
    });

    const columnaDe = (clave: string) => ENCABEZADOS.findIndex((h) => h.clave === clave) + 1;
    const tipoDocLista = Object.values(TIPO_DOC_LABEL).join(',');
    const tipoContribLista = Object.values(TIPO_CONTRIB_LABEL).join(',');
    const condicionPagoLista = condicionesPago.map((c) => c.nombre).join(',');
    const colTipoDoc = columnaDe('tipoDocumento');
    const colTipoContrib = columnaDe('tipoContribuyente');
    const colCondicionPago = columnaDe('condicionPago');
    const colActivo = columnaDe('activo');

    for (let fila = 2; fila <= 500; fila++) {
      sheet.getCell(fila, colTipoDoc).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`"${tipoDocLista}"`],
        showErrorMessage: true,
        errorTitle: 'Tipo de documento inválido',
        error: 'Elegí un tipo de documento de la lista.',
      };
      sheet.getCell(fila, colTipoContrib).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${tipoContribLista}"`],
      };
      if (condicionPagoLista) {
        sheet.getCell(fila, colCondicionPago).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${condicionPagoLista}"`],
        };
      }
      sheet.getCell(fila, colActivo).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Sí,No"'] };
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importarExcel(empresaId: string, tipo: TipoTercero, buffer: Buffer): Promise<{ creados: number }> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException('El archivo no es un Excel (.xlsx) válido.');
    }
    const sheet = workbook.getWorksheet(tipo === 'CLIENTE' ? 'Clientes' : 'Proveedores') ?? workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('El archivo no tiene ninguna hoja con datos.');

    const columnaPorClave = new Map<string, number>();
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const texto = normalizar(celdaTexto(cell));
      const match = ENCABEZADOS.find((h) => normalizar(h.texto) === texto);
      if (match) columnaPorClave.set(match.clave, colNumber);
    });
    const faltantes = ENCABEZADOS.filter((h) => h.requerido && !columnaPorClave.has(h.clave));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Al archivo le faltan columnas obligatorias: ${faltantes.map((h) => h.texto).join(', ')}. Descargá la plantilla de nuevo.`,
      );
    }

    const condicionesPago = await this.prisma.condicionPago.findMany({ where: { empresaId } });
    const condicionPagoIdPorNombre = new Map(condicionesPago.map((c) => [normalizar(c.nombre), c.id]));

    const existentes = await this.prisma.tercero.findMany({
      where: { empresaId, tipo },
      select: { tipoDocumento: true, numeroDocumento: true },
    });
    const clavesExistentes = new Set(existentes.map((t) => `${t.tipoDocumento}|${normalizar(t.numeroDocumento)}`));

    const errores: { fila: number; mensaje: string }[] = [];
    const clavesEnArchivo = new Set<string>();
    type FilaLista = Omit<CreateTerceroDto, 'empresaId' | 'tipo'>;
    const filasListas: FilaLista[] = [];

    const get = (row: ExcelJS.Row, clave: string) => {
      const col = columnaPorClave.get(clave);
      return col ? row.getCell(col) : undefined;
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const cellDoc = get(row, 'numeroDocumento');
      const numeroDocumento = cellDoc ? celdaTexto(cellDoc) : '';
      const cellRazonSocial = get(row, 'razonSocial');
      const razonSocial = cellRazonSocial ? celdaTexto(cellRazonSocial) : '';
      const filaVacia = !numeroDocumento && !razonSocial && row.actualCellCount === 0;
      if (filaVacia) return;
      if (!numeroDocumento && !razonSocial) return;

      const erroresFila: string[] = [];

      if (!razonSocial) erroresFila.push('Falta la razón social');

      const cellTipoDoc = get(row, 'tipoDocumento');
      const tipoDocTexto = cellTipoDoc ? celdaTexto(cellTipoDoc) : '';
      const tipoDocumento = tipoDocTexto ? LABEL_A_TIPO_DOC.get(normalizar(tipoDocTexto)) : undefined;
      if (!tipoDocTexto) erroresFila.push('Falta el tipo de documento');
      else if (!tipoDocumento) erroresFila.push(`Tipo de documento "${tipoDocTexto}" no reconocido`);

      if (!numeroDocumento) {
        erroresFila.push('Falta el número de documento');
      } else if (tipoDocumento) {
        const clave = `${tipoDocumento}|${normalizar(numeroDocumento)}`;
        if (clavesExistentes.has(clave)) {
          erroresFila.push(`Ya existe un ${tipo === 'CLIENTE' ? 'cliente' : 'proveedor'} con ese documento`);
        } else if (clavesEnArchivo.has(clave)) {
          erroresFila.push('Este documento está repetido en el archivo');
        } else {
          clavesEnArchivo.add(clave);
        }
      }

      const cellTipoContrib = get(row, 'tipoContribuyente');
      const tipoContribTexto = cellTipoContrib ? celdaTexto(cellTipoContrib) : '';
      const tipoContribuyente = tipoContribTexto ? LABEL_A_TIPO_CONTRIB.get(normalizar(tipoContribTexto)) : undefined;
      if (tipoContribTexto && !tipoContribuyente) {
        erroresFila.push(`Tipo de contribuyente "${tipoContribTexto}" no reconocido`);
      }

      const cellCondicionPago = get(row, 'condicionPago');
      const condicionPagoTexto = cellCondicionPago ? celdaTexto(cellCondicionPago) : '';
      const condicionPagoId = condicionPagoTexto ? condicionPagoIdPorNombre.get(normalizar(condicionPagoTexto)) : undefined;
      if (condicionPagoTexto && !condicionPagoId) {
        erroresFila.push(`Condición de pago "${condicionPagoTexto}" no reconocida`);
      }

      const cellLimite = get(row, 'limiteCredito');
      const limiteCredito = cellLimite ? celdaNumero(cellLimite) : null;

      const activo = celdaBooleana(get(row, 'activo'), true);

      if (erroresFila.length > 0) {
        errores.push({ fila: rowNumber, mensaje: erroresFila.join('; ') });
        return;
      }

      filasListas.push({
        tipoDocumento: tipoDocumento!,
        numeroDocumento,
        dvRuc: get(row, 'dvRuc') ? celdaTexto(get(row, 'dvRuc')!) || undefined : undefined,
        razonSocial,
        nombreFantasia: get(row, 'nombreFantasia') ? celdaTexto(get(row, 'nombreFantasia')!) || undefined : undefined,
        tipoContribuyente,
        direccion: get(row, 'direccion') ? celdaTexto(get(row, 'direccion')!) || undefined : undefined,
        ciudad: get(row, 'ciudad') ? celdaTexto(get(row, 'ciudad')!) || undefined : undefined,
        departamento: get(row, 'departamento') ? celdaTexto(get(row, 'departamento')!) || undefined : undefined,
        telefono: get(row, 'telefono') ? celdaTexto(get(row, 'telefono')!) || undefined : undefined,
        email: get(row, 'email') ? celdaTexto(get(row, 'email')!) || undefined : undefined,
        condicionPagoId,
        limiteCredito: limiteCredito ?? undefined,
        activo,
      });
    });

    if (filasListas.length === 0 && errores.length === 0) {
      throw new BadRequestException('El archivo no tiene filas con datos para importar.');
    }
    if (errores.length > 0) {
      throw new BadRequestException({
        message: `Hay ${errores.length} fila(s) con errores. Corregí el archivo y volvé a subirlo.`,
        errores,
      });
    }

    const creados = await this.prisma.$transaction(async (tx) => {
      for (const fila of filasListas) {
        await tx.tercero.create({
          data: {
            empresaId,
            tipo,
            ...fila,
            cuentaCorriente: { create: { limiteCredito: fila.limiteCredito } },
          },
        });
      }
      return filasListas.length;
    });

    return { creados };
  }
}
