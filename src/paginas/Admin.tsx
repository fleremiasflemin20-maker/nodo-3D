import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Eye, X } from 'lucide-react'
import { api, fecha, type Tarjeta } from '../lib/api.ts'
import { useSesion } from '../App.tsx'
import { ConSesion, Encabezado, Mensaje } from '../componentes/Comunes.tsx'
import { Portada } from '../componentes/Tarjeta.tsx'
import { nombreCategoria } from '../lib/datos.ts'

export default function Admin() {
  return (
    <ConSesion>
      <Contenido />
    </ConSesion>
  )
}

function Contenido() {
  const { usuario } = useSesion()
  const [pestana, setPestana] = useState<'revision' | 'socios' | 'reparto'>('revision')
  if (!usuario?.admin) return <div className="mx-auto max-w-md px-4 py-24"><Mensaje>Solo para el administrador.</Mensaje></div>
  return (
    <>
      <Encabezado etiqueta="Administración" titulo="Panel de Nodo 3D" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex gap-1 border-b border-linea">
          {[
            ['revision', 'Por revisar'],
            ['socios', 'Cuentas y suscripciones'],
            ['reparto', 'Reparto del mes'],
          ].map(([id, t]) => (
            <button key={id} onClick={() => setPestana(id as typeof pestana)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${pestana === id ? 'border-acento text-texto' : 'border-transparent text-tenue hover:text-texto'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="py-6">{pestana === 'revision' ? <Revision /> : pestana === 'socios' ? <Socios /> : <Reparto />}</div>
      </div>
    </>
  )
}

function Revision() {
  const [modelos, setModelos] = useState<Tarjeta[] | null>(null)
  const cargar = useCallback(() => api<{ modelos: Tarjeta[] }>('admin/revision').then((r) => setModelos(r.modelos)), [])
  useEffect(() => {
    cargar()
  }, [cargar])
  const decidir = async (id: string, aprobar: boolean) => {
    const motivo = aprobar ? '' : prompt('¿Por qué se rechaza? El creador lo verá.') ?? ''
    if (!aprobar && !motivo.trim()) return
    await api(`admin/modelos/${id}/decidir`, { datos: { aprobar, motivo } }).catch((e) => alert(e.message))
    cargar()
  }
  if (!modelos) return <p className="etiqueta animate-pulse">Cargando…</p>
  if (!modelos.length) return <p className="py-10 text-center text-tenue">No hay modelos esperando revisión.</p>
  return (
    <div className="space-y-3">
      <p className="text-sm text-tenue">Antes de aprobar: abre la ficha, descarga los archivos, revisa que sea obra del creador y que no copie marcas ni personajes con derechos.</p>
      {modelos.map((m) => (
        <div key={m.id} className="caja flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-linea"><Portada src={m.portada} alt={m.titulo} /></div>
          <div className="min-w-0 flex-1">
            <p className="etiqueta">{nombreCategoria(m.categoria)}</p>
            <p className="font-medium">{m.titulo}</p>
            <p className="text-sm text-tenue">@{m.creador.alias} · enviado el {fecha(m.actualizado)}{m.publicado ? ' · cambio en un modelo ya publicado' : ''}</p>
          </div>
          <div className="flex gap-2">
            <a href={`#/modelo/${m.id}`} target="_blank" className="boton-borde"><Eye className="h-4 w-4" /> Revisar</a>
            <button onClick={() => decidir(m.id, true)} className="boton border border-ok/40 bg-ok/10 text-ok hover:bg-ok/20"><Check className="h-4 w-4" /> Aprobar</button>
            <button onClick={() => decidir(m.id, false)} className="boton-peligro"><X className="h-4 w-4" /> Rechazar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

type Socio = { correo: string; nombre: string; creado: number; alias: string | null; proveedor: string | null; estado: string | null; vence: number | null; descargas: number }

function Socios() {
  const [socios, setSocios] = useState<Socio[] | null>(null)
  const [correo, setCorreo] = useState('')
  const [dias, setDias] = useState('31')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const cargar = useCallback(() => api<{ socios: Socio[] }>('admin/socios').then((r) => setSocios(r.socios)), [])
  useEffect(() => {
    cargar()
  }, [cargar])
  const activar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const r = await api<{ vence: number }>('admin/activar', { datos: { correo, dias: Number(dias) } })
      setAviso({ tipo: 'ok', texto: Number(dias) > 0 ? `Listo: activa hasta el ${fecha(r.vence)}.` : 'Suscripción cortada.' })
      setCorreo('')
      cargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: (err as Error).message })
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <form onSubmit={activar} className="caja h-fit space-y-3 p-5">
        <h2 className="font-semibold">Activar por pago manual</h2>
        <p className="text-xs text-tenue">Cuando alguien paga por transferencia o Deuna. Días negativos cortan la suscripción.</p>
        <input className="entrada" type="email" placeholder="correo@de-la-cuenta.com" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        <div className="flex gap-2">
          <input className="entrada w-24" type="number" value={dias} onChange={(e) => setDias(e.target.value)} />
          <button className="boton-primario flex-1">Activar</button>
        </div>
        {aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}
      </form>
      <div className="caja overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="etiqueta text-left">
            <tr className="border-b border-linea">
              {['Cuenta', 'Creador', 'Suscripción', 'Descargas'].map((t) => <th key={t} className="px-4 py-3 font-normal">{t}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {socios?.map((s) => (
              <tr key={s.correo}>
                <td className="px-4 py-2.5"><p>{s.nombre}</p><p className="text-xs text-tenue">{s.correo}</p></td>
                <td className="px-4 py-2.5 text-tenue">{s.alias ? `@${s.alias}` : '—'}</td>
                <td className="px-4 py-2.5">{s.vence && s.vence > Date.now() ? <span className="text-ok">Hasta {fecha(s.vence)}</span> : <span className="text-tenue">{s.vence ? `Venció ${fecha(s.vence)}` : 'Sin suscripción'}</span>}</td>
                <td className="px-4 py-2.5 font-mono">{s.descargas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type Informe = {
  mes: string
  recaudado: number
  estimado: boolean
  activos: number
  porcentaje: number
  bolsa: number
  descargas: number
  pagos: { alias: string; nombre: string; correo: string; whatsapp: string | null; pago: string; descargas: number; monto: number }[]
}

function Reparto() {
  const ahora = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 7)
  const [mes, setMes] = useState(ahora)
  const [recaudado, setRecaudado] = useState('')
  const [inf, setInf] = useState<Informe | null>(null)
  const [fallo, setFallo] = useState('')
  useEffect(() => {
    setFallo('')
    api<Informe>(`admin/reparto?mes=${mes}${recaudado ? `&recaudado=${encodeURIComponent(recaudado)}` : ''}`).then(setInf).catch((e) => setFallo(e.message))
  }, [mes, recaudado])
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm"><span className="mb-1.5 block">Mes</span><input className="entrada w-44" type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label>
        <label className="text-sm"><span className="mb-1.5 block">Recaudado real (USD)</span><input className="entrada w-44" inputMode="decimal" placeholder={inf ? String(inf.recaudado) : ''} value={recaudado} onChange={(e) => setRecaudado(e.target.value.replace(/[^\d.]/g, ''))} /></label>
      </div>
      {fallo && <Mensaje>{fallo}</Mensaje>}
      {inf && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Dato k={inf.estimado ? `Recaudado (estimado: ${inf.activos} activos)` : 'Recaudado'} v={`${inf.recaudado.toFixed(2)}`} />
            <Dato k={`Bolsa creadores (${inf.porcentaje} %)`} v={inf.bolsa.toFixed(2)} />
            <Dato k="Descargas que cuentan" v={String(inf.descargas)} />
            <Dato k="Para Nodo 3D" v={(inf.recaudado - inf.bolsa).toFixed(2)} />
          </div>
          <p className="text-xs text-tenue">Una descarga por persona y modelo en el mes. No cuentan las del propio creador ni las del administrador. Antes de pagar, pídele a cada creador su factura o nota de venta.</p>
          <div className="caja overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="etiqueta text-left"><tr className="border-b border-linea">{['Creador', 'Descargas', 'A pagar (USD)', 'Datos de pago'].map((t) => <th key={t} className="px-4 py-3 font-normal">{t}</th>)}</tr></thead>
              <tbody className="divide-y divide-linea">
                {inf.pagos.map((p) => (
                  <tr key={p.alias} className="align-top">
                    <td className="px-4 py-3"><p>{p.nombre} <span className="text-acento">@{p.alias}</span></p><p className="text-xs text-tenue">{p.correo}{p.whatsapp ? ` · ${p.whatsapp}` : ''}</p></td>
                    <td className="px-4 py-3 font-mono">{p.descargas}</td>
                    <td className="px-4 py-3 font-mono text-ok">{p.monto.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <pre className="whitespace-pre-wrap font-mono text-xs text-tenue">{p.pago}</pre>
                        <button onClick={() => navigator.clipboard.writeText(p.pago)} title="Copiar" className="p-1 text-tenue hover:text-texto"><Copy className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!inf.pagos.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-tenue">Aún no hay descargas este mes.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const Dato = ({ k, v }: { k: string; v: string }) => (
  <div className="caja p-4"><p className="etiqueta">{k}</p><p className="mt-1 font-mono text-2xl">{v}</p></div>
)
