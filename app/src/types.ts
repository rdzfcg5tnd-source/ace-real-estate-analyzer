// 物件の基本情報（販売図面から手入力する項目）
export interface PropertyInput {
  price: number          // 価格（円）
  monthlyRent: number    // 月額家賃（円）
  managementFee: number  // 管理費（円/月）
  repairReserve: number  // 修繕積立金（円/月）
  area: number           // 面積（㎡）
  builtYear: number      // 築年（西暦）
  builtMonth: number     // 築月（1-12, 任意）
}

// 投資シミュレーションの前提（既定値あり）
export interface Assumptions {
  acquisitionCostRate: number // 購入諸費用率（価格に対する%）
  vacancyRate: number         // 空室率（%）
  mgmtCommissionRate: number  // 管理委託費（家賃に対する%）
  propertyTaxAnnual: number   // 固定資産税・都市計画税（円/年）
  otherExpenseAnnual: number  // その他諸経費（円/年）
  // ローン
  useLoan: boolean
  downPaymentRate: number     // 頭金（価格に対する%）
  loanRate: number            // 借入金利（年%）
  loanYears: number           // 返済期間（年）
  // 出口
  holdYears: number           // 保有年数
  rentDeclineRate: number     // 家賃下落率（年%）
  exitPrice: number           // 想定売却価格（円, 0なら購入価格を使用）
  saleCostRate: number        // 売却諸費用率（%）
  // 税務・減価償却
  buildingRatio: number       // 建物割合（価格に対する%, 土地は非償却）
  structure: StructureType    // 建物構造（法定耐用年数の決定）
  taxRate: number             // 所得の実効税率（所得税+住民税の限界税率, %）
}

export type StructureType = 'RC' | 'SRC' | 'steel' | 'lightSteel' | 'wood'

export const STRUCTURE_LABELS: Record<StructureType, string> = {
  RC: '鉄筋コンクリート(RC)',
  SRC: '鉄骨鉄筋コンクリート(SRC)',
  steel: '重量鉄骨',
  lightSteel: '軽量鉄骨',
  wood: '木造',
}

// 法定耐用年数（住宅用）
export const STRUCTURE_USEFUL_LIFE: Record<StructureType, number> = {
  RC: 47,
  SRC: 47,
  steel: 34,
  lightSteel: 27,
  wood: 22,
}

export interface Property {
  id: string
  name: string
  address: string
  pdfName?: string      // 紐づくPDFファイル名
  pdfData?: string      // dataURL（localStorage保存用）
  input: PropertyInput
  assumptions: Assumptions
  createdAt: number
}

export interface CashflowRow {
  year: number
  rent: number          // 年間家賃（空室・下落反映後）
  opex: number          // 年間運営費
  debtService: number   // 年間ローン返済
  interest: number      // うち支払利息
  principal: number     // うち元金返済
  depreciation: number  // 減価償却費
  noi: number           // 純営業収益（家賃-運営費）
  cashflow: number      // 税引前キャッシュフロー
  taxableIncome: number // 課税所得（不動産所得）
  tax: number           // 所得税・住民税（負値は損益通算による還付）
  afterTaxCashflow: number // 税引後キャッシュフロー
  cumulative: number    // 累積（税引前）
  afterTaxCumulative: number // 累積（税引後）
  loanBalance: number   // 年末ローン残高
}

export interface AnalysisResult {
  grossYield: number        // 表面利回り（%）
  netYield: number          // 実質利回り（%）
  roi: number               // 自己資金利回り / Cash on Cash（%）
  irr: number | null        // IRR（%, 計算不能ならnull）
  annualRent: number        // 年間家賃（満室想定）
  annualOpex: number        // 年間運営費
  annualDebtService: number // 年間ローン返済
  annualCashflow: number    // 初年度キャッシュフロー（税引前）
  selfFunds: number         // 自己資金（頭金＋諸費用）
  loanAmount: number        // 借入額
  noi: number               // 純営業収益（初年度）
  schedule: CashflowRow[]   // 保有期間のキャッシュフロー
  // 税後・減価償却
  buildingValue: number     // 建物価格（償却対象）
  depreciationYears: number // 償却年数（中古耐用年数）
  annualDepreciation: number// 年間減価償却費
  afterTaxIrr: number | null// 税引後IRR（%）
  afterTaxRoi: number       // 税引後ROI（%）
  afterTaxAnnualCashflow: number // 初年度税引後CF
  capitalGainsTax: number   // 売却時の譲渡所得税（概算）
}
