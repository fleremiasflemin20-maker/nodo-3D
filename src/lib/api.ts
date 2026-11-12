/* Llamadas al Worker (/api/*) y los tipos que devuelve. */

export type Tarjeta = {
  id: string
  titulo: string
  categoria: string
  programas: string[]
  licencia: string
  imprimible: boolean
  estado: 'borrador' | 'revision' | 'publicado' | 'rechazado'
  motivo: string | null
  portada: string | null
  creador: { alias: string; nombre: string }
  descargas: number
  publicado: number | null
  actualizado: number
}

export type Modelo = Tarjeta & {
  descripcion: string
  creado: number
  archivos: { nombre: string; tamano: number }[]
  imagenes: { nombre: string; url: string }[]
}

export type Usuario = { id: string; correo: string; nombre: string; alias: string | null; admin: boolean }
export type Suscripcion = { activa: boolean; vence: number | null; proveedor: string | null; estado: string | null }
export type Config = { precio: string; porcentaje: number; paypal: { clientId: string; planId: string } | null; whatsapp: string }

export class ErrorApi extends Error {
  readonly estado: number
  constructor(mensaje: string, estado: number) {
    super(mensaje)
    this.estado = estado
  }
}

export async function api<T>(ruta: string, opciones: { metodo?: string; datos?: unknown } = {}): Promise<T> {
  const r = await fetch(`/api/${ruta}`, {
    method: opciones.metodo ?? (opciones.datos === undefined ? 'GET' : 'POST'),
    headers: opciones.datos === undefined ? undefined : { 'content-type': 'application/json' },
    body: opciones.datos === undefined ? undefined : JSON.stringify(opciones.datos),
    credentials: 'same-origin',
  })
  const j = (await r.json().catch(() => ({}))) as { error?: string }
  if (!r.ok) throw new ErrorApi(j.error ?? `Error ${r.status}`, r.status)
  return j as T
}

/** Sube un archivo con barra de progreso (fetch no la da, XMLHttpRequest sí). */
export function subirArchivo(ruta: string, archivo: File, progreso: (p: number) => void) {
  return new Promise<void>((ok, mal) => {
    const x = new XMLHttpRequest()
    x.open('PUT', `/api/${ruta}`)
    x.upload.onprogress = (e) => e.lengthComputable && progreso(e.loaded / e.total)
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return ok()
      let m = `Error ${x.status}`
      try {
        m = JSON.parse(x.responseText).error ?? m
      } catch {
        /* respuesta sin JSON */
      }
      mal(new ErrorApi(m, x.status))
    }
    x.onerror = () => mal(new ErrorApi('Se cortó la conexión.', 0))
    x.send(archivo)
  })
}

export const tamano = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`)
export const fecha = (ms: number) => new Date(ms).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })
