'use client'

import { useChatStore, type BattleEvaluationSummary } from '@/lib/store'

export function LeaderboardPanel() {
  const evaluation = useChatStore((s) => s.latestEvaluation)

  if (!evaluation) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-3">Leaderboard</h3>
        <p className="text-xs text-muted-foreground">
          Send a message to see model rankings.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-3">Latest Battle Results</h3>

      <div className="space-y-2">
        {evaluation.evaluations
          .sort((a, b) => a.rank - b.rank)
          .map((ev) => (
            <EvaluationCard
              key={ev.modelId}
              evaluation={ev}
              isWinner={ev.modelId === evaluation.winnerModelId}
            />
          ))}
      </div>

      {evaluation.consensus && (
        <div className="mt-4 rounded-lg bg-muted/30 p-3">
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Consensus</h4>
          <p className="text-xs">{evaluation.consensus}</p>
        </div>
      )}

      {evaluation.divergences && (
        <div className="mt-2 rounded-lg bg-muted/30 p-3">
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Divergences</h4>
          <p className="text-xs">{evaluation.divergences}</p>
        </div>
      )}
    </div>
  )
}

function EvaluationCard({
  evaluation,
  isWinner,
}: {
  evaluation: BattleEvaluationSummary['evaluations'][number]
  isWinner: boolean
}) {
  const modelName = evaluation.modelId.split('/').pop() ?? evaluation.modelId

  return (
    <div className={`rounded-lg border p-3 ${
      isWinner ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/20'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">#{evaluation.rank}</span>
          <span className="text-xs font-semibold">{modelName}</span>
          {isWinner && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
              Winner
            </span>
          )}
        </div>
        <span className={`text-sm font-bold ${
          evaluation.overallScore >= 80 ? 'text-green-400' :
          evaluation.overallScore >= 60 ? 'text-yellow-400' :
          'text-red-400'
        }`}>
          {evaluation.overallScore}
        </span>
      </div>

      {evaluation.criteria.length > 0 && (
        <div className="grid grid-cols-3 gap-1 mt-2">
          {evaluation.criteria.slice(0, 6).map((c) => (
            <div key={c.name} className="text-center">
              <div className="text-[10px] text-muted-foreground capitalize">{c.name}</div>
              <div className="text-xs font-medium">{c.score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
