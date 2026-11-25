import type { AtomNode, MoleculeSpec } from '../types/chemistry';

export type Vec3Tuple = [number, number, number];

export interface ShapeOutlineEdge {
  from: Vec3Tuple;
  to: Vec3Tuple;
  kind: 'outline' | 'axis';
}

export interface MoleculeShapeGeometry {
  edges: ShapeOutlineEdge[];
  faces: Array<[Vec3Tuple, Vec3Tuple, Vec3Tuple]>;
  shapeLabel: string;
}

function getPosMap(mol: MoleculeSpec): Map<string, Vec3Tuple> {
  const map = new Map<string, Vec3Tuple>();
  for (const atom of mol.atoms) {
    map.set(atom.id, atom.position);
  }
  return map;
}

function pick(map: Map<string, Vec3Tuple>, id: string): Vec3Tuple {
  const p = map.get(id);
  if (!p) {
    throw new Error(`Missing atom "${id}" in shape geometry builder`);
  }
  return p;
}

function addLoopEdges(
  pts: Vec3Tuple[],
  edges: ShapeOutlineEdge[],
  kind: 'outline' | 'axis' = 'outline',
) {
  for (let i = 0; i < pts.length; i++) {
    edges.push({
      from: pts[i],
      to: pts[(i + 1) % pts.length],
      kind,
    });
  }
}

export function computeMoleculeShapeGeometry(mol: MoleculeSpec): MoleculeShapeGeometry {
  const map = getPosMap(mol);
  const edges: ShapeOutlineEdge[] = [];
  const faces: Array<[Vec3Tuple, Vec3Tuple, Vec3Tuple]> = [];

  switch (mol.id) {
    case 'ch4':
    case 'nh4_plus': {
      const h1 = pick(map, 'h1');
      const h2 = pick(map, 'h2');
      const h3 = pick(map, 'h3');
      const h4 = pick(map, 'h4');
      const verts = [h1, h2, h3, h4];
      for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
          edges.push({ from: verts[i], to: verts[j], kind: 'outline' });
        }
      }
      faces.push([h1, h2, h3], [h1, h2, h4], [h1, h3, h4], [h2, h3, h4]);
      return { edges, faces, shapeLabel: 'Tetrahedron' };
    }

    case 'nh3': {
      const n1 = pick(map, 'n1');
      const h1 = pick(map, 'h1');
      const h2 = pick(map, 'h2');
      const h3 = pick(map, 'h3');
      addLoopEdges([h1, h2, h3], edges);
      edges.push(
        { from: n1, to: h1, kind: 'outline' },
        { from: n1, to: h2, kind: 'outline' },
        { from: n1, to: h3, kind: 'outline' },
      );
      faces.push([h1, h2, h3], [n1, h1, h2], [n1, h2, h3], [n1, h3, h1]);
      return { edges, faces, shapeLabel: 'Trigonal Pyramid' };
    }

    case 'h2o':
    case 'so2': {
      const center = mol.atoms.find((a) => a.isCentral) ?? mol.atoms[0];
      const ligands = mol.atoms.filter((a) => !a.isCentral);
      const cPos = center.position;
      const aPos = ligands[0].position;
      const bPos = ligands[1].position;
      edges.push(
        { from: cPos, to: aPos, kind: 'outline' },
        { from: cPos, to: bPos, kind: 'outline' },
        { from: aPos, to: bPos, kind: 'axis' },
      );
      faces.push([cPos, aPos, bPos]);
      return { edges, faces, shapeLabel: 'Bent (V-Shaped)' };
    }

    case 'becl2':
    case 'co2':
    case 'c2h2': {
      const xs = mol.atoms.map((a) => a.position[0]);
      const minX = Math.min(...xs) - 0.55;
      const maxX = Math.max(...xs) + 0.55;
      edges.push({ from: [minX, 0, 0], to: [maxX, 0, 0], kind: 'axis' });
      return { edges, faces, shapeLabel: 'Linear (180°)' };
    }

    case 'xef2': {
      const ys = mol.atoms.map((a) => a.position[1]);
      const minY = Math.min(...ys) - 0.55;
      const maxY = Math.max(...ys) + 0.55;
      edges.push({ from: [0, minY, 0], to: [0, maxY, 0], kind: 'axis' });
      return { edges, faces, shapeLabel: 'Linear (180°)' };
    }

    case 'bf3': {
      const f1 = pick(map, 'f1');
      const f2 = pick(map, 'f2');
      const f3 = pick(map, 'f3');
      addLoopEdges([f1, f2, f3], edges);
      faces.push([f1, f2, f3]);
      return { edges, faces, shapeLabel: 'Trigonal Planar' };
    }

    case 'c2h4': {
      const h1 = pick(map, 'h1');
      const h2 = pick(map, 'h2');
      const h3 = pick(map, 'h3');
      const h4 = pick(map, 'h4');
      addLoopEdges([h1, h2, h4, h3], edges);
      faces.push([h1, h2, h4], [h1, h4, h3]);
      return { edges, faces, shapeLabel: 'Planar Geometry' };
    }

    case 'pcl5': {
      const ax1 = pick(map, 'cl_ax1');
      const ax2 = pick(map, 'cl_ax2');
      const eq1 = pick(map, 'cl_eq1');
      const eq2 = pick(map, 'cl_eq2');
      const eq3 = pick(map, 'cl_eq3');
      const eqs = [eq1, eq2, eq3];
      addLoopEdges(eqs, edges);
      for (let i = 0; i < 3; i++) {
        edges.push({ from: ax1, to: eqs[i], kind: 'outline' });
        edges.push({ from: ax2, to: eqs[i], kind: 'outline' });
        const next = eqs[(i + 1) % 3];
        faces.push([ax1, eqs[i], next], [ax2, eqs[i], next]);
      }
      return { edges, faces, shapeLabel: 'Trigonal Bipyramid' };
    }

    case 'sf4': {
      const ax1 = pick(map, 'f_ax1');
      const ax2 = pick(map, 'f_ax2');
      const eq1 = pick(map, 'f_eq1');
      const eq2 = pick(map, 'f_eq2');
      edges.push(
        { from: ax1, to: eq1, kind: 'outline' },
        { from: ax1, to: eq2, kind: 'outline' },
        { from: ax2, to: eq1, kind: 'outline' },
        { from: ax2, to: eq2, kind: 'outline' },
        { from: eq1, to: eq2, kind: 'outline' },
        { from: ax1, to: ax2, kind: 'axis' },
      );
      faces.push([ax1, eq1, eq2], [ax2, eq1, eq2]);
      return { edges, faces, shapeLabel: 'Seesaw' };
    }

    case 'clf3': {
      const ax1 = pick(map, 'f_ax1');
      const ax2 = pick(map, 'f_ax2');
      const eq = pick(map, 'f_eq');
      edges.push(
        { from: ax1, to: eq, kind: 'outline' },
        { from: ax2, to: eq, kind: 'outline' },
        { from: ax1, to: ax2, kind: 'axis' },
      );
      faces.push([ax1, ax2, eq]);
      return { edges, faces, shapeLabel: 'T-Shaped' };
    }

    case 'sf6': {
      const fxPos = pick(map, 'f1');
      const fxNeg = pick(map, 'f2');
      const fyPos = pick(map, 'f3');
      const fyNeg = pick(map, 'f4');
      const fzPos = pick(map, 'f5');
      const fzNeg = pick(map, 'f6');

      const eqRing = [fxPos, fzPos, fxNeg, fzNeg];
      addLoopEdges(eqRing, edges);
      for (let i = 0; i < 4; i++) {
        const cur = eqRing[i];
        const next = eqRing[(i + 1) % 4];
        edges.push({ from: fyPos, to: cur, kind: 'outline' });
        edges.push({ from: fyNeg, to: cur, kind: 'outline' });
        faces.push([fyPos, cur, next], [fyNeg, cur, next]);
      }
      return { edges, faces, shapeLabel: 'Regular Octahedron' };
    }

    case 'if5': {
      const top = pick(map, 'f_top');
      const f1 = pick(map, 'f1');
      const f2 = pick(map, 'f2');
      const f3 = pick(map, 'f3');
      const f4 = pick(map, 'f4');
      const base = [f1, f2, f3, f4];
      addLoopEdges(base, edges);
      for (let i = 0; i < 4; i++) {
        edges.push({ from: top, to: base[i], kind: 'outline' });
        faces.push([top, base[i], base[(i + 1) % 4]]);
      }
      faces.push([f1, f2, f3], [f1, f3, f4]);
      return { edges, faces, shapeLabel: 'Square Pyramid' };
    }

    case 'xef4': {
      const f1 = pick(map, 'f1');
      const f3 = pick(map, 'f3');
      const f2 = pick(map, 'f2');
      const f4 = pick(map, 'f4');
      addLoopEdges([f1, f3, f2, f4], edges);
      faces.push([f1, f3, f2], [f1, f2, f4]);
      return { edges, faces, shapeLabel: 'Square Planar' };
    }

    case 'xef6': {
      const f1 = pick(map, 'f1');
      const f2 = pick(map, 'f2');
      const f3 = pick(map, 'f3');
      const f4 = pick(map, 'f4');
      const f5 = pick(map, 'f5');
      const f6 = pick(map, 'f6');
      addLoopEdges([f1, f2, f3], edges);
      addLoopEdges([f4, f5, f6], edges);
      edges.push(
        { from: f1, to: f4, kind: 'outline' },
        { from: f1, to: f6, kind: 'outline' },
        { from: f2, to: f4, kind: 'outline' },
        { from: f2, to: f5, kind: 'outline' },
        { from: f3, to: f5, kind: 'outline' },
        { from: f3, to: f6, kind: 'outline' },
      );
      faces.push(
        [f1, f2, f3],
        [f4, f5, f6],
        [f1, f2, f4],
        [f2, f3, f5],
        [f3, f1, f6],
        [f4, f5, f2],
        [f5, f6, f3],
        [f6, f4, f1],
      );
      return { edges, faces, shapeLabel: 'Distorted Octahedron' };
    }

    case 'if7': {
      const ax1 = pick(map, 'f_ax1');
      const ax2 = pick(map, 'f_ax2');
      const eq = [
        pick(map, 'f_eq1'),
        pick(map, 'f_eq2'),
        pick(map, 'f_eq3'),
        pick(map, 'f_eq4'),
        pick(map, 'f_eq5'),
      ];
      addLoopEdges(eq, edges);
      for (let i = 0; i < 5; i++) {
        edges.push({ from: ax1, to: eq[i], kind: 'outline' });
        edges.push({ from: ax2, to: eq[i], kind: 'outline' });
        const next = eq[(i + 1) % 5];
        faces.push([ax1, eq[i], next], [ax2, eq[i], next]);
      }
      return { edges, faces, shapeLabel: 'Pentagonal Bipyramid' };
    }

    default:
      return { edges, faces, shapeLabel: mol.molecularShape };
  }
}

export function formatAtomBadgeLabel(atom: AtomNode): string {
  if (atom.isCentral) {
    return atom.element;
  }
  const role = atom.role?.toLowerCase() ?? '';
  if (role.includes('axial')) return `${atom.element} (Ax)`;
  if (role.includes('equatorial')) return `${atom.element} (Eq)`;
  if (role.includes('apical')) return `${atom.element} (Ap)`;
  if (role.includes('basal')) return `${atom.element} (Ba)`;
  return atom.element;
}

export function computeAtomLabelAnchor(atom: AtomNode, radius: number): Vec3Tuple {
  const [x, y, z] = atom.position;
  if (atom.isCentral) {
    return [x, y, z];
  }
  const len = Math.hypot(x, y, z);
  if (len < 1e-4) {
    return [x, y + radius * 0.5, z];
  }
  const offset = radius * 0.55;
  return [
    x + (x / len) * offset,
    y + (y / len) * offset,
    z + (z / len) * offset,
  ];
}
