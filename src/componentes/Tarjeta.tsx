import { Box, Download } from 'lucide-react'
import type { Tarjeta } from '../lib/api.ts'
import { nombreCategoria, nombrePrograma } from '../lib/datos.ts'

export const ESTADOS: Record<Tarjeta['estado'], { texto: string; color: string }> = {
  borrador: { texto: 'Borrador', color: 'text-tenue border-linea' },
  revision: { texto: 'En revisión', color: 'text-aviso border-aviso/40' },
  publicado: { texto: 'Publicado', color: 'text-ok border-ok/40' },
  rechazado: { texto: 'Rechazado', color: 'text-mal border-mal/40' },
}

export function Portada({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`plano flex h-full w-full items-center justify-center bg-panel2 ${className}`}>
      <Box className="h-10 w-10 text-linea" />
    </div>
  )
}

export function TarjetaModelo({ m, href, estado = false }: { m: Tarjeta; href?: string; estado?: boolean }) {
  return (
    <a href={href ?? `#/modelo/${m.id}`} className="group caja block overflow-hidden transition hover:border-acento/50">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-linea">
        <Portada src={m.portada} alt={m.titulo} className="transition duration-500 group-hover:scale-[1.03]" />
        {estado && <span className={`chip absolute left-2 top-2 bg-fondo/90 ${ESTADOS[m.estado].color}`}>{ESTADOS[m.estado].texto}</span>}
      </div>
      <div className="p-3.5">
        <p className="etiqueta truncate">{nombreCategoria(m.categoria)}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.6em] font-medium leading-snug">{m.titulo}</h3>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-tenue">
          <span className="truncate">@{m.creador.alias}</span>
          <span className="flex shrink-0 items-center gap-1 font-mono">
            <Download className="h-3.5 w-3.5" />
            {m.descargas}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {m.programas.slice(0, 3).map((p) => (
            <span key={p} className="chip py-0.5">{nombrePrograma(p)}</span>
          ))}
        </div>
      </div>
    </a>
  )
}

export function Rejilla({ modelos, estado, href }: { modelos: Tarjeta[]; estado?: boolean; href?: (m: Tarjeta) => string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {modelos.map((m) => (
        <TarjetaModelo key={m.id} m={m} estado={estado} href={href?.(m)} />
      ))}
    </div>
  )
}
