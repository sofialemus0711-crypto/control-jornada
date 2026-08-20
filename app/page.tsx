import { redirect } from "next/navigation";
import { obtenerSesionActual } from "@/lib/auth";

export default async function Home() {
  const sesion = await obtenerSesionActual();

  if (!sesion) {
    redirect("/login");
  }

  redirect(sesion.rol === "admin" ? "/admin" : "/empleado");
}
