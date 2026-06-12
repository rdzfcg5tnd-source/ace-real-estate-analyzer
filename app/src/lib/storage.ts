import type { Property } from '../types'

const KEY = 'reins-analyzer:properties'

export function loadProperties(): Property[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as Property[]
  } catch {
    return []
  }
}

export function saveProperties(list: Property[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch (e) {
    // PDFを含めると容量超過の可能性 → PDFデータを落として再保存
    try {
      const slim = list.map((p) => ({ ...p, pdfData: undefined }))
      localStorage.setItem(KEY, JSON.stringify(slim))
    } catch {
      console.error('保存に失敗しました', e)
    }
  }
}

export function newId(): string {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
