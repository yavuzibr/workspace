import { Layers } from 'lucide-react'
import { PillSelect } from './PillSelect'

interface Props {
  subsets: string[]
  activeSubset: string | null
  onChange: (subset: string | null) => void
}

const ALL_VALUE = '__all__'

export function SubsetSelector({ subsets, activeSubset, onChange }: Props): JSX.Element | null {
  if (subsets.length <= 1) return null

  return (
    <PillSelect
      icon={<Layers size={13} />}
      value={activeSubset ?? ALL_VALUE}
      options={[
        { value: ALL_VALUE, label: "Tüm subset'ler" },
        ...subsets.map((s) => ({ value: s, label: s }))
      ]}
      onChange={(v) => onChange(v === ALL_VALUE ? null : v)}
    />
  )
}
