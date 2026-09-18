import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de Jornada Laboral",
  description:
    "Registro de asistencia y jornada laboral de empleados mediante codigo QR.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased min-h-screen">{children}</body>
    </html>
  );
}
