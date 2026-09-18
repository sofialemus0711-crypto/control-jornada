import { NextResponse } from "next/server";
import { ensureSheetsExist, getEmpleados, crearEmpleado } from "@/lib/googleSheets";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";


/**
 * Ruta de configuracion inicial, pensada para ejecutarse UNA sola vez desde
 * el navegador (ver /setup) justo despues de desplegar en Vercel, sin
 * necesidad de instalar Node.js ni usar la terminal.
 *
 * Es segura de llamar varias veces: si ya existe al menos un empleado,
 * no vuelve a crear el administrador (para evitar duplicados o sobrescribir
 * contrasenas), solo confirma que las pestanas de la hoja existen.
 */
export async function GET() {
  try {
    await ensureSheetsExist();

    const empleadosExistentes = await getEmpleados();
    if (empleadosExistentes.length > 0) {
      return NextResponse.json({
        ok: true,
        yaConfigurado: true,
        mensaje:
          "La hoja ya estaba configurada y ya existe al menos un usuario. No se creo ningun administrador nuevo.",
      });
    }

    const nombre = process.env.INITIAL_ADMIN_NOMBRE || "Administrador";
    const cargo = process.env.INITIAL_ADMIN_CARGO || "Administrador del sistema";
    const usuario = (process.env.INITIAL_ADMIN_USUARIO || "admin").toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!password) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Falta configurar la variable de entorno "INITIAL_ADMIN_PASSWORD" en Vercel. Agregala en Project Settings -> Environment Variables, vuelve a desplegar, y visita esta pagina de nuevo.',
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const admin = await crearEmpleado({
      nombre,
      cargo,
      usuario,
      passwordHash,
      rol: "admin",
    });

    return NextResponse.json({
      ok: true,
      yaConfigurado: false,
      mensaje: "Configuracion inicial completada correctamente.",
      usuario: admin.usuario,
    });
  } catch (error: any) {
    console.error("Error en configuracion inicial:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Ocurrio un error durante la configuracion. Revisa las variables de entorno en Vercel.",
      },
      { status: 500 }
    );
  }
}
