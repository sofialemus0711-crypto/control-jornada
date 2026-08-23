import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionActual } from "@/lib/auth";
import { getEmpleadoPorId, actualizarEmpleado } from "@/lib/googleSheets";
import { verifyPassword, hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { passwordActual, passwordNueva } = await request.json();

    if (!passwordActual || !passwordNueva) {
      return NextResponse.json(
        { error: "Debes indicar tu contrasena actual y la nueva." },
        { status: 400 }
      );
    }

    if (String(passwordNueva).length < 6) {
      return NextResponse.json(
        { error: "La nueva contrasena debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const empleado = await getEmpleadoPorId(sesion.id);
    if (!empleado) {
      return NextResponse.json(
        { error: "Empleado no encontrado." },
        { status: 404 }
      );
    }

    const valida = await verifyPassword(passwordActual, empleado.passwordHash);
    if (!valida) {
      return NextResponse.json(
        { error: "La contrasena actual no es correcta." },
        { status: 400 }
      );
    }

    const nuevoHash = await hashPassword(passwordNueva);
    await actualizarEmpleado(sesion.id, { passwordHash: nuevoHash });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error cambiando contrasena:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la contrasena." },
      { status: 500 }
    );
  }
}
