import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Eye, FileBox, ImagePlus, Send, Star, Trash2, Upload } from 'lucide-react'
import { api, subirArchivo, tamano, type Modelo } from '../lib/api.ts'
import { CATEGORIAS, FORMATOS, IMAGENES, LICENCIAS, MAX_ARCHIVO, MAX_IMAGEN, PROGRAMAS, extension } from '../lib/datos.ts'
import { ir } from '../lib/ruta.ts'
import { useSesion } from '../App.tsx'
import { Cargando, ConSesion, Mensaje } from '../componentes/Comunes.tsx'
import { ESTADOS } from '../componentes/Tarjeta.tsx'
import { Campo } from './Entrar.tsx'

type Datos = { titulo: string; descripcion: string; categoria: string; programas: string[]; licencia: string; imprimible: boolean }
const VACIO: Datos = { titulo: '', descripcion: '', categoria: '', programas: [], licencia: 'personal', imprimible: true }

export default function EditarModelo({ id }: { id: string | null }) {
  return (
    <ConSesion>
      <Contenido id={id} key={id ?? 'nuevo'} />
    </ConSesion>
  )
}

function Contenido({ id }: { id: string | null }) {
  const { usuario } = useSesion()
  const [modelo, setModelo] = useState<Modelo | null>(null)
  const [d, setD] = useState<Datos>(VACIO)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    if (!id) return
    const r = await api<{ modelo: Modelo }>(`modelos/${encodeURIComponent(id)}`)
    setModelo(r.modelo)
    return r.modelo
  }, [id])

  useEffect(() => {
    cargar()
      .then((m) => m && setD({ titulo: m.titulo, descripcion: m.descripcion, categoria: m.categoria, programas: m.programas, licencia: m.licencia, imprimible: m.imprimible }))
      .catch((e) => setAviso({ tipo: 'error', texto: e.message }))
  }, [cargar])

  if (!usuario?.alias)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <a href="#/vender" className="boton-primario">Crea tu perfil de creador primero</a>
      </div>
    )
  if (id && !modelo) return aviso ? <div className="mx-auto max-w-xl px-4 py-24"><Mensaje>{aviso.texto}</Mensaje></div> : <Cargando />

  const bloqueado = modelo?.estado === 'revision'
  const cambiar = <K extends keyof Datos>(k: K, v: Datos[K]) => setD((x) => ({ ...x, [k]: v }))

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setAviso(null)
    setGuardando(true)
    try {
      if (!id) {
        const r = await api<{ id: string }>('creador/modelos', { datos: d })
        ir(`/panel/modelo/${r.id}`)
        return
      }
      const r = await api<{ estado: string }>(`creador/modelos/${id}`, { datos: d })
      await cargar()
      setAviso({ tipo: 'ok', texto: r.estado === 'revision' ? 'Guardado. Como ya estaba publicado, vuelve a revisión.' : 'Guardado.' })
    } catch (err) {
      setAviso({ tipo: 'error', texto: (err as Error).message })
    } finally {
      setGuardando(false)
    }
  }

  const enviar = async () => {
    setAviso(null)
    try {
      await api(`creador/modelos/${id}/enviar`, { datos: {} })
      await cargar()
      setAviso({ tipo: 'ok', texto: 'Enviado a revisión. Te avisaremos cuando esté publicado.' })
    } catch (err) {
      setAviso({ tipo: 'error', texto: (err as Error).message })
    }
  }

  const borrar = async () => {
    if (!confirm('¿Borrar este modelo con todos sus archivos? No se puede deshacer.')) return
    await api(`creador/modelos/${id}`, { metodo: 'DELETE' })
    ir('/panel')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <a href="#/panel" className="inline-flex items-center gap-1.5 text-sm text-tenue hover:text-texto">
        <ArrowLeft className="h-4 w-4" /> Mi panel
      </a>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{id ? modelo!.titulo : 'Nuevo modelo'}</h1>
        {modelo && <span className={`chip ${ESTADOS[modelo.estado].color}`}>{ESTADOS[modelo.estado].texto}</span>}
        {modelo && (
          <a href={`#/modelo/${modelo.id}`} className="ml-auto inline-flex items-center gap-1.5 text-sm text-acento hover:underline">
            <Eye className="h-4 w-4" /> Ver ficha
          </a>
        )}
      </div>
      {modelo?.estado === 'rechazado' && modelo.motivo && (
        <div className="mt-4"><Mensaje>Se rechazó por: {modelo.motivo}. Corrígelo y vuelve a enviarlo.</Mensaje></div>
      )}
      {bloqueado && <div className="mt-4"><Mensaje tipo="info">Está en revisión. Podrás editarlo cuando tengamos respuesta.</Mensaje></div>}

      <div className={`mt-6 grid gap-6 ${id ? 'lg:grid-cols-[1.1fr_1fr]' : 'max-w-2xl'}`}>
        <form onSubmit={guardar} className="caja space-y-5 p-6">
          <p className="etiqueta">{id ? '1 · Datos' : 'Paso 1 de 3 · Datos del modelo'}</p>
          <fieldset disabled={bloqueado} className="space-y-5">
            <Campo etiqueta="Título"><input className="entrada" value={d.titulo} onChange={(e) => cambiar('titulo', e.target.value)} maxLength={80} placeholder="Ej.: Bisagra para puerta de mueble 35 mm" required /></Campo>
            <Campo etiqueta="Descripción" ayuda="Qué es, medidas, material recomendado, relleno, soportes, cómo se arma.">
              <textarea className="entrada min-h-40" value={d.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} maxLength={4000} required />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Categoría">
                <select className="entrada" value={d.categoria} onChange={(e) => cambiar('categoria', e.target.value)} required>
                  <option value="">Elige…</option>
                  {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Licencia">
                <select className="entrada" value={d.licencia} onChange={(e) => cambiar('licencia', e.target.value)}>
                  {LICENCIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Campo>
            </div>
            <p className="-mt-2 text-xs text-tenue">{LICENCIAS.find((l) => l.id === d.licencia)?.detalle}</p>
            <div>
              <span className="mb-2 block text-sm font-medium">Hecho con</span>
              <div className="flex flex-wrap gap-1.5">
                {PROGRAMAS.map((x) => {
                  const activo = d.programas.includes(x.id)
                  return (
                    <button type="button" key={x.id} onClick={() => cambiar('programas', activo ? d.programas.filter((y) => y !== x.id) : [...d.programas, x.id])} className={`rounded-md border px-2.5 py-1.5 text-sm ${activo ? 'border-acento bg-acento/10 text-acento' : 'border-linea text-tenue hover:text-texto'}`}>
                      {x.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#4DA3FF]" checked={d.imprimible} onChange={(e) => cambiar('imprimible', e.target.checked)} />
              Está listo para imprimir en 3D
            </label>
          </fieldset>
          {aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}
          <div className="flex flex-wrap gap-2">
            <button className="boton-primario" disabled={guardando || bloqueado}>{guardando ? 'Guardando…' : id ? 'Guardar datos' : 'Continuar a archivos'}</button>
            {id && !bloqueado && <button type="button" onClick={borrar} className="boton-peligro ml-auto"><Trash2 className="h-4 w-4" /> Borrar modelo</button>}
          </div>
        </form>

        {id && modelo && (
          <div className="space-y-6">
            <Subidas
              titulo="2 · Archivos del modelo"
              ayuda={`STL, 3MF, OBJ, STEP, Blend, F3D, DWG, ZIP… Hasta ${MAX_ARCHIVO / 1048576} MB cada uno.`}
              tipo="archivos"
              id={id}
              aceptar={Object.keys(FORMATOS).map((x) => `.${x}`).join(',')}
              maximo={MAX_ARCHIVO}
              lista={modelo.archivos.map((a) => ({ nombre: a.nombre, detalle: tamano(a.tamano) }))}
              bloqueado={bloqueado}
              alCambiar={cargar}
            />
            <Subidas
              titulo="3 · Fotos y renders"
              ayuda="JPG, PNG o WebP, hasta 8 MB. La que tiene estrella es la portada."
              tipo="imagenes"
              id={id}
              aceptar={Object.keys(IMAGENES).map((x) => `.${x}`).join(',')}
              maximo={MAX_IMAGEN}
              lista={modelo.imagenes.map((a) => ({ nombre: a.nombre, url: a.url }))}
              portada={modelo.portada?.split('/').pop() && decodeURIComponent(modelo.portada.split('/').pop()!)}
              bloqueado={bloqueado}
              alCambiar={cargar}
            />
            {(modelo.estado === 'borrador' || modelo.estado === 'rechazado') && (
              <div className="caja p-6">
                <p className="etiqueta">4 · Enviar</p>
                <p className="mt-2 text-sm text-tenue">Cuando tengas archivos, fotos y la descripción lista, envíalo. Lo revisamos y lo publicamos.</p>
                <button onClick={enviar} className="boton-primario mt-4 w-full" disabled={!modelo.archivos.length || !modelo.imagenes.length}>
                  <Send className="h-4 w-4" /> Enviar a revisión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type Elemento = { nombre: string; detalle?: string; url?: string }

function Subidas(props: {
  titulo: string
  ayuda: string
  tipo: 'archivos' | 'imagenes'
  id: string
  aceptar: string
  maximo: number
  lista: Elemento[]
  portada?: string | null | false
  bloqueado: boolean
  alCambiar: () => Promise<unknown>
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [cola, setCola] = useState<{ nombre: string; p: number }[]>([])
  const [fallo, setFallo] = useState('')
  const [encima, setEncima] = useState(false)
  const base = `creador/modelos/${encodeURIComponent(props.id)}/${props.tipo}`

  const subir = async (archivos: FileList | File[]) => {
    setFallo('')
    for (const f of [...archivos]) {
      // Los nombres raros (tildes, espacios dobles…) se limpian para que pasen la validación del servidor.
      const nombre = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w .()+-]/g, '_').replace(/^[^\w]+/, '').slice(-150)
      if (f.size > props.maximo) {
        setFallo(`${f.name} pesa ${tamano(f.size)}; el máximo es ${tamano(props.maximo)}.`)
        continue
      }
      if (!props.aceptar.split(',').includes(`.${extension(nombre)}`)) {
        setFallo(`${f.name}: formato no admitido.`)
        continue
      }
      setCola((c) => [...c, { nombre, p: 0 }])
      try {
        await subirArchivo(`${base}/${encodeURIComponent(nombre)}`, f, (p) => setCola((c) => c.map((x) => (x.nombre === nombre ? { ...x, p } : x))))
      } catch (e) {
        setFallo(`${nombre}: ${(e as Error).message}`)
      }
      setCola((c) => c.filter((x) => x.nombre !== nombre))
    }
    await props.alCambiar()
  }

  const quitar = async (nombre: string) => {
    await api(`${base}/${encodeURIComponent(nombre)}`, { metodo: 'DELETE' }).catch((e) => setFallo(e.message))
    await props.alCambiar()
  }
  const portada = async (nombre: string) => {
    await api(`creador/modelos/${encodeURIComponent(props.id)}/portada/${encodeURIComponent(nombre)}`, { datos: {} }).catch((e) => setFallo(e.message))
    await props.alCambiar()
  }

  return (
    <div className="caja p-6">
      <p className="etiqueta">{props.titulo}</p>
      <p className="mt-1 text-xs text-tenue">{props.ayuda}</p>
      {!props.bloqueado && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setEncima(true)
          }}
          onDragLeave={() => setEncima(false)}
          onDrop={(e) => {
            e.preventDefault()
            setEncima(false)
            subir(e.dataTransfer.files)
          }}
          onClick={() => entrada.current?.click()}
          className={`plano mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-7 text-center text-sm transition ${encima ? 'border-acento bg-acento/5' : 'border-linea hover:border-acento/50'}`}
        >
          {props.tipo === 'archivos' ? <Upload className="h-6 w-6 text-acento" /> : <ImagePlus className="h-6 w-6 text-acento" />}
          <span className="mt-2">Arrastra aquí o <span className="text-acento">elige archivos</span></span>
          <input ref={entrada} type="file" multiple accept={props.aceptar} className="hidden" onChange={(e) => e.target.files && subir(e.target.files).then(() => (e.target.value = ''))} />
        </div>
      )}
      {cola.map((c) => (
        <div key={c.nombre} className="mt-3">
          <div className="flex justify-between text-xs"><span className="truncate">{c.nombre}</span><span className="font-mono">{Math.round(c.p * 100)} %</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-linea"><div className="h-full bg-acento transition-all" style={{ width: `${c.p * 100}%` }} /></div>
        </div>
      ))}
      {fallo && <div className="mt-3"><Mensaje>{fallo}</Mensaje></div>}
      {props.tipo === 'imagenes' ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {props.lista.map((x) => (
            <div key={x.nombre} className={`group relative aspect-square overflow-hidden rounded-lg border ${props.portada === x.nombre ? 'border-nodo' : 'border-linea'}`}>
              <img src={x.url} alt={x.nombre} className="h-full w-full object-cover" />
              {!props.bloqueado && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-fondo/85 p-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => portada(x.nombre)} title="Usar de portada" className="p-1 text-nodo"><Star className="h-4 w-4" /></button>
                  <button onClick={() => quitar(x.nombre)} title="Quitar" className="p-1 text-mal"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
              {props.portada === x.nombre && <Star className="absolute right-1.5 top-1.5 h-4 w-4 fill-nodo text-nodo" />}
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-linea">
          {props.lista.map((x) => (
            <li key={x.nombre} className="flex items-center gap-3 py-2">
              <FileBox className="h-4 w-4 shrink-0 text-acento" />
              <span className="min-w-0 flex-1 truncate text-sm">{x.nombre}</span>
              <span className="font-mono text-xs text-tenue">{x.detalle}</span>
              {!props.bloqueado && <button onClick={() => quitar(x.nombre)} title="Quitar" className="p-1 text-tenue hover:text-mal"><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
