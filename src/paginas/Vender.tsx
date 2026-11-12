import { useEffect, useState } from 'react'
import { BadgeCheck, Banknote, Upload } from 'lucide-react'
import { api } from '../lib/api.ts'
import { PROGRAMAS } from '../lib/datos.ts'
import { ir } from '../lib/ruta.ts'
import { useSesion } from '../App.tsx'
import { Encabezado, Mensaje } from '../componentes/Comunes.tsx'
import { Campo } from './Entrar.tsx'

type Perfil = { alias: string; bio: string; ciudad: string; programas: string[]; whatsapp: string; pago: string }

export default function Vender() {
  const { usuario, config, cargando } = useSesion()
  return (
    <>
      <Encabezado etiqueta="Vender en Nodo 3D" titulo="Publica gratis. Cobra por cada descarga.">
        Cada mes repartimos el {config.porcentaje} % de las suscripciones entre los creadores, según cuántas personas descargaron sus modelos ese mes.
      </Encabezado>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {[
            [Upload, 'Sube tu modelo', 'Archivos (STL, 3MF, STEP, Blend, DWG…), fotos o renders y una buena descripción. Hasta 95 MB por archivo.'],
            [BadgeCheck, 'Lo revisamos', 'Comprobamos que sea tuyo, que no copie marcas registradas ni personajes con derechos y que los archivos abran bien.'],
            [Banknote, 'Cobras cada mes', 'Contamos una descarga por persona y modelo al mes. Te transferimos tu parte durante los primeros días del mes siguiente.'],
          ].map(([I, t, d], i) => {
            const Icono = I as typeof Upload
            return (
              <div key={i} className="caja flex gap-4 p-5">
                <Icono className="h-6 w-6 shrink-0 text-acento" />
                <div>
                  <h3 className="font-semibold">{t as string}</h3>
                  <p className="mt-1 text-sm text-tenue">{d as string}</p>
                </div>
              </div>
            )
          })}
        </div>
        {cargando ? null : usuario ? (
          <Formulario />
        ) : (
          <div className="caja flex flex-col items-start justify-center p-8">
            <h2 className="text-xl font-semibold">Primero, tu cuenta</h2>
            <p className="mt-2 text-tenue">Con la misma cuenta descargas y vendes.</p>
            <a href="#/entrar?modo=registro&volver=%2Fvender" className="boton-primario mt-6">Crear cuenta</a>
          </div>
        )}
      </div>
    </>
  )
}

function Formulario() {
  const { usuario, recargar } = useSesion()
  const [p, setP] = useState<Perfil>({ alias: '', bio: '', ciudad: '', programas: [], whatsapp: '', pago: '' })
  const [acepto, setAcepto] = useState(false)
  const [fallo, setFallo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const existe = !!usuario?.alias

  useEffect(() => {
    if (existe) api<{ perfil: Perfil | null }>('creador/perfil').then((r) => r.perfil && setP({ ...r.perfil, bio: r.perfil.bio ?? '', ciudad: r.perfil.ciudad ?? '', whatsapp: r.perfil.whatsapp ?? '' }))
  }, [existe])

  const cambiar = (k: keyof Perfil, v: string | string[]) => setP((x) => ({ ...x, [k]: v }))
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFallo('')
    setGuardando(true)
    try {
      await api('creador/perfil', { datos: { ...p, acepto } })
      await recargar()
      ir('/panel')
    } catch (err) {
      setFallo((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="caja space-y-5 p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{existe ? 'Tu perfil de creador' : 'Crea tu perfil de creador'}</h2>
      <Campo etiqueta="Alias público" ayuda="Tu dirección será nodo3d…/#/creador/tu-alias. Minúsculas, números y guiones.">
        <div className="flex items-center rounded-lg border border-linea bg-fondo focus-within:border-acento">
          <span className="pl-3 font-mono text-sm text-tenue">@</span>
          <input className="w-full bg-transparent px-1.5 py-2.5 font-mono text-sm outline-none" value={p.alias} onChange={(e) => cambiar('alias', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} maxLength={30} required />
        </div>
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Ciudad"><input className="entrada" value={p.ciudad} onChange={(e) => cambiar('ciudad', e.target.value)} placeholder="Quito, Guayaquil, Cuenca…" /></Campo>
        <Campo etiqueta="WhatsApp" ayuda="Solo lo ve el administrador."><input className="entrada" value={p.whatsapp} onChange={(e) => cambiar('whatsapp', e.target.value)} placeholder="+593…" inputMode="tel" /></Campo>
      </div>
      <Campo etiqueta="Sobre ti" ayuda="Qué modelas, tu experiencia, en qué te especializas.">
        <textarea className="entrada min-h-24" value={p.bio} onChange={(e) => cambiar('bio', e.target.value)} maxLength={500} />
      </Campo>
      <div>
        <span className="mb-2 block text-sm font-medium">Programas que usas</span>
        <div className="flex flex-wrap gap-1.5">
          {PROGRAMAS.map((x) => {
            const activo = p.programas.includes(x.id)
            return (
              <button type="button" key={x.id} onClick={() => cambiar('programas', activo ? p.programas.filter((y) => y !== x.id) : [...p.programas, x.id])} className={`rounded-md border px-2.5 py-1.5 text-sm ${activo ? 'border-acento bg-acento/10 text-acento' : 'border-linea text-tenue hover:text-texto'}`}>
                {x.nombre}
              </button>
            )
          })}
        </div>
      </div>
      <Campo etiqueta="Datos para tu pago" ayuda="Banco, tipo de cuenta, número, nombre y cédula del titular. Solo lo ve el administrador.">
        <textarea className="entrada min-h-20 font-mono" value={p.pago} onChange={(e) => cambiar('pago', e.target.value)} maxLength={300} required />
      </Campo>
      {!existe && (
        <label className="flex gap-3 rounded-lg border border-linea bg-fondo p-3.5 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#4DA3FF]" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
          <span>
            Declaro que los modelos que suba son de mi autoría o tengo derecho a venderlos, y que no copian marcas ni personajes protegidos. Acepto los <a href="#/terminos" className="text-acento underline" target="_blank">términos de Nodo 3D</a>.
          </span>
        </label>
      )}
      {fallo && <Mensaje>{fallo}</Mensaje>}
      <button className="boton-primario w-full" disabled={guardando || (!existe && !acepto)}>{guardando ? 'Guardando…' : existe ? 'Guardar cambios' : 'Crear mi perfil'}</button>
    </form>
  )
}
