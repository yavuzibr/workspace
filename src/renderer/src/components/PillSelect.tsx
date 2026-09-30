import type { ReactNode } from 'react'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  icon: ReactNode
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

export function PillSelect<T extends string>({
  icon,
  value,
  options,
  onChange
}: Props<T>): JSX.Element {
  return (
    <div
      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors focus-within:border-accent"
      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
    >
      {icon}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-transparent text-xs outline-none"
        style={{ color: 'var(--text-secondary)' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ backgroundColor: 'var(--bg-surface)' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
