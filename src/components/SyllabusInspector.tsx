import React, { useState } from 'react';
import { Search } from 'lucide-react';
import {
  filterMolecules,
  formatHybridizationLabel,
} from '../utils/chemistryMath';
import type {
  HybridizationType,
  MoleculeSpec,
  OrbitalSlot,
} from '../types/chemistry';

interface SyllabusInspectorProps {
  molecules: MoleculeSpec[];
  activeMolecule: MoleculeSpec;
  onSelectMolecule: (mol: MoleculeSpec) => void;
}

const HYB_FILTERS: Array<{ id: HybridizationType | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'sp', label: 'sp' },
  { id: 'sp2', label: 'sp²' },
  { id: 'sp3', label: 'sp³' },
  { id: 'sp3d', label: 'sp³d' },
  { id: 'sp3d2', label: 'sp³d²' },
  { id: 'sp3d3', label: 'sp³d³' },
];

function renderSpinArrows(slot: OrbitalSlot): string {
  if (slot.electrons === 2) return '↑↓';
  if (slot.electrons === 1) return '↑';
  return ' ';
}

function slotColorClass(slot: OrbitalSlot): string {
  switch (slot.kind) {
    case 'lone-pair':
      return 'border-amber-400 bg-amber-50 text-amber-900';
    case 'sigma-bond':
      return 'border-sky-400 bg-sky-50 text-sky-950';
    case 'pi-bond':
      return 'border-indigo-300 bg-indigo-50 text-indigo-900';
    case 'hybrid':
      return 'border-slate-300 bg-slate-50 text-slate-900';
    default:
      return 'border-slate-200 bg-white text-slate-500';
  }
}

export const SyllabusInspector: React.FC<SyllabusInspectorProps> = ({
  molecules,
  activeMolecule,
  onSelectMolecule,
}) => {
  const [hybFilter, setHybFilter] = useState<HybridizationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = filterMolecules(molecules, hybFilter, searchQuery);
  const fb = activeMolecule.formulaBreakdown;

  return (
    <aside className="w-full lg:h-full bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
      {/* Section 1: Molecule Catalog Picker */}
      <div className="p-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            HSC Chapter 3 Molecules
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {filtered.length} of {molecules.length}
          </span>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="molecule-search" className="sr-only">
            Search molecule by name, formula, or shape
          </label>
          <input
            id="molecule-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CH4, Ammonia, XeF6..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
          />
        </div>

        {/* Hybridization segmented filter */}
        <div
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          role="group"
          aria-label="Filter molecules by hybridization"
        >
          {HYB_FILTERS.map((f) => {
            const active = hybFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setHybFilter(f.id)}
                className={`px-2 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Molecule buttons grid */}
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
          {filtered.length === 0 ? (
            <div className="col-span-full py-4 text-center text-xs text-slate-500">
              No matching syllabus molecules.{' '}
              <button
                type="button"
                onClick={() => {
                  setHybFilter('all');
                  setSearchQuery('');
                }}
                className="text-sky-700 font-medium underline cursor-pointer"
              >
                Reset filter
              </button>
            </div>
          ) : (
            filtered.map((mol) => {
              const isSelected = mol.id === activeMolecule.id;
              return (
                <button
                  key={mol.id}
                  type="button"
                  onClick={() => onSelectMolecule(mol)}
                  aria-pressed={isSelected}
                  className={`px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-700 border-sky-700 text-white'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-bold font-display leading-tight">
                    {mol.formula}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isSelected ? 'text-sky-100' : 'text-slate-500'
                    }`}
                  >
                    {mol.name}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Section 2: Active Molecule Data & Formula Calculation */}
      <div className="p-4 space-y-5 overflow-y-auto">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="text-xl font-bold text-slate-950 tracking-tight">
              {activeMolecule.formula} · {activeMolecule.name}
            </h1>
            <span className="text-xs text-slate-500 shrink-0">
              {activeMolecule.banglaName}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {activeMolecule.syllabusPriority} · Central Atom: {activeMolecule.centralAtom}
          </p>

          {/* 4-cell concise data grid */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Hybridization</div>
              <div className="mt-0.5 text-base font-mono font-semibold text-sky-700">
                {formatHybridizationLabel(activeMolecule.hybridization)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Bond Angle</div>
              <div className="mt-0.5 text-sm font-mono font-semibold text-slate-950 tabular-nums">
                {activeMolecule.angleSummary}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Molecular Shape</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {activeMolecule.molecularShape}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Electron Pairs</div>
              <div className="mt-0.5 text-sm font-mono font-medium text-slate-900 tabular-nums">
                {activeMolecule.bondPairs} BP · {activeMolecule.lonePairs} LP
              </div>
            </div>
          </div>
        </div>

        {/* Formula Breakdown H = 1/2(V + M - C + A) */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Hybridization Formula
          </h3>
          <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 space-y-1 tabular-nums">
            <div>H = ½ × (V + M − C + A)</div>
            <div className="text-slate-600">
              H = ½ × ({fb.valenceElectrons} + {fb.monovalentAtoms} − {fb.cationCharge} + {fb.anionCharge}) ={' '}
              <strong className="text-sky-700 text-sm">{fb.stericNumber}</strong>{' '}
              ({formatHybridizationLabel(activeMolecule.hybridization)})
            </div>
            <div className="text-slate-500 pt-0.5">
              Electron Geometry: {activeMolecule.electronGeometry}
            </div>
            {fb.note && (
              <div className="text-amber-800 pt-0.5 font-sans">
                Note: {fb.note}
              </div>
            )}
          </div>
        </div>

        {/* Orbital Box Diagram */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Orbital Box Diagram
          </h3>
          <div className="mt-2.5 space-y-3">
            {activeMolecule.orbitalStates.map((row) => (
              <div key={row.stage}>
                <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
                  <span className="font-semibold text-slate-800">{row.stage}</span>
                  <span className="font-mono text-slate-500">{row.notation}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {row.slots.map((slot, idx) => (
                    <div
                      key={`${row.stage}-${idx}`}
                      className={`px-2 py-1 rounded border text-center min-w-[44px] ${slotColorClass(slot)}`}
                    >
                      <div className="text-xs font-mono font-bold leading-none h-4 flex items-center justify-center">
                        {renderSpinArrows(slot)}
                      </div>
                      <div className="text-[10px] font-mono opacity-80 mt-0.5 leading-tight">
                        {slot.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VSEPR Explanation & Exam Tip */}
        <div className="pt-4 border-t border-slate-200 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            VSEPR &amp; Bond Angle Analysis
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            {activeMolecule.repulsionExplanation}
          </p>
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-950 leading-relaxed">
            <strong className="font-semibold">HSC Board Tip: </strong>
            {activeMolecule.hscExamTip}
          </div>
        </div>
      </div>
    </aside>
  );
};
