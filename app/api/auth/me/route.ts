import { NextResponse } from "next/server";
import { obtenerSesionActual } from "@/lib/auth";

export async function GET() {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.json({ usuario: sesion });
}
