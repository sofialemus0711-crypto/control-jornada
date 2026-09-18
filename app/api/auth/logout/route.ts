import { NextResponse } from "next/server";
import { nombreCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(nombreCookie(), "", { path: "/", maxAge: 0 });
  return response;
}
