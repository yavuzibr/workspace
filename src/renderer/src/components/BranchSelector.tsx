import { GitBranch } from 'lucide-react'
import { PillSelect } from './PillSelect'

interface Props {
  branches: string[]
  activeBranch: string
  onChange: (branch: string) => void
}

export function BranchSelector({ branches, activeBranch, onChange }: Props): JSX.Element {
  return (
    <PillSelect
      icon={<GitBranch size={13} />}
      value={activeBranch}
      options={branches.map((b) => ({ value: b, label: b }))}
      onChange={onChange}
    />
  )
}
