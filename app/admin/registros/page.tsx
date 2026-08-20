"use client";

import { useEffect, useState, useCallback } from "react";
import EstadoBadge from "@/components/EstadoBadge";
import type { EmpleadoPublico, Registro, ResumenSemanal } from "@/lib/types";

export default function AdminRegistrosPage() {
  const [empleados, setEmpleados] = useState<EmpleadoPublico[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [resumenes, setResumenes] = useState<
    Record<string, ResumenSemanal[]>
  >({});
  const [cargando, setCargando] = useState(true);
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroSemana, setFiltroSemana] = useState("");
  const [editando, setEditando] = useState<Registro | null>(null);

  useEffect(() => {
    fetch("/api/admin/empleados")
      .then((r) => r.json())
      .then((data) => setEmpleados(data.empleados || []));
  }, []);

  const cargarRegistros = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (filtroEmpleado) params.set("empleadoId", filtroEmpleado);
    if (filtroFecha) params.set("fecha", filtroFecha);
    if (filtroSemana) params.set("semana", inicioSemanaISO(filtroSemana));

    const res = await fetch(`/api/admin/registros?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRegistros(data.registros);
      setResumenes(data.resumenesPorEmpleado);
    }
    setCargando(false);
  }, [filtroEmpleado, filtroFecha, filtroSemana]);

  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros]);

  const resumenVisible =
    filtroEmpleado && resumenes[filtroEmpleado]
      ? resumenes[filtroEmpleado][0]
      : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Registros</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Consulta y corrige la jornada de cualquier empleado.
        </p>
      </div>

      <section className="bg-white rounded-2xl shadow-card p-5">
        <div className="grid sm:grid-cols-4 gap-3">
          <select
            value={filtroEmpleado}
            onChange={(e) => setFiltroEmpleado(e.target.value)}
            className="rounded-xl border border-ink-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
          >
            <option value="">Todos los empleados</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => {
              setFiltroFecha(e.target.value);
              setFiltroSemana("");
            }}
            className="rounded-xl border border-ink-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
          />
          <input
            type="date"
            value={filtroSemana}
            onChange={(e) => {
              setFiltroSemana(e.target.value);
              setFiltroFecha("");
            }}
            title="Elige cualquier dia de la semana que quieres consultar"
            className="rounded-xl border border-ink-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
          />
          <button
            onClick={() => {
              setFiltroEmpleado("");
              setFiltroFecha("");
              setFiltroSemana("");
            }}
            className="rounded-xl border border-ink-300 text-ink-700 text-sm font-medium hover:bg-ink-100 transition"
          >
            Limpiar filtros
          </button>
        </div>
        <p className="text-xs text-ink-500 mt-2">
          El segundo campo de fecha filtra por dia exacto; el tercero filtra
          por la semana (lunes a domingo) que contiene esa fecha.
        </p>
      </section>

      {resumenVisible && (
        <section className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink-900">
              Resumen semanal
            </h2>
            <span className="text-xs text-ink-500">
              {resumenVisible.fechaInicio} a {resumenVisible.fechaFin}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <Dato label="Total horas" valor={resumenVisible.totalHoras.toFixed(2)} destacado />
            <Dato label="Horas normales" valor={resumenVisible.horasNormales.toFixed(2)} />
            <Dato
              label="Horas extra"
              valor={resumenVisible.horasExtra.toFixed(2)}
              alerta={resumenVisible.horasExtra > 0}
            />
            <Dato label="Almuerzo (h)" valor={resumenVisible.totalAlmuerzoHoras.toFixed(2)} />
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl shadow-card overflow-hidden">
        {cargando ? (
          <p className="text-sm text-ink-500 text-center py-10">Cargando...</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-10">
            No hay registros con los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs text-ink-500 border-b border-ink-100 bg-ink-100/50">
                  <th className="py-3 px-4 font-medium">Empleado</th>
                  <th className="py-3 px-4 font-medium">Fecha</th>
                  <th className="py-3 px-4 font-medium">Entrada</th>
                  <th className="py-3 px-4 font-medium">Almuerzo</th>
                  <th className="py-3 px-4 font-medium">Salida</th>
                  <th className="py-3 px-4 font-medium text-right">Horas</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  <th className="py-3 px-4 font-medium text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-3 px-4 font-medium text-ink-900">
                      {r.nombreEmpleado}
                    </td>
                    <td className="py-3 px-4 text-ink-700">
                      {r.fecha}
                      <div className="text-xs text-ink-500">{r.diaSemana}</div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-ink-700">
                      {r.horaEntrada || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-ink-700">
                      {r.huboAlmuerzo === "NO"
                        ? "No aplica"
                        : r.horaInicioAlmuerzo && r.horaFinAlmuerzo
                        ? `${r.horaInicioAlmuerzo}-${r.horaFinAlmuerzo}`
                        : r.horaInicioAlmuerzo || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-ink-700">
                      {r.horaSalida || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-ink-900">
                      {r.totalHorasTrabajadas || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <EstadoBadge estado={r.estado} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setEditando(r)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Corregir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && (
        <ModalCorregirRegistro
          registro={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargarRegistros();
          }}
        />
      )}
    </div>
  );
}

function inicioSemanaISO(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dia = date.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  date.setDate(date.getDate() + diff);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function Dato({
  label,
  valor,
  destacado,
  alerta,
}: {
  label: string;
  valor: string;
  destacado?: boolean;
  alerta?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-mono-tabular font-bold ${
          destacado ? "text-2xl text-brand-600" : "text-lg text-ink-900"
        } ${alerta ? "text-amber-600" : ""}`}
      >
        {valor}
      </p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function ModalCorregirRegistro({
  registro,
  onClose,
  onGuardado,
}: {
  registro: Registro;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [horaEntrada, setHoraEntrada] = useState(registro.horaEntrada);
  const [horaInicioAlmuerzo, setHoraInicioAlmuerzo] = useState(
    registro.horaInicioAlmuerzo
  );
  const [horaFinAlmuerzo, setHoraFinAlmuerzo] = useState(
    registro.horaFinAlmuerzo
  );
  const [horaSalida, setHoraSalida] = useState(registro.horaSalida);
  const [huboAlmuerzo, setHuboAlmuerzo] = useState(registro.huboAlmuerzo);
  const [observaciones, setObservaciones] = useState(registro.observaciones);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/admin/registros/${registro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horaEntrada,
          horaInicioAlmuerzo,
          horaFinAlmuerzo,
          horaSalida,
          huboAlmuerzo,
          observaciones,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar el registro.");
      } else {
        onGuardado();
      }
    } catch {
      setError("Error de conexion.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 flex items-end sm:items-center justify-center z-20 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-ink-900">
            Corregir registro
          </h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">
            ×
          </button>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          {registro.nombreEmpleado} · {registro.fecha} ({registro.diaSemana})
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Entrada">
              <input
                type="time"
                value={horaEntrada}
                onChange={(e) => setHoraEntrada(e.target.value)}
                className={inputClass}
              />
            </Campo>
            <Campo label="Salida">
              <input
                type="time"
                value={horaSalida}
                onChange={(e) => setHoraSalida(e.target.value)}
                className={inputClass}
              />
            </Campo>
          </div>

          <Campo label="¿Hubo almuerzo?">
            <select
              value={huboAlmuerzo}
              onChange={(e) =>
                setHuboAlmuerzo(e.target.value as typeof huboAlmuerzo)
              }
              className={inputClass}
            >
              <option value="PENDIENTE">Pendiente</option>
              <option value="SI">Si</option>
              <option value="NO">No</option>
            </select>
          </Campo>

          {huboAlmuerzo === "SI" && (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Inicio almuerzo">
                <input
                  type="time"
                  value={horaInicioAlmuerzo}
                  onChange={(e) => setHoraInicioAlmuerzo(e.target.value)}
                  className={inputClass}
                />
              </Campo>
              <Campo label="Fin almuerzo">
                <input
                  type="time"
                  value={horaFinAlmuerzo}
                  onChange={(e) => setHoraFinAlmuerzo(e.target.value)}
                  className={inputClass}
                />
              </Campo>
            </div>
          )}

          <Campo label="Observaciones">
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Opcional"
            />
          </Campo>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-ink-300 text-ink-700 font-medium py-3 hover:bg-ink-100 transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 transition text-sm"
            >
              {enviando ? "Guardando..." : "Guardar correccion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
