import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/auth";
import { actualizarEmpleado, getEmpleadoPorId } from "@/lib/googleSheets";
import { hashPassword, generarPasswordTemporal } from "@/lib/password";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const empleadoActual = await getEmpleadoPorId(params.id);
    if (!empleadoActual) {
      return NextResponse.json(
        { error: "Empleado no encontrado." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const cambios: Record<string, unknown> = {};

    if (typeof body.nombre === "string" && body.nombre.trim()) {
      cambios.nombre = body.nombre.trim();
    }
    if (typeof body.cargo === "string" && body.cargo.trim()) {
      cambios.cargo = body.cargo.trim();
    }
    if (typeof body.usuario === "string" && body.usuario.trim()) {
      cambios.usuario = body.usuario.trim().toLowerCase();
    }
    if (body.rol === "admin" || body.rol === "empleado") {
      cambios.rol = body.rol;
    }
    if (typeof body.activo === "boolean") {
      cambios.activo = body.activo;
    }

    let passwordTemporal: string | null = null;
    if (body.resetPassword === true) {
      passwordTemporal = generarPasswordTemporal();
      cambios.passwordHash = await hashPassword(passwordTemporal);
    }

    const actualizado = await actualizarEmpleado(params.id, cambios);
    if (!actualizado) {
      return NextResponse.json(
        { error: "Empleado no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      empleado: {
        id: actualizado.id,
        nombre: actualizado.nombre,
        cargo: actualizado.cargo,
        usuario: actualizado.usuario,
        rol: actualizado.rol,
        activo: actualizado.activo,
        fechaCreacion: actualizado.fechaCreacion,
      },
      passwordTemporal,
    });
  } catch (error) {
    console.error("Error actualizando empleado:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el empleado." },
      { status: 500 }
    );
  }
}
