import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/auth";
import { getRegistros } from "@/lib/googleSheets";
import { calcularResumenesSemanales, calcularHistorialMensual } from "@/lib/hours";
import { limiteHorasSemanales } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get("empleadoId");

    if (!empleadoId) {
      return NextResponse.json(
        { error: "Debes indicar el empleado." },
        { status: 400 }
      );
    }

    const todosLosRegistros = await getRegistros();
    const registrosEmpleado = todosLosRegistros.filter(
      (r) => r.empleadoId === empleadoId
    );
    const resumenesSemanales = calcularResumenesSemanales(
      registrosEmpleado,
      limiteHorasSemanales()
    );
    const historial = calcularHistorialMensual(resumenesSemanales);

    return NextResponse.json({ historial });
  } catch (error) {
    console.error("Error generando historial mensual (admin):", error);
    return NextResponse.json(
      { error: "No se pudo generar el historial mensual." },
      { status: 500 }
    );
  }
}
