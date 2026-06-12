interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  step?: number
  placeholder?: string
  hint?: string
}

export function NumField({ label, value, onChange, unit, step, placeholder, hint }: Props) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative mt-1.5">
        <input
          type="number"
          className="field pr-12"
          value={Number.isFinite(value) && value !== 0 ? value : value === 0 ? '' : ''}
          step={step}
          placeholder={placeholder ?? '0'}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-champagne/40 text-sm pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] text-champagne/30 mt-1 block">{hint}</span>}
    </label>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select
        className="field mt-1.5 font-sans cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-700">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="field mt-1.5 font-sans"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
