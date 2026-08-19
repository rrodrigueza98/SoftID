// Calculo del Formulario 120 (IVA General, declaracion jurada mensual) --
// funciones puras, sin dependencia de Nest/Prisma, para poder testearlas de
// forma aislada. Replica la mecanica de los Rubros 1 a 6 del formulario
// oficial (SET, "Instructivo del Formulario N.120 IVA - Version 4"); los
// numeros de casilla citados en los comentarios son los de ese instructivo.
//
// Portado de un proyecto hermano (irp-iva) donde esta misma logica ya esta
// probada contra datos reales -- unico cambio real es que 'tipoComprobante'
// ahora recibe los valores del enum TipoDocumentoElectronico de SoftID en
// vez de los strings propios de aquel proyecto (ver esAjuste).
//
// Fuera de alcance a proposito: el Anexo del Exportador y la Hoja de
// Calculo completos (casillas 171-220), reservados por el propio
// instructivo exclusivamente a contribuyentes inscriptos en el Registro
// Especial de Exportadores del SET. Las casillas que dependen de ellos
// (165 del Rubro 3, 49 del Rubro 4) se aceptan como override manual en vez
// de recalcularse. Tampoco se distingue AGRICOLA_5 de OTROS_5 en Rubro 1 --
// SoftID no clasifica productos como "agropecuarios en estado natural" hoy,
// asi que toda venta gravada al 5% cae en OTROS_5 (inciso c). Si algun
// cliente vende productos agropecuarios sin procesar, esto se revisita.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type CategoriaVentaF120 =
  | 'GRAVADA_10'
  | 'AGRICOLA_5'
  | 'OTROS_5'
  | 'EXONERADA'
  | 'EXPORT_AGRICOLA'
  | 'EXPORT_FLETE'
  | 'EXPORT_OTROS';

export type AtribucionCreditoF120 = 'DIRECTA_GRAVADA' | 'INDISTINTA' | 'VINCULADA_EXONERADA';
export type TasaIvaCompra = 'GRAVADA_10' | 'GRAVADA_5' | 'EXENTA';
type IncisoRubro1 = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k';

export interface LineaVenta {
  categoriaF120: CategoriaVentaF120;
  montoGravado: number;
  anulado: boolean;
  tipoComprobante: string; // 'NOTA_CREDITO_ELECTRONICA' dispara el ruteo a inciso de ajuste (h/i/j/k)
}

export interface LineaCompra {
  tasaIva: TasaIvaCompra;
  montoGravado: number;
  anulado: boolean;
  atribucionCredito: AtribucionCreditoF120;
  tipoComprobante: string; // reservado para cuando Compras modele notas de credito recibidas
}

// Notas de credito recibidas/emitidas corrigen una operacion YA declarada
// -- el formulario las trata en un inciso separado (h/i/j/k en Rubro 1, e
// en Rubro 3), no en el inciso "normal" de su misma categoria/tasa.
export function esAjuste(tipoComprobante: string): boolean {
  return tipoComprobante === 'NOTA_CREDITO_ELECTRONICA';
}

const INCISO_POR_CATEGORIA_VENTA: Record<CategoriaVentaF120, { normal: IncisoRubro1; ajuste: IncisoRubro1 | null }> = {
  GRAVADA_10: { normal: 'a', ajuste: 'h' },
  AGRICOLA_5: { normal: 'b', ajuste: 'i' },
  OTROS_5: { normal: 'c', ajuste: 'j' },
  EXONERADA: { normal: 'd', ajuste: 'k' },
  // El formulario no define un ajuste "h/i/j/k" para exportacion -- esas
  // notas de credito se tratan en el Anexo del Exportador (fuera de
  // alcance), asi que una exportacion siempre cae en su inciso normal e/f/g.
  EXPORT_AGRICOLA: { normal: 'e', ajuste: null },
  EXPORT_FLETE: { normal: 'f', ajuste: null },
  EXPORT_OTROS: { normal: 'g', ajuste: null },
};

export function clasificarVenta(categoriaF120: CategoriaVentaF120, tipoComprobante: string): IncisoRubro1 {
  const mapa = INCISO_POR_CATEGORIA_VENTA[categoriaF120];
  if (esAjuste(tipoComprobante) && mapa.ajuste) return mapa.ajuste;
  return mapa.normal;
}

// ─────────────────────────────────────────────────────────────────────────
// RUBRO 1 -- Enajenacion de bienes y/o prestacion de servicios del periodo
// ─────────────────────────────────────────────────────────────────────────

export interface Rubro1 {
  a: { monto: number; iva: number }; // casillas 10/22
  b: { monto: number; iva: number }; // casillas 150/156
  c: { monto: number; iva: number }; // casillas 151/157
  d: { monto: number }; // casilla 12
  e: { monto: number }; // casilla 152 -- solo exportador
  f: { monto: number }; // casilla 153 -- solo exportador
  g: { monto: number }; // casilla 14 -- solo exportador
  h: { monto: number; iva: number }; // casillas 15/23
  i: { monto: number; iva: number }; // casillas 154/158
  j: { monto: number; iva: number }; // casillas 155/159
  k: { monto: number }; // casilla 17
  totalMontoColI: number; // casilla 18
  totalIvaDebito5: number; // casilla 21
  totalIvaDebito10: number; // casilla 24
}

export function calcularRubro1(ventas: LineaVenta[]): Rubro1 {
  const activas = ventas.filter((v) => !v.anulado);
  const montoPorInciso = (inciso: IncisoRubro1) =>
    round2(activas.filter((v) => clasificarVenta(v.categoriaF120, v.tipoComprobante) === inciso).reduce((acc, v) => acc + v.montoGravado, 0));

  const a = montoPorInciso('a');
  const b = montoPorInciso('b');
  const c = montoPorInciso('c');
  const d = montoPorInciso('d');
  const e = montoPorInciso('e');
  const f = montoPorInciso('f');
  const g = montoPorInciso('g');
  const h = montoPorInciso('h');
  const i = montoPorInciso('i');
  const j = montoPorInciso('j');
  const k = montoPorInciso('k');

  const ivaA = round2(a * 0.1);
  const ivaB = round2(b * 0.05);
  const ivaC = round2(c * 0.05);
  const ivaH = round2(h * 0.1);
  const ivaI = round2(i * 0.05);
  const ivaJ = round2(j * 0.05);

  return {
    a: { monto: a, iva: ivaA },
    b: { monto: b, iva: ivaB },
    c: { monto: c, iva: ivaC },
    d: { monto: d },
    e: { monto: e },
    f: { monto: f },
    g: { monto: g },
    h: { monto: h, iva: ivaH },
    i: { monto: i, iva: ivaI },
    j: { monto: j, iva: ivaJ },
    k: { monto: k },
    totalMontoColI: round2(a + b + c + d + e + f + g + h + i + j + k),
    totalIvaDebito5: round2(ivaB + ivaC + ivaI + ivaJ), // "Col. II: b+c+i+j"
    totalIvaDebito10: round2(ivaA + ivaH), // "Col. III: a+h"
  };
}

// ─────────────────────────────────────────────────────────────────────────
// RUBRO 2 -- Ventas de los ultimos 6 meses (informativo, ventana movil)
// ─────────────────────────────────────────────────────────────────────────

export interface Rubro2 {
  a: number; // 160 -- mercado interno excepto agricola (GRAVADA_10 + OTROS_5)
  b: number; // 161 -- agricola en estado natural (AGRICOLA_5)
  c: number; // 26  -- exonerada/no alcanzada
  d: number; // 27  -- total mercado interno
  e: number; // 162 -- export agricola
  f: number; // 163 -- flete export
  g: number; // 29  -- export otros
  h: number; // 30  -- total exportacion
  i: number; // 31  -- total acumulado
}

// ventasVentana: TODAS las ventas activas de los ultimos 6 periodos
// tributarios (incluido el declarado). El ajuste (nota de credito) no
// cambia de "bolsillo" para este rubro -- solo importa la categoria.
//
// overrides: para una empresa que recien migra a SoftID, la ventana de 6
// meses todavia no tiene 6 periodos reales cargados -- mientras tanto se
// puede pisar a/b/c con lo que salia del sistema anterior para ese periodo
// puntual (ver GenerarF120Dto).
export function calcularRubro2(
  ventasVentana: LineaVenta[],
  overrides?: { mercadoInterno?: number; agricola?: number; exonerada?: number },
): Rubro2 {
  const activas = ventasVentana.filter((v) => !v.anulado);
  const sumaCategorias = (cats: CategoriaVentaF120[]) =>
    round2(activas.filter((v) => cats.includes(v.categoriaF120)).reduce((acc, v) => acc + v.montoGravado, 0));

  const a = overrides?.mercadoInterno ?? sumaCategorias(['GRAVADA_10', 'OTROS_5']);
  const b = overrides?.agricola ?? sumaCategorias(['AGRICOLA_5']);
  const c = overrides?.exonerada ?? sumaCategorias(['EXONERADA']);
  const d = round2(a + b + c);
  const e = sumaCategorias(['EXPORT_AGRICOLA']);
  const f = sumaCategorias(['EXPORT_FLETE']);
  const g = sumaCategorias(['EXPORT_OTROS']);
  const h = round2(e + f + g);
  const i = round2(d + h);
  return { a, b, c, d, e, f, g, h, i };
}

// ─────────────────────────────────────────────────────────────────────────
// RUBRO 3 -- Compras locales e importaciones del periodo (credito fiscal)
// ─────────────────────────────────────────────────────────────────────────

export interface Rubro3 {
  a: { monto5: number; monto10: number; iva: number }; // 32/35/38 -- directa
  b: { monto5: number; monto10: number; iva: number }; // 33/36/39 -- indistinta (bruto, antes de prorratear)
  c: number; // 164 -- porcion prorrateada de b atribuible a gravadas mercado interno
  d: number; // 165 -- porcion prorrateada con exportacion (override manual, solo exportador)
  e: { monto5: number; monto10: number; iva: number }; // 34/37/42 -- ajustes
  f: number; // 43 -- total credito fiscal
}

export function calcularRubro3(compras: LineaCompra[], rubro2: Rubro2, creditoExportacionCasilla165 = 0): Rubro3 {
  const activas = compras.filter((c) => !c.anulado);
  const normales = activas.filter((c) => !esAjuste(c.tipoComprobante));
  const ajustes = activas.filter((c) => esAjuste(c.tipoComprobante));

  const montoPorAtribucionTasa = (lineas: LineaCompra[], atribucion: AtribucionCreditoF120, tasa: TasaIvaCompra) =>
    round2(lineas.filter((c) => c.atribucionCredito === atribucion && c.tasaIva === tasa).reduce((acc, c) => acc + c.montoGravado, 0));

  const directaM5 = montoPorAtribucionTasa(normales, 'DIRECTA_GRAVADA', 'GRAVADA_5');
  const directaM10 = montoPorAtribucionTasa(normales, 'DIRECTA_GRAVADA', 'GRAVADA_10');
  const directaIva = round2(directaM5 * 0.05 + directaM10 * 0.1);

  const indistintaM5 = montoPorAtribucionTasa(normales, 'INDISTINTA', 'GRAVADA_5');
  const indistintaM10 = montoPorAtribucionTasa(normales, 'INDISTINTA', 'GRAVADA_10');
  const indistintaIva = round2(indistintaM5 * 0.05 + indistintaM10 * 0.1);

  // Formula textual del formulario: "Rubro 3, Col. III: Inc. b x (Rubro 2
  // Inc. a+b / Inc. d)" -- que proporcion de la actividad en el mercado
  // interno es gravada, aplicada al credito de uso indistinto.
  const prorrata = rubro2.d > 0 ? (rubro2.a + rubro2.b) / rubro2.d : 0;
  const casilla164 = round2(indistintaIva * prorrata);
  const casilla165 = round2(creditoExportacionCasilla165);

  const ajusteM5 = round2(ajustes.filter((c) => c.tasaIva === 'GRAVADA_5').reduce((acc, c) => acc + c.montoGravado, 0));
  const ajusteM10 = round2(ajustes.filter((c) => c.tasaIva === 'GRAVADA_10').reduce((acc, c) => acc + c.montoGravado, 0));
  const ajusteIva = round2(ajusteM5 * 0.05 + ajusteM10 * 0.1);

  return {
    a: { monto5: directaM5, monto10: directaM10, iva: directaIva },
    b: { monto5: indistintaM5, monto10: indistintaM10, iva: indistintaIva },
    c: casilla164,
    d: casilla165,
    e: { monto5: ajusteM5, monto10: ajusteM10, iva: ajusteIva },
    // "Col. III: Inc. a+c+d+e" -- OJO: b (indistinto bruto) NO entra
    // directo, solo su porcion prorrateada (c y d).
    f: round2(directaIva + casilla164 + casilla165 + ajusteIva),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// RUBRO 4 -- Determinacion del impuesto o del saldo tecnico
// ─────────────────────────────────────────────────────────────────────────

export interface Rubro4 {
  ivaDebito: number; // 44
  ivaCredito: number; // 45
  saldoTecnicoFavorAnterior: number; // 46 <- 47 del periodo anterior
  saldoTecnicoFavorContrib: number; // 166
  saldoTecnicoRemitidoFisco: number; // 167 -- voluntario, Art 91 in fine Ley 6380/2019
  saldoTecnicoFavorTrasladar: number; // 47 -> viaja al 46 del proximo periodo
  saldoTecnicoFavorFisco: number; // 48
  ivaCreditoExportacionUsado: number; // 49 -- override manual, solo exportador
  deduccionDiscapacidad: number; // 168 -- Art 7/8 Ley 4962/2013
  impuestoDeterminado: number; // 50
}

export function calcularRubro4(
  ivaDebito: number,
  ivaCredito: number,
  saldoTecnicoFavorAnterior: number,
  remisionVoluntariaFisco: number,
  ivaCreditoExportacionUsado: number,
  deduccionDiscapacidad: number,
): Rubro4 {
  const creditoTotal = round2(ivaCredito + saldoTecnicoFavorAnterior);
  const saldoTecnicoFavorContrib = creditoTotal > ivaDebito ? round2(creditoTotal - ivaDebito) : 0;
  // El contribuyente puede remitir voluntariamente hasta el total del saldo a favor.
  const saldoTecnicoRemitidoFisco = round2(Math.min(Math.max(remisionVoluntariaFisco, 0), saldoTecnicoFavorContrib));
  const saldoTecnicoFavorTrasladar = round2(saldoTecnicoFavorContrib - saldoTecnicoRemitidoFisco);
  const saldoTecnicoFavorFisco = ivaDebito > creditoTotal ? round2(ivaDebito - creditoTotal) : 0;
  const impuestoDeterminado = round2(Math.max(0, saldoTecnicoFavorFisco - ivaCreditoExportacionUsado - deduccionDiscapacidad));

  return {
    ivaDebito: round2(ivaDebito),
    ivaCredito: round2(ivaCredito),
    saldoTecnicoFavorAnterior: round2(saldoTecnicoFavorAnterior),
    saldoTecnicoFavorContrib,
    saldoTecnicoRemitidoFisco,
    saldoTecnicoFavorTrasladar,
    saldoTecnicoFavorFisco,
    ivaCreditoExportacionUsado: round2(ivaCreditoExportacionUsado),
    deduccionDiscapacidad: round2(deduccionDiscapacidad),
    impuestoDeterminado,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// RUBRO 5 -- Impuesto determinado y/o saldo financiero a favor del contribuyente
// ─────────────────────────────────────────────────────────────────────────

export interface Rubro5 {
  impuestoDeterminado: number; // 55 <- 50 del Rubro 4
  saldoFinancieroFavorAnterior: number; // 51 <- 54 del periodo anterior ("no trasladable al Rubro 4")
  retencionesComputables: number; // 52
  percepcionesComputables: number; // 169
  multa: number; // 56
  subtotalFavorContribuyente: number; // 53
  subtotalFavorFisco: number; // 57
  saldoFinancieroFavorContrib: number; // 54 -> viaja al 51 del proximo periodo
  saldoAPagarFisco: number; // 58 -- resultado final de la declaracion
}

export function calcularRubro5(
  impuestoDeterminado: number,
  saldoFinancieroFavorAnterior: number,
  retencionesComputables: number,
  percepcionesComputables: number,
  multa: number,
): Rubro5 {
  const subtotalFavorContribuyente = round2(saldoFinancieroFavorAnterior + retencionesComputables + percepcionesComputables);
  const subtotalFavorFisco = round2(impuestoDeterminado + multa);
  const saldoFinancieroFavorContrib =
    subtotalFavorContribuyente > subtotalFavorFisco ? round2(subtotalFavorContribuyente - subtotalFavorFisco) : 0;
  const saldoAPagarFisco = subtotalFavorFisco > subtotalFavorContribuyente ? round2(subtotalFavorFisco - subtotalFavorContribuyente) : 0;

  return {
    impuestoDeterminado: round2(impuestoDeterminado),
    saldoFinancieroFavorAnterior: round2(saldoFinancieroFavorAnterior),
    retencionesComputables: round2(retencionesComputables),
    percepcionesComputables: round2(percepcionesComputables),
    multa: round2(multa),
    subtotalFavorContribuyente,
    subtotalFavorFisco,
    saldoFinancieroFavorContrib,
    saldoAPagarFisco,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// RUBRO 6 -- Informacion de compras vinculadas a exoneradas (informativo)
// ─────────────────────────────────────────────────────────────────────────

export interface Rubro6 {
  a: { monto: number; iva: number }; // 59/65 -- compras 10% vinculadas directamente a exoneradas
  b: { monto: number; iva: number }; // 60/66 -- compras 5% vinculadas directamente a exoneradas
  // El formulario distingue casilla 61 (incluye exportacion) de 62 (no la
  // incluye) -- para un no-exportador son el mismo monto, se simplifica a
  // un unico campo.
  cd: number; // 61 = 62 -- compras exentas vinculadas a exoneradas
  f: number; // 64 -- IVA costo/gasto (deducible en IRE/IRP)
  g: number; // 170 -- IVA remitido al fisco (Rubro 4.167), costo no deducible
}

export function calcularRubro6(compras: LineaCompra[], rubro3IndistintaIva: number, rubro3Casilla164: number, montoRemitidoFisco: number): Rubro6 {
  const vinculadas = compras.filter((c) => !c.anulado && c.atribucionCredito === 'VINCULADA_EXONERADA');
  const m10 = round2(vinculadas.filter((c) => c.tasaIva === 'GRAVADA_10').reduce((acc, c) => acc + c.montoGravado, 0));
  const iva10 = round2(m10 * 0.1);
  const m5 = round2(vinculadas.filter((c) => c.tasaIva === 'GRAVADA_5').reduce((acc, c) => acc + c.montoGravado, 0));
  const iva5 = round2(m5 * 0.05);
  const exenta = round2(vinculadas.filter((c) => c.tasaIva === 'EXENTA').reduce((acc, c) => acc + c.montoGravado, 0));

  return {
    a: { monto: m10, iva: iva10 },
    b: { monto: m5, iva: iva5 },
    cd: exenta,
    f: round2(iva10 + iva5 + (rubro3IndistintaIva - rubro3Casilla164)),
    g: round2(montoRemitidoFisco),
  };
}

// "YYYY-MM" -> "YYYY-MM" del mes anterior, cruzando el limite de anio.
export function periodoAnterior(periodoTributario: string): string {
  const [anio, mes] = periodoTributario.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1 - 1, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Los 6 periodos que terminan en periodoTributario (incluido), mas viejo primero.
export function ultimos6Periodos(periodoTributario: string): string[] {
  const periodos: string[] = [periodoTributario];
  for (let i = 0; i < 5; i++) periodos.push(periodoAnterior(periodos[periodos.length - 1]));
  return periodos.reverse();
}
