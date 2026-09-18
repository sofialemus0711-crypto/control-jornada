import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionActual } from "@/lib/auth";
import { getRegistrosPorEmpleado } from "@/lib/googleSheets";
import {
  calcularResumenesSemanales,
  calcularResumenMensual,
  mesActualISO,
} from "@/lib/hours";
import { limiteHorasSemanales } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes") || mesActualISO();

    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json(
        { error: "El mes debe tener formato YYYY-MM." },
        { status: 400 }
      );
    }

    const registros = await getRegistrosPorEmpleado(sesion.id);
    const resumenesSemanales = calcularResumenesSemanales(
      registros,
      limiteHorasSemanales()
    );
    const resumenMensual = calcularResumenMensual(resumenesSemanales, mes);

    return NextResponse.json({ resumenMensual });
  } catch (error) {
    console.error("Error generando resumen mensual:", error);
    return NextResponse.json(
      { error: "No se pudo generar el resumen mensual." },
      { status: 500 }
    );
  }
}
