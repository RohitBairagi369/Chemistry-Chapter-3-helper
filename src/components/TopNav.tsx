import React from 'react';
import type { AppView } from '../types/chemistry';

interface TopNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

const NAV_ITEMS: Array<{ id: AppView; label: string }> = [
  { id: 'visualizer', label: '3D Visualizer' },
  { id: 'atlas', label: 'Angle Atlas' },
  { id: 'guide', label: 'Formula & Guide' },
  { id: 'quiz', label: 'HSC Quiz' },
];

export const TopNav: React.FC<TopNavProps> = ({ activeView, onNavigate }) => {
  return (
    <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8 shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#visualizer"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('visualizer');
        }}
        className="text-lg font-extrabold font-display tracking-tight text-slate-900 whitespace-nowrap shrink-0"
      >
        OrbitLab HSC
      </a>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav
        aria-label="Primary navigation"
        className="hidden md:flex items-center gap-6 text-sm font-medium"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'border-sky-600 text-slate-950 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-950 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary CTA */}
      <div className="flex items-center shrink-0">
        {activeView === 'quiz' ? (
          <button
            type="button"
            onClick={() => onNavigate('visualizer')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Back to 3D Lab
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('quiz')}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Practice Quiz
          </button>
        )}
      </div>
    </header>
  );
};
