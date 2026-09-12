
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNABLE TO VERIFY'
type Size = 'sm' | 'md' | 'lg'

interface RiskBadgeProps {
  level: string
  size?: Size
  showDot?: boolean
}

const config: Record<RiskLevel, { label: string; classes: string; dot: string }> = {
  LOW:      { label: 'LOW',      dot: 'bg-green-500',  classes: 'bg-green-50  dark:bg-green-900/30  text-green-800  dark:text-green-300  border-green-200  dark:border-green-800' },
  MEDIUM:   { label: 'MEDIUM',   dot: 'bg-amber-500',  classes: 'bg-amber-50  dark:bg-amber-900/30  text-amber-800  dark:text-amber-300  border-amber-200  dark:border-amber-800' },
  'UNABLE TO VERIFY': { label: 'UNABLE TO VERIFY', dot: 'bg-gray-400', classes: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
  HIGH:     { label: 'HIGH',     dot: 'bg-orange-500', classes: 'bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  CRITICAL: { label: 'CRITICAL', dot: 'bg-red-500',    classes: 'bg-red-50    dark:bg-red-900/30    text-red-800    dark:text-red-300    border-red-200    dark:border-red-800' },
}

const sizes: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[10px] font-semibold tracking-wide',
  md: 'px-2.5 py-1 text-xs font-semibold tracking-wide',
  lg: 'px-3 py-1.5 text-sm font-bold tracking-wide',
}

export function RiskBadge({ level, size = 'md', showDot = false }: RiskBadgeProps) {
  const key = (level?.toUpperCase() as RiskLevel) || 'LOW'
  const c = config[key] ?? config['LOW']
  const s = sizes[size]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded border ${c.classes} ${s}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />}
      {c.label}
    </span>
  )
}

export default RiskBadge
