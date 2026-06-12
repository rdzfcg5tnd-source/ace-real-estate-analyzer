import { useState } from 'react'
import type { Property, PropertyInput, Assumptions } from '../types'
import { NumField, TextField, SelectField } from './Field'
import { DEFAULT_ASSUMPTIONS } from '../lib/defaults'
import { buildingAge, man } from '../lib/format'
import { STRUCTURE_LABELS, type StructureType } from '../types'

interface Props {
  property: Property
  onChange: (p: Property) => void
}

export default function PropertyForm({ property, onChange }: Props) {
  const [showAssumptions, setShowAssumptions] = useState(true)

  const setInput = (patch: Partial<PropertyInput>) =>
    onChange({ ...property, input: { ...property.input, ...patch } })
  const setAssumption = (patch: Partial<Assumptions>) =>
    onChange({ ...property, assumptions: { ...property.assumptions, ...patch } })

  const i = property.input
  const a = property.assumptions
  const age = buildingAge(i.builtYear, i.builtMonth)

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5">
        <span className="label">物件情報の入力</span>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-6">
        {/* 物件名・住所 */}
        <div className="grid grid-cols-1 gap-4">
          <TextField
            label="物件名"
            value={property.name}
            onChange={(v) => onChange({ ...property, name: v })}
            placeholder="例：菱和パレス滝野川CDI"
          />
          <TextField
            label="所在地"
            value={property.address}
            onChange={(v) => onChange({ ...property, address: v })}
            placeholder="例：東京都北区滝野川七丁目"
          />
        </div>

        {/* 抽出項目 */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-gold text-sm font-serif">図面の項目</span>
            <div className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="価格" value={i.price} onChange={(v) => setInput({ price: v })} unit="円"
              hint={i.price ? man(i.price) : undefined} />
            <NumField label="月額家賃" value={i.monthlyRent} onChange={(v) => setInput({ monthlyRent: v })} unit="円"
              hint={i.monthlyRent ? `年間 ${man(i.monthlyRent * 12)}` : undefined} />
            <NumField label="管理費" value={i.managementFee} onChange={(v) => setInput({ managementFee: v })} unit="円/月" />
            <NumField label="修繕積立金" value={i.repairReserve} onChange={(v) => setInput({ repairReserve: v })} unit="円/月" />
            <NumField label="面積" value={i.area} onChange={(v) => setInput({ area: v })} unit="㎡" step={0.01} />
            <div className="grid grid-cols-2 gap-2">
              <NumField label="築年(西暦)" value={i.builtYear} onChange={(v) => setInput({ builtYear: v })} unit="年"
                hint={age ? `築${age}年` : undefined} />
              <NumField label="築月" value={i.builtMonth} onChange={(v) => setInput({ builtMonth: v })} unit="月" />
            </div>
          </div>
        </div>

        {/* 投資前提 */}
        <div>
          <button
            className="flex items-center gap-3 mb-3 w-full"
            onClick={() => setShowAssumptions((s) => !s)}
          >
            <span className="text-gold text-sm font-serif">投資前提（既定値）</span>
            <div className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" />
            <span className="text-champagne/40 text-xs">{showAssumptions ? '−' : '＋'}</span>
          </button>

          {showAssumptions && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <NumField label="購入諸費用率" value={a.acquisitionCostRate} onChange={(v) => setAssumption({ acquisitionCostRate: v })} unit="%" step={0.5} />
                <NumField label="空室率" value={a.vacancyRate} onChange={(v) => setAssumption({ vacancyRate: v })} unit="%" step={0.5} />
                <NumField label="管理委託費" value={a.mgmtCommissionRate} onChange={(v) => setAssumption({ mgmtCommissionRate: v })} unit="%" step={0.5} hint="家賃に対する割合" />
                <NumField label="固定資産税" value={a.propertyTaxAnnual} onChange={(v) => setAssumption({ propertyTaxAnnual: v })} unit="円/年" hint="0で自動概算" />
              </div>

              {/* ローン */}
              <div className="bg-ink-700/50 rounded-lg p-4 border border-white/5">
                <label className="flex items-center justify-between mb-3 cursor-pointer">
                  <span className="text-sm text-champagne/80">ローンを利用する</span>
                  <input
                    type="checkbox"
                    checked={a.useLoan}
                    onChange={(e) => setAssumption({ useLoan: e.target.checked })}
                    className="accent-gold w-4 h-4"
                  />
                </label>
                {a.useLoan && (
                  <div className="grid grid-cols-3 gap-3">
                    <NumField label="頭金" value={a.downPaymentRate} onChange={(v) => setAssumption({ downPaymentRate: v })} unit="%" step={5} />
                    <NumField label="金利" value={a.loanRate} onChange={(v) => setAssumption({ loanRate: v })} unit="%" step={0.1} />
                    <NumField label="期間" value={a.loanYears} onChange={(v) => setAssumption({ loanYears: v })} unit="年" />
                  </div>
                )}
              </div>

              {/* 出口 */}
              <div className="grid grid-cols-2 gap-4">
                <NumField label="保有年数" value={a.holdYears} onChange={(v) => setAssumption({ holdYears: v })} unit="年" />
                <NumField label="家賃下落率" value={a.rentDeclineRate} onChange={(v) => setAssumption({ rentDeclineRate: v })} unit="%/年" step={0.1} />
                <NumField label="想定売却価格" value={a.exitPrice} onChange={(v) => setAssumption({ exitPrice: v })} unit="円" hint="0で購入価格を据置" />
                <NumField label="売却諸費用率" value={a.saleCostRate} onChange={(v) => setAssumption({ saleCostRate: v })} unit="%" step={0.5} />
              </div>

              {/* 税務・減価償却 */}
              <div className="bg-ink-700/50 rounded-lg p-4 border border-white/5 space-y-4">
                <div className="text-xs text-champagne/50">税務・減価償却</div>
                <SelectField<StructureType>
                  label="建物構造"
                  value={a.structure}
                  onChange={(v) => setAssumption({ structure: v })}
                  options={(Object.keys(STRUCTURE_LABELS) as StructureType[]).map((k) => ({
                    value: k,
                    label: STRUCTURE_LABELS[k],
                  }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="建物割合" value={a.buildingRatio} onChange={(v) => setAssumption({ buildingRatio: v })} unit="%" step={5} hint="土地は非償却" />
                  <NumField label="実効税率" value={a.taxRate} onChange={(v) => setAssumption({ taxRate: v })} unit="%" step={5} hint="所得税+住民税の限界税率" />
                </div>
              </div>

              <button
                className="btn-ghost w-full text-xs"
                onClick={() => setAssumption({ ...DEFAULT_ASSUMPTIONS })}
              >
                既定値に戻す
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
