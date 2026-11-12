import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { api, type Tarjeta } from '../lib/api.ts'
import { useSesion } from '../App.tsx'
import { Cargando, ConSesion, Encabezado } from '../componentes/Comunes.tsx'
import { Rejilla } from '../componentes/Tarjeta.tsx'

export default function Panel() {
  return (
    <ConSesion>
      <Contenido />
    </ConSesion>
  )
}

const nombreMes = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })

function Contenido() {
  const { usuario, config } = useSesion()
  const [modelos, setModelos] = useState<Tarjeta[] | null>(null)
  const [meses, setMeses] = useState<{ mes: string; descargas: number }[]>([])
  const [mes, setMes] = useState('')

  useEffect(() => {
    if (!usuario?.alias) return
    api<{ modelos: Tarjeta[] }>('creador/modelos').then((r) => setModelos(r.modelos))
    api<{ meses: { mes: string; descargas: number }[]; mes: string }>('creador/ganancias').then((r) => {
      setMeses(r.meses)
      setMes(r.mes)
    })
  }, [usuario?.alias])

  if (!usuario?.alias)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Aún no eres creador</h1>
        <a href="#/vender" className="boton-primario mt-6">Crear mi perfil de creador</a>
      </div>
    )
  if (!modelos) return <Cargando />

  const cuenta = (e: Tarjeta['estado']) => modelos.filter((m) => m.estado === e).length
  const esteMes = meses.find((m) => m.mes === mes)?.descargas ?? 0

  return (
    <>
      <Encabezado etiqueta="Panel de creador" titulo={`@${usuario.alias}`}>
        <a href={`#/creador/${usuario.alias}`} className="text-acento hover:underline">Ver mi perfil público</a>
      </Encabezado>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Caja k="Publicados" v={cuenta('publicado')} />
          <Caja k="En revisión" v={cuenta('revision')} />
          <Caja k="Borradores y rechazados" v={cuenta('borrador') + cuenta('rechazado')} />
          <Caja k={`Descargas · ${mes ? nombreMes(mes) : ''}`} v={esteMes} acento />
        </div>
        <p className="mt-3 text-xs text-tenue">
          Cuenta una descarga por persona y modelo al mes. Tu pago es tu parte de la bolsa del {config.porcentaje} %, según tus descargas frente al total. Las tuyas no cuentan.
        </p>

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mis modelos</h2>
          <a href="#/panel/modelo" className="boton-primario"><Plus className="h-4 w-4" /> Nuevo modelo</a>
        </div>
        <div className="mt-5">
          {modelos.length ? (
            <Rejilla modelos={modelos} estado href={(m) => `#/panel/modelo/${m.id}`} />
          ) : (
            <div className="caja plano px-6 py-14 text-center">
              <p className="text-lg font-medium">Sube tu primer modelo</p>
              <p className="mt-2 text-sm text-tenue">Archivos, fotos y una buena descripción. Lo revisamos en uno o dos días.</p>
              <a href="#/panel/modelo" className="boton-primario mt-6"><Plus className="h-4 w-4" /> Nuevo modelo</a>
            </div>
          )}
        </div>

        {meses.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Historial de descargas</h2>
            <div className="caja mt-4 divide-y divide-linea">
              {meses.map((m) => (
                <div key={m.mes} className="flex justify-between px-5 py-3 text-sm">
                  <span className="capitalize">{nombreMes(m.mes)}</span>
                  <span className="font-mono">{m.descargas}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

const Caja = ({ k, v, acento }: { k: string; v: number; acento?: boolean }) => (
  <div className="caja p-4">
    <p className="etiqueta">{k}</p>
    <p className={`mt-1 font-mono text-3xl ${acento ? 'text-acento' : ''}`}>{v}</p>
  </div>
)
