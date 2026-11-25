import React, { useState } from 'react';
import {
  calculateHybridizationValue,
  formatHybridizationLabel,
  predictVseprShape,
} from '../utils/chemistryMath';
import type { MoleculeSpec } from '../types/chemistry';

interface SyllabusGuideViewProps {
  molecules: MoleculeSpec[];
  onInspectIn3D: (mol: MoleculeSpec) => void;
}

const QUICK_PRESETS = [
  { label: 'CH₄ (C + 4H)', v: 4, m: 4, c: 0, a: 0, molId: 'ch4' },
  { label: 'NH₃ (N + 3H)', v: 5, m: 3, c: 0, a: 0, molId: 'nh3' },
  { label: 'NH₄⁺ (N + 4H, +1)', v: 5, m: 4, c: 1, a: 0, molId: 'nh4_plus' },
  { label: 'PCl₅ (P + 5Cl)', v: 5, m: 5, c: 0, a: 0, molId: 'pcl5' },
  { label: 'XeF₄ (Xe + 4F)', v: 8, m: 4, c: 0, a: 0, molId: 'xef4' },
  { label: 'XeF₆ (Xe + 6F)', v: 8, m: 6, c: 0, a: 0, molId: 'xef6' },
  { label: 'IF₇ (I + 7F)', v: 7, m: 7, c: 0, a: 0, molId: 'if7' },
];

export const SyllabusGuideView: React.FC<SyllabusGuideViewProps> = ({
  molecules,
  onInspectIn3D,
}) => {
  const [valenceV, setValenceV] = useState(8);
  const [monovalentM, setMonovalentM] = useState(6);
  const [cationC, setCationC] = useState(0);
  const [anionA, setAnionA] = useState(0);
  const [totalSurroundingAtoms, setTotalSurroundingAtoms] = useState(6);

  const calc = calculateHybridizationValue(valenceV, monovalentM, cationC, anionA);
  const lonePairs = calc.isValid
    ? Math.max(0, calc.stericNumber - totalSurroundingAtoms)
    : 0;
  const vsepr = calc.isValid
    ? predictVseprShape(calc.stericNumber, lonePairs)
    : null;

  const matchingMolecules = calc.hybridization
    ? molecules.filter((m) => m.hybridization === calc.hybridization)
    : [];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Hybridization Formula Calculator */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-mono text-sky-700 font-medium">
              Interactive Steric Number Calculator
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 tracking-tight">
              H = ½ (V + M − C + A)
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Test any central atom from the HSC syllabus to predict its hybridization,
              lone pairs, and VSEPR molecular geometry.
            </p>
          </div>

          {/* Preset quick fills */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2">
              Load Syllabus Example:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setValenceV(p.v);
                    setMonovalentM(p.m);
                    setCationC(p.c);
                    setAnionA(p.a);
                    setTotalSurroundingAtoms(p.m);
                  }}
                  className="px-2.5 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Numeric Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label htmlFor="calc-v" className="block text-xs font-medium text-slate-700 mb-1">
                V (Valence e⁻)
              </label>
              <input
                id="calc-v"
                type="number"
                min={1}
                max={8}
                value={valenceV}
                onChange={(e) => setValenceV(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label htmlFor="calc-m" className="block text-xs font-medium text-slate-700 mb-1">
                M (Monovalent)
              </label>
              <input
                id="calc-m"
                type="number"
                min={0}
                max={7}
                value={monovalentM}
                onChange={(e) => setMonovalentM(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label htmlFor="calc-c" className="block text-xs font-medium text-slate-700 mb-1">
                C (+ Charge)
              </label>
              <input
                id="calc-c"
                type="number"
                min={0}
                max={4}
                value={cationC}
                onChange={(e) => setCationC(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label htmlFor="calc-a" className="block text-xs font-medium text-slate-700 mb-1">
                A (− Charge)
              </label>
              <input
                id="calc-a"
                type="number"
                min={0}
                max={4}
                value={anionA}
                onChange={(e) => setAnionA(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="calc-ligands" className="block text-xs font-medium text-slate-700 mb-1">
                σ-Ligands
              </label>
              <input
                id="calc-ligands"
                type="number"
                min={1}
                max={7}
                value={totalSurroundingAtoms}
                onChange={(e) => setTotalSurroundingAtoms(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          {/* Calculation Output */}
          {calc.isValid && calc.hybridization ? (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-mono text-sm text-slate-300 tabular-nums">
                  H = ½ × ({valenceV} + {monovalentM} − {cationC} + {anionA}) ={' '}
                  <span className="text-sky-300 font-bold text-lg">{calc.stericNumber}</span>
                </div>
                <span className="font-mono text-lg font-bold text-sky-300">
                  {formatHybridizationLabel(calc.hybridization)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-700/80 text-xs">
                <div>
                  <div className="text-slate-400">Electron Geometry</div>
                  <div className="mt-0.5 text-sm font-semibold text-white">
                    {calc.electronGeometry}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Molecular Shape</div>
                  <div className="mt-0.5 text-sm font-semibold text-white">
                    {vsepr ? vsepr.molecularShape : calc.electronGeometry}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Expected Angle</div>
                  <div className="mt-0.5 text-sm font-mono font-semibold text-amber-300 tabular-nums">
                    {vsepr ? vsepr.expectedAngle : calc.idealAngles}
                  </div>
                </div>
              </div>

              {matchingMolecules.length > 0 && (
                <div className="pt-2 border-t border-slate-700/80 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Inspect matching 3D models:</span>
                  {matchingMolecules.map((mol) => (
                    <button
                      key={mol.id}
                      type="button"
                      onClick={() => onInspectIn3D(mol)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-sky-700 text-slate-100 rounded-md transition-colors cursor-pointer"
                    >
                      {mol.formula} ({mol.name})
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
              {calc.errorMessage}
            </div>
          )}
        </section>

        {/* Right column: Core Syllabus Rules */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-950">
            HSC Chapter 3 Key Principles
          </h2>

          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-slate-900">
                1. Only σ-Bonds &amp; Lone Pairs Hybridize
              </h3>
              <p className="mt-1">
                π-bonds (as in C₂H₄, C₂H₂, CO₂, SO₂) are formed by unhybridized p or d
                orbitals and do not contribute to steric number H. Divalent O and S
                ligands count as M = 0 in the shortcut formula.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900">
                2. Period 2 vs. Period 3 Octet Expansion
              </h3>
              <p className="mt-1">
                Period 2 elements (C, N, O, F) lack 2d orbitals and cannot exceed sp³
                hybridization—explaining why NCl₅ and OF₆ do not exist, whereas PCl₅
                (sp³d) and SF₆ (sp³d²) readily form using vacant 3d orbitals.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900">
                3. Noble Gas Fluorides (XeF₂, XeF₄, XeF₆)
              </h3>
              <p className="mt-1">
                Xenon promotes 5p electrons into 5d orbitals: XeF₂ uses sp³d (Linear,
                180°), XeF₄ uses sp³d² (Square Planar, 90°), and XeF₆ uses sp³d³
                (Distorted/Capped Octahedral due to 1 stereochemically active lone pair).
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
