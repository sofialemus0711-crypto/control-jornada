import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/auth";
import { getRegistros } from "@/lib/googleSheets";
import { clasificarRango } from "@/lib/recargos";
import { horasOrdinariasDia } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const empleadoId = searchParams.get("empleadoId");
  const desde = searchParams.get("desde") || "";
  const hasta = searchParams.get("hasta") || "";
  if (!empleadoId) {
    return NextResponse.json({ error: "Debes indicar el empleado." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || desde > hasta) {
    return NextResponse.json({ error: "Rango de fechas invalido." }, { status: 400 });
  }
  if ((Date.parse(hasta) - Date.parse(desde)) / 86400000 > 366) {
    return NextResponse.json({ error: "El rango maximo es de un año." }, { status: 400 });
  }
  try {
    const todos = await getRegistros();
    const registros = todos.filter((r) => r.empleadoId === empleadoId);
    return NextResponse.json({
      resultado: clasificarRango(registros, desde, hasta, horasOrdinariasDia()),
    });
  } catch (error) {
    console.error("Error clasificando horas (admin):", error);
    return NextResponse.json({ error: "No se pudo clasificar las horas." }, { status: 500 });
  }
}
