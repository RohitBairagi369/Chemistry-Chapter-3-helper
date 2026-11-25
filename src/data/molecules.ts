import type { ElementStyle, ElementSymbol, MoleculeSpec } from '../types/chemistry';

export const ELEMENT_STYLES: Record<ElementSymbol, ElementStyle> = {
  C: {
    symbol: 'C',
    name: 'Carbon',
    atomicNumber: 6,
    valenceElectrons: 4,
    color: '#334155',
    radius: 0.44,
    roughness: 0.35,
    metalness: 0.15,
  },
  N: {
    symbol: 'N',
    name: 'Nitrogen',
    atomicNumber: 7,
    valenceElectrons: 5,
    color: '#2563eb',
    radius: 0.43,
    roughness: 0.3,
    metalness: 0.12,
  },
  O: {
    symbol: 'O',
    name: 'Oxygen',
    atomicNumber: 8,
    valenceElectrons: 6,
    color: '#dc2626',
    radius: 0.42,
    roughness: 0.28,
    metalness: 0.1,
  },
  H: {
    symbol: 'H',
    name: 'Hydrogen',
    atomicNumber: 1,
    valenceElectrons: 1,
    color: '#e2e8f0',
    radius: 0.27,
    roughness: 0.25,
    metalness: 0.08,
  },
  Be: {
    symbol: 'Be',
    name: 'Beryllium',
    atomicNumber: 4,
    valenceElectrons: 2,
    color: '#65a30d',
    radius: 0.43,
    roughness: 0.35,
    metalness: 0.25,
  },
  B: {
    symbol: 'B',
    name: 'Boron',
    atomicNumber: 5,
    valenceElectrons: 3,
    color: '#ea580c',
    radius: 0.43,
    roughness: 0.32,
    metalness: 0.15,
  },
  F: {
    symbol: 'F',
    name: 'Fluorine',
    atomicNumber: 9,
    valenceElectrons: 7,
    color: '#10b981',
    radius: 0.34,
    roughness: 0.28,
    metalness: 0.1,
  },
  Cl: {
    symbol: 'Cl',
    name: 'Chlorine',
    atomicNumber: 17,
    valenceElectrons: 7,
    color: '#16a34a',
    radius: 0.38,
    roughness: 0.3,
    metalness: 0.12,
  },
  P: {
    symbol: 'P',
    name: 'Phosphorus',
    atomicNumber: 15,
    valenceElectrons: 5,
    color: '#f97316',
    radius: 0.48,
    roughness: 0.32,
    metalness: 0.18,
  },
  S: {
    symbol: 'S',
    name: 'Sulfur',
    atomicNumber: 16,
    valenceElectrons: 6,
    color: '#eab308',
    radius: 0.48,
    roughness: 0.32,
    metalness: 0.16,
  },
  I: {
    symbol: 'I',
    name: 'Iodine',
    atomicNumber: 53,
    valenceElectrons: 7,
    color: '#7c3aed',
    radius: 0.52,
    roughness: 0.3,
    metalness: 0.2,
  },
  Xe: {
    symbol: 'Xe',
    name: 'Xenon',
    atomicNumber: 54,
    valenceElectrons: 8,
    color: '#0891b2',
    radius: 0.54,
    roughness: 0.25,
    metalness: 0.22,
  },
};

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Generates 3 symmetric pyramidal ligand coordinates around -Y axis
 * with an exact L-C-L bond angle in degrees.
 */
function pyramidalLigands(
  bondLength: number,
  bondAngleDeg: number,
): [[number, number, number], [number, number, number], [number, number, number]] {
  const cosAlpha = Math.cos(degToRad(bondAngleDeg));
  const cosTheta = Math.sqrt(Math.max(0, (2 * cosAlpha + 1) / 3));
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));

  const out: [number, number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const phi = degToRad(i * 120 + 30);
    out.push([
      round3(bondLength * sinTheta * Math.cos(phi)),
      round3(-bondLength * cosTheta),
      round3(bondLength * sinTheta * Math.sin(phi)),
    ]);
  }
  return out as [
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ];
}

function bentLigands(
  bondLength: number,
  bondAngleDeg: number,
): [[number, number, number], [number, number, number]] {
  const half = degToRad(bondAngleDeg / 2);
  return [
    [round3(-bondLength * Math.sin(half)), round3(-bondLength * Math.cos(half)), 0],
    [round3(bondLength * Math.sin(half)), round3(-bondLength * Math.cos(half)), 0],
  ];
}

function pentagonLigands(
  bondLength: number,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const phi = degToRad(i * 72);
    pts.push([
      round3(bondLength * Math.cos(phi)),
      0,
      round3(bondLength * Math.sin(phi)),
    ]);
  }
  return pts;
}

function xef6DistortedCoords(bondLength: number): {
  fluorines: [number, number, number][];
  lonePairDir: [number, number, number];
  cappedAngleDeg: number;
  uncappedAngleDeg: number;
} {
  // Lone pair points along +Y axis (capped octahedral face below +Y? Actually let's place
  // 3 capped-face fluorines in upper hemisphere tilted away from +Y lone pair,
  // and 3 opposite-face fluorines in lower hemisphere compressed together).
  // In an ideal octahedron oriented with a C3 face normal along +Y:
  // ideal polar angle from +Y is acos(1/sqrt(3)) = 54.7356 deg (giving 90 deg between all adjacent F).
  // Repulsion from the lone pair along +Y increases upper polar angle to ~63.5 deg (opening F-Xe-F to ~102 deg)
  // and compresses lower polar angle from -Y to ~46.5 deg (closing F-Xe-F to ~78 deg).
  const upperTheta = degToRad(63.5);
  const lowerTheta = degToRad(46.5);
  const fluorines: [number, number, number][] = [];

  for (let i = 0; i < 3; i++) {
    const phi = degToRad(i * 120);
    fluorines.push([
      round3(bondLength * Math.sin(upperTheta) * Math.cos(phi)),
      round3(bondLength * Math.cos(upperTheta)),
      round3(bondLength * Math.sin(upperTheta) * Math.sin(phi)),
    ]);
  }
  for (let i = 0; i < 3; i++) {
    const phi = degToRad(i * 120 + 60);
    fluorines.push([
      round3(bondLength * Math.sin(lowerTheta) * Math.cos(phi)),
      round3(-bondLength * Math.cos(lowerTheta)),
      round3(bondLength * Math.sin(lowerTheta) * Math.sin(phi)),
    ]);
  }

  // Exact angle between two upper F vectors:
  const cosUp =
    Math.cos(upperTheta) ** 2 + Math.sin(upperTheta) ** 2 * Math.cos(degToRad(120));
  const cosLow =
    Math.cos(lowerTheta) ** 2 + Math.sin(lowerTheta) ** 2 * Math.cos(degToRad(120));

  return {
    fluorines,
    lonePairDir: [0, 1, 0],
    cappedAngleDeg: Math.round((Math.acos(cosUp) * 180) / Math.PI * 10) / 10,
    uncappedAngleDeg: Math.round((Math.acos(cosLow) * 180) / Math.PI * 10) / 10,
  };
}

const nh3Coords = pyramidalLigands(1.45, 107);
const ch4Half = 1.45 / Math.sqrt(3);
const xef6Coords = xef6DistortedCoords(1.75);
const if7Pent = pentagonLigands(1.72);
const h2oCoords = bentLigands(1.4, 104.5);
const so2Coords = bentLigands(1.55, 119.5);

export const MOLECULES: MoleculeSpec[] = [
  // ==================== sp3 (CORE HSC TRIO FIRST) ====================
  {
    id: 'ch4',
    formula: 'CH₄',
    formulaPlain: 'CH4',
    name: 'Methane',
    banglaName: 'মিথেন',
    hybridization: 'sp3',
    electronGeometry: 'Tetrahedral',
    molecularShape: 'Tetrahedral',
    primaryAngleDeg: 109.5,
    angleSummary: '109.5° (109°28′)',
    idealAngleDeg: 109.5,
    bondPairs: 4,
    lonePairs: 0,
    centralAtom: 'C',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'c1', element: 'C', position: [0, 0, 0], isCentral: true, role: 'Central sp³ Carbon' },
      { id: 'h1', element: 'H', position: [round3(ch4Half), round3(ch4Half), round3(ch4Half)], role: 'σ-bonded Hydrogen' },
      { id: 'h2', element: 'H', position: [round3(-ch4Half), round3(-ch4Half), round3(ch4Half)], role: 'σ-bonded Hydrogen' },
      { id: 'h3', element: 'H', position: [round3(-ch4Half), round3(ch4Half), round3(-ch4Half)], role: 'σ-bonded Hydrogen' },
      { id: 'h4', element: 'H', position: [round3(ch4Half), round3(-ch4Half), round3(-ch4Half)], role: 'σ-bonded Hydrogen' },
    ],
    bonds: [
      { from: 'c1', to: 'h1', order: 1 },
      { from: 'c1', to: 'h2', order: 1 },
      { from: 'c1', to: 'h3', order: 1 },
      { from: 'c1', to: 'h4', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'h1-c-h2',
        atomA: 'h1',
        vertex: 'c1',
        atomB: 'h2',
        degrees: 109.5,
        displayLabel: '109.5°',
        note: 'Equal BP–BP repulsion in all 4 directions',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'C',
      valenceElectrons: 4,
      monovalentAtoms: 4,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 4,
      bondPairs: 4,
      lonePairs: 0,
    },
    orbitalStates: [
      {
        stage: 'Ground State (C₆)',
        notation: '2s² 2p²',
        slots: [
          { label: '2s', electrons: 2, kind: 'sigma-bond' },
          { label: '2px', electrons: 1, kind: 'unhybridized-p' },
          { label: '2py', electrons: 1, kind: 'unhybridized-p' },
          { label: '2pz', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'Excited State (C*)',
        notation: '2s¹ 2p³',
        slots: [
          { label: '2s', electrons: 1, kind: 'hybrid' },
          { label: '2px', electrons: 1, kind: 'hybrid' },
          { label: '2py', electrons: 1, kind: 'hybrid' },
          { label: '2pz', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³ Hybridized',
        notation: '4 × sp³ (1e⁻ each)',
        slots: [
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Carbon undergoes sp³ hybridization to form four equivalent hybrid orbitals directed toward the corners of a regular tetrahedron. With 0 lone pairs, all four C–H bond pairs repel equally, preserving the ideal tetrahedral angle of 109.5° (109°28′).',
    hscExamTip:
      'Board Exam Classic: Compare CH₄ (109.5°), NH₃ (107°), and H₂O (104.5°). All three have sp³ hybridization, but increasing lone pairs compress the bond angle.',
    defaultCamera: [3.2, 2.2, 3.6],
  },
  {
    id: 'nh3',
    formula: 'NH₃',
    formulaPlain: 'NH3',
    name: 'Ammonia',
    banglaName: 'অ্যামোনিয়া',
    hybridization: 'sp3',
    electronGeometry: 'Tetrahedral',
    molecularShape: 'Trigonal Pyramidal',
    primaryAngleDeg: 107,
    angleSummary: '107°',
    idealAngleDeg: 109.5,
    bondPairs: 3,
    lonePairs: 1,
    centralAtom: 'N',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'n1', element: 'N', position: [0, 0, 0], isCentral: true, role: 'Central sp³ Nitrogen' },
      { id: 'h1', element: 'H', position: nh3Coords[0], role: 'σ-bonded Hydrogen' },
      { id: 'h2', element: 'H', position: nh3Coords[1], role: 'σ-bonded Hydrogen' },
      { id: 'h3', element: 'H', position: nh3Coords[2], role: 'σ-bonded Hydrogen' },
    ],
    bonds: [
      { from: 'n1', to: 'h1', order: 1 },
      { from: 'n1', to: 'h2', order: 1 },
      { from: 'n1', to: 'h3', order: 1 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 'n1', direction: [0, 1, 0], label: '1 Lone Pair (LP)' },
    ],
    angles: [
      {
        id: 'h1-n-h2',
        atomA: 'h1',
        vertex: 'n1',
        atomB: 'h2',
        degrees: 107,
        displayLabel: '107°',
        note: 'Compressed 2.5° from 109.5° by LP–BP repulsion',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'N',
      valenceElectrons: 5,
      monovalentAtoms: 3,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 4,
      bondPairs: 3,
      lonePairs: 1,
    },
    orbitalStates: [
      {
        stage: 'Ground State (N₇)',
        notation: '2s² 2p³',
        slots: [
          { label: '2s', electrons: 2, kind: 'lone-pair' },
          { label: '2px', electrons: 1, kind: 'unhybridized-p' },
          { label: '2py', electrons: 1, kind: 'unhybridized-p' },
          { label: '2pz', electrons: 1, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'sp³ Hybridized',
        notation: '1 LP + 3 BP orbitals',
        slots: [
          { label: 'sp³ (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Nitrogen is sp³ hybridized with 3 bond pairs and 1 lone pair. Because Lone Pair–Bond Pair (LP–BP) repulsion is stronger than Bond Pair–Bond Pair (BP–BP) repulsion, the lone pair pushes the three N–H bonds closer together, reducing H–N–H from 109.5° to 107°.',
    hscExamTip:
      'Always state both Electron Geometry (Tetrahedral) and Molecular Shape (Trigonal Pyramidal) in HSC CQ answers!',
    defaultCamera: [3.2, 2.0, 3.6],
  },
  {
    id: 'h2o',
    formula: 'H₂O',
    formulaPlain: 'H2O',
    name: 'Water',
    banglaName: 'পানি',
    hybridization: 'sp3',
    electronGeometry: 'Tetrahedral',
    molecularShape: 'Bent / Angular (V-shaped)',
    primaryAngleDeg: 104.5,
    angleSummary: '104.5°',
    idealAngleDeg: 109.5,
    bondPairs: 2,
    lonePairs: 2,
    centralAtom: 'O',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'o1', element: 'O', position: [0, 0, 0], isCentral: true, role: 'Central sp³ Oxygen' },
      { id: 'h1', element: 'H', position: h2oCoords[0], role: 'σ-bonded Hydrogen' },
      { id: 'h2', element: 'H', position: h2oCoords[1], role: 'σ-bonded Hydrogen' },
    ],
    bonds: [
      { from: 'o1', to: 'h1', order: 1 },
      { from: 'o1', to: 'h2', order: 1 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 'o1', direction: [0, 0.58, 0.81], label: 'Lone Pair 1' },
      { id: 'lp2', originId: 'o1', direction: [0, 0.58, -0.81], label: 'Lone Pair 2' },
    ],
    angles: [
      {
        id: 'h1-o-h2',
        atomA: 'h1',
        vertex: 'o1',
        atomB: 'h2',
        degrees: 104.5,
        displayLabel: '104.5°',
        note: 'Strong LP–LP + LP–BP repulsion compresses angle by 5°',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'O',
      valenceElectrons: 6,
      monovalentAtoms: 2,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 4,
      bondPairs: 2,
      lonePairs: 2,
    },
    orbitalStates: [
      {
        stage: 'Ground State (O₈)',
        notation: '2s² 2p⁴',
        slots: [
          { label: '2s', electrons: 2, kind: 'lone-pair' },
          { label: '2px', electrons: 2, kind: 'lone-pair' },
          { label: '2py', electrons: 1, kind: 'unhybridized-p' },
          { label: '2pz', electrons: 1, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'sp³ Hybridized',
        notation: '2 LP + 2 BP orbitals',
        slots: [
          { label: 'sp³ (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³ (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Oxygen has 2 lone pairs and 2 bond pairs in an sp³ framework. The VSEPR repulsion order LP–LP > LP–BP > BP–BP causes severe compression of the O–H bond pairs, lowering the H–O–H bond angle to 104.5°.',
    hscExamTip:
      'Frequently asked alongside H₂S (~92°): Oxygen is more electronegative than Sulfur, pulling bond pairs closer to O and increasing BP–BP repulsion.',
    defaultCamera: [2.8, 1.9, 3.8],
  },
  {
    id: 'nh4_plus',
    formula: 'NH₄⁺',
    formulaPlain: 'NH4+',
    name: 'Ammonium Ion',
    banglaName: 'অ্যামোনিয়াম আয়ন',
    hybridization: 'sp3',
    electronGeometry: 'Tetrahedral',
    molecularShape: 'Tetrahedral',
    primaryAngleDeg: 109.5,
    angleSummary: '109.5°',
    idealAngleDeg: 109.5,
    bondPairs: 4,
    lonePairs: 0,
    centralAtom: 'N',
    syllabusPriority: 'Essential VSEPR',
    atoms: [
      { id: 'n1', element: 'N', position: [0, 0, 0], isCentral: true, role: 'Central sp³ Nitrogen (+1)' },
      { id: 'h1', element: 'H', position: [round3(ch4Half), round3(ch4Half), round3(ch4Half)], role: 'Coordinate-covalent H⁺' },
      { id: 'h2', element: 'H', position: [round3(-ch4Half), round3(-ch4Half), round3(ch4Half)], role: 'σ-bonded Hydrogen' },
      { id: 'h3', element: 'H', position: [round3(-ch4Half), round3(ch4Half), round3(-ch4Half)], role: 'σ-bonded Hydrogen' },
      { id: 'h4', element: 'H', position: [round3(ch4Half), round3(-ch4Half), round3(-ch4Half)], role: 'σ-bonded Hydrogen' },
    ],
    bonds: [
      { from: 'n1', to: 'h1', order: 1, label: 'Coordinate bond' },
      { from: 'n1', to: 'h2', order: 1 },
      { from: 'n1', to: 'h3', order: 1 },
      { from: 'n1', to: 'h4', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'h1-n-h2',
        atomA: 'h1',
        vertex: 'n1',
        atomB: 'h2',
        degrees: 109.5,
        displayLabel: '109.5°',
        note: 'LP is donated to H⁺, restoring full 109.5° symmetry',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'N',
      valenceElectrons: 5,
      monovalentAtoms: 4,
      cationCharge: 1,
      anionCharge: 0,
      stericNumber: 4,
      bondPairs: 4,
      lonePairs: 0,
    },
    orbitalStates: [
      {
        stage: 'Ground State (N₇)',
        notation: '2s² 2p³',
        slots: [
          { label: '2s', electrons: 2, kind: 'lone-pair' },
          { label: '2px', electrons: 1, kind: 'unhybridized-p' },
          { label: '2py', electrons: 1, kind: 'unhybridized-p' },
          { label: '2pz', electrons: 1, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'sp³ in NH₄⁺',
        notation: '3 covalent + 1 coordinate bond',
        slots: [
          { label: 'sp³ (→H⁺)', electrons: 2, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'When NH₃ accepts a proton (H⁺), its single lone pair forms a coordinate covalent bond. Because all 4 electron pairs around N are now bond pairs (4 BP, 0 LP), the bond angle expands back from 107° to the ideal 109.5°.',
    hscExamTip:
      'Great test of H = ½(V + M − C + A): H = ½(5 + 4 − 1 + 0) = 4 (sp³). Notice C = 1 is subtracted for the +1 charge!',
    defaultCamera: [3.2, 2.2, 3.6],
  },

  // ==================== sp (LINEAR) ====================
  {
    id: 'becl2',
    formula: 'BeCl₂',
    formulaPlain: 'BeCl2',
    name: 'Beryllium Chloride',
    banglaName: 'বেরিলিয়াম ক্লোরাইড',
    hybridization: 'sp',
    electronGeometry: 'Linear',
    molecularShape: 'Linear',
    primaryAngleDeg: 180,
    angleSummary: '180°',
    idealAngleDeg: 180,
    bondPairs: 2,
    lonePairs: 0,
    centralAtom: 'Be',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'be1', element: 'Be', position: [0, 0, 0], isCentral: true, role: 'Central sp Beryllium' },
      { id: 'cl1', element: 'Cl', position: [-1.75, 0, 0], role: 'σ-bonded Chlorine' },
      { id: 'cl2', element: 'Cl', position: [1.75, 0, 0], role: 'σ-bonded Chlorine' },
    ],
    bonds: [
      { from: 'be1', to: 'cl1', order: 1 },
      { from: 'be1', to: 'cl2', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'cl1-be-cl2',
        atomA: 'cl1',
        vertex: 'be1',
        atomB: 'cl2',
        degrees: 180,
        displayLabel: '180°',
        note: 'Maximum separation of 2 sp hybrid orbitals',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'Be',
      valenceElectrons: 2,
      monovalentAtoms: 2,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 2,
      bondPairs: 2,
      lonePairs: 0,
    },
    orbitalStates: [
      {
        stage: 'Ground State (Be₄)',
        notation: '2s² 2p⁰',
        slots: [
          { label: '2s', electrons: 2, kind: 'sigma-bond' },
          { label: '2px', electrons: 0, kind: 'unhybridized-p' },
          { label: '2py', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'Excited State (Be*)',
        notation: '2s¹ 2px¹',
        slots: [
          { label: '2s', electrons: 1, kind: 'hybrid' },
          { label: '2px', electrons: 1, kind: 'hybrid' },
          { label: '2py', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'sp Hybridized',
        notation: '2 × sp orbitals',
        slots: [
          { label: 'sp', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp', electrons: 1, kind: 'sigma-bond' },
          { label: '2py (empty)', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
    ],
    repulsionExplanation:
      'In the vapor phase, Be promotes one 2s electron to 2px and forms two sp hybrid orbitals aligned 180° apart to minimize repulsion between the two Be–Cl bond pairs.',
    hscExamTip:
      'Remember: BeCl₂ is an incomplete octet (electron-deficient) molecule with 4 valence electrons around Be in the gas phase.',
    defaultCamera: [0.6, 1.9, 4.3],
  },
  {
    id: 'co2',
    formula: 'CO₂',
    formulaPlain: 'CO2',
    name: 'Carbon Dioxide',
    banglaName: 'কার্বন ডাই-অক্সাইড',
    hybridization: 'sp',
    electronGeometry: 'Linear',
    molecularShape: 'Linear',
    primaryAngleDeg: 180,
    angleSummary: '180°',
    idealAngleDeg: 180,
    bondPairs: 2,
    lonePairs: 0,
    centralAtom: 'C',
    syllabusPriority: 'Essential VSEPR',
    atoms: [
      { id: 'c1', element: 'C', position: [0, 0, 0], isCentral: true, role: 'Central sp Carbon (2σ + 2π)' },
      { id: 'o1', element: 'O', position: [-1.65, 0, 0], role: 'Double-bonded Oxygen' },
      { id: 'o2', element: 'O', position: [1.65, 0, 0], role: 'Double-bonded Oxygen' },
    ],
    bonds: [
      { from: 'c1', to: 'o1', order: 2 },
      { from: 'c1', to: 'o2', order: 2 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'o1-c-o2',
        atomA: 'o1',
        vertex: 'c1',
        atomB: 'o2',
        degrees: 180,
        displayLabel: '180°',
        note: 'π-bonds do not alter σ-bond hybridization geometry',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'C',
      valenceElectrons: 4,
      monovalentAtoms: 0,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 2,
      bondPairs: 2,
      lonePairs: 0,
      note: 'Divalent Oxygen atoms contribute M = 0 in H = ½(V + M − C + A)',
    },
    orbitalStates: [
      {
        stage: 'Excited State (C*)',
        notation: '2s¹ 2p³',
        slots: [
          { label: '2s', electrons: 1, kind: 'hybrid' },
          { label: '2px', electrons: 1, kind: 'hybrid' },
          { label: '2py', electrons: 1, kind: 'pi-bond' },
          { label: '2pz', electrons: 1, kind: 'pi-bond' },
        ],
      },
      {
        stage: 'sp + 2 unhybridized p',
        notation: '2σ (sp) + 2π (2py, 2pz)',
        slots: [
          { label: 'sp', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp', electrons: 1, kind: 'sigma-bond' },
          { label: '2py (π)', electrons: 1, kind: 'pi-bond' },
          { label: '2pz (π)', electrons: 1, kind: 'pi-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Carbon uses two sp hybrid orbitals to form two σ-bonds with oxygen, while its remaining two unhybridized p orbitals (2py, 2pz) form two perpendicular π-bonds. Only σ-bonds and lone pairs determine hybridization, giving a linear 180° shape.',
    hscExamTip:
      'Crucial formula rule: Oxygen is divalent, so M = 0 in H = ½(4 + 0) = 2 (sp). Never count double-bonded oxygen in M!',
    defaultCamera: [0.6, 1.9, 4.3],
  },
  {
    id: 'c2h2',
    formula: 'C₂H₂',
    formulaPlain: 'C2H2',
    name: 'Ethyne (Acetylene)',
    banglaName: 'ইথাইন (অ্যাসিটিলিন)',
    hybridization: 'sp',
    electronGeometry: 'Linear',
    molecularShape: 'Linear',
    primaryAngleDeg: 180,
    angleSummary: '180°',
    idealAngleDeg: 180,
    bondPairs: 2,
    lonePairs: 0,
    centralAtom: 'C',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'c1', element: 'C', position: [-0.72, 0, 0], isCentral: true, role: 'sp Carbon #1' },
      { id: 'c2', element: 'C', position: [0.72, 0, 0], isCentral: true, role: 'sp Carbon #2' },
      { id: 'h1', element: 'H', position: [-2.05, 0, 0], role: 'Terminal Hydrogen' },
      { id: 'h2', element: 'H', position: [2.05, 0, 0], role: 'Terminal Hydrogen' },
    ],
    bonds: [
      { from: 'c1', to: 'c2', order: 3, label: '1σ + 2π triple bond' },
      { from: 'c1', to: 'h1', order: 1 },
      { from: 'c2', to: 'h2', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'h1-c1-c2',
        atomA: 'h1',
        vertex: 'c1',
        atomB: 'c2',
        degrees: 180,
        displayLabel: '180°',
        note: 'Collinear sp C≡C–H axis',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'C',
      valenceElectrons: 4,
      monovalentAtoms: 1,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 2,
      bondPairs: 2,
      lonePairs: 0,
      note: 'Per Carbon atom: 2 σ-domains (1 C–H + 1 C–C) ⇒ sp',
    },
    orbitalStates: [
      {
        stage: 'Excited State (C*)',
        notation: '2s¹ 2p³',
        slots: [
          { label: '2s', electrons: 1, kind: 'hybrid' },
          { label: '2px', electrons: 1, kind: 'hybrid' },
          { label: '2py', electrons: 1, kind: 'pi-bond' },
          { label: '2pz', electrons: 1, kind: 'pi-bond' },
        ],
      },
      {
        stage: 'sp Hybridized',
        notation: '2σ + 2π per Carbon',
        slots: [
          { label: 'sp (C–H)', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp (C–C)', electrons: 1, kind: 'sigma-bond' },
          { label: '2py (π)', electrons: 1, kind: 'pi-bond' },
          { label: '2pz (π)', electrons: 1, kind: 'pi-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Each carbon forms 2 σ-bonds using sp hybrid orbitals (50% s-character!) and 2 π-bonds using unhybridized 2py and 2pz orbitals. High s-character makes the C–H bond shorter and slightly acidic.',
    hscExamTip:
      'Ethyne has 3 σ-bonds and 2 π-bonds in total. High s-character (50%) explains why terminal alkynes react with Na or Cu⁺!',
    defaultCamera: [0.5, 1.9, 4.7],
  },

  // ==================== sp2 (TRIGONAL PLANAR) ====================
  {
    id: 'bf3',
    formula: 'BF₃',
    formulaPlain: 'BF3',
    name: 'Boron Trifluoride',
    banglaName: 'বোরন ট্রাইফ্লোরাইড',
    hybridization: 'sp2',
    electronGeometry: 'Trigonal Planar',
    molecularShape: 'Trigonal Planar',
    primaryAngleDeg: 120,
    angleSummary: '120°',
    idealAngleDeg: 120,
    bondPairs: 3,
    lonePairs: 0,
    centralAtom: 'B',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'b1', element: 'B', position: [0, 0, 0], isCentral: true, role: 'Central sp² Boron' },
      { id: 'f1', element: 'F', position: [0, 1.55, 0], role: 'Planar Fluorine' },
      { id: 'f2', element: 'F', position: [round3(1.55 * Math.cos(degToRad(-30))), round3(1.55 * Math.sin(degToRad(-30))), 0], role: 'Planar Fluorine' },
      { id: 'f3', element: 'F', position: [round3(-1.55 * Math.cos(degToRad(-30))), round3(1.55 * Math.sin(degToRad(-30))), 0], role: 'Planar Fluorine' },
    ],
    bonds: [
      { from: 'b1', to: 'f1', order: 1 },
      { from: 'b1', to: 'f2', order: 1 },
      { from: 'b1', to: 'f3', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'f1-b-f2',
        atomA: 'f1',
        vertex: 'b1',
        atomB: 'f2',
        degrees: 120,
        displayLabel: '120°',
        note: 'Coplanar equilateral triangle symmetry',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'B',
      valenceElectrons: 3,
      monovalentAtoms: 3,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 3,
      bondPairs: 3,
      lonePairs: 0,
    },
    orbitalStates: [
      {
        stage: 'Ground State (B₅)',
        notation: '2s² 2p¹',
        slots: [
          { label: '2s', electrons: 2, kind: 'sigma-bond' },
          { label: '2px', electrons: 1, kind: 'unhybridized-p' },
          { label: '2py', electrons: 0, kind: 'unhybridized-p' },
          { label: '2pz', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'Excited State (B*)',
        notation: '2s¹ 2px¹ 2py¹',
        slots: [
          { label: '2s', electrons: 1, kind: 'hybrid' },
          { label: '2px', electrons: 1, kind: 'hybrid' },
          { label: '2py', electrons: 1, kind: 'hybrid' },
          { label: '2pz', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'sp² Hybridized',
        notation: '3 × sp² + empty 2pz',
        slots: [
          { label: 'sp²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp²', electrons: 1, kind: 'sigma-bond' },
          { label: '2pz (vacant)', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
    ],
    repulsionExplanation:
      'Boron promotes one 2s electron and mixes one 2s with two 2p orbitals to yield three coplanar sp² orbitals 120° apart. An empty unhybridized 2pz orbital remains perpendicular to the plane, making BF₃ a Lewis acid.',
    hscExamTip:
      'Exam favorite: Why does BF₃ form an adduct with NH₃ (H₃N→BF₃)? Boron accepts NH₃’s lone pair into its vacant 2pz orbital and shifts from sp² (120°) to sp³ (109.5°)!',
    defaultCamera: [1.4, 1.4, 4.1],
  },
  {
    id: 'c2h4',
    formula: 'C₂H₄',
    formulaPlain: 'C2H4',
    name: 'Ethene (Ethylene)',
    banglaName: 'ইথিন (ইথিলিন)',
    hybridization: 'sp2',
    electronGeometry: 'Trigonal Planar',
    molecularShape: 'Planar (Trigonal Planar at each C)',
    primaryAngleDeg: 120,
    angleSummary: '120°',
    idealAngleDeg: 120,
    bondPairs: 3,
    lonePairs: 0,
    centralAtom: 'C',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'c1', element: 'C', position: [-0.74, 0, 0], isCentral: true, role: 'sp² Carbon #1' },
      { id: 'c2', element: 'C', position: [0.74, 0, 0], isCentral: true, role: 'sp² Carbon #2' },
      { id: 'h1', element: 'H', position: [-1.42, round3(1.36 * Math.sin(degToRad(60))), 0], role: 'Planar Hydrogen' },
      { id: 'h2', element: 'H', position: [-1.42, round3(-1.36 * Math.sin(degToRad(60))), 0], role: 'Planar Hydrogen' },
      { id: 'h3', element: 'H', position: [1.42, round3(1.36 * Math.sin(degToRad(60))), 0], role: 'Planar Hydrogen' },
      { id: 'h4', element: 'H', position: [1.42, round3(-1.36 * Math.sin(degToRad(60))), 0], role: 'Planar Hydrogen' },
    ],
    bonds: [
      { from: 'c1', to: 'c2', order: 2, label: '1σ + 1π double bond' },
      { from: 'c1', to: 'h1', order: 1 },
      { from: 'c1', to: 'h2', order: 1 },
      { from: 'c2', to: 'h3', order: 1 },
      { from: 'c2', to: 'h4', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'h1-c1-h2',
        atomA: 'h1',
        vertex: 'c1',
        atomB: 'h2',
        degrees: 120,
        displayLabel: '120°',
        note: 'Ideal sp² trigonal planar angle (~117°–120°)',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'C',
      valenceElectrons: 4,
      monovalentAtoms: 2,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 3,
      bondPairs: 3,
      lonePairs: 0,
      note: 'Each Carbon forms 3 σ-bonds + 1 π-bond',
    },
    orbitalStates: [
      {
        stage: 'Excited State (C*)',
        notation: '2s¹ 2p³',
        slots: [
          { label: '2s', electrons: 1, kind: 'hybrid' },
          { label: '2px', electrons: 1, kind: 'hybrid' },
          { label: '2py', electrons: 1, kind: 'hybrid' },
          { label: '2pz', electrons: 1, kind: 'pi-bond' },
        ],
      },
      {
        stage: 'sp² + 1 unhybridized p',
        notation: '3σ (sp²) + 1π (2pz)',
        slots: [
          { label: 'sp² (C–H)', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp² (C–H)', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp² (C–C)', electrons: 1, kind: 'sigma-bond' },
          { label: '2pz (π)', electrons: 1, kind: 'pi-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Each carbon in ethene is sp² hybridized, forming 3 planar σ-bonds at 120°. Sideways overlap of the unhybridized 2pz orbitals locks all six atoms into a single flat plane and creates a C=C π-bond.',
    hscExamTip:
      'Total bonds in C₂H₄ = 5 σ-bonds + 1 π-bond. Free rotation around C=C is restricted because it would break the sideways π-overlap!',
    defaultCamera: [1.4, 2.2, 4.3],
  },
  {
    id: 'so2',
    formula: 'SO₂',
    formulaPlain: 'SO2',
    name: 'Sulfur Dioxide',
    banglaName: 'সালফার ডাই-অক্সাইড',
    hybridization: 'sp2',
    electronGeometry: 'Trigonal Planar',
    molecularShape: 'Bent / V-shaped',
    primaryAngleDeg: 119.5,
    angleSummary: '119.5°',
    idealAngleDeg: 120,
    bondPairs: 2,
    lonePairs: 1,
    centralAtom: 'S',
    syllabusPriority: 'Essential VSEPR',
    atoms: [
      { id: 's1', element: 'S', position: [0, 0, 0], isCentral: true, role: 'Central sp² Sulfur' },
      { id: 'o1', element: 'O', position: so2Coords[0], role: 'Double-bonded Oxygen' },
      { id: 'o2', element: 'O', position: so2Coords[1], role: 'Double-bonded Oxygen' },
    ],
    bonds: [
      { from: 's1', to: 'o1', order: 2 },
      { from: 's1', to: 'o2', order: 2 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 's1', direction: [0, 1, 0], label: '1 Lone Pair (LP)' },
    ],
    angles: [
      {
        id: 'o1-s-o2',
        atomA: 'o1',
        vertex: 's1',
        atomB: 'o2',
        degrees: 119.5,
        displayLabel: '119.5°',
        note: 'Slightly less than 120° due to 1 equatorial lone pair',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'S',
      valenceElectrons: 6,
      monovalentAtoms: 0,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 3,
      bondPairs: 2,
      lonePairs: 1,
      note: 'Divalent O contributes 0 to M ⇒ H = ½(6 + 0) = 3 (sp²)',
    },
    orbitalStates: [
      {
        stage: 'Excited State (S₁₆)',
        notation: '3s² 3p³ 3d¹',
        slots: [
          { label: '3s', electrons: 2, kind: 'lone-pair' },
          { label: '3px', electrons: 1, kind: 'hybrid' },
          { label: '3py', electrons: 1, kind: 'hybrid' },
          { label: '3pz / 3d (π)', electrons: 2, kind: 'pi-bond' },
        ],
      },
      {
        stage: 'sp² Hybridized',
        notation: '1 LP + 2σ + 2π',
        slots: [
          { label: 'sp² (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp² (σ)', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp² (σ)', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Sulfur has 2 σ-bond domains and 1 lone pair (steric number 3 ⇒ sp²). While CO₂ is linear (no lone pair on C), SO₂ is bent (~119.5°) because the lone pair on sulfur pushes the two S=O bonds downward.',
    hscExamTip:
      'Classic comparison question: Why is CO₂ nonpolar & linear, whereas SO₂ is polar & angular?',
    defaultCamera: [1.3, 1.5, 3.8],
  },

  // ==================== sp3d (TRIGONAL BIPYRAMIDAL) ====================
  {
    id: 'pcl5',
    formula: 'PCl₅',
    formulaPlain: 'PCl5',
    name: 'Phosphorus Pentachloride',
    banglaName: 'ফসফরাস পেন্টাক্লোরাইড',
    hybridization: 'sp3d',
    electronGeometry: 'Trigonal Bipyramidal',
    molecularShape: 'Trigonal Bipyramidal',
    primaryAngleDeg: 90,
    angleSummary: '90° (axial) & 120° (eq.)',
    idealAngleDeg: 90,
    bondPairs: 5,
    lonePairs: 0,
    centralAtom: 'P',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'p1', element: 'P', position: [0, 0, 0], isCentral: true, role: 'Central sp³d Phosphorus' },
      { id: 'cl_ax1', element: 'Cl', position: [0, 1.85, 0], role: 'Axial Chlorine (longer bond)' },
      { id: 'cl_ax2', element: 'Cl', position: [0, -1.85, 0], role: 'Axial Chlorine (longer bond)' },
      { id: 'cl_eq1', element: 'Cl', position: [1.65, 0, 0], role: 'Equatorial Chlorine' },
      { id: 'cl_eq2', element: 'Cl', position: [round3(1.65 * Math.cos(degToRad(120))), 0, round3(1.65 * Math.sin(degToRad(120)))], role: 'Equatorial Chlorine' },
      { id: 'cl_eq3', element: 'Cl', position: [round3(1.65 * Math.cos(degToRad(240))), 0, round3(1.65 * Math.sin(degToRad(240)))], role: 'Equatorial Chlorine' },
    ],
    bonds: [
      { from: 'p1', to: 'cl_ax1', order: 1 },
      { from: 'p1', to: 'cl_ax2', order: 1 },
      { from: 'p1', to: 'cl_eq1', order: 1 },
      { from: 'p1', to: 'cl_eq2', order: 1 },
      { from: 'p1', to: 'cl_eq3', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'ax-p-eq',
        atomA: 'cl_ax1',
        vertex: 'p1',
        atomB: 'cl_eq1',
        degrees: 90,
        displayLabel: '90° (Axial–Eq)',
        note: '3 equatorial BP repel each axial bond at 90°',
      },
      {
        id: 'eq-p-eq',
        atomA: 'cl_eq1',
        vertex: 'p1',
        atomB: 'cl_eq2',
        degrees: 120,
        displayLabel: '120° (Eq–Eq)',
        note: '3 equatorial bonds lie in the horizontal plane at 120°',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'P',
      valenceElectrons: 5,
      monovalentAtoms: 5,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 5,
      bondPairs: 5,
      lonePairs: 0,
    },
    orbitalStates: [
      {
        stage: 'Ground State (P₁₅)',
        notation: '3s² 3p³ 3d⁰',
        slots: [
          { label: '3s', electrons: 2, kind: 'sigma-bond' },
          { label: '3px', electrons: 1, kind: 'unhybridized-p' },
          { label: '3py', electrons: 1, kind: 'unhybridized-p' },
          { label: '3pz', electrons: 1, kind: 'unhybridized-p' },
          { label: '3dz²', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'Excited State (P*)',
        notation: '3s¹ 3p³ 3d¹',
        slots: [
          { label: '3s', electrons: 1, kind: 'hybrid' },
          { label: '3px', electrons: 1, kind: 'hybrid' },
          { label: '3py', electrons: 1, kind: 'hybrid' },
          { label: '3pz', electrons: 1, kind: 'hybrid' },
          { label: '3dz²', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d Hybridized',
        notation: '5 × sp³d orbitals',
        slots: [
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Phosphorus promotes a 3s electron into an empty 3d orbital, forming five sp³d hybrid orbitals. Three equatorial Cl atoms sit in a 120° triangle while two axial Cl atoms sit above and below at 90°.',
    hscExamTip:
      'Why does PCl₅ exist while NCl₅ does not? Phosphorus has vacant 3d orbitals for octet expansion, whereas Nitrogen (Period 2) lacks 2d orbitals! Also: axial P–Cl bonds (219 pm) are longer and weaker than equatorial bonds (204 pm).',
    defaultCamera: [3.2, 2.3, 3.8],
  },
  {
    id: 'sf4',
    formula: 'SF₄',
    formulaPlain: 'SF4',
    name: 'Sulfur Tetrafluoride',
    banglaName: 'সালফার টেট্রাফ্লোরাইড',
    hybridization: 'sp3d',
    electronGeometry: 'Trigonal Bipyramidal',
    molecularShape: 'Seesaw (Distorted Tetrahedral)',
    primaryAngleDeg: 101.6,
    angleSummary: '101.6° (eq.) & 173.1° (ax.)',
    idealAngleDeg: 120,
    bondPairs: 4,
    lonePairs: 1,
    centralAtom: 'S',
    syllabusPriority: 'Essential VSEPR',
    atoms: [
      { id: 's1', element: 'S', position: [0, 0, 0], isCentral: true, role: 'Central sp³d Sulfur' },
      { id: 'f_ax1', element: 'F', position: [round3(-1.7 * Math.sin(degToRad(3.45))), round3(1.7 * Math.cos(degToRad(3.45))), 0], role: 'Axial Fluorine' },
      { id: 'f_ax2', element: 'F', position: [round3(-1.7 * Math.sin(degToRad(3.45))), round3(-1.7 * Math.cos(degToRad(3.45))), 0], role: 'Axial Fluorine' },
      { id: 'f_eq1', element: 'F', position: [round3(-1.6 * Math.cos(degToRad(50.8))), 0, round3(1.6 * Math.sin(degToRad(50.8)))], role: 'Equatorial Fluorine' },
      { id: 'f_eq2', element: 'F', position: [round3(-1.6 * Math.cos(degToRad(50.8))), 0, round3(-1.6 * Math.sin(degToRad(50.8)))], role: 'Equatorial Fluorine' },
    ],
    bonds: [
      { from: 's1', to: 'f_ax1', order: 1 },
      { from: 's1', to: 'f_ax2', order: 1 },
      { from: 's1', to: 'f_eq1', order: 1 },
      { from: 's1', to: 'f_eq2', order: 1 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 's1', direction: [1, 0, 0], label: 'Equatorial Lone Pair' },
    ],
    angles: [
      {
        id: 'feq-s-feq',
        atomA: 'f_eq1',
        vertex: 's1',
        atomB: 'f_eq2',
        degrees: 101.6,
        displayLabel: '101.6°',
        note: 'Compressed from 120° by equatorial LP',
      },
      {
        id: 'fax-s-fax',
        atomA: 'f_ax1',
        vertex: 's1',
        atomB: 'f_ax2',
        degrees: 173.1,
        displayLabel: '173.1°',
        note: 'Bent away from 180° by LP repulsion',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'S',
      valenceElectrons: 6,
      monovalentAtoms: 4,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 5,
      bondPairs: 4,
      lonePairs: 1,
    },
    orbitalStates: [
      {
        stage: 'Excited State (S*)',
        notation: '3s² 3p³ 3d¹',
        slots: [
          { label: '3s', electrons: 2, kind: 'lone-pair' },
          { label: '3px', electrons: 1, kind: 'hybrid' },
          { label: '3py', electrons: 1, kind: 'hybrid' },
          { label: '3pz', electrons: 1, kind: 'hybrid' },
          { label: '3dz²', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d Hybridized',
        notation: '1 eq. LP + 4 BP',
        slots: [
          { label: 'sp³d (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'In sp³d geometry, the lone pair occupies an equatorial site (only two 90° interactions) rather than an axial site (three 90° interactions). This creates a Seesaw shape with compressed angles (101.6° and 173.1°).',
    hscExamTip:
      'Rule for sp³d: Lone pairs ALWAYS go into equatorial positions first to minimize 90° LP–BP repulsions!',
    defaultCamera: [3.2, 2.1, 3.8],
  },
  {
    id: 'clf3',
    formula: 'ClF₃',
    formulaPlain: 'ClF3',
    name: 'Chlorine Trifluoride',
    banglaName: 'ক্লোরিন ট্রাইফ্লোরাইড',
    hybridization: 'sp3d',
    electronGeometry: 'Trigonal Bipyramidal',
    molecularShape: 'T-shaped',
    primaryAngleDeg: 87.5,
    angleSummary: '87.5°',
    idealAngleDeg: 90,
    bondPairs: 3,
    lonePairs: 2,
    centralAtom: 'Cl',
    syllabusPriority: 'Essential VSEPR',
    atoms: [
      { id: 'cl1', element: 'Cl', position: [0, 0, 0], isCentral: true, role: 'Central sp³d Chlorine' },
      { id: 'f_eq', element: 'F', position: [-1.58, 0, 0], role: 'Equatorial Fluorine' },
      { id: 'f_ax1', element: 'F', position: [round3(-1.66 * Math.sin(degToRad(2.5))), round3(1.66 * Math.cos(degToRad(2.5))), 0], role: 'Axial Fluorine' },
      { id: 'f_ax2', element: 'F', position: [round3(-1.66 * Math.sin(degToRad(2.5))), round3(-1.66 * Math.cos(degToRad(2.5))), 0], role: 'Axial Fluorine' },
    ],
    bonds: [
      { from: 'cl1', to: 'f_eq', order: 1 },
      { from: 'cl1', to: 'f_ax1', order: 1 },
      { from: 'cl1', to: 'f_ax2', order: 1 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 'cl1', direction: [0.5, 0, 0.866], label: 'Equatorial LP 1' },
      { id: 'lp2', originId: 'cl1', direction: [0.5, 0, -0.866], label: 'Equatorial LP 2' },
    ],
    angles: [
      {
        id: 'fax-cl-feq',
        atomA: 'f_ax1',
        vertex: 'cl1',
        atomB: 'f_eq',
        degrees: 87.5,
        displayLabel: '87.5°',
        note: 'Bent slightly past 90° away from 2 equatorial LPs',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'Cl',
      valenceElectrons: 7,
      monovalentAtoms: 3,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 5,
      bondPairs: 3,
      lonePairs: 2,
    },
    orbitalStates: [
      {
        stage: 'Excited State (Cl*)',
        notation: '3s² 3p⁴ 3d¹',
        slots: [
          { label: '3s', electrons: 2, kind: 'lone-pair' },
          { label: '3px', electrons: 2, kind: 'lone-pair' },
          { label: '3py', electrons: 1, kind: 'hybrid' },
          { label: '3pz', electrons: 1, kind: 'hybrid' },
          { label: '3dz²', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d Hybridized',
        notation: '2 eq. LP + 3 BP',
        slots: [
          { label: 'sp³d (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Both lone pairs occupy equatorial positions in the trigonal bipyramid, leaving 1 equatorial and 2 axial F atoms in a bent T-shaped geometry (~87.5°).',
    hscExamTip:
      'ClF₃ is bent T-shaped rather than trigonal planar because it has 2 lone pairs on Cl (steric number 5, sp³d).',
    defaultCamera: [2.8, 2.0, 3.8],
  },
  {
    id: 'xef2',
    formula: 'XeF₂',
    formulaPlain: 'XeF2',
    name: 'Xenon Difluoride',
    banglaName: 'জেনন ডাইফ্লোরাইড',
    hybridization: 'sp3d',
    electronGeometry: 'Trigonal Bipyramidal',
    molecularShape: 'Linear',
    primaryAngleDeg: 180,
    angleSummary: '180°',
    idealAngleDeg: 180,
    bondPairs: 2,
    lonePairs: 3,
    centralAtom: 'Xe',
    syllabusPriority: 'Essential VSEPR',
    atoms: [
      { id: 'xe1', element: 'Xe', position: [0, 0, 0], isCentral: true, role: 'Central sp³d Xenon' },
      { id: 'f1', element: 'F', position: [0, 1.75, 0], role: 'Axial Fluorine' },
      { id: 'f2', element: 'F', position: [0, -1.75, 0], role: 'Axial Fluorine' },
    ],
    bonds: [
      { from: 'xe1', to: 'f1', order: 1 },
      { from: 'xe1', to: 'f2', order: 1 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 'xe1', direction: [1, 0, 0], label: 'Equatorial LP 1' },
      { id: 'lp2', originId: 'xe1', direction: [-0.5, 0, 0.866], label: 'Equatorial LP 2' },
      { id: 'lp3', originId: 'xe1', direction: [-0.5, 0, -0.866], label: 'Equatorial LP 3' },
    ],
    angles: [
      {
        id: 'f1-xe-f2',
        atomA: 'f1',
        vertex: 'xe1',
        atomB: 'f2',
        degrees: 180,
        displayLabel: '180°',
        note: '3 symmetric equatorial LPs cancel out, leaving linear F–Xe–F',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'Xe',
      valenceElectrons: 8,
      monovalentAtoms: 2,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 5,
      bondPairs: 2,
      lonePairs: 3,
    },
    orbitalStates: [
      {
        stage: 'Excited State (Xe*)',
        notation: '5s² 5p⁵ 5d¹',
        slots: [
          { label: '5s', electrons: 2, kind: 'lone-pair' },
          { label: '5px', electrons: 2, kind: 'lone-pair' },
          { label: '5py', electrons: 2, kind: 'lone-pair' },
          { label: '5pz', electrons: 1, kind: 'hybrid' },
          { label: '5dz²', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d Hybridized',
        notation: '3 eq. LP + 2 ax. BP',
        slots: [
          { label: 'sp³d (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'All three lone pairs sit symmetrically at 120° around the equator of the trigonal bipyramid. Their repulsions balance completely, keeping the two axial Xe–F bonds strictly linear at 180°.',
    hscExamTip:
      'Noble Gas Triad in HSC: XeF₂ = sp³d (Linear), XeF₄ = sp³d² (Square Planar), XeF₆ = sp³d³ (Distorted Octahedral).',
    defaultCamera: [3.2, 1.8, 3.8],
  },

  // ==================== sp3d2 (OCTAHEDRAL) ====================
  {
    id: 'sf6',
    formula: 'SF₆',
    formulaPlain: 'SF6',
    name: 'Sulfur Hexafluoride',
    banglaName: 'সালফার হেক্সাফ্লোরাইড',
    hybridization: 'sp3d2',
    electronGeometry: 'Octahedral',
    molecularShape: 'Octahedral',
    primaryAngleDeg: 90,
    angleSummary: '90° (all adjacent)',
    idealAngleDeg: 90,
    bondPairs: 6,
    lonePairs: 0,
    centralAtom: 'S',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 's1', element: 'S', position: [0, 0, 0], isCentral: true, role: 'Central sp³d² Sulfur' },
      { id: 'f1', element: 'F', position: [1.65, 0, 0], role: 'Octahedral Fluorine' },
      { id: 'f2', element: 'F', position: [-1.65, 0, 0], role: 'Octahedral Fluorine' },
      { id: 'f3', element: 'F', position: [0, 1.65, 0], role: 'Octahedral Fluorine' },
      { id: 'f4', element: 'F', position: [0, -1.65, 0], role: 'Octahedral Fluorine' },
      { id: 'f5', element: 'F', position: [0, 0, 1.65], role: 'Octahedral Fluorine' },
      { id: 'f6', element: 'F', position: [0, 0, -1.65], role: 'Octahedral Fluorine' },
    ],
    bonds: [
      { from: 's1', to: 'f1', order: 1 },
      { from: 's1', to: 'f2', order: 1 },
      { from: 's1', to: 'f3', order: 1 },
      { from: 's1', to: 'f4', order: 1 },
      { from: 's1', to: 'f5', order: 1 },
      { from: 's1', to: 'f6', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'f3-s-f1',
        atomA: 'f3',
        vertex: 's1',
        atomB: 'f1',
        degrees: 90,
        displayLabel: '90°',
        note: 'All 6 S–F positions are geometrically equivalent',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'S',
      valenceElectrons: 6,
      monovalentAtoms: 6,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 6,
      bondPairs: 6,
      lonePairs: 0,
    },
    orbitalStates: [
      {
        stage: 'Ground State (S₁₆)',
        notation: '3s² 3p⁴ 3d⁰',
        slots: [
          { label: '3s', electrons: 2, kind: 'sigma-bond' },
          { label: '3px', electrons: 2, kind: 'sigma-bond' },
          { label: '3py', electrons: 1, kind: 'unhybridized-p' },
          { label: '3pz', electrons: 1, kind: 'unhybridized-p' },
          { label: '3dz²', electrons: 0, kind: 'unhybridized-p' },
          { label: '3dx²-y²', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'Excited State (S*)',
        notation: '3s¹ 3p³ 3d²',
        slots: [
          { label: '3s', electrons: 1, kind: 'hybrid' },
          { label: '3px', electrons: 1, kind: 'hybrid' },
          { label: '3py', electrons: 1, kind: 'hybrid' },
          { label: '3pz', electrons: 1, kind: 'hybrid' },
          { label: '3dz²', electrons: 1, kind: 'hybrid' },
          { label: '3dx²-y²', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d² Hybridized',
        notation: '6 × sp³d² orbitals',
        slots: [
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Sulfur excites two electrons (one from 3s, one from 3px) into two 3d orbitals (3dz² and 3dx²-y²), yielding six equivalent sp³d² orbitals arranged along ±X, ±Y, ±Z at exact 90° angles.',
    hscExamTip:
      'Why does SF₆ form easily while OF₆ does not? Oxygen has no 2d orbitals, and six F atoms cannot fit sterically around tiny Oxygen. Also, SF₆ is inert because all 6 F atoms shield S.',
    defaultCamera: [3.2, 2.4, 3.6],
  },
  {
    id: 'if5',
    formula: 'IF₅',
    formulaPlain: 'IF5',
    name: 'Iodine Pentafluoride',
    banglaName: 'আয়োডিন পেন্টাফ্লোরাইড',
    hybridization: 'sp3d2',
    electronGeometry: 'Octahedral',
    molecularShape: 'Square Pyramidal',
    primaryAngleDeg: 81.9,
    angleSummary: '81.9° (F_ax–I–F_eq)',
    idealAngleDeg: 90,
    bondPairs: 5,
    lonePairs: 1,
    centralAtom: 'I',
    syllabusPriority: 'Essential VSEPR',
    atoms: [
      { id: 'i1', element: 'I', position: [0, 0, 0], isCentral: true, role: 'Central sp³d² Iodine' },
      { id: 'f_top', element: 'F', position: [0, 1.72, 0], role: 'Apical Fluorine' },
      { id: 'f1', element: 'F', position: [round3(1.72 * Math.sin(degToRad(81.9)) * Math.cos(degToRad(45))), round3(1.72 * Math.cos(degToRad(81.9))), round3(1.72 * Math.sin(degToRad(81.9)) * Math.sin(degToRad(45)))], role: 'Basal Fluorine' },
      { id: 'f2', element: 'F', position: [round3(1.72 * Math.sin(degToRad(81.9)) * Math.cos(degToRad(135))), round3(1.72 * Math.cos(degToRad(81.9))), round3(1.72 * Math.sin(degToRad(81.9)) * Math.sin(degToRad(135)))], role: 'Basal Fluorine' },
      { id: 'f3', element: 'F', position: [round3(1.72 * Math.sin(degToRad(81.9)) * Math.cos(degToRad(225))), round3(1.72 * Math.cos(degToRad(81.9))), round3(1.72 * Math.sin(degToRad(81.9)) * Math.sin(degToRad(225)))], role: 'Basal Fluorine' },
      { id: 'f4', element: 'F', position: [round3(1.72 * Math.sin(degToRad(81.9)) * Math.cos(degToRad(315))), round3(1.72 * Math.cos(degToRad(81.9))), round3(1.72 * Math.sin(degToRad(81.9)) * Math.sin(degToRad(315)))], role: 'Basal Fluorine' },
    ],
    bonds: [
      { from: 'i1', to: 'f_top', order: 1 },
      { from: 'i1', to: 'f1', order: 1 },
      { from: 'i1', to: 'f2', order: 1 },
      { from: 'i1', to: 'f3', order: 1 },
      { from: 'i1', to: 'f4', order: 1 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 'i1', direction: [0, -1, 0], label: 'Basal Lone Pair' },
    ],
    angles: [
      {
        id: 'ftop-i-f1',
        atomA: 'f_top',
        vertex: 'i1',
        atomB: 'f1',
        degrees: 81.9,
        displayLabel: '81.9°',
        note: 'Bottom lone pair pushes the 4 basal F atoms upward',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'I',
      valenceElectrons: 7,
      monovalentAtoms: 5,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 6,
      bondPairs: 5,
      lonePairs: 1,
    },
    orbitalStates: [
      {
        stage: 'Excited State (I*)',
        notation: '5s² 5p³ 5d²',
        slots: [
          { label: '5s', electrons: 2, kind: 'lone-pair' },
          { label: '5px', electrons: 1, kind: 'hybrid' },
          { label: '5py', electrons: 1, kind: 'hybrid' },
          { label: '5pz', electrons: 1, kind: 'hybrid' },
          { label: '5dz²', electrons: 1, kind: 'hybrid' },
          { label: '5dx²-y²', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d² Hybridized',
        notation: '1 LP + 5 BP',
        slots: [
          { label: 'sp³d² (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Iodine has 5 bond pairs and 1 lone pair in an octahedral sp³d² framework. The lone pair pushes the four equatorial F atoms slightly upward toward the apical F, compressing the angle from 90° to 81.9°.',
    hscExamTip:
      'Note the symmetry difference: IF₅ (Square Pyramidal, 1 LP, polar) vs XeF₄ (Square Planar, 2 LP, nonpolar).',
    defaultCamera: [3.1, 2.2, 3.7],
  },
  {
    id: 'xef4',
    formula: 'XeF₄',
    formulaPlain: 'XeF4',
    name: 'Xenon Tetrafluoride',
    banglaName: 'জেনন টেট্রাফ্লোরাইড',
    hybridization: 'sp3d2',
    electronGeometry: 'Octahedral',
    molecularShape: 'Square Planar',
    primaryAngleDeg: 90,
    angleSummary: '90° (planar square)',
    idealAngleDeg: 90,
    bondPairs: 4,
    lonePairs: 2,
    centralAtom: 'Xe',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'xe1', element: 'Xe', position: [0, 0, 0], isCentral: true, role: 'Central sp³d² Xenon' },
      { id: 'f1', element: 'F', position: [1.7, 0, 0], role: 'Planar Fluorine' },
      { id: 'f2', element: 'F', position: [-1.7, 0, 0], role: 'Planar Fluorine' },
      { id: 'f3', element: 'F', position: [0, 0, 1.7], role: 'Planar Fluorine' },
      { id: 'f4', element: 'F', position: [0, 0, -1.7], role: 'Planar Fluorine' },
    ],
    bonds: [
      { from: 'xe1', to: 'f1', order: 1 },
      { from: 'xe1', to: 'f2', order: 1 },
      { from: 'xe1', to: 'f3', order: 1 },
      { from: 'xe1', to: 'f4', order: 1 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 'xe1', direction: [0, 1, 0], label: 'Axial Lone Pair (+Y)' },
      { id: 'lp2', originId: 'xe1', direction: [0, -1, 0], label: 'Axial Lone Pair (-Y)' },
    ],
    angles: [
      {
        id: 'f1-xe-f3',
        atomA: 'f1',
        vertex: 'xe1',
        atomB: 'f3',
        degrees: 90,
        displayLabel: '90°',
        note: 'Opposite axial LPs cancel vertically, leaving exact 90° planar bonds',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'Xe',
      valenceElectrons: 8,
      monovalentAtoms: 4,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 6,
      bondPairs: 4,
      lonePairs: 2,
    },
    orbitalStates: [
      {
        stage: 'Excited State (Xe*)',
        notation: '5s² 5p⁴ 5d²',
        slots: [
          { label: '5s', electrons: 2, kind: 'lone-pair' },
          { label: '5px', electrons: 2, kind: 'lone-pair' },
          { label: '5py', electrons: 1, kind: 'hybrid' },
          { label: '5pz', electrons: 1, kind: 'hybrid' },
          { label: '5dz²', electrons: 1, kind: 'hybrid' },
          { label: '5dx²-y²', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d² Hybridized',
        notation: '2 trans LP + 4 planar BP',
        slots: [
          { label: 'sp³d² (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d² (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d²', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'In XeF₄, the two lone pairs take opposite axial positions (180° apart) to eliminate LP–LP repulsion. Their vertical repulsions cancel out, forcing the four F atoms into a flat square plane at 90°.',
    hscExamTip:
      'Frequently tested MCQ: Even though XeF₄ has 4 bonds like CH₄, its hybridization is sp³d² (NOT sp³), and its shape is Square Planar (90°), not Tetrahedral!',
    defaultCamera: [3.0, 2.5, 3.6],
  },

  // ==================== sp3d3 (PENTAGONAL BIPYRAMIDAL / CAPPED) ====================
  {
    id: 'xef6',
    formula: 'XeF₆',
    formulaPlain: 'XeF6',
    name: 'Xenon Hexafluoride',
    banglaName: 'জেনন হেক্সাফ্লোরাইড',
    hybridization: 'sp3d3',
    electronGeometry: 'Pentagonal Bipyramidal',
    molecularShape: 'Distorted Octahedral (Capped)',
    primaryAngleDeg: xef6Coords.cappedAngleDeg,
    angleSummary: `~${xef6Coords.uncappedAngleDeg}°–${xef6Coords.cappedAngleDeg}° (Distorted from 90°)`,
    idealAngleDeg: 90,
    bondPairs: 6,
    lonePairs: 1,
    centralAtom: 'Xe',
    syllabusPriority: 'Advanced Exception',
    atoms: [
      { id: 'xe1', element: 'Xe', position: [0, 0, 0], isCentral: true, role: 'Central sp³d³ Xenon' },
      { id: 'f1', element: 'F', position: xef6Coords.fluorines[0], role: 'Capped-Face Fluorine (widened)' },
      { id: 'f2', element: 'F', position: xef6Coords.fluorines[1], role: 'Capped-Face Fluorine (widened)' },
      { id: 'f3', element: 'F', position: xef6Coords.fluorines[2], role: 'Capped-Face Fluorine (widened)' },
      { id: 'f4', element: 'F', position: xef6Coords.fluorines[3], role: 'Opposite-Face Fluorine (compressed)' },
      { id: 'f5', element: 'F', position: xef6Coords.fluorines[4], role: 'Opposite-Face Fluorine (compressed)' },
      { id: 'f6', element: 'F', position: xef6Coords.fluorines[5], role: 'Opposite-Face Fluorine (compressed)' },
    ],
    bonds: [
      { from: 'xe1', to: 'f1', order: 1 },
      { from: 'xe1', to: 'f2', order: 1 },
      { from: 'xe1', to: 'f3', order: 1 },
      { from: 'xe1', to: 'f4', order: 1 },
      { from: 'xe1', to: 'f5', order: 1 },
      { from: 'xe1', to: 'f6', order: 1 },
    ],
    lonePairsVec: [
      { id: 'lp1', originId: 'xe1', direction: xef6Coords.lonePairDir, label: '1 Stereochemically Active LP' },
    ],
    angles: [
      {
        id: 'f1-xe-f2',
        atomA: 'f1',
        vertex: 'xe1',
        atomB: 'f2',
        degrees: xef6Coords.cappedAngleDeg,
        displayLabel: `${xef6Coords.cappedAngleDeg}° (Capped face)`,
        note: 'LP pushes the 3 nearby F atoms apart (~100°–102°)',
      },
      {
        id: 'f4-xe-f5',
        atomA: 'f4',
        vertex: 'xe1',
        atomB: 'f5',
        degrees: xef6Coords.uncappedAngleDeg,
        displayLabel: `${xef6Coords.uncappedAngleDeg}° (Opposite face)`,
        note: 'Opposite 3 F atoms compress together (< 90°)',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'Xe',
      valenceElectrons: 8,
      monovalentAtoms: 6,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 7,
      bondPairs: 6,
      lonePairs: 1,
    },
    orbitalStates: [
      {
        stage: 'Ground State (Xe₅₄)',
        notation: '5s² 5p⁶ 5d⁰',
        slots: [
          { label: '5s', electrons: 2, kind: 'lone-pair' },
          { label: '5px', electrons: 2, kind: 'sigma-bond' },
          { label: '5py', electrons: 2, kind: 'sigma-bond' },
          { label: '5pz', electrons: 2, kind: 'sigma-bond' },
          { label: '5d (×3)', electrons: 0, kind: 'unhybridized-p' },
        ],
      },
      {
        stage: 'Excited State (Xe*)',
        notation: '5s² 5p³ 5d³',
        slots: [
          { label: '5s', electrons: 2, kind: 'lone-pair' },
          { label: '5px', electrons: 1, kind: 'hybrid' },
          { label: '5py', electrons: 1, kind: 'hybrid' },
          { label: '5pz', electrons: 1, kind: 'hybrid' },
          { label: '5d₁', electrons: 1, kind: 'hybrid' },
          { label: '5d₂', electrons: 1, kind: 'hybrid' },
          { label: '5d₃', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d³ Hybridized',
        notation: '1 LP + 6 BP (Steric #7)',
        slots: [
          { label: 'sp³d³ (LP)', electrons: 2, kind: 'lone-pair' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Xenon has 8 valence electrons; 6 form σ-bonds with F and 1 remains as a lone pair (H = ½(8 + 6) = 7 ⇒ sp³d³). Because the lone pair projects out through one triangular face of the octahedron, it widens those 3 F–Xe–F angles and compresses the opposite face, producing a Distorted (Capped) Octahedral shape rather than a regular octahedron.',
    hscExamTip:
      'Top HSC Board Question: Even though XeF₆ and SF₆ both have 6 fluorine atoms, SF₆ is regular Octahedral (sp³d², 0 LP) whereas XeF₆ is Distorted Octahedral (sp³d³, 1 LP)!',
    defaultCamera: [3.4, 2.3, 3.9],
  },
  {
    id: 'if7',
    formula: 'IF₇',
    formulaPlain: 'IF7',
    name: 'Iodine Heptafluoride',
    banglaName: 'আয়োডিন হেপ্টাফ্লোরাইড',
    hybridization: 'sp3d3',
    electronGeometry: 'Pentagonal Bipyramidal',
    molecularShape: 'Pentagonal Bipyramidal',
    primaryAngleDeg: 72,
    angleSummary: '72° (eq.) & 90° (ax.)',
    idealAngleDeg: 72,
    bondPairs: 7,
    lonePairs: 0,
    centralAtom: 'I',
    syllabusPriority: 'Core Board Exam',
    atoms: [
      { id: 'i1', element: 'I', position: [0, 0, 0], isCentral: true, role: 'Central sp³d³ Iodine' },
      { id: 'f_ax1', element: 'F', position: [0, 1.8, 0], role: 'Axial Fluorine' },
      { id: 'f_ax2', element: 'F', position: [0, -1.8, 0], role: 'Axial Fluorine' },
      { id: 'f_eq1', element: 'F', position: if7Pent[0], role: 'Pentagonal Equatorial F' },
      { id: 'f_eq2', element: 'F', position: if7Pent[1], role: 'Pentagonal Equatorial F' },
      { id: 'f_eq3', element: 'F', position: if7Pent[2], role: 'Pentagonal Equatorial F' },
      { id: 'f_eq4', element: 'F', position: if7Pent[3], role: 'Pentagonal Equatorial F' },
      { id: 'f_eq5', element: 'F', position: if7Pent[4], role: 'Pentagonal Equatorial F' },
    ],
    bonds: [
      { from: 'i1', to: 'f_ax1', order: 1 },
      { from: 'i1', to: 'f_ax2', order: 1 },
      { from: 'i1', to: 'f_eq1', order: 1 },
      { from: 'i1', to: 'f_eq2', order: 1 },
      { from: 'i1', to: 'f_eq3', order: 1 },
      { from: 'i1', to: 'f_eq4', order: 1 },
      { from: 'i1', to: 'f_eq5', order: 1 },
    ],
    lonePairsVec: [],
    angles: [
      {
        id: 'feq1-i-feq2',
        atomA: 'f_eq1',
        vertex: 'i1',
        atomB: 'f_eq2',
        degrees: 72,
        displayLabel: '72° (Eq–Eq)',
        note: '360° ÷ 5 = 72° around the equatorial pentagon',
      },
      {
        id: 'fax-i-feq',
        atomA: 'f_ax1',
        vertex: 'i1',
        atomB: 'f_eq1',
        degrees: 90,
        displayLabel: '90° (Axial–Eq)',
        note: 'Axial bonds perpendicular to the pentagonal plane',
      },
    ],
    formulaBreakdown: {
      centralAtom: 'I',
      valenceElectrons: 7,
      monovalentAtoms: 7,
      cationCharge: 0,
      anionCharge: 0,
      stericNumber: 7,
      bondPairs: 7,
      lonePairs: 0,
    },
    orbitalStates: [
      {
        stage: 'Excited State (I*)',
        notation: '5s¹ 5p³ 5d³',
        slots: [
          { label: '5s', electrons: 1, kind: 'hybrid' },
          { label: '5px', electrons: 1, kind: 'hybrid' },
          { label: '5py', electrons: 1, kind: 'hybrid' },
          { label: '5pz', electrons: 1, kind: 'hybrid' },
          { label: '5d₁', electrons: 1, kind: 'hybrid' },
          { label: '5d₂', electrons: 1, kind: 'hybrid' },
          { label: '5d₃', electrons: 1, kind: 'hybrid' },
        ],
      },
      {
        stage: 'sp³d³ Hybridized',
        notation: '7 × sp³d³ (0 LP)',
        slots: [
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
          { label: 'sp³d³', electrons: 1, kind: 'sigma-bond' },
        ],
      },
    ],
    repulsionExplanation:
      'Iodine excites electrons from 5s and 5p into three 5d orbitals to form seven sp³d³ hybrid orbitals. Five F atoms form a regular pentagon (72° apart) in the equatorial plane, and two axial F atoms sit at 90° above and below.',
    hscExamTip:
      'IF₇ is the textbook prototype for sp³d³ hybridization with 0 lone pairs (Pentagonal Bipyramidal).',
    defaultCamera: [3.3, 2.6, 3.8],
  },
];
