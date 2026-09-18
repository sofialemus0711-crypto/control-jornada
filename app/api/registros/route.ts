import { NextResponse } from "next/server";
import { obtenerSesionActual } from "@/lib/auth";
import { getRegistrosPorEmpleado } from "@/lib/googleSheets";
import { calcularResumenesSemanales, fechaActualISO } from "@/lib/hours";
import { limiteHorasSemanales } from "@/lib/constants";

export async function GET() {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const registros = await getRegistrosPorEmpleado(sesion.id);
    const resumenes = calcularResumenesSemanales(
      registros,
      limiteHorasSemanales()
    );
    const fechaHoy = fechaActualISO();
    const hoy = registros.find((r) => r.fecha === fechaHoy) ?? null;
    return NextResponse.json({ registros, resumenes, hoy, fechaHoy });
  } catch (error) {
    console.error("Error obteniendo registros:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los registros. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
