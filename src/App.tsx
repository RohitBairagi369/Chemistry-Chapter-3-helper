import { useEffect, useState } from 'react';
import { TopNav } from './components/TopNav';
import { MoleculeViewport3D } from './components/MoleculeViewport3D';
import { SyllabusInspector } from './components/SyllabusInspector';
import { AngleAtlasView } from './components/AngleAtlasView';
import { SyllabusGuideView } from './components/SyllabusGuideView';
import { QuizView } from './components/QuizView';
import { MOLECULES } from './data/molecules';
import { QUIZ_QUESTIONS } from './data/quizQuestions';
import type { AppView, MoleculeSpec } from './types/chemistry';

function resolveInitialState(): { view: AppView; molecule: MoleculeSpec } {
  if (typeof window === 'undefined') {
    return { view: 'visualizer', molecule: MOLECULES[0] };
  }
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  const molParam = params.get('molecule')?.toLowerCase();

  const view: AppView =
    tabParam === 'atlas' || tabParam === 'guide' || tabParam === 'quiz'
      ? tabParam
      : 'visualizer';

  const matchedMol =
    MOLECULES.find((m) => m.id === molParam || m.formulaPlain.toLowerCase() === molParam) ??
    MOLECULES[0];

  return { view, molecule: matchedMol };
}

export default function App() {
  const initial = resolveInitialState();
  const [activeView, setActiveView] = useState<AppView>(initial.view);
  const [activeMolecule, setActiveMolecule] = useState<MoleculeSpec>(initial.molecule);

  useEffect(() => {
    document.body.dataset.view = activeView;
    document.body.dataset.molecule = activeMolecule.id;
  }, [activeView, activeMolecule]);

  const handleInspectIn3D = (mol: MoleculeSpec) => {
    setActiveMolecule(mol);
    setActiveView('visualizer');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <TopNav activeView={activeView} onNavigate={setActiveView} />

      {/* Mobile navigation strip (keeps top bar clean 1-row on desktop and <15% height on mobile) */}
      <nav
        aria-label="Mobile view navigation"
        className="md:hidden flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-200 overflow-x-auto"
      >
        {(
          [
            { id: 'visualizer', label: '3D Lab' },
            { id: 'atlas', label: 'Angle Atlas' },
            { id: 'guide', label: 'Formula' },
            { id: 'quiz', label: 'Quiz' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === tab.id
                ? 'bg-sky-700 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="flex-1">
        {activeView === 'visualizer' && (
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:h-[calc(100vh-96px)] lg:min-h-[600px] items-stretch">
              <div className="lg:col-span-7 xl:col-span-8 flex h-[500px] lg:h-full">
                <MoleculeViewport3D molecule={activeMolecule} />
              </div>
              <div className="lg:col-span-5 xl:col-span-4 flex lg:h-full lg:overflow-hidden">
                <SyllabusInspector
                  molecules={MOLECULES}
                  activeMolecule={activeMolecule}
                  onSelectMolecule={setActiveMolecule}
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'atlas' && (
          <AngleAtlasView
            molecules={MOLECULES}
            onInspectIn3D={handleInspectIn3D}
          />
        )}

        {activeView === 'guide' && (
          <SyllabusGuideView
            molecules={MOLECULES}
            onInspectIn3D={handleInspectIn3D}
          />
        )}

        {activeView === 'quiz' && (
          <QuizView
            questions={QUIZ_QUESTIONS}
            molecules={MOLECULES}
            onInspectIn3D={handleInspectIn3D}
          />
        )}
      </main>
    </div>
  );
}
