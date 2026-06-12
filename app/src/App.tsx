import { useEffect, useMemo, useState } from 'react'
import type { Property } from './types'
import { DEFAULT_ASSUMPTIONS, EMPTY_INPUT } from './lib/defaults'
import { analyze } from './lib/finance'
import { loadProperties, saveProperties, newId } from './lib/storage'
import PropertyList from './components/PropertyList'
import PdfViewer from './components/PdfViewer'
import PropertyForm from './components/PropertyForm'
import ResultsPanel from './components/ResultsPanel'
import ComparisonView from './components/ComparisonView'
import OcrBanner, { type OcrState } from './components/OcrBanner'
import { extractFromPdf } from './lib/ocr'

function blankProperty(): Property {
  return {
    id: newId(),
    name: '',
    address: '',
    input: { ...EMPTY_INPUT },
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    createdAt: Date.now(),
  }
}

export default function App() {
  const initial = useMemo(() => {
    const saved = loadProperties()
    return saved.length ? saved : [blankProperty()]
  }, [])
  const [properties, setProperties] = useState<Property[]>(initial)
  const [activeId, setActiveId] = useState<string | null>(initial[0].id)
  const [draft, setDraft] = useState<Property>(initial[0])
  const [view, setView] = useState<'analysis' | 'compare'>('analysis')
  const [ocr, setOcr] = useState<OcrState>({ status: 'idle', phase: '', ratio: 0, text: '', filled: [] })

  // 保存済みリストの永続化
  useEffect(() => {
    saveProperties(properties)
  }, [properties])

  // activeId変更時にドラフトを差し替え（OCR表示はリセット）
  useEffect(() => {
    if (activeId) {
      const p = properties.find((x) => x.id === activeId)
      if (p) setDraft(p)
      setOcr({ status: 'idle', phase: '', ratio: 0, text: '', filled: [] })
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(() => analyze(draft.input, draft.assumptions), [draft])

  // ドラフト変更を保存リストへ反映（存在すれば更新）
  const updateDraft = (p: Property) => {
    setDraft(p)
    setProperties((list) => {
      const exists = list.some((x) => x.id === p.id)
      return exists ? list.map((x) => (x.id === p.id ? p : x)) : list
    })
  }

  const handleNew = () => {
    const p = blankProperty()
    setProperties((list) => [p, ...list])
    setActiveId(p.id)
    setDraft(p)
  }

  const handleSelect = (id: string) => setActiveId(id)

  const handleDelete = (id: string) => {
    setProperties((list) => {
      const next = list.filter((x) => x.id !== id)
      if (id === activeId) {
        const fallback = next[0] ?? null
        setActiveId(fallback?.id ?? null)
        setDraft(fallback ?? blankProperty())
      }
      return next
    })
  }

  // PDFのdataURLからOCR抽出 → 入力欄へ反映
  const runOcr = async (base: Property, dataUrl: string) => {
    setOcr({ status: 'running', phase: '準備', ratio: 0, text: '', filled: [] })
    try {
      const res = await extractFromPdf(dataUrl, (phase, ratio) =>
        setOcr((o) => ({ ...o, status: 'running', phase, ratio })),
      )
      const filled = Object.keys(res.fields)
      updateDraft({
        ...base,
        input: { ...base.input, ...res.fields },
        name: base.name || res.meta.name || base.name,
        address: base.address || res.meta.address || base.address,
      })
      setOcr({ status: 'done', phase: '完了', ratio: 1, text: res.text, filled })
    } catch (e) {
      setOcr({ status: 'error', phase: '', ratio: 0, text: '', filled: [], error: String(e) })
    }
  }

  const handlePickPdf = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const withPdf = { ...draft, pdfName: file.name, pdfData: dataUrl }
      updateDraft(withPdf)
      void runOcr(withPdf, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleRerunOcr = () => {
    if (draft.pdfData) void runOcr(draft, draft.pdfData)
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-ink-900/60 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-xl tracking-wide">
            <span className="gold-text">ACE</span>
            <span className="text-champagne/90"> 不動産投資分析</span>
          </h1>
          <span className="text-xs text-champagne/30 tracking-widest uppercase">Investment Analyzer</span>
        </div>
        {/* ビュー切替タブ */}
        <div className="flex items-center gap-1 bg-ink-700/60 rounded-lg p-1 border border-white/5">
          <button
            className={`px-4 py-1.5 rounded-md text-sm transition ${
              view === 'analysis' ? 'bg-gold/15 text-gold-light' : 'text-champagne/50 hover:text-champagne'
            }`}
            onClick={() => setView('analysis')}
          >
            分析
          </button>
          <button
            className={`px-4 py-1.5 rounded-md text-sm transition ${
              view === 'compare' ? 'bg-gold/15 text-gold-light' : 'text-champagne/50 hover:text-champagne'
            }`}
            onClick={() => setView('compare')}
          >
            比較
          </button>
        </div>
      </header>

      {/* 本体 */}
      <div className="flex-1 flex gap-5 p-5 overflow-hidden">
        <PropertyList
          properties={properties}
          activeId={activeId}
          onSelect={(id) => {
            handleSelect(id)
            setView('analysis')
          }}
          onNew={handleNew}
          onDelete={handleDelete}
        />

        <main className="flex-1 flex flex-col gap-5 overflow-auto pr-1">
          {view === 'analysis' ? (
            <>
              <OcrBanner ocr={ocr} onRerun={handleRerunOcr} hasPdf={!!draft.pdfData} />

              {/* 上段：PDF ＋ 入力 */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-h-[560px]">
                <PdfViewer file={draft.pdfData ?? null} fileName={draft.pdfName} onPick={handlePickPdf} />
                <PropertyForm property={draft} onChange={updateDraft} />
              </div>

              {/* 下段：結果 */}
              <ResultsPanel result={result} property={draft} />
            </>
          ) : (
            <ComparisonView properties={properties} />
          )}
        </main>
      </div>
    </div>
  )
}
