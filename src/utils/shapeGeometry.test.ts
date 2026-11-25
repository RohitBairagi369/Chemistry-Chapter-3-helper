import test from 'node:test';
import assert from 'node:assert/strict';
import { MOLECULES } from '../data/molecules';
import {
  computeAtomLabelAnchor,
  computeBondLabelAnchors,
  computeBondPiNormals,
  computeMoleculeShapeGeometry,
  countSigmaAndPiBonds,
  formatAtomBadgeLabel,
} from './shapeGeometry';

test('every HSC molecule generates non-empty 3D shape outlines and valid face triangles', () => {
  for (const mol of MOLECULES) {
    const geom = computeMoleculeShapeGeometry(mol);
    assert.ok(
      geom.edges.length >= 1,
      `Expected at least 1 shape outline edge for ${mol.id}`,
    );
    assert.ok(geom.shapeLabel.length > 0, `Expected non-empty shapeLabel for ${mol.id}`);
    for (const face of geom.faces) {
      assert.equal(face.length, 3);
    }
  }
});

test('polyhedral edge and face counts match exact VSEPR geometry definitions', () => {
  const byId = new Map(MOLECULES.map((m) => [m.id, m]));

  const ch4 = computeMoleculeShapeGeometry(byId.get('ch4')!);
  assert.equal(ch4.edges.length, 6);
  assert.equal(ch4.faces.length, 4);

  const pcl5 = computeMoleculeShapeGeometry(byId.get('pcl5')!);
  assert.equal(pcl5.edges.length, 9);
  assert.equal(pcl5.faces.length, 6);

  const sf6 = computeMoleculeShapeGeometry(byId.get('sf6')!);
  assert.equal(sf6.edges.length, 12);
  assert.equal(sf6.faces.length, 8);

  const xef6 = computeMoleculeShapeGeometry(byId.get('xef6')!);
  assert.equal(xef6.edges.length, 12);
  assert.equal(xef6.faces.length, 8);

  const if7 = computeMoleculeShapeGeometry(byId.get('if7')!);
  assert.equal(if7.edges.length, 15);
  assert.equal(if7.faces.length, 10);
});

test('atom badge labels format axial/equatorial roles concisely and compute outward anchors', () => {
  assert.equal(
    formatAtomBadgeLabel({ id: 'p1', element: 'P', position: [0, 0, 0], isCentral: true, role: 'Central sp³d Phosphorus' }),
    'P',
  );
  assert.equal(
    formatAtomBadgeLabel({ id: 'cl1', element: 'Cl', position: [0, 1.85, 0], role: 'Axial Chlorine (longer bond)' }),
    'Cl (Ax)',
  );
  assert.equal(
    formatAtomBadgeLabel({ id: 'cl2', element: 'Cl', position: [1.65, 0, 0], role: 'Equatorial Chlorine' }),
    'Cl (Eq)',
  );
  assert.equal(
    formatAtomBadgeLabel({ id: 'h1', element: 'H', position: [1, 1, 1], role: 'σ-bonded Hydrogen' }),
    'H',
  );

  const anchor = computeAtomLabelAnchor(
    { id: 'f1', element: 'F', position: [0, 2, 0], role: 'Axial Fluorine' },
    0.34,
  );
  assert.ok(anchor[1] > 2.15 && anchor[1] < 2.25);
});

test('countSigmaAndPiBonds, computeBondPiNormals, and computeBondLabelAnchors match HSC textbook bond counts', () => {
  const byId = new Map(MOLECULES.map((m) => [m.id, m]));

  assert.deepEqual(countSigmaAndPiBonds(byId.get('ch4')!), { sigmaCount: 4, piCount: 0 });
  assert.deepEqual(countSigmaAndPiBonds(byId.get('c2h4')!), { sigmaCount: 5, piCount: 1 });
  assert.deepEqual(countSigmaAndPiBonds(byId.get('c2h2')!), { sigmaCount: 3, piCount: 2 });
  assert.deepEqual(countSigmaAndPiBonds(byId.get('co2')!), { sigmaCount: 2, piCount: 2 });
  assert.deepEqual(countSigmaAndPiBonds(byId.get('so2')!), { sigmaCount: 2, piCount: 2 });

  // C2H4 double bond pi normal is along +/-Z (perpendicular to XY molecular plane)
  assert.deepEqual(
    computeBondPiNormals('c2h4', 0, 2, [-0.74, 0, 0], [0.74, 0, 0]),
    [[0, 0, 1]],
  );

  // CO2 has two mutually perpendicular pi planes along Y and Z
  assert.deepEqual(
    computeBondPiNormals('co2', 0, 2, [0, 0, 0], [-1.65, 0, 0]),
    [[0, 1, 0]],
  );
  assert.deepEqual(
    computeBondPiNormals('co2', 1, 2, [0, 0, 0], [1.65, 0, 0]),
    [[0, 0, 1]],
  );

  // C2H2 triple bond has 2 orthogonal pi planes
  const c2h2Normals = computeBondPiNormals('c2h2', 0, 3, [-0.72, 0, 0], [0.72, 0, 0]);
  assert.equal(c2h2Normals.length, 2);

  // Bond labels include 1σ + 1π for C2H4 double bond + 1 representative σ C-H bond
  const c2h4Labels = computeBondLabelAnchors(byId.get('c2h4')!);
  assert.equal(c2h4Labels.length, 2);
  assert.equal(c2h4Labels[0].text, '1σ + 1π');
  assert.equal(c2h4Labels[1].text, 'σ');

  // Bond labels include 1σ + 2π for C2H2 triple bond + 1 representative σ C-H bond
  const c2h2Labels = computeBondLabelAnchors(byId.get('c2h2')!);
  assert.equal(c2h2Labels.length, 2);
  assert.equal(c2h2Labels[0].text, '1σ + 2π');
  assert.equal(c2h2Labels[1].text, 'σ');
});
