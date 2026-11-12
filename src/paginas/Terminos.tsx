import { useSesion } from '../App.tsx'
import { Encabezado } from '../componentes/Comunes.tsx'
import { LICENCIAS } from '../lib/datos.ts'

export default function Terminos() {
  const { config } = useSesion()
  const secciones: [string, React.ReactNode][] = [
    ['1. Qué es Nodo 3D', 'Nodo 3D es un catálogo de modelos 3D hechos por creadores de Ecuador. Quien se suscribe puede descargar todo el catálogo mientras su suscripción esté activa. Por ahora atendemos solo a personas en Ecuador.'],
    ['2. Suscripción', `La suscripción cuesta ${config.precio} USD al mes y se puede cancelar cuando quieras; seguirás descargando hasta el final del mes pagado. Los archivos descargados se rigen por la licencia de cada modelo, no por la suscripción.`],
    ['3. Autoría', 'Cada creador declara que los modelos que publica son de su autoría o que tiene derecho a distribuirlos. No se aceptan copias de otros sitios, modelos sacados de juegos o películas, ni personajes, logotipos o marcas registradas de terceros. Si recibimos una queja fundada, retiramos el modelo y podemos cerrar la cuenta.'],
    ['4. Revisión', 'Todo modelo pasa por revisión antes de publicarse, y vuelve a revisión si cambia después. Podemos rechazar un modelo explicando el motivo.'],
    ['5. Reparto para creadores', `Cada mes, el ${config.porcentaje} % de lo recaudado por suscripciones se reparte entre los creadores en proporción a sus descargas del mes. Cuenta una descarga por persona y modelo; no cuentan las del propio creador. El pago se hace por transferencia bancaria en los primeros días del mes siguiente, contra la factura o nota de venta del creador.`],
    [
      '6. Licencias',
      <ul className="list-disc space-y-1.5 pl-5">
        {LICENCIAS.map((l) => (
          <li key={l.id}><span className="text-texto">{l.nombre}:</span> {l.detalle}</li>
        ))}
      </ul>,
    ],
    ['7. Marcas', 'Blender, Fusion, AutoCAD, SolidWorks, SketchUp, Rhino, ZBrush, Onshape, FreeCAD y Tinkercad son marcas de sus respectivos dueños. Las mencionamos solo para indicar con qué programa se hizo cada modelo; Nodo 3D no tiene relación con ellas.'],
    ['8. Datos personales', 'Guardamos tu nombre, correo y, si eres creador, tus datos de pago, solo para operar el servicio. No los vendemos ni los compartimos. Puedes pedir que borremos tu cuenta por WhatsApp.'],
  ]
  return (
    <>
      <Encabezado etiqueta="Legal" titulo="Términos y licencias" />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-tenue sm:px-6">
        {secciones.map(([t, c]) => (
          <section key={t}>
            <h2 className="mb-2 text-lg font-semibold text-texto">{t}</h2>
            <div className="leading-relaxed">{c}</div>
          </section>
        ))}
      </div>
    </>
  )
}
