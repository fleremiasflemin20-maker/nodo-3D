import { useEffect, useRef, useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import { api, fecha } from '../lib/api.ts'
import { useSesion } from '../App.tsx'
import { Encabezado, Mensaje, whatsapp } from '../componentes/Comunes.tsx'

export default function Planes() {
  const { usuario, suscripcion, config } = useSesion()
  return (
    <>
      <Encabezado etiqueta="Planes" titulo="Un precio. Todo el catálogo.">
        Sin compras sueltas ni sorpresas. Cancela cuando quieras.
      </Encabezado>
      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6 md:grid-cols-2">
        <div className="caja relative overflow-hidden border-acento/50 p-7">
          <span className="absolute right-4 top-4 rounded-md bg-acento/15 px-2 py-1 font-mono text-[11px] text-acento">MENSUAL</span>
          <p className="etiqueta">Suscripción Nodo</p>
          <p className="mt-4 flex items-baseline gap-1">
            <span className="font-mono text-5xl font-semibold">{config.precio}</span>
            <span className="text-tenue">USD / mes</span>
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {['Descargas ilimitadas de todo el catálogo', 'STL, 3MF, STEP, Blend, DWG y más', `El ${config.porcentaje} % va a los creadores`, 'Modelos revisados antes de publicarse', 'Cancela cuando quieras'].map((t) => (
              <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-ok" />{t}</li>
            ))}
          </ul>
          <div className="mt-7">
            {suscripcion?.activa ? (
              <Mensaje tipo="ok">Tu suscripción está activa hasta el {fecha(suscripcion.vence!)}.</Mensaje>
            ) : usuario ? (
              <Pagar />
            ) : (
              <a href="#/entrar?modo=registro&volver=%2Fplanes" className="boton-primario w-full">Crear cuenta para suscribirme</a>
            )}
          </div>
        </div>
        <div className="caja p-7">
          <p className="etiqueta text-nodo">Para creadores</p>
          <p className="mt-4 flex items-baseline gap-1">
            <span className="font-mono text-5xl font-semibold">0</span>
            <span className="text-tenue">USD</span>
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {['Publicar es gratis', 'Perfil público con tus modelos', `Cobras el ${config.porcentaje} % de la bolsa según tus descargas`, 'Pago mensual por transferencia', 'Tú eliges la licencia de cada modelo'].map((t) => (
              <li key={t} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-acento" />{t}</li>
            ))}
          </ul>
          <a href="#/vender" className="boton-borde mt-7 w-full">Quiero vender mis modelos</a>
        </div>
      </div>
    </>
  )
}

/** PayPal si ya está configurado; si no (o además), activación manual por WhatsApp. */
function Pagar() {
  const { usuario, config, recargar } = useSesion()
  const caja = useRef<HTMLDivElement>(null)
  const [fallo, setFallo] = useState('')

  useEffect(() => {
    const pp = config.paypal
    if (!pp || !caja.current || !usuario) return
    const s = document.createElement('script')
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(pp.clientId)}&vault=true&intent=subscription&locale=es_EC`
    s.onload = () => {
      const paypal = (window as unknown as { paypal?: { Buttons: (o: object) => { render: (el: HTMLElement) => void } } }).paypal
      if (!paypal || !caja.current) return
      caja.current.innerHTML = ''
      paypal
        .Buttons({
          style: { shape: 'rect', color: 'blue', layout: 'vertical', label: 'subscribe' },
          createSubscription: (_: unknown, actions: { subscription: { create: (o: object) => Promise<string> } }) => actions.subscription.create({ plan_id: pp.planId, custom_id: usuario.id }),
          onApprove: async (d: { subscriptionID: string }) => {
            try {
              await api('paypal/confirmar', { datos: { subscriptionID: d.subscriptionID } })
              await recargar()
            } catch (e) {
              setFallo((e as Error).message)
            }
          },
        })
        .render(caja.current)
    }
    document.body.appendChild(s)
    return () => s.remove()
  }, [config.paypal, usuario, recargar])

  return (
    <div className="space-y-3">
      {config.paypal && <div ref={caja} />}
      {fallo && <Mensaje>{fallo}</Mensaje>}
      <a
        className={config.paypal ? 'boton-borde w-full' : 'boton-primario w-full'}
        href={whatsapp(config.whatsapp, `Hola, quiero activar mi suscripción a Nodo 3D (${config.precio} USD/mes). Mi correo de cuenta es ${usuario?.correo}.`)}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle className="h-4 w-4" /> Pagar por transferencia o Deuna
      </a>
      <p className="text-xs text-tenue">Te enviamos los datos por WhatsApp y activamos tu cuenta en cuanto llegue el pago.</p>
    </div>
  )
}
