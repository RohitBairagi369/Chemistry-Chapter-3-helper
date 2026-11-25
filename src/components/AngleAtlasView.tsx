import React, { useState } from 'react';
import {
  filterMolecules,
  formatHybridizationLabel,
} from '../utils/chemistryMath';
import type { HybridizationType, MoleculeSpec } from '../types/chemistry';

interface AngleAtlasViewProps {
  molecules: MoleculeSpec[];
  onInspectIn3D: (mol: MoleculeSpec) => void;
}

const HYB_TABS: Array<{ id: HybridizationType | 'all'; label: string }> = [
  { id: 'all', label: 'All Hybridizations' },
  { id: 'sp', label: 'sp' },
  { id: 'sp2', label: 'sp²' },
  { id: 'sp3', label: 'sp³' },
  { id: 'sp3d', label: 'sp³d' },
  { id: 'sp3d2', label: 'sp³d²' },
  { id: 'sp3d3', label: 'sp³d³' },
];

const VSEPR_TRIO = [
  {
    id: 'ch4',
    formula: 'CH₄',
    name: 'Methane',
    lp: 0,
    angle: 109.5,
    note: '0 Lone Pairs · Equal BP–BP repulsion',
  },
  {
    id: 'nh3',
    formula: 'NH₃',
    name: 'Ammonia',
    lp: 1,
    angle: 107.0,
    note: '1 Lone Pair · −2.5° compression',
  },
  {
    id: 'h2o',
    formula: 'H₂O',
    name: 'Water',
    lp: 2,
    angle: 104.5,
    note: '2 Lone Pairs · −5.0° compression',
  },
];

export const AngleAtlasView: React.FC<AngleAtlasViewProps> = ({
  molecules,
  onInspectIn3D,
}) => {
  const [selectedHyb, setSelectedHyb] = useState<HybridizationType | 'all'>('all');
  const filtered = filterMolecules(molecules, selectedHyb, '');

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header + VSEPR Lone Pair Compression Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono text-sky-700 font-medium">
              HSC Chemistry 1st Paper · Chapter 3
            </p>
            <h1 className="mt-1.5 text-2xl font-bold text-slate-950 tracking-tight">
              Bond Angle &amp; VSEPR Geometry Atlas
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Every extra lone pair on the central atom exerts greater angular repulsion
              than a bonding pair, systematically compressing bond angles inside the
              same hybridization family.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-200 text-xs font-mono text-slate-700">
            Repulsion Order: LP–LP &gt; LP–BP &gt; BP–BP
          </div>
        </div>

        {/* Interactive Visual Angle Compression Scale for sp3 Trio */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Classic sp³ Lone-Pair Angle Compression (CH₄ → NH₃ → H₂O)
            </h2>
            <span className="text-xs font-mono text-slate-500">All sp³</span>
          </div>

          <div className="space-y-4">
            {VSEPR_TRIO.map((item) => {
              const targetMol = molecules.find((m) => m.id === item.id);
              const barWidth = Math.round((item.angle / 180) * 100);
              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold font-display text-slate-950">
                        {item.formula}
                      </span>
                      <span className="text-slate-600">{item.name}</span>
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        · {item.note}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-semibold text-sky-700 tabular-nums">
                        {item.angle}°
                      </span>
                      {targetMol && (
                        <button
                          type="button"
                          onClick={() => onInspectIn3D(targetMol)}
                          className="text-xs font-medium text-slate-700 hover:text-sky-700 underline whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Inspect 3D
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600 rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Bar + Reference Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Complete Syllabus Bond Angle Reference
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any row to open its interactive 3D hybrid orbitals and lone pairs.
            </p>
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
            role="group"
            aria-label="Filter angle table by hybridization"
          >
            {HYB_TABS.map((tab) => {
              const active = selectedHyb === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedHyb(tab.id)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Molecule</th>
                <th className="py-3 px-4">Hybridization</th>
                <th className="py-3 px-4">BP / LP</th>
                <th className="py-3 px-4">Electron Geometry</th>
                <th className="py-3 px-4">Molecular Shape</th>
                <th className="py-3 px-4">Bond Angle(s)</th>
                <th className="py-3 px-4 text-right">3D Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((mol) => (
                <tr
                  key={mol.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold font-display text-slate-950">
                      {mol.formula}
                    </div>
                    <div className="text-xs text-slate-500">{mol.name}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-sky-700">
                    {formatHybridizationLabel(mol.hybridization)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                    {mol.bondPairs} BP / {mol.lonePairs} LP
                  </td>
                  <td className="py-3 px-4 text-slate-700">{mol.electronGeometry}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {mol.molecularShape}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                    {mol.angleSummary}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectIn3D(mol)}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      View in 3D
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
