'use client'

import type { BattleProgress } from '@/lib/store'

interface BattleProgressProps {
  progress: BattleProgress
}

const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  analyzing: { label: 'Analyzing Task', color: 'text-blue-400' },
  competing: { label: 'Models Competing', color: 'text-yellow-400' },
  judging: { label: 'Judging Responses', color: 'text-purple-400' },
  discussing: { label: 'Discussion', color: 'text-green-400' },
  complete: { label: 'Complete', color: 'text-green-500' },
}

export function BattleProgressIndicator({ progress }: BattleProgressProps) {
  const config = PHASE_CONFIG[progress.phase] ?? { label: progress.phase, color: 'text-gray-400' }

  return (
    <div className="mx-4 my-2 rounded-lg border border-border bg-muted/30 px-4 py-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: '0s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
        </div>
        <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
        <span className="text-xs text-muted-foreground">{progress.detail}</span>
      </div>

      {progress.candidateModels && progress.candidateModels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {progress.candidateModels.map((model) => (
            <span
              key={model}
              className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground"
            >
              {model.split('/').pop()}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
