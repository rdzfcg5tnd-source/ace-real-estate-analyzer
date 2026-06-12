import type { AnalysisResult, Property } from '../types'
import { pct, man, yen } from '../lib/format'
import { exportExcel, exportPdf } from '../lib/export'
import CashflowChart from './CashflowChart'

function Metric({
  label,
  value,
  sub,
  accent,
  tip,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  tip?: string
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        accent ? 'border-gold/40 bg-gradient-to-b from-gold/10 to-transparent' : 'border-white/5 bg-ink-700/40'
      }`}
      title={tip}
    >
      <div className="label">{label}</div>
      <div className={`mt-2 font-mono text-2xl ${accent ? 'gold-text' : 'text-champagne'}`}>{value}</div>
      {sub && <div className="text-[11px] text-champagne/40 mt-1">{sub}</div>}
    </div>
  )
}

export default function ResultsPanel({ result, property }: { result: AnalysisResult; property: Property }) {
  const r = result
  return (
    <div className="card p-4 sm:p-5 space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-gold font-serif text-lg whitespace-nowrap">投資分析結果</span>
        <div className="flex-1 min-w-[1rem] h-px bg-gradient-to-r from-gold/30 to-transparent" />
        <button className="btn-ghost text-xs py-1.5" onClick={() => exportExcel(property)}>
          ⤓ Excel
        </button>
        <button className="btn-gold text-xs py-1.5" onClick={() => exportPdf(property)}>
          ⤓ PDFレポート
        </button>
      </div>

      {/* 4大指標 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="表面利回り" value={pct(r.grossYield)} sub="年間家賃 ÷ 価格" />
        <Metric label="実質利回り" value={pct(r.netYield)} accent sub="経費控除後 ÷ 総取得費" />
        <Metric
          label="IRR（税引後）"
          value={pct(r.afterTaxIrr)}
          accent
          sub={`税引前 ${pct(r.irr)}・${r.schedule.length}年`}
          tip="内部収益率：保有期間の税引後キャッシュフローを考慮した年率"
        />
        <Metric
          label="ROI（税引後）"
          value={pct(r.afterTaxRoi)}
          sub={`税引前 ${pct(r.roi)}`}
          tip="自己資金利回り（Cash on Cash）"
        />
      </div>

      {/* 内訳 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="年間家賃（満室）" value={man(r.annualRent)} />
        <Metric label="年間運営費" value={man(r.annualOpex)} />
        <Metric label="年間ローン返済" value={man(r.annualDebtService)} />
        <Metric label="自己資金" value={man(r.selfFunds)} />
        <Metric label="借入額" value={man(r.loanAmount)} />
        <Metric label="初年度CF（税引後）" value={man(r.afterTaxAnnualCashflow)} sub={`税引前 ${man(r.annualCashflow)}`} />
        <Metric label="減価償却" value={man(r.annualDepreciation)} sub={`${r.depreciationYears}年・建物${man(r.buildingValue)}`} />
        <Metric label="譲渡所得税（概算）" value={man(r.capitalGainsTax)} sub="売却時" />
      </div>

      {/* チャート */}
      <div>
        <div className="label mb-2">キャッシュフロー推移（税引後・最終年は売却損益を含む）</div>
        <CashflowChart schedule={r.schedule} />
      </div>

      {/* 明細テーブル */}
      <div className="overflow-auto">
        <table className="w-full text-xs font-mono whitespace-nowrap">
          <thead>
            <tr className="text-champagne/40 border-b border-white/10">
              <th className="text-left py-2 px-2 font-normal">年</th>
              <th className="text-right py-2 px-2 font-normal">家賃</th>
              <th className="text-right py-2 px-2 font-normal">運営費</th>
              <th className="text-right py-2 px-2 font-normal">返済</th>
              <th className="text-right py-2 px-2 font-normal">減価償却</th>
              <th className="text-right py-2 px-2 font-normal">所得税</th>
              <th className="text-right py-2 px-2 font-normal">税引前CF</th>
              <th className="text-right py-2 px-2 font-normal">税引後CF</th>
              <th className="text-right py-2 px-2 font-normal">累積(税後)</th>
              <th className="text-right py-2 px-2 font-normal">残債</th>
            </tr>
          </thead>
          <tbody>
            {r.schedule.map((row) => (
              <tr key={row.year} className="border-b border-white/5 hover:bg-ink-700/40">
                <td className="py-1.5 px-2 text-champagne/70">{row.year}</td>
                <td className="text-right px-2 text-champagne/80">{yen(row.rent)}</td>
                <td className="text-right px-2 text-champagne/60">{yen(row.opex)}</td>
                <td className="text-right px-2 text-champagne/60">{yen(row.debtService)}</td>
                <td className="text-right px-2 text-champagne/50">{yen(row.depreciation)}</td>
                <td className={`text-right px-2 ${row.tax < 0 ? 'text-emerald-400/70' : 'text-champagne/60'}`}>
                  {yen(row.tax)}
                </td>
                <td className={`text-right px-2 ${row.cashflow >= 0 ? 'text-champagne/80' : 'text-red-400/80'}`}>
                  {yen(row.cashflow)}
                </td>
                <td className={`text-right px-2 ${row.afterTaxCashflow >= 0 ? 'text-gold-light' : 'text-red-400/80'}`}>
                  {yen(row.afterTaxCashflow)}
                </td>
                <td className={`text-right px-2 ${row.afterTaxCumulative >= 0 ? 'text-champagne' : 'text-red-400/80'}`}>
                  {yen(row.afterTaxCumulative)}
                </td>
                <td className="text-right px-2 text-champagne/40">{yen(row.loanBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-champagne/30 leading-relaxed">
        ※ 表面/実質利回りは満室想定。IRR・ROI・CF表は空室率・家賃下落・ローン返済・減価償却・所得税・売却損益（譲渡所得税含む）を反映した試算です。
        所得税は不動産所得×実効税率（赤字は損益通算による節税と仮定）、減価償却は中古耐用年数の簡便法、譲渡所得税は長期20.315%/短期39.63%で概算。
        固定資産税未入力時は概算（価格×0.6×1.7%）。実際の投資判断・税務は専門家にご相談ください。
      </p>
    </div>
  )
}
