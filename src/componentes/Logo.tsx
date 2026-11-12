/** El nodo: un hexágono (un cubo visto en isométrico) con sus vértices y un centro naranja. */
export function Marca({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g stroke="#4DA3FF" strokeWidth="3" fill="none" strokeLinejoin="round">
        <path d="M32 10 L51 21 L51 43 L32 54 L13 43 L13 21 Z" />
        <path d="M32 10 L32 32 L51 43 M32 32 L13 43" opacity=".5" />
      </g>
      <circle cx="32" cy="32" r="5.5" fill="#FF7A1A" />
      <g fill="#E7ECF2">
        {[
          [32, 10],
          [51, 21],
          [51, 43],
          [32, 54],
          [13, 43],
          [13, 21],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" />
        ))}
      </g>
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Marca />
      <span className="font-mono text-[17px] font-semibold tracking-tight">
        NODO<span className="text-acento">3D</span>
      </span>
    </span>
  )
}
