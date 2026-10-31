"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CATEGORIAS,
  ES_EXTRA,
  ETIQUETAS_CATEGORIA,
  type ResultadoClasificacion,
} from "@/lib/recargos";

interface Props {
  cargar: (desde: string, hasta: string) => Promise<ResultadoClasificacion>;
  dependencias?: unknown[];
  titulo?: string;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function fmtFecha(f: string): string {
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

export default function ClasificacionHoras({
  cargar,
  dependencias = [],
  titulo = "Horas extra y recargos (ley colombiana)",
}: Props) {
  const hoy = new Date();
  const [desde, setDesde] = useState(iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)));
  const [hasta, setHasta] = useState(iso(hoy));
  const [resultado, setResultado] = useState<ResultadoClasificacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salario, setSalario] = useState("");

  const buscar = useCallback(
    async (d: string, h: string) => {
      setCargando(true);
      setError(null);
      try {
        setResultado(await cargar(d, h));
      } catch (e) {
        setResultado(null);
        setError(e instanceof Error ? e.message : "No se pudo consultar.");
      } finally {
        setCargando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencias
  );

  useEffect(() => {
    buscar(desde, hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  function atajo(tipo: "semana" | "mes" | "mesPasado") {
    const h = new Date();
    let d: Date;
    let f: Date = h;
    if (tipo === "semana") {
      const dow = (h.getDay() + 6) % 7;
      d = new Date(h.getFullYear(), h.getMonth(), h.getDate() - dow);
    } else if (tipo === "mes") {
      d = new Date(h.getFullYear(), h.getMonth(), 1);
    } else {
      d = new Date(h.getFullYear(), h.getMonth() - 1, 1);
      f = new Date(h.getFullYear(), h.getMonth(), 0);
    }
    setDesde(iso(d));
    setHasta(iso(f));
    buscar(iso(d), iso(f));
  }

  const valorHora = Number(salario.replace(/\D/g, "")) / 210;
  const hayPago = valorHora > 0 && resultado;
  const pagoTotal = hayPago ? resultado.totalHorasEquivalentes * valorHora : 0;

  return (
    <section className="bg-white rounded-2xl shadow-card p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-ink-900">{titulo}</h2>
        <p className="text-xs text-ink-500 mt-0.5">
          Busca por fechas y mira cómo se clasifica cada hora. Se cuentan como
          extra las horas después de{" "}
          {resultado ? resultado.limiteOrdinarioDia : 7.5} h netas por día
          (sin almuerzo).
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          buscar(desde, hasta);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="block">
          <span className="block text-xs font-medium text-ink-700 mb-1">Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-xl border border-ink-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink-700 mb-1">Hasta</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-xl border border-ink-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => atajo("semana")} className="rounded-lg border border-ink-300 px-2.5 py-1.5">
            Esta semana
          </button>
          <button type="button" onClick={() => atajo("mes")} className="rounded-lg border border-ink-300 px-2.5 py-1.5">
            Este mes
          </button>
          <button type="button" onClick={() => atajo("mesPasado")} className="rounded-lg border border-ink-300 px-2.5 py-1.5">
            Mes pasado
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {resultado && (
        <>
          {resultado.dias.length === 0 ? (
            <p className="text-sm text-ink-500">
              No hay jornadas completas entre {fmtFecha(resultado.desde)} y{" "}
              {fmtFecha(resultado.hasta)}.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-ink-100 p-3">
                  <p className="text-xs text-ink-500">Horas netas</p>
                  <p className="text-lg font-bold text-ink-900">{resultado.totalHorasNetas.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs text-ink-500">Total horas extra</p>
                  <p className="text-lg font-bold text-amber-700">{resultado.totalHorasExtra.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-ink-100 p-3 col-span-2 sm:col-span-1">
                  <p className="text-xs text-ink-500">Días con jornada</p>
                  <p className="text-lg font-bold text-ink-900">{resultado.dias.length}</p>
                </div>
              </div>

              {/* Totales por categoria */}
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="text-left text-xs text-ink-500 border-b border-ink-100">
                      <th className="py-2 px-2 font-medium">Clasificación</th>
                      <th className="py-2 px-2 font-medium text-right">Horas</th>
                      <th className="py-2 px-2 font-medium text-right">Pago adicional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIAS.map((c) => (
                      <tr key={c} className="border-b border-ink-100 last:border-0">
                        <td className="py-2 px-2">
                          {ETIQUETAS_CATEGORIA[c]}
                          {ES_EXTRA[c] && (
                            <span className="ml-2 text-[10px] font-semibold uppercase text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">
                              extra
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {resultado.totalHoras[c].toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-ink-500 tabular-nums">
                          {resultado.factores[c] === 0
                            ? "Incluida en salario"
                            : ES_EXTRA[c]
                            ? `${Math.round(resultado.factores[c] * 100)}% del valor hora`
                            : `+${Math.round(resultado.factores[c] * 100)}% recargo`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculadora */}
              <div className="rounded-xl border border-ink-100 p-4 space-y-2">
                <label className="block">
                  <span className="block text-xs font-medium text-ink-700 mb-1">
                    Salario mensual (opcional, para estimar el pago)
                  </span>
                  <input
                    inputMode="numeric"
                    placeholder="Ej: 1750905"
                    value={salario}
                    onChange={(e) => setSalario(e.target.value)}
                    className="w-full sm:w-64 rounded-xl border border-ink-300 px-3 py-2 text-sm"
                  />
                </label>
                {hayPago ? (
                  <p className="text-sm text-ink-700">
                    Valor hora ordinaria (salario ÷ 210):{" "}
                    <b>{cop.format(valorHora)}</b>
                    <br />
                    Pago adicional al salario por extras y recargos:{" "}
                    <b className="text-brand-700">{cop.format(pagoTotal)}</b>
                  </p>
                ) : (
                  <p className="text-xs text-ink-500">
                    Escribe el salario para ver el valor estimado. No se guarda.
                  </p>
                )}
              </div>

              {/* Detalle por dia */}
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[620px]">
                  <thead>
                    <tr className="text-left text-xs text-ink-500 border-b border-ink-100">
                      <th className="py-2 px-2 font-medium">Fecha</th>
                      <th className="py-2 px-2 font-medium">Turno</th>
                      <th className="py-2 px-2 font-medium text-right">Netas</th>
                      <th className="py-2 px-2 font-medium text-right">Extra</th>
                      <th className="py-2 px-2 font-medium">Cómo se clasifica</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.dias.map((d, i) => (
                      <tr key={d.fecha + i} className="border-b border-ink-100 last:border-0 align-top">
                        <td className="py-2 px-2 whitespace-nowrap">
                          {d.diaSemana.slice(0, 3)} {fmtFecha(d.fecha)}
                          {d.festivo && (
                            <div className="text-[11px] text-red-600">{d.festivo}</div>
                          )}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap text-ink-500">
                          {d.horaEntrada}–{d.horaSalida}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">{d.horasNetas.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right tabular-nums font-semibold text-amber-700">
                          {d.horasExtra.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-xs text-ink-700">
                          {CATEGORIAS.filter((c) => d.horas[c] > 0).map((c) => (
                            <div key={c}>
                              {d.horas[c].toFixed(2)} h · {ETIQUETAS_CATEGORIA[c]}
                            </div>
                          ))}
                          {d.excedeLimiteDiarioLegal && (
                            <div className="text-red-600 mt-0.5">
                              ⚠ Más de 2 h extra en el día (tope legal)
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {resultado.semanas.some((s) => s.excedeLimiteSemanalLegal) && (
                <p className="text-xs text-red-600">
                  ⚠ Hay semanas con más de 12 h extra (tope legal semanal):{" "}
                  {resultado.semanas
                    .filter((s) => s.excedeLimiteSemanalLegal)
                    .map((s) => `${fmtFecha(s.inicio)} (${s.horasExtra.toFixed(2)} h)`)
                    .join(", ")}
                </p>
              )}
            </>
          )}

          {resultado.registrosIncompletos > 0 && (
            <p className="text-xs text-ink-500">
              {resultado.registrosIncompletos} registro(s) sin salida no se
              clasificaron; el administrador debe completarlos.
            </p>
          )}

          <div className="rounded-xl bg-ink-100 p-4 text-xs text-ink-700 space-y-1">
            <p className="font-semibold">Reglas aplicadas</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Valor hora = salario mensual ÷ 210 (jornada de 42 h semanales desde el 15-jul-2026).</li>
              <li>Jornada nocturna: 7:00 p.m. a 6:00 a.m. (antes del 25-dic-2025 era 9:00 p.m.).</li>
              <li>Extra diurna 125% · extra nocturna 175% · recargo nocturno +35%.</li>
              <li>
                Recargo dominical/festivo vigente: +{Math.round(resultado.recargoDominicalVigente * 100)}%
                (sube a +100% el 1-jul-2027). Los recargos se suman: p. ej. extra nocturna dominical =
                175% + {Math.round(resultado.recargoDominicalVigente * 100)}%.
              </li>
              <li>Los recargos y las extras se pagan además del salario; las horas ordinarias diurnas ya están en el salario.</li>
              <li>Tope legal: 2 h extra por día y 12 por semana. Los festivos de Colombia se calculan automáticamente.</li>
              <li>
                La regla de {resultado.limiteOrdinarioDia} h diarias es de la empresa y puede diferir de la ley
                (8 h/día y 42 h/semana). Es una guía de cálculo, no asesoría legal; confirma con tu contador.
              </li>
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
