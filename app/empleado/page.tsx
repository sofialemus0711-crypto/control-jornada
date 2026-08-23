"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EstadoBadge from "@/components/EstadoBadge";
import CapturaFoto from "@/components/CapturaFoto";
import type { Registro, ResumenSemanal, SesionUsuario } from "@/lib/types";

interface DatosRegistros {
  registros: Registro[];
  resumenes: ResumenSemanal[];
  hoy: Registro | null;
  fechaHoy: string;
}

export default function PanelEmpleado() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [datos, setDatos] = useState<DatosRegistros | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "error" | "exito";
    texto: string;
  } | null>(null);
  const [horaReloj, setHoraReloj] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [fotoEntrada, setFotoEntrada] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    const [resUsuario, resRegistros] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/registros"),
    ]);
    if (resUsuario.ok) {
      const data = await resUsuario.json();
      setUsuario(data.usuario);
    }
    if (resRegistros.ok) {
      const data = await resRegistros.json();
      setDatos(data);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    const actualizar = () =>
      setHoraReloj(
        new Date().toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    actualizar();
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, []);

  async function marcar(accion: string) {
    setProcesando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/registros/marcar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          ...(accion === "ENTRADA" ? { foto: fotoEntrada } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: data.error || "Ocurrio un error." });
      } else {
        setMensaje({ tipo: "exito", texto: "Registro guardado correctamente." });
        setFotoEntrada(null);
        await cargarDatos();
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexion. Intenta de nuevo." });
    } finally {
      setProcesando(false);
    }
  }

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-100">
        <p className="text-ink-500 text-sm">Cargando tu panel...</p>
      </div>
    );
  }

  const hoy = datos?.hoy ?? null;
  const resumenSemanaActual = datos?.resumenes?.[0];

  const puedeEntrada = !hoy;
  const puedeDecidirAlmuerzo =
    hoy && !hoy.horaSalida && hoy.huboAlmuerzo === "PENDIENTE";
  const puedeFinAlmuerzo =
    hoy && hoy.horaInicioAlmuerzo && !hoy.horaFinAlmuerzo && !hoy.horaSalida;
  const puedeSalida =
    hoy && !hoy.horaSalida && hoy.huboAlmuerzo !== "PENDIENTE" && !puedeFinAlmuerzo;
  const jornadaCompleta = hoy && hoy.horaSalida;

  return (
    <div className="min-h-screen bg-ink-100 pb-16">
      <header className="bg-white border-b border-ink-300/60 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink-900 leading-tight">
              {usuario?.nombre}
            </p>
            <p className="text-xs text-ink-500">{usuario?.cargo}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarPassword(true)}
              className="text-xs text-ink-500 hover:text-brand-600 px-2 py-1.5 transition"
            >
              Cambiar contrasena
            </button>
            <button
              onClick={cerrarSesion}
              className="text-xs font-medium text-ink-700 hover:text-red-600 border border-ink-300 rounded-lg px-3 py-1.5 transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Tarjeta principal: reloj + acciones */}
        <section className="bg-white rounded-2xl shadow-card p-6 text-center">
          <p className="font-mono-tabular text-4xl font-bold text-ink-900 tracking-tight">
            {horaReloj}
          </p>
          <p className="text-sm text-ink-500 mt-1 capitalize">
            {hoy?.diaSemana ||
              new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
          </p>

          <div className="mt-4 flex justify-center">
            {hoy ? (
              <EstadoBadge estado={hoy.estado} />
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 text-ink-500 ring-1 ring-ink-300 px-2.5 py-1 text-xs font-medium">
                Sin registrar hoy
              </span>
            )}
          </div>

          {mensaje && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm text-left ${
                mensaje.tipo === "error"
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-700"
              }`}
            >
              {mensaje.texto}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3">
            {puedeEntrada && (
              <>
                <CapturaFoto onFotoLista={setFotoEntrada} />
                <BotonAccion
                  label="Registrar entrada"
                  color="brand"
                  disabled={procesando || !fotoEntrada}
                  onClick={() => marcar("ENTRADA")}
                />
              </>
            )}

            {puedeDecidirAlmuerzo && (
              <>
                <BotonAccion
                  label="Iniciar almuerzo"
                  color="amber"
                  disabled={procesando}
                  onClick={() => marcar("INICIO_ALMUERZO")}
                />
                <BotonAccion
                  label="Hoy no tuve hora de almuerzo"
                  color="ghost"
                  disabled={procesando}
                  onClick={() => marcar("SIN_ALMUERZO")}
                />
              </>
            )}

            {puedeFinAlmuerzo && (
              <BotonAccion
                label="Finalizar almuerzo"
                color="amber"
                disabled={procesando}
                onClick={() => marcar("FIN_ALMUERZO")}
              />
            )}

            {puedeSalida && (
              <BotonAccion
                label="Registrar salida"
                color="red"
                disabled={procesando}
                onClick={() => marcar("SALIDA")}
              />
            )}

            {jornadaCompleta && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
                Jornada de hoy completada — {hoy?.totalHorasTrabajadas} horas
                trabajadas.
              </div>
            )}
          </div>
        </section>

        {/* Resumen del dia */}
        {hoy && (
          <section className="bg-white rounded-2xl shadow-card p-6">
            <h2 className="text-sm font-semibold text-ink-900 mb-4">
              Registro de hoy
            </h2>
            <div className="flex items-start gap-4">
              {hoy.fotoEntrada && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/jpeg;base64,${hoy.fotoEntrada}`}
                  alt="Foto de verificacion de entrada"
                  className="h-16 w-16 rounded-xl object-cover ring-1 ring-ink-200 flex-shrink-0"
                />
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center flex-1">
                <Dato label="Entrada" valor={hoy.horaEntrada || "—"} />
                <Dato
                  label="Almuerzo"
                  valor={
                    hoy.huboAlmuerzo === "NO"
                      ? "No aplica"
                      : hoy.horaInicioAlmuerzo && hoy.horaFinAlmuerzo
                      ? `${hoy.horaInicioAlmuerzo} - ${hoy.horaFinAlmuerzo}`
                      : hoy.horaInicioAlmuerzo || "—"
                  }
                />
                <Dato label="Salida" valor={hoy.horaSalida || "—"} />
                <Dato
                  label="Horas"
                  valor={hoy.totalHorasTrabajadas || "—"}
                />
              </div>
            </div>
          </section>
        )}

        {/* Resumen semanal */}
        {resumenSemanaActual && (
          <section className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink-900">
                Semana actual
              </h2>
              <span className="text-xs text-ink-500">
                {formatearRangoFechas(
                  resumenSemanaActual.fechaInicio,
                  resumenSemanaActual.fechaFin
                )}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <Dato
                label="Total horas"
                valor={resumenSemanaActual.totalHoras.toFixed(2)}
                destacado
              />
              <Dato
                label="Horas extra"
                valor={resumenSemanaActual.horasExtra.toFixed(2)}
                alerta={resumenSemanaActual.horasExtra > 0}
              />
              <Dato
                label="Almuerzo (h)"
                valor={resumenSemanaActual.totalAlmuerzoHoras.toFixed(2)}
              />
            </div>
          </section>
        )}

        {/* Historial */}
        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">
            Historial reciente
          </h2>
          {datos && datos.registros.length > 0 ? (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-xs text-ink-500 border-b border-ink-100">
                    <th className="py-2 px-2 font-medium">Fecha</th>
                    <th className="py-2 px-2 font-medium">Entrada</th>
                    <th className="py-2 px-2 font-medium">Almuerzo</th>
                    <th className="py-2 px-2 font-medium">Salida</th>
                    <th className="py-2 px-2 font-medium text-right">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.registros.slice(0, 14).map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-ink-100 last:border-0"
                    >
                      <td className="py-2.5 px-2">
                        <div className="font-medium text-ink-900">
                          {r.fecha}
                        </div>
                        <div className="text-xs text-ink-500">
                          {r.diaSemana}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-mono-tabular text-ink-700">
                        {r.horaEntrada || "—"}
                      </td>
                      <td className="py-2.5 px-2 font-mono-tabular text-ink-700">
                        {r.huboAlmuerzo === "NO" ? "No aplica" : r.huboAlmuerzo === "SI" ? `${r.horaInicioAlmuerzo}-${r.horaFinAlmuerzo}` : "—"}
                      </td>
                      <td className="py-2.5 px-2 font-mono-tabular text-ink-700">
                        {r.horaSalida || "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono-tabular font-semibold text-ink-900">
                        {r.totalHorasTrabajadas || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-500 text-center py-6">
              Aun no tienes registros de jornada.
            </p>
          )}
        </section>
      </main>

      {mostrarPassword && (
        <ModalCambiarPassword onClose={() => setMostrarPassword(false)} />
      )}
    </div>
  );
}

function BotonAccion({
  label,
  color,
  onClick,
  disabled,
}: {
  label: string;
  color: "brand" | "amber" | "red" | "ghost";
  onClick: () => void;
  disabled?: boolean;
}) {
  const estilos: Record<string, string> = {
    brand: "bg-brand-600 hover:bg-brand-700 text-white shadow-card",
    amber: "bg-amber-500 hover:bg-amber-600 text-white shadow-card",
    red: "bg-red-600 hover:bg-red-700 text-white shadow-card",
    ghost:
      "bg-white border border-ink-300 text-ink-700 hover:bg-ink-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl py-3.5 text-base font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${estilos[color]}`}
    >
      {label}
    </button>
  );
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

function formatearRangoFechas(inicio: string, fin: string): string {
  const opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const [yi, mi, di] = inicio.split("-").map(Number);
  const [yf, mf, df] = fin.split("-").map(Number);
  const fechaInicio = new Date(yi, mi - 1, di).toLocaleDateString("es-CO", opciones);
  const fechaFin = new Date(yf, mf - 1, df).toLocaleDateString("es-CO", opciones);
  return `${fechaInicio} - ${fechaFin}`;
}

function ModalCambiarPassword({ onClose }: { onClose: () => void }) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (passwordNueva !== confirmacion) {
      setError("Las contrasenas nuevas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/empleado/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar la contrasena.");
      } else {
        setExito(true);
      }
    } catch {
      setError("Error de conexion.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 flex items-end sm:items-center justify-center z-20 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 animate-slide-up">
        <h3 className="text-base font-semibold text-ink-900 mb-4">
          Cambiar contrasena
        </h3>

        {exito ? (
          <div>
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              Tu contrasena fue actualizada correctamente.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 transition"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="Contrasena actual"
              required
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="w-full rounded-xl border border-ink-300 px-4 py-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition"
            />
            <input
              type="password"
              placeholder="Nueva contrasena (min. 6 caracteres)"
              required
              minLength={6}
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              className="w-full rounded-xl border border-ink-300 px-4 py-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition"
            />
            <input
              type="password"
              placeholder="Confirmar nueva contrasena"
              required
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              className="w-full rounded-xl border border-ink-300 px-4 py-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition"
            />
            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-ink-300 text-ink-700 font-medium py-3 hover:bg-ink-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 transition"
              >
                {enviando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
