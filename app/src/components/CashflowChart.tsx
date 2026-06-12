import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { CashflowRow } from '../types'
import { man } from '../lib/format'

export default function CashflowChart({ schedule }: { schedule: CashflowRow[] }) {
  const data = schedule.map((r) => ({
    year: `${r.year}年`,
    キャッシュフロー: Math.round(r.cashflow / 10000),
    累積: Math.round(r.cumulative / 10000),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cfBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6cd8a" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#9c7a32" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="year" tick={{ fill: 'rgba(232,226,212,0.5)', fontSize: 11 }} />
        <YAxis
          tick={{ fill: 'rgba(232,226,212,0.5)', fontSize: 11 }}
          tickFormatter={(v) => `${v}万`}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: '#17171b',
            border: '1px solid rgba(201,162,75,0.3)',
            borderRadius: 8,
            color: '#e8e2d4',
          }}
          formatter={(v) => [man(Number(v) * 10000), '']}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
        <Bar dataKey="キャッシュフロー" fill="url(#cfBar)" radius={[3, 3, 0, 0]} maxBarSize={36} />
        <Line
          type="monotone"
          dataKey="累積"
          stroke="#c9a24b"
          strokeWidth={2}
          dot={{ r: 3, fill: '#e6cd8a' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
