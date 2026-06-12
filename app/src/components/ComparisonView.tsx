import type { Property } from '../types'
import { analyze } from '../lib/finance'
import { pct, man } from '../lib/format'

interface Props {
  properties: Property[]
}

type RowDef = {
  label: string
  get: (r: ReturnType<typeof analyze>) => number | null
  fmt: (v: number | null) => string
  better: 'high' | 'low'
}

const ROWS: RowDef[] = [
  { label: '価格', get: () => null, fmt: () => '', better: 'low' }, // placeholder (uses input)
  { label: '表面利回り', get: (r) => r.grossYield, fmt: (v) => pct(v), better: 'high' },
  { label: '実質利回り', get: (r) => r.netYield, fmt: (v) => pct(v), better: 'high' },
  { label: 'IRR（税引後）', get: (r) => r.afterTaxIrr, fmt: (v) => pct(v), better: 'high' },
  { label: 'ROI（税引後）', get: (r) => r.afterTaxRoi, fmt: (v) => pct(v), better: 'high' },
  { label: '自己資金', get: (r) => r.selfFunds, fmt: (v) => man(v ?? 0), better: 'low' },
  { label: '初年度CF（税引後）', get: (r) => r.afterTaxAnnualCashflow, fmt: (v) => man(v ?? 0), better: 'high' },
  { label: '年間減価償却', get: (r) => r.annualDepreciation, fmt: (v) => man(v ?? 0), better: 'high' },
  { label: '譲渡所得税（概算）', get: (r) => r.capitalGainsTax, fmt: (v) => man(v ?? 0), better: 'low' },
]

export default function ComparisonView({ properties }: Props) {
  const items = properties
    .filter((p) => p.input.price > 0)
    .map((p) => ({ p, r: analyze(p.input, p.assumptions) }))

  if (items.length < 2) {
    return (
      <div className="card p-10 text-center text-champagne/40">
        <p className="text-sm">比較するには価格を入力した物件が2件以上必要です。</p>
        <p className="text-xs text-champagne/25 mt-2">「分析」タブで物件を追加してください。</p>
      </div>
    )
  }

  // 各行の最良値インデックスを算出
  const bestIndex = (def: RowDef): number => {
    let best = -1
    let bestVal = def.better === 'high' ? -Infinity : Infinity
    items.forEach((it, idx) => {
      const v =
        def.label === '価格' ? it.p.input.price : def.get(it.r)
      if (v === null || !isFinite(v)) return
      if (def.better === 'high' ? v > bestVal : v < bestVal) {
        bestVal = v
        best = idx
      }
    })
    return best
  }

  return (
    <div className="card overflow-auto">
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
        <span className="text-gold font-serif text-lg">物件比較</span>
        <span className="text-xs text-champagne/40">{items.length}件 ・ 最良値をハイライト</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 label sticky left-0 bg-ink-800 z-10">指標</th>
            {items.map((it) => (
              <th key={it.p.id} className="text-right py-3 px-4 font-normal min-w-[140px]">
                <div className="text-champagne truncate max-w-[200px] ml-auto">
                  {it.p.name || '無題の物件'}
                </div>
                <div className="text-xs text-champagne/40 truncate max-w-[200px] ml-auto font-sans">
                  {it.p.address || '—'}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((def) => {
            const best = bestIndex(def)
            return (
              <tr key={def.label} className="border-b border-white/5 hover:bg-ink-700/30">
                <td className="py-2.5 px-4 text-champagne/60 sticky left-0 bg-ink-800/95 z-10">{def.label}</td>
                {items.map((it, idx) => {
                  const v = def.label === '価格' ? it.p.input.price : def.get(it.r)
                  const text = def.label === '価格' ? man(it.p.input.price) : def.fmt(v)
                  const isBest = idx === best
                  return (
                    <td
                      key={it.p.id}
                      className={`text-right py-2.5 px-4 font-mono ${
                        isBest ? 'text-gold-light font-semibold' : 'text-champagne/80'
                      }`}
                    >
                      {isBest && <span className="text-gold/60 mr-1">★</span>}
                      {text}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
