import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "cjl_session";

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "");
}

async function obtenerRol(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return (payload.rol as string) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rol = await obtenerRol(request);

  const esRutaAdmin = pathname.startsWith("/admin");
  const esRutaEmpleado = pathname.startsWith("/empleado");

  if ((esRutaAdmin || esRutaEmpleado) && !rol) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (esRutaAdmin && rol !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/empleado";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && rol) {
    const url = request.nextUrl.clone();
    url.pathname = rol === "admin" ? "/admin" : "/empleado";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/empleado/:path*", "/login"],
};
