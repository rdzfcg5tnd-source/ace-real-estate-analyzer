import type { Assumptions, PropertyInput } from '../types'

// 一般的な区分マンション投資の既定前提
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  acquisitionCostRate: 8,    // 仲介手数料・登記・不動産取得税など 概ね7〜9%
  vacancyRate: 5,            // 空室率 5%
  mgmtCommissionRate: 5,     // 賃貸管理委託費 家賃の5%
  propertyTaxAnnual: 0,      // 不明なら自動概算（finance側で算出）
  otherExpenseAnnual: 0,
  useLoan: true,
  downPaymentRate: 20,       // 頭金20%
  loanRate: 2.0,             // 金利2.0%
  loanYears: 20,             // 20年
  holdYears: 10,             // 保有10年
  rentDeclineRate: 1.0,      // 家賃下落 年1%
  exitPrice: 0,              // 0 = 購入価格を据え置き
  saleCostRate: 4,           // 売却諸費用4%
  buildingRatio: 70,         // 建物割合70%（区分マンションの目安）
  structure: 'RC',           // 鉄筋コンクリート
  taxRate: 30,               // 実効税率30%（課税所得330〜695万の目安）
}

export const EMPTY_INPUT: PropertyInput = {
  price: 0,
  monthlyRent: 0,
  managementFee: 0,
  repairReserve: 0,
  area: 0,
  builtYear: new Date().getFullYear(),
  builtMonth: 1,
}
