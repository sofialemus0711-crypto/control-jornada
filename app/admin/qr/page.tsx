"use client";

import { useEffect, useState } from "react";

export default function AdminQRPage() {
  const [urlLogin, setUrlLogin] = useState("");
  const [cacheBuster, setCacheBuster] = useState(0);

  useEffect(() => {
    setUrlLogin(`${window.location.origin}/login`);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Codigo QR de acceso</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Imprime este codigo y ubicalo en la entrada. Al escanearlo, los
          empleados llegan directo a la pantalla de inicio de sesion — el QR
          nunca registra la asistencia automaticamente.
        </p>
      </div>

      <section className="bg-white rounded-2xl shadow-card p-8 flex flex-col items-center text-center">
        {urlLogin && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cacheBuster}
            src={`/api/qr?t=${cacheBuster}`}
            alt="Codigo QR de acceso a Control de Jornada"
            className="w-64 h-64 rounded-xl border border-ink-200"
          />
        )}
        <p className="text-xs text-ink-500 mt-4 break-all font-mono-tabular">
          {urlLogin}
        </p>

        <div className="flex gap-3 mt-6 w-full">
          <a
            href="/api/qr"
            download="codigo-qr-control-jornada.png"
            className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-3 transition text-center"
          >
            Descargar PNG
          </a>
          <button
            onClick={() => setCacheBuster((c) => c + 1)}
            className="flex-1 rounded-xl border border-ink-300 text-ink-700 text-sm font-medium py-3 hover:bg-ink-100 transition"
          >
            Regenerar vista
          </button>
        </div>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="text-sm text-amber-800">
          <strong>Importante:</strong> si cambias el dominio de la aplicacion
          (variable <code className="font-mono-tabular">NEXT_PUBLIC_APP_URL</code>),
          este codigo apuntara a la nueva direccion automaticamente la
          proxima vez que lo generes — no necesitas reimprimirlo salvo que
          cambie la URL.
        </p>
      </section>
    </div>
  );
}
