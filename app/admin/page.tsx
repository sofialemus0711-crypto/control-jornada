"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EstadoBadge from "@/components/EstadoBadge";
import type { Registro } from "@/lib/types";

interface Resumen {
  fechaHoy: string;
  totalEmpleados: number;
  empleadosActivos: number;
  registrosHoy: Registro[];
  horasExtraSemanaTotal: number;
  horasTotalesSemana: number;
  limiteHorasSemanales: number;
}

export default function AdminResumenPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/resumen")
      .then((r) => r.json())
      .then((data) => {
        setResumen(data);
        setCargando(false);
      });
  }, []);

  if (cargando) {
    return <p className="text-ink-500 text-sm py-10 text-center">Cargando...</p>;
  }

  if (!resumen) {
    return (
      <p className="text-red-600 text-sm py-10 text-center">
        No se pudo cargar el resumen.
      </p>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-ink-900">
          Resumen general
        </h1>
        <p className="text-sm text-ink-500 mt-0.5">
          {new Date(resumen.fechaHoy + "T12:00:00").toLocaleDateString("es-CO", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaMetrica
          label="Empleados activos"
          valor={`${resumen.empleadosActivos} / ${resumen.totalEmpleados}`}
        />
        <TarjetaMetrica
          label="Registros hoy"
          valor={String(resumen.registrosHoy.length)}
        />
        <TarjetaMetrica
          label="Horas semana (todos)"
          valor={resumen.horasTotalesSemana.toFixed(1)}
        />
        <TarjetaMetrica
          label={`Horas extra (> ${resumen.limiteHorasSemanales}h/sem)`}
          valor={resumen.horasExtraSemanaTotal.toFixed(1)}
          alerta={resumen.horasExtraSemanaTotal > 0}
        />
      </div>

      <section className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-900">
            Vista diaria de hoy
          </h2>
          <Link
            href="/admin/registros"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Ver todos los registros →
          </Link>
        </div>

        {resumen.registrosHoy.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-8">
            Ningun empleado ha registrado su jornada hoy todavia.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-ink-500 border-b border-ink-100">
                  <th className="py-2 px-2 font-medium">Empleado</th>
                  <th className="py-2 px-2 font-medium">Entrada</th>
                  <th className="py-2 px-2 font-medium">Almuerzo</th>
                  <th className="py-2 px-2 font-medium">Salida</th>
                  <th className="py-2 px-2 font-medium text-right">Horas</th>
                  <th className="py-2 px-2 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resumen.registrosHoy.map((r) => (
                  <tr key={r.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 px-2 font-medium text-ink-900">
                      {r.nombreEmpleado}
                    </td>
                    <td className="py-2.5 px-2 font-mono-tabular text-ink-700">
                      {r.horaEntrada || "—"}
                    </td>
                    <td className="py-2.5 px-2 font-mono-tabular text-ink-700">
                      {r.huboAlmuerzo === "NO"
                        ? "No aplica"
                        : r.horaInicioAlmuerzo && r.horaFinAlmuerzo
                        ? `${r.horaInicioAlmuerzo}-${r.horaFinAlmuerzo}`
                        : r.horaInicioAlmuerzo || "—"}
                    </td>
                    <td className="py-2.5 px-2 font-mono-tabular text-ink-700">
                      {r.horaSalida || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-tabular font-semibold text-ink-900">
                      {r.totalHorasTrabajadas || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <EstadoBadge estado={r.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TarjetaMetrica({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <p
        className={`font-mono-tabular text-2xl font-bold ${
          alerta ? "text-amber-600" : "text-ink-900"
        }`}
      >
        {valor}
      </p>
      <p className="text-xs text-ink-500 mt-1">{label}</p>
    </div>
  );
}
