import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AfectacionIVA, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

// Mismas etiquetas en espanol que usa el frontend (ProductosPage.AFECTACION_LABEL)
// -- la plantilla y el parser hablan el mismo idioma que la pantalla.
const AFECTACION_LABEL: Record<AfectacionIVA, string> = {
  GRAVADO: 'Gravado',
  GRAVADO_PARCIAL: 'Grav. parcial',
  EXENTO: 'Exento',
  EXONERADO: 'Exonerado',
};
const LABEL_A_AFECTACION = new Map<string, AfectacionIVA>(
  Object.entries(AFECTACION_LABEL).map(([enumValue, label]) => [normalizar(label), enumValue as AfectacionIVA]),
);
// Tambien se acepta el nombre crudo del enum (por si alguien lo escribe asi).
for (const value of Object.keys(AFECTACION_LABEL) as AfectacionIVA[]) {
  LABEL_A_AFECTACION.set(normalizar(value), value);
}

const ENCABEZADOS = [
  { clave: 'codigo', texto: 'Código', requerido: true },
  { clave: 'descripcion', texto: 'Descripción', requerido: true },
  { clave: 'unidadMedida', texto: 'Unidad de medida', requerido: true },
  { clave: 'categoria', texto: 'Categoría', requerido: false },
  { clave: 'codigoBarra', texto: 'Código de barra', requerido: false },
  { clave: 'afectacionIva', texto: 'Afectación IVA', requerido: false },
  { clave: 'tasaIva', texto: 'Tasa IVA', requerido: false },
  { clave: 'precioCosto', texto: 'Precio costo', requerido: true },
  { clave: 'precioVenta', texto: 'Precio venta', requerido: true },
  { clave: 'controlaStock', texto: 'Controla stock', requerido: false },
  { clave: 'stockMinimo', texto: 'Stock mínimo', requerido: false },
  { clave: 'activo', texto: 'Activo', requerido: false },
] as const;

// Normaliza para comparar texto tipeado por el usuario: minusculas, sin
// tildes, sin lo que este entre parentesis (ej. "Tasa IVA (%)" -> "tasa iva").
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductoDto) {
    return this.prisma.producto.create({ data: dto });
  }

  findAll(params: { empresaId: string; categoriaId?: string; search?: string }) {
    const { empresaId, categoriaId, search } = params;
    const where: Prisma.ProductoWhereInput = {
      empresaId,
      ...(categoriaId ? { categoriaId } : {}),
      ...(search
        ? {
            OR: [
              { descripcion: { contains: search, mode: 'insensitive' } },
              { codigo: { contains: search, mode: 'insensitive' } },
              { codigoBarra: { contains: search } },
            ],
          }
        : {}),
    };
    return this.prisma.producto.findMany({
      where,
      include: { categoria: true, unidadMedida: true },
      orderBy: { descripcion: 'asc' },
    });
  }

  async findOne(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true, unidadMedida: true, stocks: { include: { deposito: true } } },
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);
    return producto;
  }

  async update(id: string, dto: UpdateProductoDto) {
    await this.findOne(id);
    return this.prisma.producto.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.producto.delete({ where: { id } });
  }

  // Plantilla descargable: encabezados + una fila de ejemplo + validacion de
  // datos (listas desplegables) para las columnas con catalogo cerrado.
  async generarPlantillaExcel(empresaId: string): Promise<Buffer> {
    const unidades = await this.prisma.unidadMedida.findMany({ orderBy: { descripcion: 'asc' } });
    const categorias = await this.prisma.categoriaProducto.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Productos');

    sheet.columns = ENCABEZADOS.map((h) => ({
      header: h.texto + (h.requerido ? ' *' : ''),
      key: h.clave,
      width: Math.max(h.texto.length + 4, 16),
    }));
    sheet.getRow(1).font = { bold: true };

    sheet.addRow({
      codigo: 'PROD001',
      descripcion: 'Ejemplo de producto',
      unidadMedida: unidades.find((u) => u.descripcion === 'Unidad')?.descripcion ?? unidades[0]?.descripcion ?? '',
      categoria: categorias[0]?.nombre ?? '',
      codigoBarra: '',
      afectacionIva: AFECTACION_LABEL.GRAVADO,
      tasaIva: 10,
      precioCosto: 10000,
      precioVenta: 15000,
      controlaStock: 'Sí',
      stockMinimo: 5,
      activo: 'Sí',
    });

    const columnaDe = (clave: string) => ENCABEZADOS.findIndex((h) => h.clave === clave) + 1;
    const unidadLista = unidades.map((u) => u.descripcion).join(',');
    const afectacionLista = Object.values(AFECTACION_LABEL).join(',');
    const colUnidad = columnaDe('unidadMedida');
    const colAfectacion = columnaDe('afectacionIva');
    const colControlaStock = columnaDe('controlaStock');
    const colActivo = columnaDe('activo');

    for (let fila = 2; fila <= 500; fila++) {
      sheet.getCell(fila, colUnidad).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`"${unidadLista}"`],
        showErrorMessage: true,
        errorTitle: 'Unidad inválida',
        error: 'Elegí una unidad de la lista.',
      };
      sheet.getCell(fila, colAfectacion).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${afectacionLista}"`],
      };
      sheet.getCell(fila, colControlaStock).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Sí,No"'],
      };
      sheet.getCell(fila, colActivo).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Sí,No"'] };
    }

    const ayuda = workbook.addWorksheet('Instrucciones');
    ayuda.getColumn(1).width = 95;
    ayuda.addRows([
      ['Completá la hoja "Productos", una fila por producto. No cambies los encabezados.'],
      ['Los campos con * son obligatorios.'],
      ['Código: tiene que ser único -- no puede repetirse con uno que ya tengas cargado ni dentro del archivo.'],
      ['Unidad de medida: elegí una opción de la lista desplegable (catálogo oficial SIFEN).'],
      ['Categoría: si escribís una que todavía no existe, se crea sola al importar.'],
      [`Afectación IVA: ${Object.values(AFECTACION_LABEL).join(' / ')}. Si lo dejás vacío, se usa Gravado.`],
      ['Tasa IVA: 0, 5 o 10. Si lo dejás vacío, se usa 10 (o 0 si la afectación es Exento/Exonerado).'],
      ['Controla stock / Activo: Sí o No. Si lo dejás vacío, se usa Sí.'],
    ]);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Importacion masiva: valida TODAS las filas primero -- si alguna tiene un
  // error no se crea nada, para que el usuario corrija el archivo y lo
  // vuelva a subir en vez de terminar con una carga a medias.
  async importarExcel(empresaId: string, buffer: Buffer): Promise<{ creados: number }> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException('El archivo no es un Excel (.xlsx) válido.');
    }
    const sheet = workbook.getWorksheet('Productos') ?? workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('El archivo no tiene ninguna hoja con datos.');

    // Mapea encabezado -> columna leyendo la fila 1, asi tolera que el
    // usuario reordene columnas (siempre que no cambie el texto).
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

    const unidades = await this.prisma.unidadMedida.findMany();
    const unidadPorNombre = new Map(unidades.map((u) => [normalizar(u.descripcion), u]));
    const unidadPorCodigo = new Map(unidades.map((u) => [u.codigoSifen, u]));

    const categoriasExistentes = await this.prisma.categoriaProducto.findMany({ where: { empresaId } });
    const categoriaIdPorNombre = new Map(categoriasExistentes.map((c) => [normalizar(c.nombre), c.id]));

    const productosExistentes = await this.prisma.producto.findMany({ where: { empresaId }, select: { codigo: true } });
    const codigosExistentes = new Set(productosExistentes.map((p) => normalizar(p.codigo)));

    const errores: { fila: number; mensaje: string }[] = [];
    const codigosEnArchivo = new Set<string>();
    type FilaLista = {
      empresaId: string;
      codigo: string;
      codigoBarra: string | null;
      descripcion: string;
      categoriaNombre: string | null;
      unidadMedidaId: string;
      afectacionIva: AfectacionIVA;
      tasaIva: number;
      precioCosto: number;
      precioVenta: number;
      controlaStock: boolean;
      stockMinimo: number | null;
      activo: boolean;
    };
    const filasListas: FilaLista[] = [];

    const get = (row: ExcelJS.Row, clave: string) => {
      const col = columnaPorClave.get(clave);
      return col ? row.getCell(col) : undefined;
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const cellCodigo = get(row, 'codigo');
      const codigo = cellCodigo ? celdaTexto(cellCodigo) : '';
      const cellDescripcion = get(row, 'descripcion');
      const descripcion = cellDescripcion ? celdaTexto(cellDescripcion) : '';
      // Fila completamente vacia (comun al final del archivo) -- se ignora
      // en silencio, no es un error del usuario.
      const filaVacia = !codigo && !descripcion && row.actualCellCount === 0;
      if (filaVacia) return;
      if (!codigo && !descripcion) return;

      const erroresFila: string[] = [];

      if (!codigo) erroresFila.push('Falta el código');
      if (!descripcion) erroresFila.push('Falta la descripción');

      const codigoNorm = normalizar(codigo);
      if (codigo) {
        if (codigosExistentes.has(codigoNorm)) erroresFila.push(`Ya existe un producto con el código "${codigo}"`);
        else if (codigosEnArchivo.has(codigoNorm)) erroresFila.push(`El código "${codigo}" está repetido en el archivo`);
        else codigosEnArchivo.add(codigoNorm);
      }

      const cellUnidad = get(row, 'unidadMedida');
      const unidadTexto = cellUnidad ? celdaTexto(cellUnidad) : '';
      const unidad = unidadPorNombre.get(normalizar(unidadTexto)) ?? unidadPorCodigo.get(unidadTexto);
      if (!unidadTexto) erroresFila.push('Falta la unidad de medida');
      else if (!unidad) erroresFila.push(`Unidad de medida "${unidadTexto}" no reconocida`);

      const cellAfectacion = get(row, 'afectacionIva');
      const afectacionTexto = cellAfectacion ? celdaTexto(cellAfectacion) : '';
      const afectacion = afectacionTexto ? LABEL_A_AFECTACION.get(normalizar(afectacionTexto)) : AfectacionIVA.GRAVADO;
      if (afectacionTexto && !afectacion) {
        erroresFila.push(`Afectación IVA "${afectacionTexto}" no reconocida (usá ${Object.values(AFECTACION_LABEL).join(' / ')})`);
      }

      const cellTasa = get(row, 'tasaIva');
      const tasaTexto = cellTasa ? celdaTexto(cellTasa) : '';
      const tasaIva = celdaNumero(cellTasa) ?? (afectacion === 'GRAVADO' || afectacion === 'GRAVADO_PARCIAL' ? 10 : 0);
      if (tasaTexto && ![0, 5, 10].includes(tasaIva)) erroresFila.push('Tasa IVA debe ser 0, 5 o 10');

      const cellCosto = get(row, 'precioCosto');
      const precioCosto = cellCosto ? celdaNumero(cellCosto) : null;
      if (precioCosto === null) erroresFila.push('Falta o es inválido el precio de costo');
      else if (precioCosto < 0) erroresFila.push('El precio de costo no puede ser negativo');

      const cellVenta = get(row, 'precioVenta');
      const precioVenta = cellVenta ? celdaNumero(cellVenta) : null;
      if (precioVenta === null) erroresFila.push('Falta o es inválido el precio de venta');
      else if (precioVenta < 0) erroresFila.push('El precio de venta no puede ser negativo');

      const cellStockMin = get(row, 'stockMinimo');
      const stockMinimo = cellStockMin ? celdaNumero(cellStockMin) : null;

      const cellCategoria = get(row, 'categoria');
      const categoriaNombre = cellCategoria ? celdaTexto(cellCategoria) : '';

      const controlaStock = celdaBooleana(get(row, 'controlaStock'), true);
      const activo = celdaBooleana(get(row, 'activo'), true);

      if (erroresFila.length > 0) {
        errores.push({ fila: rowNumber, mensaje: erroresFila.join('; ') });
        return;
      }

      filasListas.push({
        empresaId,
        codigo,
        codigoBarra: get(row, 'codigoBarra') ? celdaTexto(get(row, 'codigoBarra')!) || null : null,
        descripcion,
        categoriaNombre: categoriaNombre || null,
        unidadMedidaId: unidad!.id,
        afectacionIva: afectacion ?? AfectacionIVA.GRAVADO,
        tasaIva,
        precioCosto: precioCosto!,
        precioVenta: precioVenta!,
        controlaStock,
        stockMinimo,
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
        if (fila.categoriaNombre) {
          const key = normalizar(fila.categoriaNombre);
          if (!categoriaIdPorNombre.has(key)) {
            const nueva = await tx.categoriaProducto.create({ data: { empresaId, nombre: fila.categoriaNombre } });
            categoriaIdPorNombre.set(key, nueva.id);
          }
        }
      }
      await tx.producto.createMany({
        data: filasListas.map((f) => ({
          empresaId: f.empresaId,
          codigo: f.codigo,
          codigoBarra: f.codigoBarra,
          descripcion: f.descripcion,
          categoriaId: f.categoriaNombre ? categoriaIdPorNombre.get(normalizar(f.categoriaNombre)) : undefined,
          unidadMedidaId: f.unidadMedidaId,
          afectacionIva: f.afectacionIva,
          tasaIva: f.tasaIva,
          precioCosto: f.precioCosto,
          precioVenta: f.precioVenta,
          controlaStock: f.controlaStock,
          stockMinimo: f.stockMinimo,
          activo: f.activo,
        })),
      });
      return filasListas.length;
    });

    return { creados };
  }
}
