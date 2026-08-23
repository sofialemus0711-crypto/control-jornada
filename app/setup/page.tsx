"use client";

import { useState } from "react";

export default function SetupPage() {
  const [estado, setEstado] = useState<"inicial" | "cargando" | "ok" | "error">(
    "inicial"
  );
  const [mensaje, setMensaje] = useState("");
  const [usuario, setUsuario] = useState("");

  async function ejecutarConfiguracion() {
    setEstado("cargando");
    try {
      const res = await fetch("/api/setup");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setEstado("error");
        setMensaje(data.error || "Ocurrio un error inesperado.");
        return;
      }
      setEstado("ok");
      setMensaje(data.mensaje);
      setUsuario(data.usuario || "");
    } catch {
      setEstado("error");
      setMensaje("No se pudo conectar con el servidor. Intenta de nuevo.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-elevated p-7">
        <h1 className="text-xl font-bold text-ink-900">
          Configuracion inicial
        </h1>
        <p className="text-sm text-ink-500 mt-2">
          Este paso crea las pestañas necesarias en tu Google Sheet y tu
          primer usuario administrador (los datos vienen de las variables
          <code className="mx-1 font-mono-tabular bg-ink-100 px-1.5 py-0.5 rounded">
            INITIAL_ADMIN_*
          </code>
          que configuraste en Vercel). Solo debes hacerlo una vez.
        </p>

        {estado === "inicial" && (
          <button
            onClick={ejecutarConfiguracion}
            className="mt-6 w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 transition shadow-card"
          >
            Ejecutar configuracion inicial
          </button>
        )}

        {estado === "cargando" && (
          <p className="mt-6 text-sm text-ink-500 text-center py-3">
            Configurando, esto puede tardar unos segundos...
          </p>
        )}

        {estado === "ok" && (
          <div className="mt-6">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              {mensaje}
              {usuario && (
                <p className="mt-1">
                  Usuario administrador:{" "}
                  <span className="font-mono-tabular font-semibold">
                    {usuario}
                  </span>
                </p>
              )}
            </div>
            <a
              href="/login"
              className="mt-4 block text-center w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 transition shadow-card"
            >
              Ir a iniciar sesion
            </a>
          </div>
        )}

        {estado === "error" && (
          <div className="mt-6">
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {mensaje}
            </div>
            <button
              onClick={ejecutarConfiguracion}
              className="mt-4 w-full rounded-xl border border-ink-300 text-ink-700 font-medium py-3 hover:bg-ink-100 transition"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
