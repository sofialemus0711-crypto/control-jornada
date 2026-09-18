import type { EstadoRegistro } from "@/lib/types";

const ESTILOS: Record<EstadoRegistro, { label: string; className: string }> = {
  EN_CURSO: {
    label: "En curso",
    className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  },
  EN_ALMUERZO: {
    label: "En almuerzo",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  COMPLETO: {
    label: "Completo",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  INCOMPLETO: {
    label: "Incompleto",
    className: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
};

export default function EstadoBadge({ estado }: { estado: EstadoRegistro }) {
  const estilo = ESTILOS[estado] ?? ESTILOS.EN_CURSO;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${estilo.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {estilo.label}
    </span>
  );
}
