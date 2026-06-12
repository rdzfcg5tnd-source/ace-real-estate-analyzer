import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// pdf.js のワーカーをローカルバンドルから設定
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface Props {
  file: string | null // dataURL
  fileName?: string
  onPick: (file: File) => void
}

export default function PdfViewer({ file, fileName, onPick }: Props) {
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.0)

  const onLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPage(1)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onPick(f)
  }

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="label">販売図面</span>
          {fileName && (
            <span className="text-sm text-champagne/60 truncate font-mono">{fileName}</span>
          )}
        </div>
        <label className="btn-ghost text-xs cursor-pointer py-1.5 px-3">
          PDFを選択
          <input type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
        </label>
      </div>

      <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-ink-900/40">
        {file ? (
          <Document
            file={file}
            onLoadSuccess={onLoad}
            loading={<div className="text-champagne/40 mt-10">読み込み中…</div>}
            error={<div className="text-red-400/70 mt-10">PDFを表示できませんでした</div>}
          >
            <Page
              pageNumber={page}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-champagne/40 mt-16 gap-3">
            <div className="w-16 h-16 rounded-full border border-gold/30 flex items-center justify-center text-gold/60 text-2xl">
              ⌘
            </div>
            <p className="text-sm">レインズで取得した販売図面PDFを選択してください</p>
            <p className="text-xs text-champagne/25">図面を見ながら右側に項目を入力します</p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 text-xs text-champagne/60">
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost py-1 px-2"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
            >
              −
            </button>
            <span className="font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              className="btn-ghost py-1 px-2"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
            >
              ＋
            </button>
          </div>
          {numPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost py-1 px-2 disabled:opacity-30"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              <span className="font-mono">
                {page} / {numPages}
              </span>
              <button
                className="btn-ghost py-1 px-2 disabled:opacity-30"
                disabled={page >= numPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
