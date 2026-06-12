// 円を「○○万円」表記に（読みやすさ優先）
export function yen(n: number): string {
  if (!isFinite(n)) return '—'
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

// 万円表記
export function man(n: number): string {
  if (!isFinite(n)) return '—'
  const m = n / 10000
  if (Math.abs(m) >= 10000) {
    return (m / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 2 }) + '億円'
  }
  return m.toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + '万円'
}

export function pct(n: number | null, digits = 2): string {
  if (n === null || n === undefined || !isFinite(n)) return '—'
  return n.toFixed(digits) + '%'
}

// 築年数（西暦・月から現在までの年数）
export function buildingAge(year: number, month: number): number {
  const now = new Date()
  let age = now.getFullYear() - year
  if (now.getMonth() + 1 < (month || 1)) age -= 1
  return Math.max(0, age)
}
