import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { api, fecha } from '../lib/api.ts'
import { ir } from '../lib/ruta.ts'
import { useSesion } from '../App.tsx'
import { ConSesion, Encabezado, Mensaje } from '../componentes/Comunes.tsx'
import { Campo } from './Entrar.tsx'

export default function Cuenta() {
  return (
    <ConSesion>
      <Contenido />
    </ConSesion>
  )
}

function Contenido() {
  const { usuario, suscripcion, recargar } = useSesion()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  if (!usuario) return null

  const salir = async () => {
    await api('salir', { datos: {} }).catch(() => {})
    await recargar()
    ir('/')
  }
  const cambiar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api('clave', { datos: { actual, nueva } })
      setActual('')
      setNueva('')
      setAviso({ tipo: 'ok', texto: 'Contraseña cambiada.' })
    } catch (err) {
      setAviso({ tipo: 'error', texto: (err as Error).message })
    }
  }

  return (
    <>
      <Encabezado etiqueta="Mi cuenta" titulo={usuario.nombre}>{usuario.correo}</Encabezado>
      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6 md:grid-cols-2">
        <section className="caja p-6">
          <h2 className="font-semibold">Suscripción</h2>
          {suscripcion?.activa ? (
            <p className="mt-3 text-sm"><span className="text-ok">Activa</span> hasta el {fecha(suscripcion.vence!)}.</p>
          ) : (
            <>
              <p className="mt-3 text-sm text-tenue">{suscripcion?.vence ? `Venció el ${fecha(suscripcion.vence)}.` : 'Todavía no tienes una suscripción.'}</p>
              <a href="#/planes" className="boton-primario mt-4">Activar suscripción</a>
            </>
          )}
        </section>
        <section className="caja p-6">
          <h2 className="font-semibold">Creador</h2>
          {usuario.alias ? (
            <>
              <p className="mt-3 text-sm text-tenue">Tu perfil público es <a className="text-acento hover:underline" href={`#/creador/${usuario.alias}`}>@{usuario.alias}</a>.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="#/panel" className="boton-primario">Mi panel</a>
                <a href="#/vender" className="boton-borde">Editar perfil</a>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-tenue">¿Diseñas modelos 3D? Publica gratis y cobra por cada descarga.</p>
              <a href="#/vender" className="boton-borde mt-4">Hacerme creador</a>
            </>
          )}
        </section>
        <form onSubmit={cambiar} className="caja space-y-4 p-6">
          <h2 className="font-semibold">Cambiar contraseña</h2>
          <Campo etiqueta="Contraseña actual"><input className="entrada" type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" required /></Campo>
          <Campo etiqueta="Nueva contraseña"><input className="entrada" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" minLength={8} required /></Campo>
          {aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}
          <button className="boton-borde">Guardar</button>
        </form>
        <section className="caja flex flex-col justify-between p-6">
          <h2 className="font-semibold">Sesión</h2>
          <button onClick={salir} className="boton-peligro mt-4 self-start"><LogOut className="h-4 w-4" /> Cerrar sesión</button>
        </section>
      </div>
    </>
  )
}
