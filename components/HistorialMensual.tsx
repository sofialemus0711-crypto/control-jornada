"use client";

import { useEffect, useState } from "react";
import type { ResumenMensual } from "@/lib/hours";

interface Props {
  /** Debe devolver el historial completo: un ResumenMensual por cada mes con datos. */
  cargarHistorial: () => Promise<ResumenMensual[]>;
  dependencias?: unknown[];
  titulo?: string;
}

export default function HistorialMensual({
  cargarHistorial,
  dependencias = [],
  titulo = "Historial de horas extra por mes",
}: Props) {
  const [historial, setHistorial] = useState<ResumenMensual[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    cargarHistorial()
      .then((data) => {
        if (!cancelado) setHistorial(data);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar el historial mensual.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return (
    <section className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-sm font-semibold text-ink-900 mb-4">{titulo}</h2>

      {cargando ? (
        <p className="text-sm text-ink-500 text-center py-8">Cargando...</p>
      ) : error ? (
        <p className="text-sm text-red-600 text-center py-8">{error}</p>
      ) : !historial || historial.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-8">
          Aun no hay registros de jornada. En cuanto se marquen entradas y
          salidas, aqui va a aparecer automaticamente el resumen de cada
          mes.
        </p>
      ) : (
        <div className="space-y-6">
          {historial.map((mes) => (
            <div
              key={mes.mes}
              className="border-b border-ink-100 last:border-0 pb-6 last:pb-0"
            >
              <p className="text-sm font-semibold text-ink-800 mb-3 capitalize">
                {mes.etiquetaMes}
              </p>
              <ul className="space-y-2">
                {mes.semanas.map((s) => (
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

              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-900">
                  Total horas extra de{" "}
                  {mes.etiquetaMes.split(" ")[0].toLowerCase()}
                </p>
                <p className="font-mono-tabular font-bold text-lg text-brand-600">
                  {mes.totalHorasExtra.toFixed(2)} h
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
