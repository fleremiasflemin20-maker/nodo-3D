import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { api, fecha, type Tarjeta } from '../lib/api.ts'
import { nombrePrograma } from '../lib/datos.ts'
import { Cargando, Mensaje } from '../componentes/Comunes.tsx'
import { Rejilla } from '../componentes/Tarjeta.tsx'

type Perfil = { alias: string; nombre: string; bio: string | null; ciudad: string | null; programas: string[]; desde: number }

export default function PerfilCreador({ alias }: { alias: string }) {
  const [d, setD] = useState<{ creador: Perfil; modelos: Tarjeta[] } | null>(null)
  const [fallo, setFallo] = useState('')
  useEffect(() => {
    api<{ creador: Perfil; modelos: Tarjeta[] }>(`creadores/${encodeURIComponent(alias)}`).then(setD).catch((e) => setFallo(e.message))
  }, [alias])
  if (fallo) return <div className="mx-auto max-w-xl px-4 py-24"><Mensaje>{fallo}</Mensaje></div>
  if (!d) return <Cargando />
  const c = d.creador
  const total = d.modelos.reduce((s, m) => s + m.descargas, 0)
  return (
    <>
      <section className="plano border-b border-linea">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-linea bg-panel font-mono text-3xl text-acento">{c.nombre.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="etiqueta text-acento">Creador</p>
            <h1 className="mt-1 text-3xl font-semibold">{c.nombre}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-tenue">
              <span>@{c.alias}</span>
              {c.ciudad && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {c.ciudad}
                </span>
              )}
              <span>En Nodo 3D desde {fecha(c.desde)}</span>
            </p>
            {c.bio && <p className="mt-3 max-w-2xl whitespace-pre-line text-tenue">{c.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.programas.map((p) => (
                <span key={p} className="chip">{nombrePrograma(p)}</span>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-linea bg-linea">
            <div className="bg-panel px-5 py-3"><dt className="etiqueta">Modelos</dt><dd className="font-mono text-2xl">{d.modelos.length}</dd></div>
            <div className="bg-panel px-5 py-3"><dt className="etiqueta">Descargas</dt><dd className="font-mono text-2xl">{total}</dd></div>
          </dl>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {d.modelos.length ? <Rejilla modelos={d.modelos} /> : <p className="py-10 text-center text-tenue">Todavía no tiene modelos publicados.</p>}
      </div>
    </>
  )
}
