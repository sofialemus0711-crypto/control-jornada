"use client";

import { useEffect, useState } from "react";
import type { EmpleadoPublico } from "@/lib/types";

export default function AdminEmpleadosPage() {
  const [empleados, setEmpleados] = useState<EmpleadoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<EmpleadoPublico | null>(null);
  const [credenciales, setCredenciales] = useState<{
    usuario: string;
    password: string;
  } | null>(null);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/admin/empleados");
    if (res.ok) {
      const data = await res.json();
      setEmpleados(data.empleados);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Empleados</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Administra quienes pueden registrar su jornada.
          </p>
        </div>
        <button
          onClick={() => setMostrarNuevo(true)}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 transition shadow-card"
        >
          + Nuevo empleado
        </button>
      </div>

      {credenciales && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Empleado creado correctamente
            </p>
            <p className="text-sm text-emerald-700 mt-1">
              Usuario: <span className="font-mono-tabular font-semibold">{credenciales.usuario}</span>
              {" · "}
              Contrasena temporal:{" "}
              <span className="font-mono-tabular font-semibold">
                {credenciales.password}
              </span>
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              Comparte estos datos con el empleado. No volveran a mostrarse.
            </p>
          </div>
          <button
            onClick={() => setCredenciales(null)}
            className="text-emerald-700 hover:text-emerald-900 text-sm"
          >
            Cerrar
          </button>
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-card overflow-hidden">
        {cargando ? (
          <p className="text-sm text-ink-500 text-center py-10">Cargando...</p>
        ) : empleados.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-10">
            Aun no has agregado empleados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-ink-500 border-b border-ink-100 bg-ink-100/50">
                  <th className="py-3 px-4 font-medium">Nombre</th>
                  <th className="py-3 px-4 font-medium">Cargo</th>
                  <th className="py-3 px-4 font-medium">Usuario</th>
                  <th className="py-3 px-4 font-medium">Rol</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  <th className="py-3 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((e) => (
                  <tr key={e.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-3 px-4 font-medium text-ink-900">
                      {e.nombre}
                    </td>
                    <td className="py-3 px-4 text-ink-700">{e.cargo}</td>
                    <td className="py-3 px-4 font-mono-tabular text-ink-700">
                      {e.usuario}
                    </td>
                    <td className="py-3 px-4 text-ink-700 capitalize">{e.rol}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          e.activo
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-ink-100 text-ink-500 ring-1 ring-ink-300"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {e.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setEditando(e)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarNuevo && (
        <ModalNuevoEmpleado
          onClose={() => setMostrarNuevo(false)}
          onCreado={(usuario, password) => {
            setCredenciales({ usuario, password });
            setMostrarNuevo(false);
            cargar();
          }}
        />
      )}

      {editando && (
        <ModalEditarEmpleado
          empleado={editando}
          onClose={() => setEditando(null)}
          onGuardado={(passwordTemporal) => {
            if (passwordTemporal) {
              setCredenciales({
                usuario: editando.usuario,
                password: passwordTemporal,
              });
            }
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalNuevoEmpleado({
  onClose,
  onCreado,
}: {
  onClose: () => void;
  onCreado: (usuario: string, password: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [usuario, setUsuario] = useState("");
  const [rol, setRol] = useState<"empleado" | "admin">("empleado");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, cargo, usuario, rol }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el empleado.");
      } else {
        onCreado(data.empleado.usuario, data.passwordTemporal);
      }
    } catch {
      setError("Error de conexion.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ModalBase titulo="Nuevo empleado" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Campo label="Nombre completo">
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Maria Rodriguez"
          />
        </Campo>
        <Campo label="Cargo">
          <input
            required
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Analista de operaciones"
          />
        </Campo>
        <Campo label="Usuario (opcional, se genera automaticamente)">
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="maria.rodriguez"
          />
        </Campo>
        <Campo label="Rol">
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as "empleado" | "admin")}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="empleado">Empleado</option>
            <option value="admin">Administrador</option>
          </select>
        </Campo>

        {error && <MensajeError texto={error} />}

        <BotonesModal onCancel={onClose} enviando={enviando} textoEnvio="Crear empleado" />
      </form>
    </ModalBase>
  );
}

function ModalEditarEmpleado({
  empleado,
  onClose,
  onGuardado,
}: {
  empleado: EmpleadoPublico;
  onClose: () => void;
  onGuardado: (passwordTemporal: string | null) => void;
}) {
  const [nombre, setNombre] = useState(empleado.nombre);
  const [cargo, setCargo] = useState(empleado.cargo);
  const [usuario, setUsuario] = useState(empleado.usuario);
  const [rol, setRol] = useState(empleado.rol);
  const [activo, setActivo] = useState(empleado.activo);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(resetPassword: boolean) {
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/admin/empleados/${empleado.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, cargo, usuario, rol, activo, resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar el empleado.");
      } else {
        onGuardado(data.passwordTemporal ?? null);
      }
    } catch {
      setError("Error de conexion.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ModalBase titulo={`Editar: ${empleado.nombre}`} onClose={onClose}>
      <div className="space-y-3">
        <Campo label="Nombre completo">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </Campo>
        <Campo label="Cargo">
          <input
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </Campo>
        <Campo label="Usuario">
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </Campo>
        <Campo label="Rol">
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as "empleado" | "admin")}
            className="w-full rounded-xl border border-ink-300 px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="empleado">Empleado</option>
            <option value="admin">Administrador</option>
          </select>
        </Campo>
        <label className="flex items-center gap-2 text-sm text-ink-700 pt-1">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          Empleado activo (puede iniciar sesion)
        </label>

        {error && <MensajeError texto={error} />}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-ink-300 text-ink-700 font-medium py-3 hover:bg-ink-100 transition text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => guardar(false)}
            className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 transition text-sm"
          >
            Guardar cambios
          </button>
        </div>
        <button
          type="button"
          disabled={enviando}
          onClick={() => guardar(true)}
          className="w-full rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium py-2.5 transition text-sm"
        >
          Restablecer contrasena
        </button>
      </div>
    </ModalBase>
  );
}

function ModalBase({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-ink-900/50 flex items-end sm:items-center justify-center z-20 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-ink-900">{titulo}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
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

function MensajeError({ texto }: { texto: string }) {
  return (
    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
      {texto}
    </p>
  );
}

function BotonesModal({
  onCancel,
  enviando,
  textoEnvio,
}: {
  onCancel: () => void;
  enviando: boolean;
  textoEnvio: string;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-xl border border-ink-300 text-ink-700 font-medium py-3 hover:bg-ink-100 transition text-sm"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={enviando}
        className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 transition text-sm"
      >
        {enviando ? "Guardando..." : textoEnvio}
      </button>
    </div>
  );
}
