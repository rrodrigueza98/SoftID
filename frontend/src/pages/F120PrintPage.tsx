import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { formatDateTime } from '../lib/format';
import type { DeclaracionF120 } from '../lib/types';
import { PageSpinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

// Los importes del formulario oficial van sin céntimos y sin símbolo de
// moneda ("LOS IMPORTES SE CONSIGNARÁN SIN CÉNTIMOS").
function n(value: number): string {
  const entero = Math.round(value);
  return entero === 0 ? '' : entero.toLocaleString('es-PY');
}

function Casilla({ numero, value }: { numero: number; value: number }) {
  return (
    <td className="f120-cell">
      <span className="f120-num">{numero}</span>
      <div className="f120-val">{n(value)}</div>
    </td>
  );
}

function Blocked() {
  return <td className="f120-cell f120-blocked" />;
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`f120-field ${className ?? ''}`}>
      <div className="f120-label">{label}</div>
      <div className="f120-value">{value || ' '}</div>
    </div>
  );
}

function Check({ checked }: { checked: boolean }) {
  return <span className="f120-check">{checked ? '✕' : ''}</span>;
}

export default function F120PrintPage() {
  const { id } = useParams<{ id: string }>();

  const { data: d, isLoading } = useQuery({
    queryKey: ['f120', id],
    queryFn: async () => (await api.get<DeclaracionF120>(`/f120/${id}`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (d) setTimeout(() => window.print(), 300);
  }, [d]);

  if (isLoading || !d) return <PageSpinner />;

  const { rubro1, rubro2, rubro3, rubro6 } = d.detalleJson;
  const [anio, mes] = d.periodoTributario.split('-');

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => window.close()}>
          Cerrar
        </Button>
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>

      <div className="f120-form">
        {/* ── Encabezado ── */}
        <div className="f120-box grid grid-cols-[120px_1fr]">
          <div className="flex flex-col items-center justify-center gap-1 border-r-2 p-2 text-center" style={{ borderColor: 'var(--f120-border)' }}>
            <div className="text-[9px] font-bold leading-tight">SET TRIBUTACIÓN</div>
            <div className="text-[8px] font-semibold leading-tight">IMPUESTO AL VALOR AGREGADO</div>
            <div className="text-[8px]">VERSIÓN 4</div>
            <div className="text-3xl font-bold">120</div>
          </div>
          <div>
            <div className="grid grid-cols-3 border-b" style={{ borderColor: 'var(--f120-border)' }}>
              <Field label="Número de orden" value={d.id.slice(-8).toUpperCase()} />
              <Field label="RUC" value={d.empresa?.ruc ?? ''} />
              <Field label="DV" value={d.empresa?.dvRuc ?? ''} />
            </div>
            <div className="grid grid-cols-1 border-b" style={{ borderColor: 'var(--f120-border)' }}>
              <Field label="Razón social" value={d.empresa?.razonSocial ?? ''} />
            </div>
            <div className="grid grid-cols-[1fr_auto]">
              <div className="f120-field flex flex-col gap-0.5 border-r-0">
                <div className="flex items-center gap-1">
                  <Check checked={d.tipoDeclaracion === 'ORIGINAL'} />
                  <span className="text-[9px]">01 Declaración Jurada Original</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check checked={d.tipoDeclaracion === 'RECTIFICATIVA'} />
                  <span className="text-[9px]">
                    02 Declaración Jurada Rectificativa
                    {d.tipoDeclaracion === 'RECTIFICATIVA' && ` — N° ${d.numeroOrdenRectificada}`}
                  </span>
                </div>
              </div>
              <div className="f120-field">
                <div className="f120-label">Período / Ejercicio Fiscal</div>
                <div className="flex gap-3 text-[11px] font-semibold">
                  <span>Mes: {mes}</span>
                  <span>Año: {anio}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="f120-bar">PARA CONTRIBUYENTES QUE REALICEN OPERACIONES GRAVADAS Y EXONERADAS</div>
        <div className="f120-tabs">
          <div className="f120-tab f120-tab-activa">Declaración</div>
        </div>

        {/* ── Rubro 1 ── */}
        <div className="f120-section-title">RUBRO 1 — ENAJENACIÓN DE BIENES Y/O PRESTACIÓN DE SERVICIOS DEL PERÍODO</div>
        <table className="f120-table">
          <thead>
            <tr>
              <th rowSpan={2}>Inc.</th>
              <th rowSpan={2}>Concepto</th>
              <th rowSpan={2}>
                Monto imponible
                <br />
                -I-
              </th>
              <th colSpan={2}>IVA débito</th>
            </tr>
            <tr>
              <th>Al 5% -II-</th>
              <th>Al 10% -III-</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="f120-inc">a</td>
              <td className="f120-desc">Enajenación de bienes y/o prestación de servicios gravados con tasa del 10%</td>
              <Casilla numero={10} value={rubro1.a.monto} />
              <Blocked />
              <Casilla numero={22} value={rubro1.a.iva} />
            </tr>
            <tr>
              <td className="f120-inc">b</td>
              <td className="f120-desc">
                Enajenación de productos agrícolas en estado natural y sus derivados del primer proceso de elaboración o
                industrialización gravados con tasa del 5%
              </td>
              <Casilla numero={150} value={rubro1.b.monto} />
              <Casilla numero={156} value={rubro1.b.iva} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">c</td>
              <td className="f120-desc">Enajenación de otros bienes y/o prestación de servicios gravados con tasa del 5%</td>
              <Casilla numero={151} value={rubro1.c.monto} />
              <Casilla numero={157} value={rubro1.c.iva} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">d</td>
              <td className="f120-desc">Enajenación de bienes, prestación de servicios o ingresos exonerados o no alcanzados por el Impuesto</td>
              <Casilla numero={12} value={rubro1.d.monto} />
              <Blocked />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">h</td>
              <td className="f120-desc">
                Ajustes de precios, devoluciones realizadas, descuentos obtenidos y recupero de Impuestos por operaciones incobrables,
                declaradas a la tasa del 10%
              </td>
              <Casilla numero={15} value={rubro1.h.monto} />
              <Blocked />
              <Casilla numero={23} value={rubro1.h.iva} />
            </tr>
            <tr>
              <td className="f120-inc">i</td>
              <td className="f120-desc">
                Ajustes por operaciones incobrables declaradas a la tasa del 5% — productos agrícolas en estado natural
              </td>
              <Casilla numero={154} value={rubro1.i.monto} />
              <Casilla numero={158} value={rubro1.i.iva} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">j</td>
              <td className="f120-desc">Ajustes por operaciones incobrables declaradas a la tasa del 5% — otros bienes y servicios</td>
              <Casilla numero={155} value={rubro1.j.monto} />
              <Casilla numero={159} value={rubro1.j.iva} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">k</td>
              <td className="f120-desc">Ajustes por operaciones incobrables, exonerados o no alcanzados por el Impuesto</td>
              <Casilla numero={17} value={rubro1.k.monto} />
              <Blocked />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">l</td>
              <td className="f120-desc f120-strong">TOTAL (Col. I: a+b+c+d+h+i+j+k; Col. II: b+c+i+j; Col. III: a+h)</td>
              <Casilla numero={18} value={rubro1.totalMontoColI} />
              <Casilla numero={21} value={rubro1.totalIvaDebito5} />
              <Casilla numero={24} value={rubro1.totalIvaDebito10} />
            </tr>
          </tbody>
        </table>

        {/* ── Rubro 2 ── */}
        <div className="f120-section-title">
          RUBRO 2 — ENAJENACIÓN DE BIENES Y/O PRESTACIÓN DE SERVICIOS DE LOS ÚLTIMOS SEIS (6) MESES
        </div>
        <table className="f120-table">
          <thead>
            <tr>
              <th>Inc.</th>
              <th>Concepto</th>
              <th>Monto acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="f120-inc">a</td>
              <td className="f120-desc">Enajenación gravada en el mercado interno (excepto agrícola en estado natural)</td>
              <Casilla numero={160} value={rubro2.a} />
            </tr>
            <tr>
              <td className="f120-inc">b</td>
              <td className="f120-desc">Enajenación de productos agrícolas en estado natural en el mercado interno</td>
              <Casilla numero={161} value={rubro2.b} />
            </tr>
            <tr>
              <td className="f120-inc">c</td>
              <td className="f120-desc">Enajenación exonerada o no alcanzada</td>
              <Casilla numero={26} value={rubro2.c} />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">d</td>
              <td className="f120-desc f120-strong">TOTAL DE OPERACIONES EN EL MERCADO INTERNO (a+b+c)</td>
              <Casilla numero={27} value={rubro2.d} />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">i</td>
              <td className="f120-desc f120-strong">TOTAL DE OPERACIONES ACUMULADAS</td>
              <Casilla numero={31} value={rubro2.i} />
            </tr>
          </tbody>
        </table>

        {/* ── Rubro 3 ── */}
        <div className="f120-section-title">RUBRO 3 — COMPRAS LOCALES E IMPORTACIONES DEL PERÍODO</div>
        <table className="f120-table">
          <thead>
            <tr>
              <th rowSpan={2}>Inc.</th>
              <th rowSpan={2}>Concepto</th>
              <th colSpan={2}>Monto imponible</th>
              <th rowSpan={2}>
                IVA crédito
                <br />
                -III-
              </th>
            </tr>
            <tr>
              <th>Al 5% -I-</th>
              <th>Al 10% -II-</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="f120-inc">a</td>
              <td className="f120-desc">IVA crédito atribuido directamente a operaciones gravadas en el mercado interno</td>
              <Casilla numero={32} value={rubro3.a.monto5} />
              <Casilla numero={35} value={rubro3.a.monto10} />
              <Casilla numero={38} value={rubro3.a.iva} />
            </tr>
            <tr>
              <td className="f120-inc">b</td>
              <td className="f120-desc">IVA crédito atribuido indistintamente a operaciones gravadas, exoneradas o no alcanzadas</td>
              <Casilla numero={33} value={rubro3.b.monto5} />
              <Casilla numero={36} value={rubro3.b.monto10} />
              <Casilla numero={39} value={rubro3.b.iva} />
            </tr>
            <tr>
              <td className="f120-inc">c</td>
              <td className="f120-desc">
                IVA crédito atribuido proporcionalmente a operaciones gravadas en el mercado interno — Rubro 3 Col. III b × (Rubro 2 a+b /
                d)
              </td>
              <Blocked />
              <Blocked />
              <Casilla numero={164} value={rubro3.c} />
            </tr>
            <tr>
              <td className="f120-inc">e</td>
              <td className="f120-desc">IVA crédito por ajustes de precios, devoluciones y descuentos otorgados sobre compras ya declaradas</td>
              <Casilla numero={34} value={rubro3.e.monto5} />
              <Casilla numero={37} value={rubro3.e.monto10} />
              <Casilla numero={42} value={rubro3.e.iva} />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">f</td>
              <td className="f120-desc f120-strong">TOTAL DE IVA CRÉDITO PARA OPERACIONES EN EL MERCADO INTERNO (a+c+e)</td>
              <Blocked />
              <Blocked />
              <Casilla numero={43} value={rubro3.f} />
            </tr>
          </tbody>
        </table>

        {/* ── Rubro 4 ── */}
        <div className="f120-section-title">RUBRO 4 — DETERMINACIÓN DEL IMPUESTO O DEL SALDO TÉCNICO</div>
        <table className="f120-table">
          <thead>
            <tr>
              <th style={{ width: 20 }}></th>
              <th>Concepto</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="f120-inc">a</td>
              <td className="f120-desc">IVA débito (Rubro 1, Col. II y III: Inc. l)</td>
              <Casilla numero={44} value={Number(d.ivaDebito)} />
            </tr>
            <tr>
              <td className="f120-inc">b</td>
              <td className="f120-desc">IVA crédito (Rubro 3, Inc. f)</td>
              <Casilla numero={45} value={Number(d.ivaCredito)} />
            </tr>
            <tr>
              <td className="f120-inc">c</td>
              <td className="f120-desc">Saldo a favor del contribuyente del período anterior</td>
              <Casilla numero={46} value={Number(d.saldoTecnicoFavorAnterior)} />
            </tr>
            <tr>
              <td className="f120-inc">d</td>
              <td className="f120-desc">SALDO A FAVOR DEL CONTRIBUYENTE, cuando Inc. a sea menor que Inc. b+c</td>
              <Casilla numero={166} value={Number(d.saldoTecnicoFavorContrib)} />
            </tr>
            <tr>
              <td className="f120-inc">e</td>
              <td className="f120-desc">Saldo a favor del contribuyente a remitir en beneficio del Fisco (Art. 91 de la Ley), voluntario</td>
              <Casilla numero={167} value={Number(d.saldoTecnicoRemitidoFisco)} />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">f</td>
              <td className="f120-desc f120-strong">SALDO A FAVOR DEL CONTRIBUYENTE a trasladar al siguiente período (Inc. d − Inc. e)</td>
              <Casilla numero={47} value={Number(d.saldoTecnicoFavorTrasladar)} />
            </tr>
            <tr>
              <td className="f120-inc">g</td>
              <td className="f120-desc">Saldo a favor del fisco, cuando Inc. a sea mayor que Inc. b+c</td>
              <Casilla numero={48} value={Number(d.saldoTecnicoFavorFisco)} />
            </tr>
            <tr>
              <td className="f120-inc">i</td>
              <td className="f120-desc">Deducción Art. 7°/8° Ley N° 4.962/2013 (discapacidad — no trasladable)</td>
              <Casilla numero={168} value={Number(d.deduccionDiscapacidad)} />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">j</td>
              <td className="f120-desc f120-strong">IMPUESTO DETERMINADO (Inc. g − Inc. i)</td>
              <Casilla numero={50} value={Number(d.impuestoDeterminado)} />
            </tr>
          </tbody>
        </table>

        {/* ── Rubro 5 ── */}
        <div className="f120-section-title">RUBRO 5 — IMPUESTO DETERMINADO Y/O SALDO FINANCIERO A FAVOR DEL CONTRIBUYENTE</div>
        <table className="f120-table">
          <thead>
            <tr>
              <th style={{ width: 20 }}></th>
              <th>Concepto</th>
              <th>Contribuyente -I-</th>
              <th>Fisco -II-</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="f120-inc">a</td>
              <td className="f120-desc">Impuesto determinado para operaciones gravadas (Rubro 4, Inc. j)</td>
              <Blocked />
              <Casilla numero={55} value={Number(d.impuestoDeterminado)} />
            </tr>
            <tr>
              <td className="f120-inc">b</td>
              <td className="f120-desc">Saldo a favor del contribuyente del período anterior</td>
              <Casilla numero={51} value={Number(d.saldoFinancieroFavorAnterior)} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">c</td>
              <td className="f120-desc">Retenciones computables por operaciones gravadas</td>
              <Casilla numero={52} value={Number(d.retencionesComputables)} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">d</td>
              <td className="f120-desc">Percepciones computables por operaciones gravadas</td>
              <Casilla numero={169} value={Number(d.percepcionesComputables)} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">e</td>
              <td className="f120-desc">Multa por presentar la Declaración Jurada con posterioridad al vencimiento</td>
              <Blocked />
              <Casilla numero={56} value={Number(d.multa)} />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">f</td>
              <td className="f120-desc f120-strong">SUBTOTALES (Col. I: b+c+d; Col. II: a+e)</td>
              <Casilla numero={53} value={Number(d.subtotalFavorContribuyente)} />
              <Casilla numero={57} value={Number(d.subtotalFavorFisco)} />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">g</td>
              <td className="f120-desc f120-strong">
                SALDO A FAVOR DEL CONTRIBUYENTE a trasladar al Inc. b del siguiente período (Col. I − Col. II, si I&gt;II). No trasladable
                al Rubro 4.
              </td>
              <Casilla numero={54} value={Number(d.saldoFinancieroFavorContrib)} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc f120-strong">h</td>
              <td className="f120-desc f120-strong">SALDO A PAGAR A FAVOR DEL FISCO (Col. II − Col. I, si II&gt;I)</td>
              <Blocked />
              <Casilla numero={58} value={Number(d.saldoAPagarFisco)} />
            </tr>
          </tbody>
        </table>

        {/* ── Rubro 6 ── */}
        <div className="f120-section-title">
          RUBRO 6 — INFORMACIÓN DE LAS COMPRAS DEL PERÍODO VINCULADAS A OPERACIONES EXONERADAS O NO ALCANZADAS
        </div>
        <table className="f120-table">
          <thead>
            <tr>
              <th style={{ width: 20 }}></th>
              <th>Concepto</th>
              <th>Monto -I-</th>
              <th>IVA -II-</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="f120-inc">a</td>
              <td className="f120-desc">Compras con IVA crédito del 10% relacionadas directamente a operaciones exoneradas o no alcanzadas</td>
              <Casilla numero={59} value={rubro6.a.monto} />
              <Casilla numero={65} value={rubro6.a.iva} />
            </tr>
            <tr>
              <td className="f120-inc">b</td>
              <td className="f120-desc">Compras con IVA crédito del 5% relacionadas directamente a operaciones exoneradas o no alcanzadas</td>
              <Casilla numero={60} value={rubro6.b.monto} />
              <Casilla numero={66} value={rubro6.b.iva} />
            </tr>
            <tr>
              <td className="f120-inc">c/d</td>
              <td className="f120-desc">Compras exentas relacionadas a operaciones exoneradas o no alcanzadas</td>
              <Casilla numero={61} value={rubro6.cd} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">f</td>
              <td className="f120-desc">IVA — costo o gasto deducible en el IRE o IRP</td>
              <Casilla numero={64} value={rubro6.f} />
              <Blocked />
            </tr>
            <tr>
              <td className="f120-inc">g</td>
              <td className="f120-desc">IVA — costo o gasto por remisión del saldo IVA crédito al fisco, no deducible en el IRE o IRP</td>
              <Casilla numero={170} value={rubro6.g} />
              <Blocked />
            </tr>
          </tbody>
        </table>

        {d.generadaEn && <p className="mt-3 text-[9px] text-ink-400">Generada el {formatDateTime(d.generadaEn)}</p>}
      </div>

      <p className="mt-6 text-center text-xs text-ink-400 print:hidden">
        Réplica visual del Formulario 120 — no sustituye la presentación oficial en Marangatú. Transcribí estos valores a cada casilla del
        formulario real. Las casillas del Anexo del Exportador no se muestran (fuera del alcance de este cálculo).
      </p>
    </div>
  );
}
