"use client";

import { useRef, useState } from "react";

interface Props {
  onFotoLista: (base64: string | null) => void;
}

/**
 * Captura una foto desde la camara del dispositivo (usa el atributo
 * "capture" para abrir la camara frontal en celulares) y la comprime en el
 * navegador antes de enviarla, para que quepa dentro de una celda de
 * Google Sheets.
 */
export default function CapturaFoto({ onFotoLista }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(
    null
  );
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setProcesando(true);
    setError(null);
    try {
      const comprimida = await comprimirImagen(archivo);
      setPrevisualizacion(comprimida);
      onFotoLista(comprimida.split(",")[1] ?? null);
    } catch {
      setError("No se pudo procesar la foto. Intenta de nuevo.");
      onFotoLista(null);
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function quitarFoto() {
    setPrevisualizacion(null);
    onFotoLista(null);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={manejarArchivo}
      />

      {!previsualizacion ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={procesando}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 text-ink-600 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 py-4 text-sm font-medium transition disabled:opacity-60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path
              d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="3.2" />
          </svg>
          {procesando ? "Procesando foto..." : "Tomar foto para registrar entrada"}
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previsualizacion}
            alt="Foto de verificacion"
            className="h-14 w-14 rounded-lg object-cover ring-1 ring-emerald-300"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">
              Foto lista
            </p>
            <p className="text-xs text-emerald-600">
              Se guardara junto con tu registro de entrada.
            </p>
          </div>
          <button
            type="button"
            onClick={quitarFoto}
            className="text-xs font-medium text-ink-500 hover:text-red-600"
          >
            Repetir
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

/**
 * Redimensiona y comprime una imagen en el navegador, reduciendo la
 * calidad hasta que quepa comodamente en una celda de Google Sheets
 * (limite de 50.000 caracteres), y devuelve un data URL "data:image/jpeg;base64,...".
 */
async function comprimirImagen(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo);
  const maxAncho = 360;
  const escala = Math.min(1, maxAncho / bitmap.width);
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, ancho, alto);

  let calidad = 0.6;
  let dataUrl = canvas.toDataURL("image/jpeg", calidad);

  // Reduce la calidad progresivamente hasta quedar por debajo del limite
  // seguro para una celda de Google Sheets.
  while (dataUrl.length > 40000 && calidad > 0.15) {
    calidad -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", calidad);
  }

  return dataUrl;
}
