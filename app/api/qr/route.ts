import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { obtenerSesionAdmin } from "@/lib/auth";
import { urlApp } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const destino = `${urlApp()}/login`;
    const buffer = await QRCode.toBuffer(destino, {
      type: "png",
      width: 720,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generando QR:", error);
    return NextResponse.json(
      { error: "No se pudo generar el codigo QR." },
      { status: 500 }
    );
  }
}
