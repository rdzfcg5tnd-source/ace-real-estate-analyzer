import { useState } from 'react'

export interface OcrState {
  status: 'idle' | 'running' | 'done' | 'error'
  phase: string
  ratio: number
  text: string
  filled: string[]
  error?: string
}

const FIELD_LABELS: Record<string, string> = {
  price: '価格',
  monthlyRent: '月額家賃',
  managementFee: '管理費',
  repairReserve: '修繕積立金',
  area: '面積',
  builtYear: '築年',
  builtMonth: '築月',
}

export default function OcrBanner({
  ocr,
  onRerun,
  hasPdf,
}: {
  ocr: OcrState
  onRerun: () => void
  hasPdf: boolean
}) {
  const [showText, setShowText] = useState(false)
  if (ocr.status === 'idle') return null

  return (
    <div className="card p-4">
      {ocr.status === 'running' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gold-light">
              OCRで自動入力中… <span className="text-champagne/50">{ocr.phase}</span>
            </span>
            <span className="font-mono text-xs text-champagne/60">{Math.round(ocr.ratio * 100)}%</span>
          </div>
          <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-dark to-gold-light transition-all"
              style={{ width: `${Math.max(5, ocr.ratio * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-champagne/30 mt-2">
            初回は日本語認識データ（約数MB）をダウンロードするため少し時間がかかります。
          </p>
        </div>
      )}

      {ocr.status === 'done' && (
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              {ocr.filled.length > 0 ? (
                <span className="text-gold-light">
                  ✓ {ocr.filled.length}項目を自動入力しました
                </span>
              ) : (
                <span className="text-amber-400/80">⚠ 項目を読み取れませんでした（手入力してください）</span>
              )}
              {ocr.filled.length > 0 && (
                <span className="text-champagne/50 ml-2">
                  {ocr.filled.map((f) => FIELD_LABELS[f] ?? f).join('・')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost text-xs py-1" onClick={() => setShowText((s) => !s)}>
                {showText ? 'OCR結果を隠す' : 'OCR結果を見る'}
              </button>
              <button className="btn-ghost text-xs py-1" onClick={onRerun} disabled={!hasPdf}>
                再抽出
              </button>
            </div>
          </div>
          <p className="text-[11px] text-champagne/30 mt-2">
            ※ 画像認識のため誤りが残る場合があります。入力欄の数値を必ずご確認・修正ください。
          </p>
          {showText && (
            <pre className="mt-3 max-h-48 overflow-auto bg-ink-900/60 rounded-lg p-3 text-[11px] text-champagne/50 whitespace-pre-wrap">
              {ocr.text || '(認識結果なし)'}
            </pre>
          )}
        </div>
      )}

      {ocr.status === 'error' && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-red-400/80">OCRに失敗しました：{ocr.error}</span>
          <button className="btn-ghost text-xs py-1" onClick={onRerun} disabled={!hasPdf}>
            再試行
          </button>
        </div>
      )}
    </div>
  )
}
