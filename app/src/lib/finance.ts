import type { Assumptions, PropertyInput, AnalysisResult, CashflowRow } from '../types'
import { STRUCTURE_USEFUL_LIFE } from '../types'
import { buildingAge } from './format'

// 固定資産税・都市計画税の概算（未入力時に使用）
// 評価額 ≈ 価格 × 0.6、固都税合計税率 ≈ 1.7%
export function estimatePropertyTax(price: number): number {
  return Math.round(price * 0.6 * 0.017)
}

// 元利均等返済の毎月返済額
export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0
  const r = annualRatePct / 100 / 12
  const n = years * 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - Math.pow(1 + r, -n))
}

// k回返済後（年末）のローン残高
export function loanBalanceAfter(
  principal: number,
  annualRatePct: number,
  years: number,
  monthsPaid: number,
): number {
  if (principal <= 0 || years <= 0) return 0
  const n = years * 12
  const k = Math.min(monthsPaid, n)
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal * (1 - k / n)
  const pow = (m: number) => Math.pow(1 + r, m)
  const bal = (principal * (pow(n) - pow(k))) / (pow(n) - 1)
  return Math.max(0, bal)
}

// 各年の支払利息・元金返済（元利均等の月次を年単位に集約）
export function annualAmortization(
  principal: number,
  annualRatePct: number,
  years: number,
  holdYears: number,
): { interest: number; principal: number }[] {
  const out: { interest: number; principal: number }[] = []
  const r = annualRatePct / 100 / 12
  const pay = monthlyPayment(principal, annualRatePct, years)
  const totalMonths = years * 12
  let balance = principal
  for (let y = 1; y <= holdYears; y++) {
    let interestSum = 0
    let principalSum = 0
    for (let m = 0; m < 12; m++) {
      const month = (y - 1) * 12 + m
      if (month >= totalMonths || balance <= 0) break
      const interest = balance * r
      const principalPart = pay - interest
      interestSum += interest
      principalSum += principalPart
      balance -= principalPart
    }
    out.push({ interest: interestSum, principal: principalSum })
  }
  return out
}

// 中古建物の耐用年数（簡便法）
//  経過 >= 法定 : 法定 × 0.2
//  経過 <  法定 : (法定 - 経過) + 経過 × 0.2
export function usedUsefulLife(structure: Assumptions['structure'], ageYears: number): number {
  const legal = STRUCTURE_USEFUL_LIFE[structure]
  let life: number
  if (ageYears >= legal) {
    life = legal * 0.2
  } else {
    life = legal - ageYears + ageYears * 0.2
  }
  return Math.max(2, Math.floor(life))
}

// IRR（内部収益率）を二分法で算出。符号変化がなければ null。
export function irr(cashflows: number[]): number | null {
  const npv = (rate: number) =>
    cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0)

  let lo = -0.9999
  let hi = 1.0
  let flo = npv(lo)
  let fhi = npv(hi)

  let tries = 0
  while (flo * fhi > 0 && hi < 100 && tries < 60) {
    hi *= 1.5
    fhi = npv(hi)
    tries++
  }
  if (flo * fhi > 0) return null

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fmid = npv(mid)
    if (Math.abs(fmid) < 1e-6) return mid * 100
    if (flo * fmid < 0) {
      hi = mid
      fhi = fmid
    } else {
      lo = mid
      flo = fmid
    }
  }
  return ((lo + hi) / 2) * 100
}

export function analyze(input: PropertyInput, a: Assumptions): AnalysisResult {
  const price = input.price || 0
  const annualRent = (input.monthlyRent || 0) * 12 // 満室想定の年間家賃

  // 取得費・自己資金・借入
  const acquisitionCost = price * (a.acquisitionCostRate / 100)
  const totalCost = price + acquisitionCost
  const loanAmount = a.useLoan ? price * (1 - a.downPaymentRate / 100) : 0
  const downPayment = a.useLoan ? price * (a.downPaymentRate / 100) : price
  const selfFunds = downPayment + acquisitionCost

  const propertyTax = a.propertyTaxAnnual > 0 ? a.propertyTaxAnnual : estimatePropertyTax(price)
  const fixedOpex = (input.managementFee + input.repairReserve) * 12 + propertyTax + a.otherExpenseAnnual

  // 満室ベースの年間運営費（実質利回り用）
  const mgmtCommissionFull = annualRent * (a.mgmtCommissionRate / 100)
  const annualOpexFull = fixedOpex + mgmtCommissionFull

  // ローン年間返済額・償却
  const mPay = monthlyPayment(loanAmount, a.loanRate, a.loanYears)
  const annualDebtService = mPay * 12
  const amort = annualAmortization(loanAmount, a.loanRate, a.loanYears, a.holdYears)

  // ── 減価償却 ──
  const age = buildingAge(input.builtYear, input.builtMonth)
  const buildingValue = price * (a.buildingRatio / 100)
  const depreciationYears = usedUsefulLife(a.structure, age)
  const annualDepreciation = depreciationYears > 0 ? buildingValue / depreciationYears : 0

  // ── 利回り指標 ──
  const grossYield = price > 0 ? (annualRent / price) * 100 : 0
  const netYield = totalCost > 0 ? ((annualRent - annualOpexFull) / totalCost) * 100 : 0

  // ── キャッシュフロー表（空室・家賃下落・税を反映）──
  const schedule: CashflowRow[] = []
  let cumulative = 0
  let atCumulative = 0
  let capitalGainsTax = 0
  for (let y = 1; y <= a.holdYears; y++) {
    const declineFactor = Math.pow(1 - a.rentDeclineRate / 100, y - 1)
    const grossRent = annualRent * declineFactor
    const effRent = grossRent * (1 - a.vacancyRate / 100)
    const mgmtCommission = effRent * (a.mgmtCommissionRate / 100)
    const opex = fixedOpex + mgmtCommission
    const noi = effRent - opex
    const debtService = annualDebtService
    const interest = amort[y - 1]?.interest ?? 0
    const principalPaid = amort[y - 1]?.principal ?? 0
    const depreciation = y <= depreciationYears ? annualDepreciation : 0
    const loanBalance = loanBalanceAfter(loanAmount, a.loanRate, a.loanYears, y * 12)

    // 不動産所得と所得税（負値は損益通算により還付＝節税効果）
    const taxableIncome = noi - interest - depreciation
    const tax = taxableIncome * (a.taxRate / 100)

    let cashflow = noi - debtService
    let afterTaxCashflow = cashflow - tax

    // 最終年は売却損益を加算
    if (y === a.holdYears) {
      const exit = a.exitPrice > 0 ? a.exitPrice : price
      const saleCost = exit * (a.saleCostRate / 100)
      const netSaleProceeds = exit - saleCost - loanBalance

      // 譲渡所得税（簿価 = 価格 − 償却累計。長期5年超20.315% / 短期39.63%）
      const accumulatedDep = annualDepreciation * Math.min(a.holdYears, depreciationYears)
      const bookValue = price - accumulatedDep
      const capitalGain = exit - bookValue - saleCost
      const cgtRate = a.holdYears > 5 ? 0.20315 : 0.3963
      capitalGainsTax = capitalGain > 0 ? capitalGain * cgtRate : 0

      cashflow += netSaleProceeds
      afterTaxCashflow += netSaleProceeds - capitalGainsTax
    }

    cumulative += cashflow
    atCumulative += afterTaxCashflow
    schedule.push({
      year: y,
      rent: Math.round(effRent),
      opex: Math.round(opex),
      debtService: Math.round(debtService),
      interest: Math.round(interest),
      principal: Math.round(principalPaid),
      depreciation: Math.round(depreciation),
      noi: Math.round(noi),
      cashflow: Math.round(cashflow),
      taxableIncome: Math.round(taxableIncome),
      tax: Math.round(tax),
      afterTaxCashflow: Math.round(afterTaxCashflow),
      cumulative: Math.round(cumulative),
      afterTaxCumulative: Math.round(atCumulative),
      loanBalance: Math.round(loanBalance),
    })
  }

  // 初年度（運用のみ：売却損益を除く）
  const single = a.holdYears === 1
  const saleAdj = single ? saleProceeds(input, a, loanAmount, annualDepreciation, depreciationYears) : null
  const year1 = schedule[0]
  const annualCashflow = year1 ? year1.cashflow - (saleAdj?.pretax ?? 0) : 0
  const afterTaxAnnualCashflow = year1 ? year1.afterTaxCashflow - (saleAdj?.aftertax ?? 0) : 0
  const noiYear1 = year1 ? year1.noi : 0

  const roi = selfFunds > 0 ? (annualCashflow / selfFunds) * 100 : 0
  const afterTaxRoi = selfFunds > 0 ? (afterTaxAnnualCashflow / selfFunds) * 100 : 0

  // IRR：初期投資 = -自己資金
  const irrVal = selfFunds > 0 ? irr([-selfFunds, ...schedule.map((r) => r.cashflow)]) : null
  const afterTaxIrr =
    selfFunds > 0 ? irr([-selfFunds, ...schedule.map((r) => r.afterTaxCashflow)]) : null

  return {
    grossYield,
    netYield,
    roi,
    irr: irrVal,
    annualRent,
    annualOpex: Math.round(annualOpexFull),
    annualDebtService: Math.round(annualDebtService),
    annualCashflow: Math.round(annualCashflow),
    selfFunds: Math.round(selfFunds),
    loanAmount: Math.round(loanAmount),
    noi: Math.round(noiYear1),
    schedule,
    buildingValue: Math.round(buildingValue),
    depreciationYears,
    annualDepreciation: Math.round(annualDepreciation),
    afterTaxIrr,
    afterTaxRoi,
    afterTaxAnnualCashflow: Math.round(afterTaxAnnualCashflow),
    capitalGainsTax: Math.round(capitalGainsTax),
  }
}

// holdYears=1 のとき初年度CFから売却分を差し引くための補助
function saleProceeds(
  input: PropertyInput,
  a: Assumptions,
  loanAmount: number,
  annualDepreciation: number,
  depreciationYears: number,
): { pretax: number; aftertax: number } {
  const exit = a.exitPrice > 0 ? a.exitPrice : input.price
  const saleCost = exit * (a.saleCostRate / 100)
  const loanBalance = loanBalanceAfter(loanAmount, a.loanRate, a.loanYears, a.holdYears * 12)
  const netSaleProceeds = exit - saleCost - loanBalance
  const accumulatedDep = annualDepreciation * Math.min(a.holdYears, depreciationYears)
  const bookValue = input.price - accumulatedDep
  const capitalGain = exit - bookValue - saleCost
  const cgtRate = a.holdYears > 5 ? 0.20315 : 0.3963
  const cgt = capitalGain > 0 ? capitalGain * cgtRate : 0
  return { pretax: netSaleProceeds, aftertax: netSaleProceeds - cgt }
}
