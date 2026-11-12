import { useState } from 'react'
import { api } from '../lib/api.ts'
import { ir } from '../lib/ruta.ts'
import { useSesion } from '../App.tsx'
import { Mensaje } from '../componentes/Comunes.tsx'
import { Marca } from '../componentes/Logo.tsx'

export default function Entrar({ modo, volver }: { modo: 'entrar' | 'registro'; volver: string | null }) {
  const { recargar } = useSesion()
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [fallo, setFallo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const registro = modo === 'registro'
  const sufijo = volver ? `&volver=${encodeURIComponent(volver)}` : ''

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFallo('')
    setEnviando(true)
    try {
      await api(registro ? 'registro' : 'entrar', { datos: registro ? { nombre, correo, clave } : { correo, clave } })
      await recargar()
      ir(volver && volver.startsWith('/') ? volver : registro ? '/planes' : '/')
    } catch (err) {
      setFallo((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="plano flex min-h-[80vh] items-center justify-center px-4 py-16">
      <form onSubmit={enviar} className="caja w-full max-w-sm space-y-4 p-7">
        <Marca className="h-10 w-10" />
        <div>
          <h1 className="text-2xl font-semibold">{registro ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
          <p className="mt-1 text-sm text-tenue">{registro ? 'Una sola cuenta para descargar y para vender tus modelos.' : 'Bienvenido de vuelta a Nodo 3D.'}</p>
        </div>
        {registro && (
          <Campo etiqueta="Nombre">
            <input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required />
          </Campo>
        )}
        <Campo etiqueta="Correo">
          <input className="entrada" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" required />
        </Campo>
        <Campo etiqueta="Contraseña">
          <input className="entrada" type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete={registro ? 'new-password' : 'current-password'} minLength={8} required />
        </Campo>
        {fallo && <Mensaje>{fallo}</Mensaje>}
        <button className="boton-primario w-full" disabled={enviando}>{enviando ? 'Un momento…' : registro ? 'Crear cuenta' : 'Entrar'}</button>
        <p className="text-center text-sm text-tenue">
          {registro ? '¿Ya tienes cuenta? ' : '¿Primera vez? '}
          <a className="text-acento hover:underline" href={`#/entrar?modo=${registro ? 'entrar' : 'registro'}${sufijo}`}>
            {registro ? 'Inicia sesión' : 'Crea tu cuenta'}
          </a>
        </p>
      </form>
    </div>
  )
}

export const Campo = ({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium">{etiqueta}</span>
    {children}
    {ayuda && <span className="mt-1 block text-xs text-tenue">{ayuda}</span>}
  </label>
)
