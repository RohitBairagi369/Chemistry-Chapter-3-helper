export type HybridizationType =
  | 'sp'
  | 'sp2'
  | 'sp3'
  | 'sp3d'
  | 'sp3d2'
  | 'sp3d3';

export type ElementSymbol =
  | 'C'
  | 'N'
  | 'O'
  | 'H'
  | 'Be'
  | 'B'
  | 'F'
  | 'Cl'
  | 'P'
  | 'S'
  | 'I'
  | 'Xe';

export interface ElementStyle {
  symbol: ElementSymbol;
  name: string;
  atomicNumber: number;
  valenceElectrons: number;
  color: string;
  radius: number;
  roughness: number;
  metalness: number;
}

export interface AtomNode {
  id: string;
  element: ElementSymbol;
  position: [number, number, number];
  isCentral?: boolean;
  role?: string;
}

export interface BondEdge {
  from: string;
  to: string;
  order: 1 | 2 | 3;
  label?: string;
}

export interface LonePairNode {
  id: string;
  originId: string;
  direction: [number, number, number];
  label: string;
}

export interface BondAngleSpec {
  id: string;
  atomA: string;
  vertex: string;
  atomB: string;
  degrees: number;
  displayLabel: string;
  note?: string;
}

export interface OrbitalSlot {
  label: string;
  electrons: 0 | 1 | 2;
  kind: 'hybrid' | 'unhybridized-p' | 'lone-pair' | 'sigma-bond' | 'pi-bond';
}

export interface OrbitalStateRow {
  stage: string;
  notation: string;
  slots: OrbitalSlot[];
}

export interface FormulaBreakdown {
  centralAtom: ElementSymbol;
  valenceElectrons: number; // V
  monovalentAtoms: number;  // M
  cationCharge: number;     // C
  anionCharge: number;      // A
  stericNumber: number;     // H = 0.5 * (V + M - C + A)
  bondPairs: number;
  lonePairs: number;
  note?: string;
}

export interface MoleculeSpec {
  id: string;
  formula: string;
  formulaPlain: string;
  name: string;
  banglaName: string;
  hybridization: HybridizationType;
  electronGeometry: string;
  molecularShape: string;
  primaryAngleDeg: number;
  angleSummary: string;
  idealAngleDeg: number;
  bondPairs: number;
  lonePairs: number;
  centralAtom: ElementSymbol;
  syllabusPriority: 'Core Board Exam' | 'Essential VSEPR' | 'Advanced Exception';
  atoms: AtomNode[];
  bonds: BondEdge[];
  lonePairsVec: LonePairNode[];
  angles: BondAngleSpec[];
  formulaBreakdown: FormulaBreakdown;
  orbitalStates: OrbitalStateRow[];
  repulsionExplanation: string;
  hscExamTip: string;
  defaultCamera: [number, number, number];
}

export type QuizCategory =
  | 'all'
  | 'formula'
  | 'angles'
  | 'exceptions';

export interface QuizQuestion {
  id: string;
  category: Exclude<QuizCategory, 'all'>;
  difficulty: 'Standard' | 'Board Exam' | 'Challenge';
  prompt: string;
  formulaTag?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  relatedMoleculeId: string;
}

export type AppView = 'visualizer' | 'atlas' | 'guide' | 'quiz';
