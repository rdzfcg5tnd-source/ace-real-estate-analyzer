import { createWorker } from 'tesseract.js'
import type { PropertyInput } from '../types'

export interface OcrResult {
  text: string
  fields: Partial<PropertyInput>
  meta: { name?: string; address?: string }
}

// dataURL(base64) → Uint8Array
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? ''
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// PDF各ページを高解像度でcanvasに描画
async function renderPages(dataUrl: string, scale = 2.5, maxPages = 1): Promise<HTMLCanvasElement[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  const data = dataUrlToBytes(dataUrl)
  const doc = await pdfjsLib.getDocument({ data }).promise
  const canvases: HTMLCanvasElement[] = []
  const n = Math.min(doc.numPages, maxPages)
  for (let p = 1; p <= n; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    canvases.push(canvas)
  }
  return canvases
}

// 全角→半角・記号正規化。スペースは別途まとめて除去する。
function normalize(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[，､、]/g, ',')
    .replace(/[：﹕]/g, ':')
    .replace(/[Ｏｏ]/g, '0') // よくある誤認識（O→0）
    .replace(/㎡|㎥|m²|ｍ²|ｍ2|m2|mi|ml|ｍ/gi, '㎡') // 面積単位ゆれ（OCRはm2/mi/ml等に誤読）
}

// 整数（円・年など）：カンマもピリオドも桁区切りとみなし除去
// （OCRは「70,000」を「70.000」と誤読しがちなため）
const cleanInt = (s: string) => Number(s.replace(/[,.\s]/g, ''))
// 小数（面積）：カンマのみ除去、ピリオドは小数点として残す
const cleanFloat = (s: string) => Number(s.replace(/[,\s]/g, ''))

// 文字列全体から各項目を抽出
export function parseFields(rawText: string): { fields: Partial<PropertyInput>; meta: { name?: string; address?: string } } {
  // スペース（半角/全角/タブ）を全除去 → OCRの文字間スペースでキーワードが壊れるのを防ぐ
  const t = normalize(rawText).replace(/[\s　]/g, '')
  const fields: Partial<PropertyInput> = {}
  const meta: { name?: string; address?: string } = {}
  const find = (re: RegExp) => t.match(re)

  // キーワードと数値の間にOCRノイズ（: _ 等）が入りうるので [^\d]{0,3} で吸収
  // 価格
  const price = find(/(?:価格|販売価格)[^\d]{0,3}([\d,.]+)(億|万)?円/)
  if (price) {
    let v = cleanInt(price[1])
    if (price[2] === '万') v *= 10000
    else if (price[2] === '億') v *= 100000000
    if (v > 0) fields.price = Math.round(v)
  }

  // 月額家賃 / 賃料
  const rent =
    find(/月額(?:賃料|家賃|賃貸料)?[^\d]{0,3}([\d,.]+)(万)?円/) ??
    find(/(?:賃料|家賃)[^\d]{0,3}([\d,.]+)(万)?円/)
  if (rent) {
    let v = cleanInt(rent[1])
    if (rent[2] === '万') v *= 10000
    if (v > 0) fields.monthlyRent = Math.round(v)
  } else {
    const annual = find(/年間賃料[^\d]{0,3}([\d,.]+)(万)?円/)
    if (annual) {
      let v = cleanInt(annual[1])
      if (annual[2] === '万') v *= 10000
      if (v > 0) fields.monthlyRent = Math.round(v / 12)
    }
  }

  // 管理費
  const mgmt = find(/管理費[^\d]{0,3}([\d,.]+)円/)
  if (mgmt) fields.managementFee = cleanInt(mgmt[1])

  // 修繕積立金（修繕積立金 / 積立金）
  const repair = find(/(?:修繕積立金|積立金)[^\d]{0,3}([\d,.]+)円/)
  if (repair) fields.repairReserve = cleanInt(repair[1])

  // 面積（専有 > 壁芯 > 登記 > 専有 の優先。土地面積を拾わぬようキーワード必須）
  const area =
    find(/専有面積[^\d]{0,3}([\d.]+)㎡/) ??
    find(/壁芯面積[^\d]{0,3}([\d.]+)㎡/) ??
    find(/登記面積[^\d]{0,3}([\d.]+)㎡/) ??
    find(/専有[^\d]{0,3}([\d.]+)㎡/) ??
    // 間取り記号（1K/1DK/2LDK等）に隣接する面積
    find(/(?:[1-4][RKSLD]{1,4})[^\d]{0,3}([\d.]+)㎡/)
  if (area) {
    const v = cleanFloat(area[1])
    // 専有面積の現実的範囲（バルコニー/土地/延床を除外）
    if (isFinite(v) && v >= 10 && v < 200) fields.area = v
  }

  // 築年（築年数 / 完成・竣工 / 西暦年月）
  const built =
    find(/築年数?[^\d]{0,3}(\d{4})年(\d{1,2})?月?/) ??
    find(/(?:新築|完成|竣工)[^\d]{0,3}(\d{4})年(\d{1,2})?月?/) ??
    find(/(19\d{2}|20\d{2})年(\d{1,2})月/)
  if (built) {
    fields.builtYear = Number(built[1])
    if (built[2]) fields.builtMonth = Number(built[2])
  }

  return { fields, meta }
}

// メインエントリ：PDFのdataURLから抽出
export async function extractFromPdf(
  dataUrl: string,
  onProgress?: (phase: string, ratio: number) => void,
): Promise<OcrResult> {
  onProgress?.('PDFを画像化', 0)
  const canvases = await renderPages(dataUrl)

  const worker = await createWorker('jpn', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.('文字認識', m.progress)
    },
  })

  let allText = ''
  for (let idx = 0; idx < canvases.length; idx++) {
    const { data } = await worker.recognize(canvases[idx])
    allText += data.text + '\n'
  }
  await worker.terminate()

  const { fields, meta } = parseFields(allText)
  onProgress?.('完了', 1)
  return { text: allText, fields, meta }
}
