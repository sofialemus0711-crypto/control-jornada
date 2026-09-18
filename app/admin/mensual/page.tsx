"use client";

import { useEffect, useState } from "react";
import ResumenMensual from "@/components/ResumenMensual";
import type { EmpleadoPublico } from "@/lib/types";
import type { ResumenMensual as ResumenMensualTipo } from "@/lib/hours";

export default function AdminMensualPage() {
  const [empleados, setEmpleados] = useState<EmpleadoPublico[]>([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/empleados")
      .then((r) => r.json())
      .then((data) => {
        const lista: EmpleadoPublico[] = data.empleados || [];
        setEmpleados(lista);
        if (lista.length > 0) setEmpleadoId(lista[0].id);
        setCargando(false);
      });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-ink-900">
          Horas extra por mes
        </h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Elige un empleado y un mes para ver las horas extra acumuladas en
          cada semana.
        </p>
      </div>

      <section className="bg-white rounded-2xl shadow-card p-5">
        <label className="block">
          <span className="block text-xs font-medium text-ink-700 mb-1.5">
            Empleado
          </span>
          <select
            value={empleadoId}
            onChange={(e) => setEmpleadoId(e.target.value)}
            disabled={cargando || empleados.length === 0}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
          >
            {empleados.length === 0 && <option>Sin empleados</option>}
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} — {e.cargo}
              </option>
            ))}
          </select>
        </label>
      </section>

      {empleadoId && (
        <ResumenMensual
          key={empleadoId}
          dependencias={[empleadoId]}
          cargarResumen={async (mes) => {
            const res = await fetch(
              `/api/admin/registros/mensual?empleadoId=${empleadoId}&mes=${mes}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error");
            return data.resumenMensual as ResumenMensualTipo;
          }}
        />
      )}
    </div>
  );
}
