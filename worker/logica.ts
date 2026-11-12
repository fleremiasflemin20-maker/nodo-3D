/*
 * La parte de Nodo 3D que no toca la red ni la base de datos: contraseñas,
 * tokens, nombres de archivo, hasta cuándo vale una suscripción y cómo se
 * reparte el dinero del mes entre los creadores. Así se puede probar con
 * `npm test` sin Cloudflare.
 *
 * Las cuentas y la suscripción vienen del Club Flemin de la Biblioteca 3D.
 */

export const DIA = 86_400_000
/** Días de gracia tras la fecha de cobro de PayPal, por si el cobro tarda. */
export const GRACIA = 2 * DIA
export const DURACION_SESION = 30 * DIA
/** Cloudflare Workers no admite más de 100 000 iteraciones de PBKDF2. */
const ITERACIONES = 100_000

const aB64 = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b)
  let s = ''
  for (const x of bytes) s += String.fromCharCode(x)
  return btoa(s)
}
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const aHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

async function derivar(clave: string, sal: Uint8Array, iteraciones: number) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones }, base, 256)
}

/** Compara sin cortar en el primer byte distinto, para no filtrar nada por el tiempo. */
export function iguales(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]
  return d === 0
}

export async function cifrarClave(clave: string) {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivar(clave, sal, ITERACIONES)
  return `pbkdf2$${ITERACIONES}$${aB64(sal)}$${aB64(hash)}`
}

export async function comprobarClave(clave: string, guardada: string) {
  const [tipo, iter, sal, hash] = guardada.split('$')
  if (tipo !== 'pbkdf2' || !iter || !sal || !hash) return false
  const calculado = await derivar(clave, deB64(sal), Number(iter))
  return iguales(new Uint8Array(calculado), deB64(hash))
}

export const nuevoToken = () => aB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!)
export const nuevoId = () => crypto.randomUUID()
export const hashToken = async (t: string) => aHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))

export const normalizarCorreo = (c: unknown) => (typeof c === 'string' ? c.trim().toLowerCase() : '')
export const correoValido = (c: string) => c.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)
export function problemaClave(c: unknown) {
  if (typeof c !== 'string' || c.length < 8) return 'La contraseña necesita al menos 8 caracteres.'
  if (c.length > 200) return 'La contraseña es demasiado larga.'
  return null
}

/** Ids del catálogo y nombres de archivo: nada de barras, ni "..", ni rarezas. */
export const idValido = (s: string) => /^[a-z0-9][a-z0-9-]{0,80}$/.test(s)
export const nombreArchivoValido = (s: string) => s.length <= 160 && /^[\w][\w .()+-]*\.[A-Za-z0-9]{1,8}$/.test(s) && !s.includes('..')

export type SuscripcionPayPal = {
  id: string
  status: string
  plan_id?: string
  custom_id?: string
  billing_info?: { next_billing_time?: string; last_payment?: { time?: string } }
}

/**
 * Hasta cuándo puede descargar alguien según lo que diga PayPal.
 * - ACTIVE: hasta el próximo cobro, más dos días de gracia.
 * - CANCELLED: ya pagó el mes en curso, así que se respeta lo que tenía.
 * - SUSPENDED / EXPIRED / otro: se corta ya.
 */
export function venceSegunPayPal(s: SuscripcionPayPal, vencePrevio: number, ahora: number) {
  if (s.status === 'ACTIVE') {
    const proximo = Date.parse(s.billing_info?.next_billing_time ?? '')
    const desde = Number.isFinite(proximo) ? proximo : ahora + 30 * DIA
    return Math.max(desde + GRACIA, vencePrevio)
  }
  if (s.status === 'CANCELLED') {
    const ultimo = Date.parse(s.billing_info?.last_payment?.time ?? '')
    const pagado = Number.isFinite(ultimo) ? ultimo + 30 * DIA + GRACIA : 0
    return Math.max(vencePrevio, pagado)
  }
  return Math.min(vencePrevio, ahora)
}

/** Suma días de una activación manual sin quitar lo que ya tenía pagado. */
export const venceManual = (vencePrevio: number, dias: number, ahora: number) => Math.max(vencePrevio, ahora) + dias * DIA

/** De un evento de webhook de PayPal, el id de la suscripción a la que se refiere. */
export function suscripcionDelEvento(evento: unknown): string | null {
  const e = evento as { event_type?: string; resource?: { id?: string; billing_agreement_id?: string } }
  if (!e?.event_type || !e.resource) return null
  if (e.event_type.startsWith('BILLING.SUBSCRIPTION.')) return e.resource.id ?? null
  if (e.event_type.startsWith('PAYMENT.SALE.')) return e.resource.billing_agreement_id ?? null
  return null
}

export function leerCookie(cabecera: string | null, nombre: string) {
  for (const parte of (cabecera ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nombre) return v.join('=')
  }
  return null
}

/* ── Nodo 3D ─────────────────────────────────────────────────── */

/** Texto de una línea, sin espacios de sobra y con tope de largo. */
export const linea = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
/** Texto con saltos de línea (descripciones), sin líneas vacías de más. */
export const parrafos = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : ''

/** Solo los ids que están en la lista, sin repetir. */
export const deLista = (v: unknown, validos: readonly { id: string }[]) => {
  const ok = new Set(validos.map((x) => x.id))
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ok.has(x)))] : []
}
export const unoDe = (v: unknown, validos: readonly { id: string }[]) => (typeof v === 'string' && validos.some((x) => x.id === v) ? v : null)

/** El alias público de un creador: minúsculas, números y guiones. */
export const aliasValido = (s: string) => /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(s) && !s.includes('--')
export const RESERVADOS = new Set(['admin', 'nodo', 'nodo3d', 'api', 'soporte', 'ayuda', 'creador', 'creadores', 'cuenta'])

/** "Engranaje helicoidal 20T" → "engranaje-helicoidal-20t-x7k2". */
export function idDeTitulo(titulo: string, azar = crypto.getRandomValues(new Uint8Array(4))) {
  const base = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  const letras = 'abcdefghjkmnpqrstuvwxyz23456789'
  const cola = [...azar].map((b) => letras[b % letras.length]).join('')
  return `${base || 'modelo'}-${cola}`
}

/** El mes en Ecuador (UTC−5, sin horario de verano): 'AAAA-MM'. */
export const mesEcuador = (ms: number) => new Date(ms - 5 * 3_600_000).toISOString().slice(0, 7)
export const mesValido = (s: string) => /^20\d\d-(0[1-9]|1[0-2])$/.test(s)

export type DescargasCreador = { creador: string; descargas: number }
export type Pago = { creador: string; descargas: number; monto: number }

/**
 * Reparte `porcentaje` % de lo recaudado entre los creadores según sus
 * descargas del mes (una por persona y modelo). Se trabaja en centavos y los
 * centavos que sobran del redondeo van a quien tenga más descargas, para que
 * la suma cuadre siempre con la bolsa.
 */
export function repartir(recaudado: number, porcentaje: number, filas: DescargasCreador[]) {
  const bolsa = Math.max(0, Math.round(recaudado * 100 * (porcentaje / 100)))
  const total = filas.reduce((s, f) => s + Math.max(0, f.descargas), 0)
  if (!total || !bolsa) return { bolsa: bolsa / 100, total, pagos: filas.map((f) => ({ ...f, monto: 0 })) as Pago[] }
  const ordenadas = [...filas].sort((a, b) => b.descargas - a.descargas || a.creador.localeCompare(b.creador))
  const centavos = ordenadas.map((f) => Math.floor((bolsa * Math.max(0, f.descargas)) / total))
  let sobra = bolsa - centavos.reduce((s, c) => s + c, 0)
  for (let i = 0; sobra > 0; i = (i + 1) % centavos.length, sobra--) centavos[i]++
  return { bolsa: bolsa / 100, total, pagos: ordenadas.map((f, i) => ({ ...f, monto: centavos[i] / 100 })) }
}
