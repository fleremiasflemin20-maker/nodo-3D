import { useEffect, useState } from 'react'
import { ArrowLeft, Download, FileBox, Lock, Pencil, Printer, Scale } from 'lucide-react'
import { api, fecha, tamano, type Modelo } from '../lib/api.ts'
import { extension, licencia, nombreCategoria, nombrePrograma } from '../lib/datos.ts'
import { useSesion } from '../App.tsx'
import { Cargando, Mensaje } from '../componentes/Comunes.tsx'
import { ESTADOS, Portada } from '../componentes/Tarjeta.tsx'

export default function FichaModelo({ id }: { id: string }) {
  const { usuario, suscripcion, config } = useSesion()
  const [m, setM] = useState<Modelo | null>(null)
  const [fallo, setFallo] = useState('')
  const [foto, setFoto] = useState(0)

  useEffect(() => {
    setM(null)
    setFoto(0)
    api<{ modelo: Modelo }>(`modelos/${encodeURIComponent(id)}`)
      .then((r) => setM(r.modelo))
      .catch((e) => setFallo(e.message))
  }, [id, usuario?.id])

  if (fallo) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><Mensaje>{fallo}</Mensaje></div>
  if (!m) return <Cargando />

  const dueno = usuario?.alias === m.creador.alias
  const puede = !!usuario && (dueno || usuario.admin || !!suscripcion?.activa)
  const lic = licencia(m.licencia)
  const imagen = m.imagenes[foto]?.url ?? m.portada

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <a href="#/explorar" className="inline-flex items-center gap-1.5 text-sm text-tenue hover:text-texto">
        <ArrowLeft className="h-4 w-4" /> Explorar
      </a>

      {m.estado !== 'publicado' && (
        <div className="mt-4">
          <Mensaje tipo={m.estado === 'rechazado' ? 'error' : 'info'}>
            Vista previa · {ESTADOS[m.estado].texto}. Solo la ves tú{usuario?.admin && !dueno ? ' (administrador)' : ''}.
            {m.motivo && <> Motivo: {m.motivo}</>}
          </Mensaje>
        </div>
      )}

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        {/* Fotos */}
        <div>
          <div className="caja aspect-[4/3] overflow-hidden">
            <Portada src={imagen} alt={m.titulo} className="object-contain" />
          </div>
          {m.imagenes.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {m.imagenes.map((img, i) => (
                <button key={img.nombre} onClick={() => setFoto(i)} className={`h-20 w-24 shrink-0 overflow-hidden rounded-lg border ${i === foto ? 'border-acento' : 'border-linea opacity-70 hover:opacity-100'}`}>
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <section className="mt-8">
            <h2 className="etiqueta mb-3">Descripción</h2>
            <div className="whitespace-pre-line leading-relaxed text-texto/90">{m.descripcion}</div>
          </section>
        </div>

        {/* Datos y descarga */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="caja p-5">
            <p className="etiqueta">{nombreCategoria(m.categoria)}</p>
            <h1 className="mt-1.5 text-2xl font-semibold leading-tight">{m.titulo}</h1>
            <a href={`#/creador/${m.creador.alias}`} className="mt-3 inline-flex items-center gap-2 text-sm text-tenue hover:text-texto">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-linea bg-panel2 font-mono text-xs text-acento">{m.creador.nombre.slice(0, 1).toUpperCase()}</span>
              {m.creador.nombre} <span className="text-acento">@{m.creador.alias}</span>
            </a>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-linea pt-4 text-sm">
              <Dato k="Descargas" v={String(m.descargas)} />
              <Dato k="Publicado" v={m.publicado ? fecha(m.publicado) : '—'} />
              <Dato k="Formatos" v={[...new Set(m.archivos.map((a) => extension(a.nombre).toUpperCase()))].join(', ') || '—'} />
              <Dato k="Imprimible" v={m.imprimible ? 'Sí' : 'Solo digital'} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {m.programas.map((p) => (
                <span key={p} className="chip">{nombrePrograma(p)}</span>
              ))}
            </div>
            {dueno && (
              <a href={`#/panel/modelo/${m.id}`} className="boton-borde mt-5 w-full">
                <Pencil className="h-4 w-4" /> Editar
              </a>
            )}
          </div>

          <div className="caja p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Archivos</h2>
              <span className="etiqueta">{m.archivos.length}</span>
            </div>
            <ul className="mt-3 divide-y divide-linea">
              {m.archivos.map((a) => (
                <li key={a.nombre} className="flex items-center gap-3 py-2.5">
                  <FileBox className="h-4 w-4 shrink-0 text-acento" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{a.nombre}</span>
                    <span className="font-mono text-xs text-tenue">{tamano(a.tamano)}</span>
                  </span>
                  {puede ? (
                    <a href={`/api/descargar/${encodeURIComponent(m.id)}/${encodeURIComponent(a.nombre)}`} className="boton-borde px-2.5 py-1.5" title="Descargar">
                      <Download className="h-4 w-4" />
                    </a>
                  ) : (
                    <Lock className="h-4 w-4 text-tenue" />
                  )}
                </li>
              ))}
            </ul>
            {!puede && (
              <div className="mt-4 rounded-lg border border-acento/30 bg-acento/5 p-4 text-sm">
                <p>
                  Descarga este y todos los modelos por <span className="font-mono font-semibold">{config.precio} USD</span> al mes.
                </p>
                <a href={usuario ? '#/planes' : `#/entrar?modo=registro&volver=${encodeURIComponent(`/modelo/${m.id}`)}`} className="boton-primario mt-3 w-full">
                  {usuario ? 'Activar suscripción' : 'Crear cuenta y suscribirme'}
                </a>
              </div>
            )}
          </div>

          {lic && (
            <div className="caja p-5 text-sm">
              <h2 className="flex items-center gap-2 font-semibold">
                <Scale className="h-4 w-4 text-acento" /> Licencia: {lic.nombre}
              </h2>
              <p className="mt-2 text-tenue">{lic.detalle}</p>
              {m.imprimible && (
                <p className="mt-3 flex items-center gap-2 text-tenue">
                  <Printer className="h-4 w-4" /> Pensado para impresión 3D.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

const Dato = ({ k, v }: { k: string; v: string }) => (
  <div>
    <dt className="etiqueta">{k}</dt>
    <dd className="mt-0.5 font-mono text-sm">{v}</dd>
  </div>
)
