import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/auth";
import { getRegistros } from "@/lib/googleSheets";
import {
  calcularResumenesSemanales,
  calcularResumenMensual,
  mesActualISO,
} from "@/lib/hours";
import { limiteHorasSemanales } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get("empleadoId");
    const mes = searchParams.get("mes") || mesActualISO();

    if (!empleadoId) {
      return NextResponse.json(
        { error: "Debes indicar el empleado." },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json(
        { error: "El mes debe tener formato YYYY-MM." },
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
    const resumenMensual = calcularResumenMensual(resumenesSemanales, mes);

    return NextResponse.json({ resumenMensual });
  } catch (error) {
    console.error("Error generando resumen mensual (admin):", error);
    return NextResponse.json(
      { error: "No se pudo generar el resumen mensual." },
      { status: 500 }
    );
  }
}
