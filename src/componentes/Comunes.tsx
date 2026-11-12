import type { ReactNode } from 'react'
import { useSesion } from '../App.tsx'

export function Encabezado({ etiqueta, titulo, children }: { etiqueta: string; titulo: ReactNode; children?: ReactNode }) {
  return (
    <section className="plano border-b border-linea">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="etiqueta text-acento">{etiqueta}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
        {children && <div className="mt-3 max-w-2xl text-tenue">{children}</div>}
      </div>
    </section>
  )
}

export function Mensaje({ tipo = 'error', children }: { tipo?: 'error' | 'ok' | 'info'; children: ReactNode }) {
  const c = { error: 'border-mal/40 bg-mal/10 text-mal', ok: 'border-ok/40 bg-ok/10 text-ok', info: 'border-acento/40 bg-acento/10 text-acento' }[tipo]
  return <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${c}`}>{children}</div>
}

export const Cargando = () => <p className="etiqueta animate-pulse px-4 py-16 text-center">Cargando…</p>

/** Muestra el contenido solo con sesión iniciada; si no, invita a entrar y vuelve aquí. */
export function ConSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion()
  if (cargando) return <Cargando />
  if (!usuario)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Inicia sesión para continuar</h1>
        <a href={`#/entrar?volver=${encodeURIComponent(location.hash.slice(1))}`} className="boton-primario mt-6">
          Iniciar sesión
        </a>
      </div>
    )
  return <>{children}</>
}

export const whatsapp = (numero: string, texto: string) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
