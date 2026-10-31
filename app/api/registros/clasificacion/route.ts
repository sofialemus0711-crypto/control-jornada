import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionActual } from "@/lib/auth";
import { getRegistrosPorEmpleado } from "@/lib/googleSheets";
import { clasificarRango } from "@/lib/recargos";
import { horasOrdinariasDia } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde") || "";
  const hasta = searchParams.get("hasta") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || desde > hasta) {
    return NextResponse.json({ error: "Rango de fechas invalido." }, { status: 400 });
  }
  if ((Date.parse(hasta) - Date.parse(desde)) / 86400000 > 366) {
    return NextResponse.json({ error: "El rango maximo es de un año." }, { status: 400 });
  }
  try {
    const registros = await getRegistrosPorEmpleado(sesion.id);
    return NextResponse.json({
      resultado: clasificarRango(registros, desde, hasta, horasOrdinariasDia()),
    });
  } catch (error) {
    console.error("Error clasificando horas:", error);
    return NextResponse.json({ error: "No se pudo clasificar las horas." }, { status: 500 });
  }
}
