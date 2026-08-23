"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SesionUsuario } from "@/lib/types";

const TABS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/registros", label: "Registros" },
  { href: "/admin/empleados", label: "Empleados" },
  { href: "/admin/qr", label: "Codigo QR" },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUsuario(data.usuario));
  }, []);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink-100">
      <header className="bg-ink-900 text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-brand-500/90 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  className="h-4.5 w-4.5"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-semibold tracking-tight">
                Control de Jornada
              </span>
              <span className="hidden sm:inline text-xs text-white/50 ml-1 border border-white/20 rounded-full px-2 py-0.5">
                Administrador
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-white/70">
                {usuario?.nombre}
              </span>
              <button
                onClick={cerrarSesion}
                className="text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition"
              >
                Salir
              </button>
            </div>
          </div>
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const activo =
                tab.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    activo
                      ? "border-brand-400 text-white"
                      : "border-transparent text-white/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
