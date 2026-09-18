import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/auth";
import { getRegistros, getEmpleados } from "@/lib/googleSheets";
import { calcularResumenesSemanales, inicioSemanaISO } from "@/lib/hours";
import { limiteHorasSemanales } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get("empleadoId");
    const fecha = searchParams.get("fecha");
    const semana = searchParams.get("semana"); // fecha lunes YYYY-MM-DD

    let registros = await getRegistros();

    if (empleadoId) {
      registros = registros.filter((r) => r.empleadoId === empleadoId);
    }
    if (fecha) {
      registros = registros.filter((r) => r.fecha === fecha);
    }
    if (semana) {
      registros = registros.filter((r) => inicioSemanaISO(r.fecha) === semana);
    }

    registros = registros.sort((a, b) => b.fecha.localeCompare(a.fecha));

    const empleados = await getEmpleados();

    const resumenesPorEmpleado: Record<
      string,
      ReturnType<typeof calcularResumenesSemanales>
    > = {};

    if (empleadoId) {
      resumenesPorEmpleado[empleadoId] = calcularResumenesSemanales(
        registros,
        limiteHorasSemanales()
      );
    } else {
      for (const emp of empleados) {
        const registrosEmpleado = registros.filter(
          (r) => r.empleadoId === emp.id
        );
        if (registrosEmpleado.length > 0) {
          resumenesPorEmpleado[emp.id] = calcularResumenesSemanales(
            registrosEmpleado,
            limiteHorasSemanales()
          );
        }
      }
    }

    return NextResponse.json({ registros, resumenesPorEmpleado });
  } catch (error) {
    console.error("Error listando registros:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los registros." },
      { status: 500 }
    );
  }
}
