import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { api, type Tarjeta } from '../lib/api.ts'
import { CATEGORIAS, PROGRAMAS, nombreCategoria, nombrePrograma } from '../lib/datos.ts'
import { ir } from '../lib/ruta.ts'
import { Encabezado } from '../componentes/Comunes.tsx'
import { Rejilla } from '../componentes/Tarjeta.tsx'

export default function Explorar({ params }: { params: URLSearchParams }) {
  const q = params.get('q') ?? ''
  const categoria = params.get('categoria') ?? ''
  const programa = params.get('programa') ?? ''
  const orden = params.get('orden') ?? 'recientes'
  const [modelos, setModelos] = useState<Tarjeta[] | null>(null)
  const [texto, setTexto] = useState(q)
  const clave = params.toString()

  useEffect(() => {
    setModelos(null)
    setTexto(q)
    api<{ modelos: Tarjeta[] }>(`modelos?${clave}`)
      .then((r) => setModelos(r.modelos))
      .catch(() => setModelos([]))
  }, [clave, q])

  const con = (cambios: Record<string, string>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) v ? p.set(k, v) : p.delete(k)
    ir(`/explorar?${p}`)
  }

  const titulo = categoria ? nombreCategoria(categoria) : programa ? `Hechos en ${nombrePrograma(programa)}` : q ? `“${q}”` : 'Todos los modelos'

  return (
    <>
      <Encabezado etiqueta="Explorar" titulo={titulo}>
        {modelos ? `${modelos.length} modelo${modelos.length === 1 ? '' : 's'}` : 'Buscando…'}
      </Encabezado>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[230px_1fr]">
        <aside className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              con({ q: texto.trim() })
            }}
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar…" className="entrada pl-9" />
            </label>
          </form>
          <Grupo titulo="Categoría" valor={categoria} opciones={CATEGORIAS} elegir={(v) => con({ categoria: v })} />
          <Grupo titulo="Programa" valor={programa} opciones={PROGRAMAS} elegir={(v) => con({ programa: v })} />
        </aside>
        <div>
          <div className="mb-4 flex items-center justify-end gap-2 text-sm">
            <span className="text-tenue">Ordenar:</span>
            {[
              ['recientes', 'Recientes'],
              ['populares', 'Más descargados'],
            ].map(([id, t]) => (
              <button key={id} onClick={() => con({ orden: id === 'recientes' ? '' : id })} className={`rounded-md px-2.5 py-1 ${orden === id ? 'bg-panel2 text-texto' : 'text-tenue hover:text-texto'}`}>
                {t}
              </button>
            ))}
          </div>
          {modelos === null ? (
            <p className="etiqueta animate-pulse py-10">Cargando…</p>
          ) : modelos.length ? (
            <Rejilla modelos={modelos} />
          ) : (
            <div className="caja plano px-6 py-16 text-center">
              <p className="text-lg font-medium">No encontramos modelos con esos filtros.</p>
              <p className="mt-2 text-sm text-tenue">Prueba con otra palabra o quita algún filtro.</p>
              <a href="#/explorar" className="boton-borde mt-6">Ver todos</a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Grupo({ titulo, valor, opciones, elegir }: { titulo: string; valor: string; opciones: readonly { id: string; nombre: string }[]; elegir: (v: string) => void }) {
  return (
    <div>
      <p className="etiqueta mb-2">{titulo}</p>
      <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
        <Opcion activo={!valor} onClick={() => elegir('')}>Todas</Opcion>
        {opciones.map((o) => (
          <Opcion key={o.id} activo={valor === o.id} onClick={() => elegir(valor === o.id ? '' : o.id)}>
            {o.nombre}
          </Opcion>
        ))}
      </div>
    </div>
  )
}

const Opcion = ({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`rounded-md border px-2.5 py-1.5 text-left text-sm transition lg:border-transparent ${activo ? 'border-acento/50 bg-acento/10 text-acento' : 'border-linea text-tenue hover:text-texto'}`}
  >
    {children}
  </button>
)
