/*
 * El Worker de Nodo 3D. La web es estática (la sirve ASSETS); este código solo
 * atiende /api/*:
 *
 *   cuentas (correo + contraseña) y sesiones → D1
 *   creadores: perfil público, modelos, subida de archivos e imágenes a R2
 *   revisión: un modelo solo se ve cuando el administrador lo aprueba
 *   suscripción mensual con PayPal, o activación manual del administrador
 *   descargas solo para suscriptores, contadas para el reparto del mes
 *
 * En R2 cada modelo vive bajo `modelos/<id>/archivos/` y `modelos/<id>/imagenes/`.
 * Las cuentas y la suscripción son las del Club Flemin de la Biblioteca 3D.
 */
import type { Entorno, R2Objeto } from './tipos.ts'
import {
  DIA,
  DURACION_SESION,
  RESERVADOS,
  type SuscripcionPayPal,
  aliasValido,
  cifrarClave,
  comprobarClave,
  correoValido,
  deLista,
  hashToken,
  idDeTitulo,
  idValido,
  leerCookie,
  linea,
  mesEcuador,
  mesValido,
  nombreArchivoValido,
  normalizarCorreo,
  nuevoId,
  nuevoToken,
  parrafos,
  problemaClave,
  repartir,
  suscripcionDelEvento,
  unoDe,
  venceManual,
  venceSegunPayPal,
} from './logica.ts'
import { CATEGORIAS, FORMATOS, IMAGENES, LICENCIAS, MAX_ARCHIVO, MAX_ARCHIVOS, MAX_IMAGEN, MAX_IMAGENES, PROGRAMAS, extension } from './catalogo.ts'

const COOKIE = 'nodo_sesion'

type Usuario = { id: string; correo: string; nombre: string; alias: string | null }
type Suscripcion = { proveedor: string; referencia: string | null; estado: string; vence: number }
type FilaModelo = {
  id: string
  creador_id: string
  titulo: string
  descripcion: string
  categoria: string
  programas: string
  licencia: string
  imprimible: number
  estado: string
  motivo: string | null
  portada: string | null
  creado: number
  actualizado: number
  publicado: number | null
  alias?: string
  creador_nombre?: string
  descargas?: number
}
type Tipo = 'archivos' | 'imagenes'

const json = (datos: unknown, estado = 200, extra?: HeadersInit) => {
  const h = new Headers(extra)
  h.set('content-type', 'application/json; charset=utf-8')
  h.set('cache-control', 'no-store')
  return new Response(JSON.stringify(datos), { status: estado, headers: h })
}
const error = (mensaje: string, estado = 400) => json({ error: mensaje }, estado)
const leer = async <T>(req: Request) => ((await req.json().catch(() => ({}))) ?? {}) as Partial<T>

const cookieSesion = (token: string, url: URL) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DURACION_SESION / 1000}${url.protocol === 'https:' ? '; Secure' : ''}`
const cookieBorrada = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`

const porcentaje = (env: Entorno) => {
  const p = Number(env.PORCENTAJE_CREADORES ?? '60')
  return Number.isFinite(p) && p >= 0 && p <= 100 ? p : 60
}
const precio = (env: Entorno) => env.PRECIO ?? '4.99'

export default {
  async fetch(peticion: Request, env: Entorno): Promise<Response> {
    const url = new URL(peticion.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(peticion)
    try {
      return await api(peticion, url, env)
    } catch (e) {
      console.error(e)
      return error('Algo falló en el servidor. Intenta de nuevo en un momento.', 500)
    }
  },
}

async function api(req: Request, url: URL, env: Entorno): Promise<Response> {
  const ruta = url.pathname.replace(/\/+$/, '')
  const metodo = req.method

  // Toda escritura que no sea el webhook de PayPal tiene que venir de la propia web.
  if (metodo !== 'GET' && ruta !== '/api/paypal/webhook') {
    const origen = req.headers.get('origin')
    if (origen && new URL(origen).host !== url.host) return error('Origen no permitido.', 403)
  }

  /* ── Público ── */
  if (ruta === '/api/config' && metodo === 'GET') {
    return json({
      precio: precio(env),
      porcentaje: porcentaje(env),
      paypal: env.PAYPAL_CLIENT_ID && env.PAYPAL_PLAN_ID ? { clientId: env.PAYPAL_CLIENT_ID, planId: env.PAYPAL_PLAN_ID } : null,
      whatsapp: env.WHATSAPP ?? '593979523040',
    })
  }
  if (ruta === '/api/modelos' && metodo === 'GET') return listarModelos(url, env)
  if (ruta === '/api/resumen' && metodo === 'GET') {
    const r = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM modelos WHERE estado = 'publicado') AS modelos,
              (SELECT COUNT(DISTINCT creador_id) FROM modelos WHERE estado = 'publicado') AS creadores,
              (SELECT COUNT(*) FROM descargas) AS descargas`,
    ).first()
    return json(r)
  }

  let m = ruta.match(/^\/api\/modelos\/([^/]+)$/)
  if (m && metodo === 'GET') return verModelo(req, env, decodeURIComponent(m[1]))

  m = ruta.match(/^\/api\/creadores\/([^/]+)$/)
  if (m && metodo === 'GET') return verCreador(env, decodeURIComponent(m[1]))

  m = ruta.match(/^\/api\/imagen\/([^/]+)\/([^/]+)$/)
  if (m && metodo === 'GET') return imagen(req, env, decodeURIComponent(m[1]), decodeURIComponent(m[2]))

  m = ruta.match(/^\/api\/descargar\/([^/]+)\/([^/]+)$/)
  if (m && metodo === 'GET') return descargar(req, env, decodeURIComponent(m[1]), decodeURIComponent(m[2]))

  /* ── Cuenta ── */
  if (ruta === '/api/registro' && metodo === 'POST') return registro(req, url, env)
  if (ruta === '/api/entrar' && metodo === 'POST') return entrar(req, url, env)
  if (ruta === '/api/salir' && metodo === 'POST') {
    const t = leerCookie(req.headers.get('cookie'), COOKIE)
    if (t) await env.DB.prepare('DELETE FROM sesiones WHERE token = ?').bind(await hashToken(t)).run()
    return json({ ok: true }, 200, { 'set-cookie': cookieBorrada })
  }
  if (ruta === '/api/yo' && metodo === 'GET') {
    const u = await usuarioDe(req, env)
    if (!u) return json({ usuario: null })
    let s = await suscripcionDe(env, u.id)
    if (s && s.proveedor === 'paypal' && s.referencia && s.vence < Date.now()) s = (await sincronizarPayPal(env, u.id, s.referencia).catch(() => null)) ?? s
    return json({ usuario: { id: u.id, correo: u.correo, nombre: u.nombre, alias: u.alias, admin: esAdmin(env, u.correo) }, suscripcion: resumen(s) })
  }
  if (ruta === '/api/clave' && metodo === 'POST') {
    const u = await usuarioDe(req, env)
    if (!u) return error('Inicia sesión primero.', 401)
    const { actual, nueva } = await leer<{ actual: string; nueva: string }>(req)
    const fila = await env.DB.prepare('SELECT clave FROM usuarios WHERE id = ?').bind(u.id).first<{ clave: string }>()
    if (!fila || typeof actual !== 'string' || !(await comprobarClave(actual, fila.clave))) return error('La contraseña actual no es correcta.', 401)
    const p = problemaClave(nueva)
    if (p) return error(p)
    const t = leerCookie(req.headers.get('cookie'), COOKIE)
    await env.DB.batch([
      env.DB.prepare('UPDATE usuarios SET clave = ? WHERE id = ?').bind(await cifrarClave(nueva!), u.id),
      env.DB.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND token != ?').bind(u.id, t ? await hashToken(t) : ''),
    ])
    return json({ ok: true })
  }

  /* ── PayPal ── */
  if (ruta === '/api/paypal/confirmar' && metodo === 'POST') {
    const u = await usuarioDe(req, env)
    if (!u) return error('Inicia sesión primero.', 401)
    const { subscriptionID } = await leer<{ subscriptionID: string }>(req)
    if (!subscriptionID || !/^I-[A-Z0-9]{6,40}$/.test(subscriptionID)) return error('Suscripción no válida.')
    const s = await sincronizarPayPal(env, u.id, subscriptionID)
    if (!s) return error('PayPal no confirmó la suscripción. Si ya pagaste, escríbenos por WhatsApp.', 402)
    return json({ suscripcion: resumen(s) })
  }
  if (ruta === '/api/paypal/webhook' && metodo === 'POST') {
    // No hace falta fiarse del contenido: se vuelve a preguntar a PayPal por la suscripción.
    const ref = suscripcionDelEvento(await req.json().catch(() => null))
    if (ref) {
      const fila = await env.DB.prepare("SELECT usuario_id FROM suscripciones WHERE proveedor = 'paypal' AND referencia = ?").bind(ref).first<{ usuario_id: string }>()
      const dueno = fila?.usuario_id ?? (await duenoSegunPayPal(env, ref))
      if (dueno) await sincronizarPayPal(env, dueno, ref)
    }
    return json({ ok: true })
  }

  /* ── Creadores ── */
  if (ruta.startsWith('/api/creador/')) {
    const u = await usuarioDe(req, env)
    if (!u) return error('Inicia sesión primero.', 401)
    return creador(req, ruta, metodo, env, u)
  }

  /* ── Administrador ── */
  if (ruta.startsWith('/api/admin/')) {
    const u = await usuarioDe(req, env)
    if (!u || !esAdmin(env, u.correo)) return error('Solo para el administrador.', 403)
    return admin(req, url, ruta, metodo, env)
  }

  return error('No encontrado.', 404)
}

/* ── Catálogo público ────────────────────────────────────────── */

const SELECT_MODELO = `SELECT m.*, c.alias, u.nombre AS creador_nombre,
  (SELECT COUNT(DISTINCT d.usuario_id) FROM descargas d WHERE d.modelo_id = m.id) AS descargas
  FROM modelos m JOIN creadores c ON c.usuario_id = m.creador_id JOIN usuarios u ON u.id = m.creador_id`

const tarjeta = (f: FilaModelo) => ({
  id: f.id,
  titulo: f.titulo,
  categoria: f.categoria,
  programas: JSON.parse(f.programas) as string[],
  licencia: f.licencia,
  imprimible: !!f.imprimible,
  estado: f.estado,
  motivo: f.motivo,
  portada: f.portada ? `/api/imagen/${encodeURIComponent(f.id)}/${encodeURIComponent(f.portada)}` : null,
  creador: { alias: f.alias, nombre: f.creador_nombre },
  descargas: f.descargas ?? 0,
  publicado: f.publicado,
  actualizado: f.actualizado,
})

async function listarModelos(url: URL, env: Entorno) {
  const p = url.searchParams
  const donde = ["m.estado = 'publicado'"]
  const valores: unknown[] = []
  const q = linea(p.get('q'), 60)
  if (q) {
    donde.push('(m.titulo LIKE ? OR m.descripcion LIKE ? OR c.alias LIKE ?)')
    const like = `%${q.replace(/[%_]/g, '')}%`
    valores.push(like, like, like)
  }
  const cat = unoDe(p.get('categoria'), CATEGORIAS)
  if (cat) (donde.push('m.categoria = ?'), valores.push(cat))
  const prog = unoDe(p.get('programa'), PROGRAMAS)
  if (prog) (donde.push('m.programas LIKE ?'), valores.push(`%"${prog}"%`))
  const orden = p.get('orden') === 'populares' ? 'descargas DESC, m.publicado DESC' : 'm.publicado DESC'
  const { results } = await env.DB.prepare(`${SELECT_MODELO} WHERE ${donde.join(' AND ')} ORDER BY ${orden} LIMIT 120`)
    .bind(...valores)
    .all<FilaModelo>()
  return json({ modelos: results.map(tarjeta) })
}

async function verModelo(req: Request, env: Entorno, id: string) {
  if (!idValido(id)) return error('Modelo no válido.')
  const f = await env.DB.prepare(`${SELECT_MODELO} WHERE m.id = ?`).bind(id).first<FilaModelo>()
  if (!f) return error('Ese modelo no existe.', 404)
  if (f.estado !== 'publicado') {
    // Los borradores y los que están en revisión solo los ven su creador y el administrador.
    const u = await usuarioDe(req, env)
    if (!u || (u.id !== f.creador_id && !esAdmin(env, u.correo))) return error('Ese modelo no existe.', 404)
  }
  const [archivos, imagenes] = await Promise.all([listarArchivos(env, id, 'archivos'), listarArchivos(env, id, 'imagenes')])
  return json({
    modelo: {
      ...tarjeta(f),
      descripcion: f.descripcion,
      creado: f.creado,
      archivos: archivos.map((o) => ({ nombre: nombreDe(o, id, 'archivos'), tamano: o.size })),
      imagenes: imagenes
        .map((o) => nombreDe(o, id, 'imagenes'))
        .sort((a, b) => (a === f.portada ? -1 : b === f.portada ? 1 : a.localeCompare(b)))
        .map((n) => ({ nombre: n, url: `/api/imagen/${encodeURIComponent(id)}/${encodeURIComponent(n)}` })),
    },
  })
}

async function verCreador(env: Entorno, alias: string) {
  if (!aliasValido(alias)) return error('Ese creador no existe.', 404)
  const c = await env.DB.prepare('SELECT c.usuario_id, c.alias, c.bio, c.ciudad, c.programas, c.creado, u.nombre FROM creadores c JOIN usuarios u ON u.id = c.usuario_id WHERE c.alias = ?')
    .bind(alias)
    .first<{ usuario_id: string; alias: string; bio: string | null; ciudad: string | null; programas: string; creado: number; nombre: string }>()
  if (!c) return error('Ese creador no existe.', 404)
  const { results } = await env.DB.prepare(`${SELECT_MODELO} WHERE m.creador_id = ? AND m.estado = 'publicado' ORDER BY m.publicado DESC`).bind(c.usuario_id).all<FilaModelo>()
  return json({
    creador: { alias: c.alias, nombre: c.nombre, bio: c.bio, ciudad: c.ciudad, programas: JSON.parse(c.programas), desde: c.creado },
    modelos: results.map(tarjeta),
  })
}

/* ── Panel del creador ───────────────────────────────────────── */

async function creador(req: Request, ruta: string, metodo: string, env: Entorno, u: Usuario): Promise<Response> {
  if (ruta === '/api/creador/perfil' && metodo === 'GET') {
    const c = await env.DB.prepare('SELECT alias, bio, ciudad, programas, whatsapp, pago FROM creadores WHERE usuario_id = ?').bind(u.id).first<Record<string, string>>()
    return json({ perfil: c ? { ...c, programas: JSON.parse(c.programas) } : null })
  }
  if (ruta === '/api/creador/perfil' && metodo === 'POST') {
    const b = await leer<{ alias: string; bio: string; ciudad: string; programas: string[]; whatsapp: string; pago: string; acepto: boolean }>(req)
    const alias = linea(b.alias, 30).toLowerCase()
    if (!aliasValido(alias) || RESERVADOS.has(alias)) return error('El alias va en minúsculas, con letras, números y guiones (3 a 30 caracteres).')
    const programas = deLista(b.programas, PROGRAMAS)
    if (!programas.length) return error('Marca al menos un programa con el que trabajas.')
    const pago = parrafos(b.pago, 300)
    if (pago.length < 10) return error('Escribe tu banco, tipo y número de cuenta para enviarte tus ganancias.')
    const previo = await env.DB.prepare('SELECT acepto FROM creadores WHERE usuario_id = ?').bind(u.id).first<{ acepto: number }>()
    if (!previo && b.acepto !== true) return error('Tienes que aceptar que los modelos que subas son de tu autoría.')
    const otro = await env.DB.prepare('SELECT usuario_id FROM creadores WHERE alias = ?').bind(alias).first<{ usuario_id: string }>()
    if (otro && otro.usuario_id !== u.id) return error('Ese alias ya lo usa otro creador.', 409)
    const whatsapp = typeof b.whatsapp === 'string' ? b.whatsapp.replace(/[^\d+]/g, '').slice(0, 16) : ''
    await env.DB.prepare(
      `INSERT INTO creadores (usuario_id, alias, bio, ciudad, programas, whatsapp, pago, acepto, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (usuario_id) DO UPDATE SET alias = excluded.alias, bio = excluded.bio, ciudad = excluded.ciudad,
         programas = excluded.programas, whatsapp = excluded.whatsapp, pago = excluded.pago`,
    )
      .bind(u.id, alias, parrafos(b.bio, 500) || null, linea(b.ciudad, 60) || null, JSON.stringify(programas), whatsapp.length >= 7 ? whatsapp : null, pago, previo?.acepto ?? Date.now(), Date.now())
      .run()
    return json({ ok: true, alias })
  }

  if (!u.alias) return error('Primero crea tu perfil de creador.', 403)

  if (ruta === '/api/creador/modelos' && metodo === 'GET') {
    const { results } = await env.DB.prepare(`${SELECT_MODELO} WHERE m.creador_id = ? ORDER BY m.actualizado DESC`).bind(u.id).all<FilaModelo>()
    return json({ modelos: results.map(tarjeta) })
  }
  if (ruta === '/api/creador/modelos' && metodo === 'POST') {
    const datos = datosModelo(await leer<Record<string, unknown>>(req))
    if (typeof datos === 'string') return error(datos)
    const id = idDeTitulo(datos.titulo)
    const ahora = Date.now()
    await env.DB.prepare(
      `INSERT INTO modelos (id, creador_id, titulo, descripcion, categoria, programas, licencia, imprimible, estado, creado, actualizado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?)`,
    )
      .bind(id, u.id, datos.titulo, datos.descripcion, datos.categoria, JSON.stringify(datos.programas), datos.licencia, datos.imprimible ? 1 : 0, ahora, ahora)
      .run()
    return json({ id })
  }
  if (ruta === '/api/creador/ganancias' && metodo === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT mes, COUNT(DISTINCT usuario_id || '|' || modelo_id) AS descargas FROM descargas
        WHERE creador_id = ? AND usuario_id != creador_id GROUP BY mes ORDER BY mes DESC LIMIT 12`,
    )
      .bind(u.id)
      .all<{ mes: string; descargas: number }>()
    return json({ meses: results, mes: mesEcuador(Date.now()) })
  }

  let m = ruta.match(/^\/api\/creador\/modelos\/([^/]+)$/)
  if (m) {
    const modelo = await propio(env, u, decodeURIComponent(m[1]))
    if (!modelo) return error('Ese modelo no es tuyo.', 404)
    if (metodo === 'POST') {
      if (modelo.estado === 'revision') return error('Está en revisión. Espera la respuesta antes de cambiarlo.', 409)
      const datos = datosModelo(await leer<Record<string, unknown>>(req))
      if (typeof datos === 'string') return error(datos)
      // Cambiar uno ya publicado lo devuelve a revisión, para que nada entre sin que lo vea el administrador.
      const estado = modelo.estado === 'publicado' ? 'revision' : modelo.estado
      await env.DB.prepare('UPDATE modelos SET titulo = ?, descripcion = ?, categoria = ?, programas = ?, licencia = ?, imprimible = ?, estado = ?, actualizado = ? WHERE id = ?')
        .bind(datos.titulo, datos.descripcion, datos.categoria, JSON.stringify(datos.programas), datos.licencia, datos.imprimible ? 1 : 0, estado, Date.now(), modelo.id)
        .run()
      return json({ ok: true, estado })
    }
    if (metodo === 'DELETE') {
      const todo = [...(await listarArchivos(env, modelo.id, 'archivos')), ...(await listarArchivos(env, modelo.id, 'imagenes'))].map((o) => o.key)
      for (let i = 0; i < todo.length; i += 1000) await env.ARCHIVOS.delete(todo.slice(i, i + 1000))
      await env.DB.prepare('DELETE FROM modelos WHERE id = ?').bind(modelo.id).run()
      return json({ ok: true })
    }
  }

  m = ruta.match(/^\/api\/creador\/modelos\/([^/]+)\/enviar$/)
  if (m && metodo === 'POST') {
    const modelo = await propio(env, u, decodeURIComponent(m[1]))
    if (!modelo) return error('Ese modelo no es tuyo.', 404)
    if (modelo.estado === 'publicado' || modelo.estado === 'revision') return error('Ya está enviado.', 409)
    const [archivos, imagenes] = await Promise.all([listarArchivos(env, modelo.id, 'archivos'), listarArchivos(env, modelo.id, 'imagenes')])
    if (!archivos.length) return error('Sube al menos un archivo del modelo.')
    if (!imagenes.length) return error('Sube al menos una foto o render.')
    await env.DB.prepare("UPDATE modelos SET estado = 'revision', motivo = NULL, actualizado = ? WHERE id = ?").bind(Date.now(), modelo.id).run()
    return json({ ok: true })
  }

  m = ruta.match(/^\/api\/creador\/modelos\/([^/]+)\/portada\/([^/]+)$/)
  if (m && metodo === 'POST') {
    const modelo = await propio(env, u, decodeURIComponent(m[1]))
    const nombre = decodeURIComponent(m[2])
    if (!modelo) return error('Ese modelo no es tuyo.', 404)
    if (!(await env.ARCHIVOS.get(`modelos/${modelo.id}/imagenes/${nombre}`))) return error('Esa imagen no existe.', 404)
    await env.DB.prepare('UPDATE modelos SET portada = ?, actualizado = ? WHERE id = ?').bind(nombre, Date.now(), modelo.id).run()
    return json({ ok: true })
  }

  m = ruta.match(/^\/api\/creador\/modelos\/([^/]+)\/(archivos|imagenes)\/([^/]+)$/)
  if (m && (metodo === 'PUT' || metodo === 'DELETE')) {
    const modelo = await propio(env, u, decodeURIComponent(m[1]))
    const tipo = m[2] as Tipo
    const nombre = decodeURIComponent(m[3])
    if (!modelo) return error('Ese modelo no es tuyo.', 404)
    if (modelo.estado === 'revision') return error('Está en revisión. Espera la respuesta antes de cambiarlo.', 409)
    if (!nombreArchivoValido(nombre)) return error('Ese nombre de archivo no sirve. Usa letras, números, guiones y puntos.')
    const clave = `modelos/${modelo.id}/${tipo}/${nombre}`
    if (metodo === 'DELETE') {
      await env.ARCHIVOS.delete(clave)
      if (tipo === 'imagenes' && modelo.portada === nombre) await env.DB.prepare('UPDATE modelos SET portada = NULL WHERE id = ?').bind(modelo.id).run()
      return json({ ok: true })
    }
    return subir(req, env, modelo, tipo, nombre, clave)
  }

  return error('No encontrado.', 404)
}

/** Valida lo que manda el formulario de un modelo. Devuelve el error como texto. */
function datosModelo(b: Record<string, unknown>) {
  const titulo = linea(b.titulo, 80)
  if (titulo.length < 4) return 'El título necesita al menos 4 letras.'
  const descripcion = parrafos(b.descripcion, 4000)
  if (descripcion.length < 30) return 'Describe el modelo con al menos 30 caracteres: qué es, medidas, cómo imprimirlo.'
  const categoria = unoDe(b.categoria, CATEGORIAS)
  if (!categoria) return 'Elige una categoría.'
  const programas = deLista(b.programas, PROGRAMAS)
  if (!programas.length) return 'Marca con qué programa lo hiciste.'
  const licencia = unoDe(b.licencia, LICENCIAS)
  if (!licencia) return 'Elige una licencia.'
  return { titulo, descripcion, categoria, programas, licencia, imprimible: b.imprimible !== false }
}

const propio = (env: Entorno, u: Usuario, id: string) =>
  idValido(id) ? env.DB.prepare('SELECT * FROM modelos WHERE id = ? AND creador_id = ?').bind(id, u.id).first<FilaModelo>() : Promise.resolve(null)

async function subir(req: Request, env: Entorno, modelo: FilaModelo, tipo: Tipo, nombre: string, clave: string) {
  const ext = extension(nombre)
  const tipos = tipo === 'archivos' ? FORMATOS : IMAGENES
  if (!tipos[ext]) return error(tipo === 'archivos' ? `Formato .${ext} no admitido.` : 'Las imágenes van en JPG, PNG o WebP.')
  const largo = Number(req.headers.get('content-length'))
  const maximo = tipo === 'archivos' ? MAX_ARCHIVO : MAX_IMAGEN
  if (!Number.isFinite(largo) || largo <= 0) return error('El archivo llegó vacío.')
  if (largo > maximo) return error(`Pesa demasiado: el máximo es ${Math.round(maximo / 1048576)} MB. Comprímelo en .zip o divídelo.`, 413)
  const existentes = await listarArchivos(env, modelo.id, tipo)
  const tope = tipo === 'archivos' ? MAX_ARCHIVOS : MAX_IMAGENES
  if (existentes.length >= tope && !existentes.some((o) => o.key === clave)) return error(`Máximo ${tope} ${tipo === 'archivos' ? 'archivos' : 'imágenes'} por modelo.`)
  if (!req.body) return error('El archivo llegó vacío.')
  await env.ARCHIVOS.put(clave, req.body, { httpMetadata: { contentType: tipos[ext] } })
  const cambios = ['actualizado = ?']
  const valores: unknown[] = [Date.now()]
  if (tipo === 'imagenes' && !modelo.portada) (cambios.push('portada = ?'), valores.push(nombre))
  // Un archivo nuevo en un modelo publicado también pasa por revisión.
  if (modelo.estado === 'publicado') cambios.push("estado = 'revision'")
  await env.DB.prepare(`UPDATE modelos SET ${cambios.join(', ')} WHERE id = ?`).bind(...valores, modelo.id).run()
  return json({ ok: true, nombre })
}

/* ── Administrador ───────────────────────────────────────────── */

async function admin(req: Request, url: URL, ruta: string, metodo: string, env: Entorno): Promise<Response> {
  if (ruta === '/api/admin/revision' && metodo === 'GET') {
    const { results } = await env.DB.prepare(`${SELECT_MODELO} WHERE m.estado = 'revision' ORDER BY m.actualizado ASC`).all<FilaModelo>()
    return json({ modelos: results.map(tarjeta) })
  }
  const m = ruta.match(/^\/api\/admin\/modelos\/([^/]+)\/decidir$/)
  if (m && metodo === 'POST') {
    const id = decodeURIComponent(m[1])
    const { aprobar, motivo } = await leer<{ aprobar: boolean; motivo: string }>(req)
    const f = idValido(id) ? await env.DB.prepare('SELECT estado FROM modelos WHERE id = ?').bind(id).first<{ estado: string }>() : null
    if (!f) return error('Ese modelo no existe.', 404)
    const ahora = Date.now()
    if (aprobar === true) {
      await env.DB.prepare("UPDATE modelos SET estado = 'publicado', motivo = NULL, publicado = COALESCE(publicado, ?), actualizado = ? WHERE id = ?").bind(ahora, ahora, id).run()
    } else {
      const porque = parrafos(motivo, 500)
      if (porque.length < 5) return error('Escribe el motivo para que el creador sepa qué corregir.')
      await env.DB.prepare("UPDATE modelos SET estado = 'rechazado', motivo = ?, actualizado = ? WHERE id = ?").bind(porque, ahora, id).run()
    }
    return json({ ok: true })
  }
  if (ruta === '/api/admin/socios' && metodo === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT u.correo, u.nombre, u.creado, c.alias, s.proveedor, s.estado, s.vence,
              (SELECT COUNT(*) FROM descargas d WHERE d.usuario_id = u.id) AS descargas
         FROM usuarios u LEFT JOIN suscripciones s ON s.usuario_id = u.id LEFT JOIN creadores c ON c.usuario_id = u.id
        ORDER BY COALESCE(s.vence, 0) DESC, u.creado DESC LIMIT 500`,
    ).all()
    return json({ socios: results })
  }
  if (ruta === '/api/admin/activar' && metodo === 'POST') {
    const { correo, dias } = await leer<{ correo: string; dias: number }>(req)
    const c = normalizarCorreo(correo)
    const d = Math.round(Number(dias))
    if (!Number.isFinite(d) || d < -3650 || d > 3650 || d === 0) return error('Días no válidos.')
    const destino = await env.DB.prepare('SELECT id FROM usuarios WHERE correo = ?').bind(c).first<{ id: string }>()
    if (!destino) return error('No hay ninguna cuenta con ese correo. Pídele que la cree primero.', 404)
    const previa = await suscripcionDe(env, destino.id)
    const ahora = Date.now()
    const vence = d > 0 ? venceManual(previa?.vence ?? 0, d, ahora) : ahora
    await guardarSuscripcion(env, destino.id, { proveedor: previa?.proveedor === 'paypal' && d > 0 ? 'paypal' : 'manual', referencia: previa?.referencia ?? null, estado: d > 0 ? 'MANUAL' : 'CANCELADA', vence })
    return json({ ok: true, vence })
  }
  if (ruta === '/api/admin/reparto' && metodo === 'GET') {
    const mes = url.searchParams.get('mes') ?? mesEcuador(Date.now())
    if (!mesValido(mes)) return error('Mes no válido (AAAA-MM).')
    // Lo recaudado lo pone el administrador (cobros manuales + PayPal). Si no, se estima con los suscriptores activos.
    const activos = await env.DB.prepare('SELECT COUNT(*) AS n FROM suscripciones WHERE vence > ?').bind(Date.now()).first<{ n: number }>()
    const dado = Number(url.searchParams.get('recaudado'))
    const recaudado = Number.isFinite(dado) && dado > 0 ? dado : Math.round((activos?.n ?? 0) * Number(precio(env)) * 100) / 100
    const { results } = await env.DB.prepare(
      `SELECT d.creador_id AS creador, COUNT(DISTINCT d.usuario_id || '|' || d.modelo_id) AS descargas
         FROM descargas d WHERE d.mes = ? AND d.usuario_id != d.creador_id GROUP BY d.creador_id`,
    )
      .bind(mes)
      .all<{ creador: string; descargas: number }>()
    const r = repartir(recaudado, porcentaje(env), results)
    const datos = await env.DB.prepare('SELECT c.usuario_id, c.alias, c.pago, c.whatsapp, u.nombre, u.correo FROM creadores c JOIN usuarios u ON u.id = c.usuario_id').all<{
      usuario_id: string
      alias: string
      pago: string
      whatsapp: string | null
      nombre: string
      correo: string
    }>()
    const por = new Map(datos.results.map((c) => [c.usuario_id, c]))
    return json({
      mes,
      recaudado,
      estimado: !(Number.isFinite(dado) && dado > 0),
      activos: activos?.n ?? 0,
      porcentaje: porcentaje(env),
      bolsa: r.bolsa,
      descargas: r.total,
      pagos: r.pagos.map((p) => {
        const c = por.get(p.creador)
        return { alias: c?.alias, nombre: c?.nombre, correo: c?.correo, whatsapp: c?.whatsapp, pago: c?.pago, descargas: p.descargas, monto: p.monto }
      }),
    })
  }
  return error('No encontrado.', 404)
}

/* ── Cuentas ─────────────────────────────────────────────────── */

async function registro(req: Request, url: URL, env: Entorno) {
  const { correo, clave, nombre } = await leer<{ correo: string; clave: string; nombre: string }>(req)
  const c = normalizarCorreo(correo)
  const n = linea(nombre, 60)
  if (n.length < 2) return error('Cuéntanos cómo te llamas.')
  if (!correoValido(c)) return error('Escribe un correo válido.')
  const p = problemaClave(clave)
  if (p) return error(p)
  if (await env.DB.prepare('SELECT 1 FROM usuarios WHERE correo = ?').bind(c).first()) return error('Ya existe una cuenta con ese correo. Inicia sesión.', 409)
  const id = nuevoId()
  await env.DB.prepare('INSERT INTO usuarios (id, correo, clave, nombre, creado) VALUES (?, ?, ?, ?, ?)').bind(id, c, await cifrarClave(clave!), n, Date.now()).run()
  return iniciarSesion(env, url, id)
}

async function entrar(req: Request, url: URL, env: Entorno) {
  const { correo, clave } = await leer<{ correo: string; clave: string }>(req)
  const c = normalizarCorreo(correo)
  const ahora = Date.now()
  const fallos = await env.DB.prepare('SELECT COUNT(*) AS n FROM intentos WHERE correo = ? AND fecha > ?').bind(c, ahora - 15 * 60_000).first<{ n: number }>()
  if ((fallos?.n ?? 0) >= 8) return error('Demasiados intentos. Espera 15 minutos.', 429)
  const u = await env.DB.prepare('SELECT id, clave FROM usuarios WHERE correo = ?').bind(c).first<{ id: string; clave: string }>()
  if (!u || typeof clave !== 'string' || !(await comprobarClave(clave, u.clave))) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO intentos (correo, fecha) VALUES (?, ?)').bind(c, ahora),
      env.DB.prepare('DELETE FROM intentos WHERE fecha < ?').bind(ahora - DIA),
    ])
    return error('Correo o contraseña incorrectos.', 401)
  }
  return iniciarSesion(env, url, u.id)
}

async function iniciarSesion(env: Entorno, url: URL, usuarioId: string) {
  const token = nuevoToken()
  const ahora = Date.now()
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sesiones (token, usuario_id, expira) VALUES (?, ?, ?)').bind(await hashToken(token), usuarioId, ahora + DURACION_SESION),
    env.DB.prepare('DELETE FROM sesiones WHERE expira < ?').bind(ahora),
  ])
  return json({ ok: true }, 200, { 'set-cookie': cookieSesion(token, url) })
}

async function usuarioDe(req: Request, env: Entorno): Promise<Usuario | null> {
  const t = leerCookie(req.headers.get('cookie'), COOKIE)
  if (!t) return null
  return env.DB.prepare(
    'SELECT u.id, u.correo, u.nombre, c.alias FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id LEFT JOIN creadores c ON c.usuario_id = u.id WHERE s.token = ? AND s.expira > ?',
  )
    .bind(await hashToken(t), Date.now())
    .first<Usuario>()
}

const esAdmin = (env: Entorno, correo: string) =>
  (env.ADMIN_CORREOS ?? '').split(',').map(normalizarCorreo).filter(Boolean).includes(correo)

/* ── Suscripción ─────────────────────────────────────────────── */

const suscripcionDe = (env: Entorno, usuarioId: string) =>
  env.DB.prepare('SELECT proveedor, referencia, estado, vence FROM suscripciones WHERE usuario_id = ?').bind(usuarioId).first<Suscripcion>()

const resumen = (s: Suscripcion | null) =>
  s ? { activa: s.vence > Date.now(), vence: s.vence, proveedor: s.proveedor, estado: s.estado } : { activa: false, vence: null, proveedor: null, estado: null }

async function guardarSuscripcion(env: Entorno, usuarioId: string, s: Suscripcion) {
  await env.DB.prepare(
    `INSERT INTO suscripciones (usuario_id, proveedor, referencia, estado, vence, actualizado) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (usuario_id) DO UPDATE SET proveedor = excluded.proveedor, referencia = excluded.referencia,
       estado = excluded.estado, vence = excluded.vence, actualizado = excluded.actualizado`,
  )
    .bind(usuarioId, s.proveedor, s.referencia, s.estado, s.vence, Date.now())
    .run()
}

const basePayPal = (env: Entorno) => (env.PAYPAL_ENTORNO === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com')

async function consultarPayPal(env: Entorno, id: string): Promise<SuscripcionPayPal | null> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRETO) throw new Error('Falta configurar PayPal (PAYPAL_CLIENT_ID y el secreto PAYPAL_SECRETO).')
  const base = basePayPal(env)
  const t = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRETO}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!t.ok) throw new Error(`PayPal rechazó las credenciales (${t.status}).`)
  const { access_token } = (await t.json()) as { access_token: string }
  const r = await fetch(`${base}/v1/billing/subscriptions/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${access_token}` } })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`PayPal respondió ${r.status} al consultar ${id}.`)
  return (await r.json()) as SuscripcionPayPal
}

async function duenoSegunPayPal(env: Entorno, id: string) {
  const s = await consultarPayPal(env, id)
  if (!s?.custom_id) return null
  const u = await env.DB.prepare('SELECT id FROM usuarios WHERE id = ?').bind(s.custom_id).first<{ id: string }>()
  return u?.id ?? null
}

async function sincronizarPayPal(env: Entorno, usuarioId: string, id: string): Promise<Suscripcion | null> {
  const s = await consultarPayPal(env, id)
  if (!s || s.custom_id !== usuarioId || (env.PAYPAL_PLAN_ID && s.plan_id !== env.PAYPAL_PLAN_ID)) return null
  const previa = await suscripcionDe(env, usuarioId)
  const nueva: Suscripcion = { proveedor: 'paypal', referencia: id, estado: s.status, vence: venceSegunPayPal(s, previa?.vence ?? 0, Date.now()) }
  await guardarSuscripcion(env, usuarioId, nueva)
  return nueva
}

/* ── Archivos ────────────────────────────────────────────────── */

async function listarArchivos(env: Entorno, id: string, tipo: Tipo) {
  const todos: R2Objeto[] = []
  let cursor: string | undefined
  do {
    const l = await env.ARCHIVOS.list({ prefix: `modelos/${id}/${tipo}/`, cursor })
    todos.push(...l.objects)
    cursor = l.truncated ? l.cursor : undefined
  } while (cursor)
  return todos
}
const nombreDe = (o: R2Objeto, id: string, tipo: Tipo) => o.key.slice(`modelos/${id}/${tipo}/`.length)

async function imagen(req: Request, env: Entorno, id: string, nombre: string) {
  if (!idValido(id) || !nombreArchivoValido(nombre)) return error('Imagen no válida.')
  const f = await env.DB.prepare('SELECT estado, creador_id FROM modelos WHERE id = ?').bind(id).first<{ estado: string; creador_id: string }>()
  if (!f) return error('No encontrada.', 404)
  const publica = f.estado === 'publicado'
  if (!publica) {
    const u = await usuarioDe(req, env)
    if (!u || (u.id !== f.creador_id && !esAdmin(env, u.correo))) return error('No encontrada.', 404)
  }
  const obj = await env.ARCHIVOS.get(`modelos/${id}/imagenes/${nombre}`)
  if (!obj) return error('No encontrada.', 404)
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('etag', obj.httpEtag)
  h.set('cache-control', publica ? 'public, max-age=3600' : 'private, no-store')
  return new Response(obj.body, { headers: h })
}

async function descargar(req: Request, env: Entorno, id: string, nombre: string) {
  if (!idValido(id) || !nombreArchivoValido(nombre)) return error('Archivo no válido.')
  const u = await usuarioDe(req, env)
  if (!u) return error('Inicia sesión para descargar.', 401)
  const f = await env.DB.prepare('SELECT estado, creador_id FROM modelos WHERE id = ?').bind(id).first<{ estado: string; creador_id: string }>()
  if (!f) return error('Ese modelo no existe.', 404)
  const dueno = u.id === f.creador_id
  const administrador = esAdmin(env, u.correo)
  if (f.estado !== 'publicado' && !dueno && !administrador) return error('Ese modelo no existe.', 404)
  // El creador descarga lo suyo y el administrador revisa sin suscripción; el resto necesita estar al día.
  if (!dueno && !administrador) {
    let s = await suscripcionDe(env, u.id)
    if (s && s.vence <= Date.now() && s.proveedor === 'paypal' && s.referencia) s = await sincronizarPayPal(env, u.id, s.referencia).catch(() => s)
    if (!s || s.vence <= Date.now()) return error('Necesitas una suscripción activa para descargar.', 402)
  }
  const obj = await env.ARCHIVOS.get(`modelos/${id}/archivos/${nombre}`)
  if (!obj) return error('Ese archivo ya no existe.', 404)
  if (!administrador && f.estado === 'publicado') {
    const ahora = Date.now()
    await env.DB.prepare('INSERT INTO descargas (usuario_id, modelo_id, creador_id, archivo, mes, fecha) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(u.id, id, f.creador_id, nombre, mesEcuador(ahora), ahora)
      .run()
  }
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('etag', obj.httpEtag)
  h.set('content-length', String(obj.size))
  if (!h.has('content-type')) h.set('content-type', 'application/octet-stream')
  h.set('content-disposition', `attachment; filename="${nombre.replace(/[^\x20-\x7e]|"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(nombre)}`)
  h.set('cache-control', 'private, no-store')
  return new Response(obj.body, { headers: h })
}
