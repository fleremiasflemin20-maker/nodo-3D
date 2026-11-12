import { useEffect, useState } from 'react'

/*
 * Rutas con # para que la web estática funcione igual en cualquier hosting:
 *   #/explorar?categoria=mecanica   →  { partes: ['explorar'], params }
 */
export type Ruta = { partes: string[]; params: URLSearchParams }

const leer = (): Ruta => {
  const [camino, consulta] = location.hash.replace(/^#\/?/, '').split('?')
  return { partes: camino.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(consulta ?? '') }
}

export function useRuta() {
  const [r, setR] = useState(leer)
  useEffect(() => {
    const cambio = () => {
      setR(leer())
      window.scrollTo({ top: 0 })
    }
    addEventListener('hashchange', cambio)
    return () => removeEventListener('hashchange', cambio)
  }, [])
  return r
}

export const ir = (destino: string) => {
  location.hash = destino.startsWith('#') ? destino : `#${destino}`
}
