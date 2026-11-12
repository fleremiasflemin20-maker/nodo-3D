import { useEffect, useState } from 'react'
import { ArrowRight, Boxes, Building2, Car, Cog, Cpu, Dices, FlaskConical, Gem, Home, Search, ShieldCheck, Upload, UserRound, Wrench } from 'lucide-react'
import { api, type Tarjeta } from '../lib/api.ts'
import { CATEGORIAS, PROGRAMAS } from '../lib/datos.ts'
import { ir } from '../lib/ruta.ts'
import { useSesion } from '../App.tsx'
import { Rejilla } from '../componentes/Tarjeta.tsx'

const ICONOS: Record<string, typeof Cog> = {
  mecanica: Cog,
  arquitectura: Building2,
  herramientas: Wrench,
  hogar: Home,
  personajes: UserRound,
  vehiculos: Car,
  electronica: Cpu,
  joyeria: Gem,
  escenarios: Dices,
  educacion: FlaskConical,
}

export default function Inicio() {
  const { config } = useSesion()
  const [modelos, setModelos] = useState<Tarjeta[] | null>(null)
  const [resumen, setResumen] = useState<{ modelos: number; creadores: number; descargas: number } | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api<{ modelos: Tarjeta[] }>('modelos').then((r) => setModelos(r.modelos.slice(0, 8))).catch(() => setModelos([]))
    api<typeof resumen>('resumen').then(setResumen).catch(() => {})
  }, [])

  return (
    <>
      {/* Portada */}
      <section className="plano relative overflow-hidden border-b border-linea">
        <Red />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
          <p className="etiqueta flex items-center gap-2 text-acento">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-nodo" /> Hecho en Ecuador
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Modelos 3D de creadores <span className="text-acento">ecuatorianos</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-tenue">
            Piezas, repuestos, maquetas y figuras diseñados en Blender, Fusion, AutoCAD y más. Descarga todo lo que necesites por{' '}
            <span className="font-mono text-texto">{config.precio} USD</span> al mes.
          </p>
          <form
            className="mt-8 flex max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              ir(`/explorar?q=${encodeURIComponent(q.trim())}`)
            }}
          >
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Engranaje, soporte, maqueta, bisagra…" className="entrada py-3 pl-10 text-base" />
            </label>
            <button className="boton-primario px-5">Buscar</button>
          </form>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-xl border border-linea bg-linea">
            {[
              ['Modelos', resumen?.modelos],
              ['Creadores', resumen?.creadores],
              ['Descargas', resumen?.descargas],
            ].map(([t, n]) => (
              <div key={t as string} className="bg-panel/90 px-4 py-3">
                <dt className="etiqueta">{t}</dt>
                <dd className="mt-1 font-mono text-2xl">{n ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Programas */}
      <section className="border-b border-linea bg-panel/40">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-4 sm:px-6">
          <span className="etiqueta shrink-0">Filtrar por programa</span>
          {PROGRAMAS.filter((p) => p.id !== 'otro').map((p) => (
            <a key={p.id} href={`#/explorar?programa=${p.id}`} className="chip shrink-0 hover:border-acento/60 hover:text-texto">
              {p.nombre}
            </a>
          ))}
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <Titulo etiqueta="01 · Categorías" titulo="¿Qué necesitas imprimir?" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIAS.map((c) => {
            const I = ICONOS[c.id] ?? Boxes
            return (
              <a key={c.id} href={`#/explorar?categoria=${c.id}`} className="caja group flex items-center gap-3 p-4 transition hover:border-acento/50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-linea bg-panel2 text-acento group-hover:border-acento/50">
                  <I className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium leading-tight">{c.nombre}</span>
              </a>
            )
          })}
        </div>
      </section>

      {/* Recientes */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <Titulo etiqueta="02 · Recién publicados" titulo="Lo último de la comunidad" />
          <a href="#/explorar" className="hidden items-center gap-1 text-sm text-acento hover:underline sm:flex">
            Ver todo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-6">
          {modelos === null ? (
            <p className="etiqueta animate-pulse py-10">Cargando…</p>
          ) : modelos.length ? (
            <Rejilla modelos={modelos} />
          ) : (
            <div className="caja plano px-6 py-14 text-center">
              <p className="text-lg font-medium">Estamos abriendo las puertas.</p>
              <p className="mt-2 text-tenue">Los primeros creadores están subiendo sus modelos. ¿Quieres ser uno de ellos?</p>
              <a href="#/vender" className="boton-primario mt-6">Publicar mis modelos</a>
            </div>
          )}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <Titulo etiqueta="03 · Cómo funciona" titulo="Una suscripción. Todo el catálogo." />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            [Search, 'Encuentra', 'Busca por categoría, por programa o por lo que necesitas reparar. Cada ficha trae fotos, formatos y licencia.'],
            [ShieldCheck, 'Suscríbete', `Por ${config.precio} USD al mes descargas sin límite. Puedes cancelar cuando quieras.`],
            [Upload, 'Apoya al creador', `El ${config.porcentaje} % de lo recaudado se reparte cada mes entre los creadores según las descargas de sus modelos.`],
          ].map(([I, t, d], i) => {
            const Icono = I as typeof Cog
            return (
              <div key={i} className="caja p-6">
                <div className="flex items-center justify-between">
                  <Icono className="h-6 w-6 text-acento" />
                  <span className="font-mono text-xs text-tenue">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{t as string}</h3>
                <p className="mt-2 text-sm text-tenue">{d as string}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Creadores */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="caja plano relative overflow-hidden p-8 sm:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="etiqueta text-nodo">Para creadores</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">¿Modelas en Blender, Fusion o AutoCAD? Cobra por tu trabajo.</h2>
              <p className="mt-4 max-w-xl text-tenue">
                Publicar es gratis. Cada mes repartimos el {config.porcentaje} % de las suscripciones entre los creadores, según cuántas personas descargaron sus modelos. Te pagamos por transferencia bancaria.
              </p>
              <a href="#/vender" className="boton-primario mt-8">
                Empezar a vender <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="rounded-xl border border-linea bg-fondo/80 p-6 font-mono text-sm">
              <p className="etiqueta mb-4">Ejemplo de un mes</p>
              <Fila k="Suscriptores" v="300" />
              <Fila k={`× ${config.precio} USD`} v={`${(300 * Number(config.precio)).toFixed(2)}`} />
              <Fila k={`Bolsa creadores (${config.porcentaje} %)`} v={`${((300 * Number(config.precio) * config.porcentaje) / 100).toFixed(2)}`} acento />
              <Fila k="Tus descargas / total" v="120 / 1 500" />
              <div className="mt-3 flex justify-between border-t border-linea pt-3 text-base">
                <span>Tu pago</span>
                <span className="text-ok">{(((300 * Number(config.precio) * config.porcentaje) / 100) * (120 / 1500)).toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

const Fila = ({ k, v, acento }: { k: string; v: string; acento?: boolean }) => (
  <div className="flex justify-between py-1.5 text-tenue">
    <span>{k}</span>
    <span className={acento ? 'text-acento' : 'text-texto'}>{v}</span>
  </div>
)

function Titulo({ etiqueta, titulo }: { etiqueta: string; titulo: string }) {
  return (
    <div>
      <p className="etiqueta">{etiqueta}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h2>
    </div>
  )
}

/** La red de nodos de la portada: puntos unidos por líneas, como una malla vista desde arriba. */
function Red() {
  const puntos = [
    [70, 18], [84, 30], [92, 14], [78, 52], [95, 46], [62, 40], [88, 70], [72, 80], [96, 88], [58, 66],
  ]
  const uniones = [
    [0, 1], [1, 2], [0, 2], [1, 3], [1, 4], [3, 4], [0, 5], [5, 3], [3, 6], [4, 6], [6, 7], [7, 9], [3, 9], [6, 8], [7, 8],
  ]
  return (
    <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {uniones.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={puntos[a][0]} y1={puntos[a][1]} x2={puntos[b][0]} y2={puntos[b][1]} stroke="#4DA3FF" strokeOpacity=".22" strokeWidth=".12" />
      ))}
      {puntos.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={i === 3 ? 0.55 : 0.32} ry={i === 3 ? 0.9 : 0.52} fill={i === 3 ? '#FF7A1A' : '#E7ECF2'} opacity={i === 3 ? 1 : 0.7}>
          <animate attributeName="opacity" values=".35;1;.35" dur={`${3 + (i % 4)}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
    </svg>
  )
}
