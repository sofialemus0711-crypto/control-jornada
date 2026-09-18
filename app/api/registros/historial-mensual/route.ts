import { NextResponse } from "next/server";
import { obtenerSesionActual } from "@/lib/auth";
import { getRegistrosPorEmpleado } from "@/lib/googleSheets";
import { calcularResumenesSemanales, calcularHistorialMensual } from "@/lib/hours";
import { limiteHorasSemanales } from "@/lib/constants";

export async function GET() {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const registros = await getRegistrosPorEmpleado(sesion.id);
    const resumenesSemanales = calcularResumenesSemanales(
      registros,
      limiteHorasSemanales()
    );
    const historial = calcularHistorialMensual(resumenesSemanales);

    return NextResponse.json({ historial });
  } catch (error) {
    console.error("Error generando historial mensual:", error);
    return NextResponse.json(
      { error: "No se pudo generar el historial mensual." },
      { status: 500 }
    );
  }
}
