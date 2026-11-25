import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { scoreQuizAnswers } from '../utils/chemistryMath';
import type { MoleculeSpec, QuizCategory, QuizQuestion } from '../types/chemistry';

interface QuizViewProps {
  questions: QuizQuestion[];
  molecules: MoleculeSpec[];
  onInspectIn3D: (mol: MoleculeSpec) => void;
}

const CATEGORIES: Array<{ id: QuizCategory; label: string }> = [
  { id: 'all', label: 'All Topics' },
  { id: 'formula', label: 'Hybridization & Formula' },
  { id: 'angles', label: 'Bond Angles & VSEPR' },
  { id: 'exceptions', label: 'Lone Pair Exceptions' },
];

export const QuizView: React.FC<QuizViewProps> = ({
  questions,
  molecules,
  onInspectIn3D,
}) => {
  const [category, setCategory] = useState<QuizCategory>('all');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showSummary, setShowSummary] = useState(false);

  const filteredQuestions = useMemo(() => {
    if (category === 'all') return questions;
    return questions.filter((q) => q.category === category);
  }, [questions, category]);

  const activeQuestion = filteredQuestions[currentIdx] ?? filteredQuestions[0];
  const selectedOption = activeQuestion ? answers[activeQuestion.id] : undefined;
  const isAnswered = selectedOption !== undefined;
  const isCorrect =
    isAnswered && activeQuestion && selectedOption === activeQuestion.correctIndex;

  const summary = useMemo(
    () => scoreQuizAnswers(filteredQuestions, answers),
    [filteredQuestions, answers],
  );

  const handleCategoryChange = (nextCat: QuizCategory) => {
    setCategory(nextCat);
    setCurrentIdx(0);
    setShowSummary(false);
  };

  const handleSelectOption = (idx: number) => {
    if (!activeQuestion || isAnswered) return;
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: idx,
    }));
  };

  const handleRetake = () => {
    setAnswers({});
    setCurrentIdx(0);
    setShowSummary(false);
  };

  const relatedMolecule = activeQuestion
    ? molecules.find((m) => m.id === activeQuestion.relatedMoleculeId)
    : undefined;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Category Filter */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-sky-700 font-medium">
            HSC Chemistry 1st Paper · Chapter 3 Practice
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 tracking-tight">
            Hybridization &amp; VSEPR Mastery Quiz
          </h1>
        </div>

        <div className="flex items-center gap-4 text-sm font-mono tabular-nums">
          <span className="text-slate-600">
            Score: <strong className="text-slate-950">{summary.correct}</strong> / {summary.total}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-sky-700 font-semibold">{summary.accuracyPercent}%</span>
        </div>
      </div>

      {/* Topic Filter Bar */}
      <div
        className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit max-w-full overflow-x-auto"
        role="group"
        aria-label="Filter quiz questions by topic"
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Main Quiz Card or Summary View */}
      {showSummary ? (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <span className="text-xs font-mono text-sky-700 font-semibold">
                Round Complete · {summary.masteryLabel}
              </span>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 tabular-nums">
                You scored {summary.correct} out of {summary.total} ({summary.accuracyPercent}%)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </button>
          </div>

          <div className="space-y-3">
            {filteredQuestions.map((q, index) => {
              const userChoice = answers[q.id];
              const qCorrect = userChoice === q.correctIndex;
              const mol = molecules.find((m) => m.id === q.relatedMoleculeId);
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {qCorrect ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700">
                          <XCircle className="w-4 h-4" />
                          Incorrect
                        </span>
                      )}
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-600">Q{index + 1}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{q.prompt}</p>
                    <p className="text-xs text-slate-600">
                      Answer: <strong className="text-slate-900">{q.options[q.correctIndex]}</strong>
                    </p>
                  </div>
                  {mol && (
                    <button
                      type="button"
                      onClick={() => onInspectIn3D(mol)}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-white border border-sky-200 rounded-lg hover:bg-sky-50 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
                    >
                      Inspect {mol.formula} in 3D
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : activeQuestion ? (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          {/* Progress header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
              <span>
                Question {currentIdx + 1} of {filteredQuestions.length} · {activeQuestion.difficulty}
              </span>
              {activeQuestion.formulaTag && (
                <span className="text-slate-700 font-semibold">{activeQuestion.formulaTag}</span>
              )}
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 transition-all"
                style={{
                  width: `${Math.round(((currentIdx + 1) / filteredQuestions.length) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Question prompt */}
          <h2 className="text-lg sm:text-xl font-bold text-slate-950 leading-snug">
            {activeQuestion.prompt}
          </h2>

          {/* Answer Options */}
          <div className="space-y-2.5" role="radiogroup" aria-label="Quiz answer choices">
            {activeQuestion.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isThisCorrect = idx === activeQuestion.correctIndex;

              let btnStyle =
                'bg-white border-slate-200 text-slate-800 hover:border-sky-400 hover:bg-slate-50';
              if (isAnswered) {
                if (isThisCorrect) {
                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium';
                } else if (isSelected && !isThisCorrect) {
                  btnStyle = 'bg-rose-50 border-rose-400 text-rose-950';
                } else {
                  btnStyle = 'bg-slate-50 border-slate-200 text-slate-500';
                }
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors flex items-center justify-between gap-3 ${
                    isAnswered ? 'cursor-default' : 'cursor-pointer'
                  } ${btnStyle}`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs font-semibold text-slate-500 shrink-0">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span>{opt}</span>
                  </div>
                  {isAnswered && isThisCorrect && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      Correct
                    </span>
                  )}
                  {isAnswered && isSelected && !isThisCorrect && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 shrink-0">
                      <XCircle className="w-4 h-4" />
                      Incorrect
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate Feedback & Next Actions */}
          {isAnswered && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                {isCorrect ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Correct Answer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-rose-700">
                    <XCircle className="w-4 h-4" />
                    Incorrect — Review Concept
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {activeQuestion.explanation}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                {relatedMolecule ? (
                  <button
                    type="button"
                    onClick={() => onInspectIn3D(relatedMolecule)}
                    className="px-3.5 py-2 text-xs font-semibold text-sky-700 bg-white border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Inspect {relatedMolecule.formula} in 3D
                  </button>
                ) : (
                  <span />
                )}

                {currentIdx < filteredQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Next Question
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSummary(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    View Quiz Results
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};
