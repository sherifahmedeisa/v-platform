import React from 'react'
import { Plus, Edit3, CheckCircle2 } from 'lucide-react'
import type { QuestionItem } from '../types'

interface QuestionsPanelProps {
  questions: QuestionItem[]
  onInsertQuestion: (q: string) => void
  onGenerateAnswer: (q: QuestionItem) => void
  isGenerating: boolean
}

export const QuestionsPanel: React.FC<QuestionsPanelProps> = ({
  questions,
  onInsertQuestion,
  onGenerateAnswer,
  isGenerating,
}) => {
  const answeredCount = questions.filter((q) => q.answered).length

  return (
    <div className="h-full flex flex-col text-sm select-none bg-neutral-950 font-sans">
      {/* Cupertino Header */}
      <div className="p-4 border-b border-white/[0.08] bg-neutral-900/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <span className="text-white font-semibold tracking-tight text-base">Search Intent Questions</span>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">High-intent user queries</p>
        </div>
        <span className="text-xs sm:text-sm font-mono text-neutral-300 font-medium">
          {answeredCount}/{questions.length} answered
        </span>
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {questions.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border p-4 transition-all ${
              item.answered
                ? 'border-white/[0.04] bg-neutral-900/20 text-neutral-400'
                : 'border-white/[0.08] bg-neutral-900/50 hover:bg-neutral-900/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase font-mono text-neutral-400 font-semibold">
                    {item.intent}
                  </span>
                  {item.answered && (
                    <span className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-400 font-mono">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Answered in draft</span>
                    </span>
                  )}
                </div>
                <div
                  className={`text-base font-semibold leading-snug ${
                    item.answered ? 'text-neutral-400' : 'text-neutral-100'
                  }`}
                >
                  {item.question}
                </div>
              </div>
            </div>

            {/* Apple Micro Actions */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs sm:text-sm font-medium">
              <button
                onClick={() => onInsertQuestion(item.question)}
                className="text-neutral-400 hover:text-white flex items-center space-x-1.5 cursor-pointer transition-colors py-1 px-2.5 rounded-lg hover:bg-white/[0.04]"
              >
                <Plus className="w-4 h-4" />
                <span>Insert</span>
              </button>

              <button
                onClick={() => onGenerateAnswer(item)}
                disabled={isGenerating}
                className="text-neutral-300 hover:text-white flex items-center space-x-1.5 cursor-pointer transition-colors disabled:opacity-40 py-1 px-2.5 rounded-lg hover:bg-white/[0.04]"
              >
                <Edit3 className="w-4 h-4" />
                <span>Answer with AI</span>
              </button>
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="p-10 text-center text-neutral-500 text-sm sm:text-base">
            No questions available for this query.
          </div>
        )}
      </div>
    </div>
  )
}
