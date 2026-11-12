import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Menu, Search, UserRound, X } from 'lucide-react'
import { api, type Config, type Suscripcion, type Usuario } from './lib/api.ts'
import { ir, useRuta } from './lib/ruta.ts'
import { Logo } from './componentes/Logo.tsx'
import Inicio from './paginas/Inicio.tsx'
import Explorar from './paginas/Explorar.tsx'
import FichaModelo from './paginas/Modelo.tsx'
import PerfilCreador from './paginas/Creador.tsx'
import Entrar from './paginas/Entrar.tsx'
import Cuenta from './paginas/Cuenta.tsx'
import Planes from './paginas/Planes.tsx'
import Panel from './paginas/Panel.tsx'
import EditarModelo from './paginas/EditarModelo.tsx'
import Admin from './paginas/Admin.tsx'
import Terminos from './paginas/Terminos.tsx'
import Vender from './paginas/Vender.tsx'

type Sesion = {
  usuario: Usuario | null
  suscripcion: Suscripcion | null
  config: Config
  cargando: boolean
  recargar: () => Promise<void>
}

const CONFIG: Config = { precio: '4.99', porcentaje: 60, paypal: null, whatsapp: '593979523040' }
const Ctx = createContext<Sesion>({ usuario: null, suscripcion: null, config: CONFIG, cargando: true, recargar: async () => {} })
export const useSesion = () => useContext(Ctx)

export default function App() {
  const ruta = useRuta()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null)
  const [config, setConfig] = useState<Config>(CONFIG)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    const r = await api<{ usuario: Usuario | null; suscripcion?: Suscripcion }>('yo').catch(() => ({ usuario: null, suscripcion: undefined }))
    setUsuario(r.usuario)
    setSuscripcion(r.suscripcion ?? null)
    setCargando(false)
  }, [])

  useEffect(() => {
    recargar()
    api<Config>('config').then(setConfig).catch(() => {})
  }, [recargar])

  const [p0, p1, p2] = ruta.partes
  let pagina
  if (!p0) pagina = <Inicio />
  else if (p0 === 'explorar') pagina = <Explorar params={ruta.params} />
  else if (p0 === 'modelo' && p1) pagina = <FichaModelo id={p1} />
  else if (p0 === 'creador' && p1) pagina = <PerfilCreador alias={p1} />
  else if (p0 === 'entrar') pagina = <Entrar modo={ruta.params.get('modo') === 'registro' ? 'registro' : 'entrar'} volver={ruta.params.get('volver')} />
  else if (p0 === 'cuenta') pagina = <Cuenta />
  else if (p0 === 'planes') pagina = <Planes />
  else if (p0 === 'vender') pagina = <Vender />
  else if (p0 === 'panel' && p1 === 'modelo') pagina = <EditarModelo id={p2 ?? null} />
  else if (p0 === 'panel') pagina = <Panel />
  else if (p0 === 'admin') pagina = <Admin />
  else if (p0 === 'terminos') pagina = <Terminos />
  else pagina = <NoEncontrado />

  return (
    <Ctx.Provider value={{ usuario, suscripcion, config, cargando, recargar }}>
      <Cabecera actual={p0 ?? ''} />
      <main className="min-h-[70vh]">{pagina}</main>
      <Pie />
    </Ctx.Provider>
  )
}

function Cabecera({ actual }: { actual: string }) {
  const { usuario } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => setAbierto(false), [actual])
  const enlaces = [
    ['explorar', 'Explorar'],
    ['vender', 'Vender mis modelos'],
    ['planes', 'Planes'],
  ]
  const buscar = (e: React.FormEvent) => {
    e.preventDefault()
    ir(`/explorar?q=${encodeURIComponent(q.trim())}`)
  }
  return (
    <header className="sticky top-0 z-40 border-b border-linea bg-fondo/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <a href="#/" className="shrink-0" aria-label="Nodo 3D, inicio">
          <Logo />
        </a>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {enlaces.map(([id, texto]) => (
            <a key={id} href={`#/${id}`} className={`rounded-md px-3 py-2 text-sm ${actual === id ? 'text-texto' : 'text-tenue hover:text-texto'}`}>
              {texto}
            </a>
          ))}
        </nav>
        <form onSubmit={buscar} className="ml-auto hidden max-w-xs flex-1 lg:block">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelos…" className="entrada py-2 pl-9" />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {usuario ? (
            <>
              {usuario.alias && (
                <a href="#/panel" className="boton-borde hidden py-2 sm:inline-flex">
                  Mi panel
                </a>
              )}
              {usuario.admin && (
                <a href="#/admin" className="boton-borde hidden py-2 sm:inline-flex">
                  Admin
                </a>
              )}
              <a href="#/cuenta" className="boton-borde py-2" title="Mi cuenta">
                <UserRound className="h-4 w-4" />
                <span className="hidden max-w-28 truncate sm:inline">{usuario.nombre.split(' ')[0]}</span>
              </a>
            </>
          ) : (
            <>
              <a href="#/entrar" className="hidden text-sm text-tenue hover:text-texto sm:inline">
                Iniciar sesión
              </a>
              <a href="#/entrar?modo=registro" className="boton-primario py-2">
                Crear cuenta
              </a>
            </>
          )}
          <button className="boton-borde p-2 md:hidden" onClick={() => setAbierto(!abierto)} aria-label="Menú">
            {abierto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {abierto && (
        <nav className="border-t border-linea px-4 py-3 md:hidden">
          <form onSubmit={buscar} className="mb-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelos…" className="entrada" />
          </form>
          {[...enlaces, ...(usuario?.alias ? [['panel', 'Mi panel']] : []), ...(usuario?.admin ? [['admin', 'Admin']] : [])].map(([id, texto]) => (
            <a key={id} href={`#/${id}`} className="block rounded-md px-2 py-2.5 text-sm text-tenue hover:text-texto">
              {texto}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}

function Pie() {
  return (
    <footer className="mt-24 border-t border-linea">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-tenue">
            Modelos 3D hechos por creadores de Ecuador. Cada descarga suma para pagarle a quien lo diseñó.
          </p>
          <p className="mt-4 text-xs text-tenue/70">
            Un proyecto hermano de{' '}
            <a className="underline hover:text-texto" href="https://biblioteca-3d.fleremiasflemin.workers.dev" target="_blank" rel="noreferrer">
              Biblioteca Flemin 3D
            </a>
            .
          </p>
        </div>
        <div className="text-sm">
          <p className="etiqueta mb-3">Nodo 3D</p>
          <a className="block py-1 text-tenue hover:text-texto" href="#/explorar">Explorar modelos</a>
          <a className="block py-1 text-tenue hover:text-texto" href="#/planes">Planes</a>
          <a className="block py-1 text-tenue hover:text-texto" href="#/vender">Vender mis modelos</a>
        </div>
        <div className="text-sm">
          <p className="etiqueta mb-3">Legal</p>
          <a className="block py-1 text-tenue hover:text-texto" href="#/terminos">Términos y licencias</a>
          <p className="py-1 text-tenue/70">Blender, Fusion, AutoCAD y demás son marcas de sus dueños. Nodo 3D no tiene relación con ellas.</p>
        </div>
      </div>
    </footer>
  )
}

function NoEncontrado() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="etiqueta">Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold">Esta página no existe</h1>
      <a href="#/" className="boton-primario mt-8">Volver al inicio</a>
    </div>
  )
}
