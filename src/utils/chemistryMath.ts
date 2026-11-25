import type {
  HybridizationType,
  MoleculeSpec,
  QuizQuestion,
} from '../types/chemistry';

export interface HybridizationCalculationResult {
  stericNumber: number;
  isValid: boolean;
  hybridization: HybridizationType | null;
  electronGeometry: string;
  idealAngles: string;
  errorMessage?: string;
}

export interface VseprPrediction {
  electronGeometry: string;
  molecularShape: string;
  hybridization: HybridizationType;
  expectedAngle: string;
}

const STERIC_MAP: Record<
  number,
  {
    hybridization: HybridizationType;
    electronGeometry: string;
    idealAngles: string;
  }
> = {
  2: {
    hybridization: 'sp',
    electronGeometry: 'Linear',
    idealAngles: '180°',
  },
  3: {
    hybridization: 'sp2',
    electronGeometry: 'Trigonal Planar',
    idealAngles: '120°',
  },
  4: {
    hybridization: 'sp3',
    electronGeometry: 'Tetrahedral',
    idealAngles: '109.5°',
  },
  5: {
    hybridization: 'sp3d',
    electronGeometry: 'Trigonal Bipyramidal',
    idealAngles: '90°, 120°',
  },
  6: {
    hybridization: 'sp3d2',
    electronGeometry: 'Octahedral',
    idealAngles: '90°',
  },
  7: {
    hybridization: 'sp3d3',
    electronGeometry: 'Pentagonal Bipyramidal',
    idealAngles: '72°, 90°',
  },
};

/**
 * HSC Chemistry Chapter 3 Hybridization Formula:
 * H = 1/2 * (V + M - C + A)
 * V = valence electrons on central atom
 * M = number of monovalent atoms attached (H, F, Cl, Br, I)
 * C = cationic charge (+)
 * A = anionic charge (-)
 */
export function calculateHybridizationValue(
  valenceElectrons: number,
  monovalentAtoms: number,
  cationCharge = 0,
  anionCharge = 0,
): HybridizationCalculationResult {
  const raw = 0.5 * (valenceElectrons + monovalentAtoms - cationCharge + anionCharge);
  const rounded = Math.round(raw * 10) / 10;

  if (!Number.isInteger(rounded) || rounded < 2 || rounded > 7) {
    return {
      stericNumber: rounded,
      isValid: false,
      hybridization: null,
      electronGeometry: 'Outside standard sp–sp³d³ range',
      idealAngles: '—',
      errorMessage:
        'H must be an integer between 2 and 7 (for sp through sp³d³). Note: divalent O or S ligands contribute 0 to M.',
    };
  }

  const entry = STERIC_MAP[rounded];
  return {
    stericNumber: rounded,
    isValid: true,
    hybridization: entry.hybridization,
    electronGeometry: entry.electronGeometry,
    idealAngles: entry.idealAngles,
  };
}

/**
 * Predicts VSEPR molecular shape from steric number (H) and lone pairs (LP).
 */
export function predictVseprShape(
  stericNumber: number,
  lonePairs: number,
): VseprPrediction | null {
  const base = STERIC_MAP[stericNumber];
  if (!base || lonePairs < 0 || lonePairs >= stericNumber) {
    return null;
  }

  const bondPairs = stericNumber - lonePairs;
  const key = `${stericNumber}-${lonePairs}`;
  const shapeTable: Record<string, { shape: string; angle: string }> = {
    '2-0': { shape: 'Linear', angle: '180°' },
    '3-0': { shape: 'Trigonal Planar', angle: '120°' },
    '3-1': { shape: 'Bent / V-shaped', angle: '< 120° (~119°)' },
    '4-0': { shape: 'Tetrahedral', angle: '109.5°' },
    '4-1': { shape: 'Trigonal Pyramidal', angle: '107°' },
    '4-2': { shape: 'Bent / Angular (V-shaped)', angle: '104.5°' },
    '5-0': { shape: 'Trigonal Bipyramidal', angle: '90° (axial), 120° (eq.)' },
    '5-1': { shape: 'Seesaw', angle: '< 90°, < 120° (~101.6° / 173°)' },
    '5-2': { shape: 'T-shaped', angle: '< 90° (~87.5°)' },
    '5-3': { shape: 'Linear', angle: '180°' },
    '6-0': { shape: 'Octahedral', angle: '90°' },
    '6-1': { shape: 'Square Pyramidal', angle: '< 90° (~81.9° / 90°)' },
    '6-2': { shape: 'Square Planar', angle: '90°' },
    '7-0': { shape: 'Pentagonal Bipyramidal', angle: '72° (eq.), 90° (axial)' },
    '7-1': { shape: 'Distorted Octahedral (Capped)', angle: '~72°–90° (distorted)' },
  };

  const match = shapeTable[key];
  if (!match) {
    return {
      electronGeometry: base.electronGeometry,
      molecularShape: `${bondPairs} BP / ${lonePairs} LP Geometry`,
      hybridization: base.hybridization,
      expectedAngle: base.idealAngles,
    };
  }

  return {
    electronGeometry: base.electronGeometry,
    molecularShape: match.shape,
    hybridization: base.hybridization,
    expectedAngle: match.angle,
  };
}

/**
 * Computes exact bond angle in degrees between two vectors (A - V) and (B - V).
 */
export function computeBondAngleDegrees(
  posA: [number, number, number],
  vertex: [number, number, number],
  posB: [number, number, number],
): number {
  const ax = posA[0] - vertex[0];
  const ay = posA[1] - vertex[1];
  const az = posA[2] - vertex[2];
  const bx = posB[0] - vertex[0];
  const by = posB[1] - vertex[1];
  const bz = posB[2] - vertex[2];

  const magA = Math.hypot(ax, ay, az);
  const magB = Math.hypot(bx, by, bz);
  if (magA < 1e-8 || magB < 1e-8) return 0;

  const dot = (ax * bx + ay * by + az * bz) / (magA * magB);
  const clamped = Math.max(-1, Math.min(1, dot));
  return (Math.acos(clamped) * 180) / Math.PI;
}

export function formatHybridizationLabel(hyb: HybridizationType): string {
  switch (hyb) {
    case 'sp':
      return 'sp';
    case 'sp2':
      return 'sp²';
    case 'sp3':
      return 'sp³';
    case 'sp3d':
      return 'sp³d';
    case 'sp3d2':
      return 'sp³d²';
    case 'sp3d3':
      return 'sp³d³';
  }
}

export function filterMolecules(
  molecules: MoleculeSpec[],
  hybridization: HybridizationType | 'all',
  query: string,
): MoleculeSpec[] {
  const q = query.trim().toLowerCase();
  return molecules.filter((mol) => {
    if (hybridization !== 'all' && mol.hybridization !== hybridization) {
      return false;
    }
    if (!q) return true;
    return (
      mol.name.toLowerCase().includes(q) ||
      mol.formulaPlain.toLowerCase().includes(q) ||
      mol.molecularShape.toLowerCase().includes(q) ||
      mol.hybridization.toLowerCase().includes(q) ||
      mol.banglaName.toLowerCase().includes(q)
    );
  });
}

export interface QuizScoreSummary {
  total: number;
  answered: number;
  correct: number;
  accuracyPercent: number;
  masteryLabel: 'Needs Review' | 'Developing' | 'Board Ready';
}

export function scoreQuizAnswers(
  questions: QuizQuestion[],
  answers: Record<string, number>,
): QuizScoreSummary {
  const total = questions.length;
  let answered = 0;
  let correct = 0;

  for (const q of questions) {
    if (answers[q.id] !== undefined) {
      answered += 1;
      if (answers[q.id] === q.correctIndex) {
        correct += 1;
      }
    }
  }

  const accuracyPercent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const masteryLabel =
    accuracyPercent >= 80
      ? 'Board Ready'
      : accuracyPercent >= 50
        ? 'Developing'
        : 'Needs Review';

  return {
    total,
    answered,
    correct,
    accuracyPercent,
    masteryLabel,
  };
}
