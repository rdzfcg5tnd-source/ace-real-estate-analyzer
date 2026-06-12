import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 公開先のベースパス。GitHub Pages はサブパス配信のため VITE_BASE=/<repo>/ を渡す。
// ローカル開発や Vercel/Netlify（ルート配信）では未指定 = '/' のまま動く。
const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'ogp.svg'],
      manifest: {
        name: 'ACE 不動産投資分析',
        short_name: 'ACE投資分析',
        description:
          '販売図面PDFから表面/実質利回り・IRR・税引後ROIを自動計算する不動産投資シミュレーター。画像はブラウザ内で処理され外部送信なし。',
        lang: 'ja',
        dir: 'ltr',
        theme_color: '#0a0a0b',
        background_color: '#0a0a0b',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        categories: ['finance', 'business', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // ビルド成果物をプリキャッシュ（PDFワーカー含む大きめファイルも許可）
        globPatterns: ['**/*.{js,css,html,svg,png,ico,mjs,wasm}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // OCRの言語データ等（CDN）はオンライン取得（取得済みはtesseractがIndexedDBにキャッシュ）
        navigateFallback: `${base}index.html`,
      },
      devOptions: {
        enabled: false, // 開発時はSWを無効（HMRと干渉させない）
      },
    }),
  ],
})
