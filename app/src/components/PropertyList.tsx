import type { Property } from '../types'
import { analyze } from '../lib/finance'
import { pct, man } from '../lib/format'

interface Props {
  properties: Property[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export default function PropertyList({ properties, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="w-full lg:w-72 lg:shrink-0 flex flex-col gap-3 lg:gap-4 lg:h-full">
      <button className="btn-gold w-full" onClick={onNew}>
        ＋ 新規分析
      </button>

      <div className="card overflow-auto max-h-60 lg:max-h-none lg:flex-1">
        <div className="px-4 py-3 border-b border-white/5 label">保存済み物件</div>
        {properties.length === 0 ? (
          <div className="p-4 text-sm text-champagne/30">まだ物件がありません</div>
        ) : (
          <ul>
            {properties.map((p) => {
              const r = analyze(p.input, p.assumptions)
              const active = p.id === activeId
              return (
                <li
                  key={p.id}
                  className={`group px-4 py-3 border-b border-white/5 cursor-pointer transition ${
                    active ? 'bg-gold/10 border-l-2 border-l-gold' : 'hover:bg-ink-700/50 border-l-2 border-l-transparent'
                  }`}
                  onClick={() => onSelect(p.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-champagne truncate">
                        {p.name || '無題の物件'}
                      </div>
                      <div className="text-xs text-champagne/40 truncate">{p.address || '—'}</div>
                    </div>
                    <button
                      className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-champagne/40 lg:text-champagne/30 hover:text-red-400 transition text-base lg:text-xs px-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(p.id)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                    <span className="text-champagne/50">{p.input.price ? man(p.input.price) : '—'}</span>
                    <span className="gold-text">実質 {pct(r.netYield, 1)}</span>
                    <span className="text-champagne/40">IRR {pct(r.irr, 1)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
