"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [horaActual, setHoraActual] = useState("");

  useEffect(() => {
    const actualizar = () =>
      setHoraActual(
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesion.");
        setCargando(false);
        return;
      }

      const redirectTo =
        searchParams.get("redirect") ||
        (data.rol === "admin" ? "/admin" : "/empleado");
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Ocurrio un error de conexion. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              className="h-7 w-7"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Control de Jornada
          </h1>
          <p className="text-brand-100/80 text-sm mt-1">
            Registra tu asistencia de forma rapida y segura
          </p>
          <p className="font-mono-tabular text-white/60 text-xs mt-3 tracking-widest">
            {horaActual}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-elevated p-6 sm:p-7 animate-slide-up"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="usuario"
                className="block text-sm font-medium text-ink-700 mb-1.5"
              >
                Usuario
              </label>
              <input
                id="usuario"
                type="text"
                autoComplete="username"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ej. maria.rodriguez"
                className="w-full rounded-xl border border-ink-300 px-4 py-3 text-base text-ink-900 placeholder:text-ink-500/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-700 mb-1.5"
              >
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-ink-300 px-4 py-3 text-base text-ink-900 placeholder:text-ink-500/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-6 w-full rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 text-base transition shadow-card"
          >
            {cargando ? "Ingresando..." : "Iniciar sesion"}
          </button>
        </form>

        <p className="text-center text-brand-100/70 text-xs mt-6">
          ¿Olvidaste tu contrasena? Solicitala a tu administrador.
        </p>
      </div>
    </main>
  );
}
