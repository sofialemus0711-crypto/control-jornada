import { NextRequest, NextResponse } from "next/server";
import { getEmpleadoPorUsuario } from "@/lib/googleSheets";
import { verifyPassword } from "@/lib/password";
import { crearSesion, nombreCookie, SESSION_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { usuario, password } = await request.json();

    if (!usuario || !password) {
      return NextResponse.json(
        { error: "Usuario y contrasena son obligatorios." },
        { status: 400 }
      );
    }

    const empleado = await getEmpleadoPorUsuario(String(usuario));

    if (!empleado || !empleado.activo) {
      return NextResponse.json(
        { error: "Usuario o contrasena incorrectos." },
        { status: 401 }
      );
    }

    const passwordValida = await verifyPassword(
      String(password),
      empleado.passwordHash
    );

    if (!passwordValida) {
      return NextResponse.json(
        { error: "Usuario o contrasena incorrectos." },
        { status: 401 }
      );
    }

    const token = await crearSesion({
      id: empleado.id,
      nombre: empleado.nombre,
      cargo: empleado.cargo,
      usuario: empleado.usuario,
      rol: empleado.rol,
    });

    const response = NextResponse.json({
      ok: true,
      rol: empleado.rol,
      nombre: empleado.nombre,
    });
    response.cookies.set(nombreCookie(), token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Ocurrio un error al iniciar sesion. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
