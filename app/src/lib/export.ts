import * as XLSX from 'xlsx'
import type { Property, AnalysisResult } from '../types'
import { STRUCTURE_LABELS } from '../types'
import { analyze } from './finance'
import { yen, pct, man, buildingAge } from './format'

function fileBase(p: Property): string {
  const name = (p.name || '物件').replace(/[\\/:*?"<>|]/g, '_')
  return `${name}_投資分析`
}

// ── Excel 出力 ──
export function exportExcel(p: Property): void {
  const r = analyze(p.input, p.assumptions)
  const i = p.input
  const a = p.assumptions
  const wb = XLSX.utils.book_new()

  // サマリーシート
  const summary: (string | number)[][] = [
    ['物件名', p.name || '—'],
    ['所在地', p.address || '—'],
    [],
    ['◆ 物件情報', ''],
    ['価格(円)', i.price],
    ['月額家賃(円)', i.monthlyRent],
    ['管理費(円/月)', i.managementFee],
    ['修繕積立金(円/月)', i.repairReserve],
    ['面積(㎡)', i.area],
    ['築年', `${i.builtYear}年${i.builtMonth}月（築${buildingAge(i.builtYear, i.builtMonth)}年）`],
    [],
    ['◆ 投資前提', ''],
    ['購入諸費用率(%)', a.acquisitionCostRate],
    ['空室率(%)', a.vacancyRate],
    ['管理委託費(%)', a.mgmtCommissionRate],
    ['固定資産税(円/年)', a.propertyTaxAnnual || '自動概算'],
    ['ローン利用', a.useLoan ? 'あり' : 'なし'],
    ['頭金(%)', a.downPaymentRate],
    ['借入金利(%)', a.loanRate],
    ['返済期間(年)', a.loanYears],
    ['保有年数(年)', a.holdYears],
    ['家賃下落率(%/年)', a.rentDeclineRate],
    ['想定売却価格(円)', a.exitPrice || '購入価格を据置'],
    ['売却諸費用率(%)', a.saleCostRate],
    ['建物構造', STRUCTURE_LABELS[a.structure]],
    ['建物割合(%)', a.buildingRatio],
    ['実効税率(%)', a.taxRate],
    [],
    ['◆ 分析結果', ''],
    ['表面利回り', `${r.grossYield.toFixed(2)}%`],
    ['実質利回り', `${r.netYield.toFixed(2)}%`],
    ['IRR(税引前)', r.irr === null ? '—' : `${r.irr.toFixed(2)}%`],
    ['IRR(税引後)', r.afterTaxIrr === null ? '—' : `${r.afterTaxIrr.toFixed(2)}%`],
    ['ROI(税引前)', `${r.roi.toFixed(2)}%`],
    ['ROI(税引後)', `${r.afterTaxRoi.toFixed(2)}%`],
    ['自己資金(円)', r.selfFunds],
    ['借入額(円)', r.loanAmount],
    ['年間家賃・満室(円)', r.annualRent],
    ['年間運営費(円)', r.annualOpex],
    ['年間ローン返済(円)', r.annualDebtService],
    ['建物価格(円)', r.buildingValue],
    ['償却年数(年)', r.depreciationYears],
    ['年間減価償却費(円)', r.annualDepreciation],
    ['譲渡所得税・概算(円)', r.capitalGainsTax],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(summary)
  ws1['!cols'] = [{ wch: 24 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'サマリー')

  // キャッシュフローシート
  const header = [
    '年', '家賃', '運営費', 'NOI', 'ローン返済', 'うち利息', 'うち元金',
    '減価償却', '課税所得', '所得税', '税引前CF', '税引後CF',
    '累積(税引前)', '累積(税引後)', 'ローン残高',
  ]
  const rows = r.schedule.map((s) => [
    s.year, s.rent, s.opex, s.noi, s.debtService, s.interest, s.principal,
    s.depreciation, s.taxableIncome, s.tax, s.cashflow, s.afterTaxCashflow,
    s.cumulative, s.afterTaxCumulative, s.loanBalance,
  ])
  const ws2 = XLSX.utils.aoa_to_sheet([header, ...rows])
  ws2['!cols'] = header.map(() => ({ wch: 12 }))
  XLSX.utils.book_append_sheet(wb, ws2, 'キャッシュフロー')

  XLSX.writeFile(wb, `${fileBase(p)}.xlsx`)
}

// ── PDF 出力（印刷ダイアログ経由・日本語フォント安全）──
export function exportPdf(p: Property): void {
  const r = analyze(p.input, p.assumptions)
  const html = reportHtml(p, r)
  const w = window.open('', '_blank', 'width=900,height=1200')
  if (!w) {
    alert('ポップアップがブロックされました。ポップアップを許可してください。')
    return
  }
  w.document.write(html)
  w.document.close()
  // レンダリング後に印刷
  w.onload = () => {
    w.focus()
    w.print()
  }
}

function metricRow(label: string, value: string): string {
  return `<tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`
}

function reportHtml(p: Property, r: AnalysisResult): string {
  const i = p.input
  const a = p.assumptions
  const cfRows = r.schedule
    .map(
      (s) => `<tr>
        <td>${s.year}</td>
        <td class="num">${yen(s.rent)}</td>
        <td class="num">${yen(s.opex)}</td>
        <td class="num">${yen(s.debtService)}</td>
        <td class="num">${yen(s.depreciation)}</td>
        <td class="num">${yen(s.tax)}</td>
        <td class="num ${s.cashflow < 0 ? 'neg' : ''}">${yen(s.cashflow)}</td>
        <td class="num ${s.afterTaxCashflow < 0 ? 'neg' : ''}">${yen(s.afterTaxCashflow)}</td>
        <td class="num">${yen(s.afterTaxCumulative)}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>${p.name || '物件'} 投資分析レポート</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Hiragino Sans","Noto Sans JP",sans-serif; color:#1a1a1a; margin:32px; }
  h1 { font-size:20px; border-bottom:2px solid #c9a24b; padding-bottom:8px; }
  h2 { font-size:14px; color:#9c7a32; margin-top:24px; border-left:3px solid #c9a24b; padding-left:8px; }
  .sub { color:#666; font-size:12px; margin-top:4px; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
  td,th { border:1px solid #ddd; padding:5px 8px; }
  .lbl { background:#faf7ef; width:40%; color:#555; }
  .val { font-weight:600; }
  .metrics { display:flex; gap:12px; margin-top:8px; }
  .metric { flex:1; border:1px solid #e3d9bf; border-radius:8px; padding:10px; text-align:center; background:#fcfaf3; }
  .metric .m-lbl { font-size:11px; color:#888; }
  .metric .m-val { font-size:20px; font-weight:700; color:#9c7a32; margin-top:4px; }
  th { background:#f3eee0; font-weight:600; }
  .num { text-align:right; font-variant-numeric:tabular-nums; }
  .neg { color:#c0392b; }
  .note { font-size:10px; color:#999; margin-top:16px; line-height:1.6; }
  @media print { body { margin:12mm; } }
</style></head><body>
<h1>${p.name || '無題の物件'} ｜ 不動産投資分析レポート</h1>
<div class="sub">${p.address || ''}　／　ACE 不動産投資分析</div>

<h2>主要指標</h2>
<div class="metrics">
  <div class="metric"><div class="m-lbl">表面利回り</div><div class="m-val">${pct(r.grossYield)}</div></div>
  <div class="metric"><div class="m-lbl">実質利回り</div><div class="m-val">${pct(r.netYield)}</div></div>
  <div class="metric"><div class="m-lbl">IRR(税引後)</div><div class="m-val">${pct(r.afterTaxIrr)}</div></div>
  <div class="metric"><div class="m-lbl">ROI(税引後)</div><div class="m-val">${pct(r.afterTaxRoi)}</div></div>
</div>

<h2>物件情報</h2>
<table>
  ${metricRow('価格', man(i.price))}
  ${metricRow('月額家賃', `${yen(i.monthlyRent)}（年間 ${man(i.monthlyRent * 12)}）`)}
  ${metricRow('管理費 / 修繕積立金', `${yen(i.managementFee)} / ${yen(i.repairReserve)}（月）`)}
  ${metricRow('面積', `${i.area} ㎡`)}
  ${metricRow('築年', `${i.builtYear}年${i.builtMonth}月（築${buildingAge(i.builtYear, i.builtMonth)}年）`)}
</table>

<h2>投資前提</h2>
<table>
  ${metricRow('購入諸費用率 / 空室率', `${a.acquisitionCostRate}% / ${a.vacancyRate}%`)}
  ${metricRow('ローン', a.useLoan ? `頭金${a.downPaymentRate}% ・ 金利${a.loanRate}% ・ ${a.loanYears}年` : 'なし')}
  ${metricRow('保有年数 / 家賃下落率', `${a.holdYears}年 / ${a.rentDeclineRate}%/年`)}
  ${metricRow('想定売却価格', a.exitPrice > 0 ? man(a.exitPrice) : '購入価格を据置')}
  ${metricRow('建物構造 / 建物割合', `${STRUCTURE_LABELS[a.structure]} / ${a.buildingRatio}%`)}
  ${metricRow('実効税率', `${a.taxRate}%`)}
  ${metricRow('償却年数 / 年間減価償却費', `${r.depreciationYears}年 / ${man(r.annualDepreciation)}`)}
  ${metricRow('自己資金 / 借入額', `${man(r.selfFunds)} / ${man(r.loanAmount)}`)}
  ${metricRow('譲渡所得税(概算)', man(r.capitalGainsTax))}
</table>

<h2>キャッシュフロー推移</h2>
<table>
  <tr><th>年</th><th>家賃</th><th>運営費</th><th>ローン返済</th><th>減価償却</th><th>所得税</th><th>税引前CF</th><th>税引後CF</th><th>累積(税後)</th></tr>
  ${cfRows}
</table>

<p class="note">
※ 表面/実質利回りは満室想定。IRR・ROI・CF表は空室率・家賃下落・ローン返済・減価償却・所得税・売却損益（譲渡所得税含む）を反映した試算です。
固定資産税が未入力の場合は概算（価格×0.6×1.7%）、減価償却は中古耐用年数の簡便法、譲渡所得税は長期20.315%/短期39.63%で概算しています。
実際の投資判断・税務は専門家にご相談ください。　作成: ACE 不動産投資分析
</p>
</body></html>`
}
