"use client";

import { useEffect, useState } from "react";
import type { ResumenMensual as ResumenMensualTipo } from "@/lib/hours";

function mesActualLocalISO(): string {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

interface Props {
  /** Recibe el mes en formato YYYY-MM y debe devolver el resumen mensual. */
  cargarResumen: (mes: string) => Promise<ResumenMensualTipo>;
  /** Se vuelve a llamar cuando cambia algo externo (ej. el empleado elegido en el admin). */
  dependencias?: unknown[];
  titulo?: string;
}

export default function ResumenMensual({
  cargarResumen,
  dependencias = [],
  titulo = "Resumen mensual de horas extra",
}: Props) {
  const [mes, setMes] = useState(mesActualLocalISO());
  const [resumen, setResumen] = useState<ResumenMensualTipo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    cargarResumen(mes)
      .then((data) => {
        if (!cancelado) setResumen(data);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar el resumen mensual.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ...dependencias]);

  function cambiarMes(delta: number) {
    const [y, m] = mes.split("-").map(Number);
    const fecha = new Date(y, m - 1 + delta, 1);
    const nuevoMes = `${fecha.getFullYear()}-${String(
      fecha.getMonth() + 1
    ).padStart(2, "0")}`;
    setMes(nuevoMes);
  }

  return (
    <section className="bg-white rounded-2xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink-900">{titulo}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => cambiarMes(-1)}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-100 transition"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <input
            type="month"
            value={mes}
            onChange={(e) => e.target.value && setMes(e.target.value)}
            className="rounded-lg border border-ink-300 px-2 py-1 text-sm text-ink-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            onClick={() => cambiarMes(1)}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-100 transition"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-ink-500 text-center py-8">Cargando...</p>
      ) : error ? (
        <p className="text-sm text-red-600 text-center py-8">{error}</p>
      ) : !resumen || resumen.semanas.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-8">
          No hay registros en {resumen?.etiquetaMes.toLowerCase() ?? "este mes"}.
        </p>
      ) : (
        <div>
          <p className="text-sm font-medium text-ink-700 mb-3 capitalize">
            {resumen.etiquetaMes}
          </p>
          <ul className="space-y-2">
            {resumen.semanas.map((s) => (
              <li
                key={s.fechaInicio}
                className="flex items-center justify-between rounded-xl bg-ink-100/60 px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    Semana {s.numero}
                  </p>
                  <p className="text-xs text-ink-500">
                    {s.fechaInicio} a {s.fechaFin}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono-tabular font-bold ${
                      s.horasExtra > 0 ? "text-amber-600" : "text-ink-400"
                    }`}
                  >
                    {s.horasExtra.toFixed(2)} h extra
                  </p>
                  <p className="text-xs text-ink-500 font-mono-tabular">
                    {s.totalHoras.toFixed(2)} h totales
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-900">
              Total horas extra de {resumen.etiquetaMes.split(" ")[0].toLowerCase()}
            </p>
            <p className="font-mono-tabular font-bold text-xl text-brand-600">
              {resumen.totalHorasExtra.toFixed(2)} h
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
