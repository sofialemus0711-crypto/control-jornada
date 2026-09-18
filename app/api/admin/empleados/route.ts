import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/auth";
import {
  getEmpleados,
  crearEmpleado,
  getEmpleadoPorUsuario,
} from "@/lib/googleSheets";
import { hashPassword, generarPasswordTemporal } from "@/lib/password";
import type { EmpleadoPublico } from "@/lib/types";

function aEmpleadoPublico(e: {
  id: string;
  nombre: string;
  cargo: string;
  usuario: string;
  rol: "admin" | "empleado";
  activo: boolean;
  fechaCreacion: string;
}): EmpleadoPublico {
  const { id, nombre, cargo, usuario, rol, activo, fechaCreacion } = e;
  return { id, nombre, cargo, usuario, rol, activo, fechaCreacion };
}

export async function GET() {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const empleados = await getEmpleados();
    return NextResponse.json({
      empleados: empleados.map(aEmpleadoPublico),
    });
  } catch (error) {
    console.error("Error listando empleados:", error);
    return NextResponse.json(
      { error: "No se pudo obtener la lista de empleados." },
      { status: 500 }
    );
  }
}

function generarUsuario(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
}

export async function POST(request: NextRequest) {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const nombre = String(body?.nombre || "").trim();
    const cargo = String(body?.cargo || "").trim();
    const rol = body?.rol === "admin" ? "admin" : "empleado";
    let usuario = String(body?.usuario || "").trim().toLowerCase();

    if (!nombre || !cargo) {
      return NextResponse.json(
        { error: "El nombre y el cargo son obligatorios." },
        { status: 400 }
      );
    }

    if (!usuario) {
      usuario = generarUsuario(nombre);
    }

    if (!usuario) {
      return NextResponse.json(
        { error: "No se pudo generar un usuario valido. Indica uno manualmente." },
        { status: 400 }
      );
    }

    const existente = await getEmpleadoPorUsuario(usuario);
    if (existente) {
      return NextResponse.json(
        { error: `El usuario "${usuario}" ya esta en uso. Elige otro.` },
        { status: 400 }
      );
    }

    const passwordTemporal = generarPasswordTemporal();
    const passwordHash = await hashPassword(passwordTemporal);

    const empleado = await crearEmpleado({
      nombre,
      cargo,
      usuario,
      passwordHash,
      rol,
    });

    return NextResponse.json({
      ok: true,
      empleado: aEmpleadoPublico(empleado),
      passwordTemporal,
    });
  } catch (error) {
    console.error("Error creando empleado:", error);
    return NextResponse.json(
      { error: "No se pudo crear el empleado. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
