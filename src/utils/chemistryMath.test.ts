import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHybridizationValue,
  computeBondAngleDegrees,
  filterMolecules,
  formatHybridizationLabel,
  predictVseprShape,
  scoreQuizAnswers,
} from './chemistryMath';
import { MOLECULES } from '../data/molecules';
import { QUIZ_QUESTIONS } from '../data/quizQuestions';

test('HSC hybridization formula H = 1/2(V + M - C + A) handles key syllabus molecules', () => {
  // CH4: C(4) + 4 H(4) -> 4 (sp3)
  const ch4 = calculateHybridizationValue(4, 4, 0, 0);
  assert.equal(ch4.isValid, true);
  assert.equal(ch4.stericNumber, 4);
  assert.equal(ch4.hybridization, 'sp3');

  // NH3: N(5) + 3 H(3) -> 4 (sp3)
  const nh3 = calculateHybridizationValue(5, 3, 0, 0);
  assert.equal(nh3.stericNumber, 4);
  assert.equal(nh3.hybridization, 'sp3');

  // NH4+: N(5) + 4 H(4) - 1 -> 4 (sp3)
  const nh4Plus = calculateHybridizationValue(5, 4, 1, 0);
  assert.equal(nh4Plus.stericNumber, 4);
  assert.equal(nh4Plus.hybridization, 'sp3');

  // PCl5: P(5) + 5 Cl(5) -> 5 (sp3d)
  const pcl5 = calculateHybridizationValue(5, 5, 0, 0);
  assert.equal(pcl5.stericNumber, 5);
  assert.equal(pcl5.hybridization, 'sp3d');

  // SF6: S(6) + 6 F(6) -> 6 (sp3d2)
  const sf6 = calculateHybridizationValue(6, 6, 0, 0);
  assert.equal(sf6.stericNumber, 6);
  assert.equal(sf6.hybridization, 'sp3d2');

  // XeF6: Xe(8) + 6 F(6) -> 7 (sp3d3)
  const xef6 = calculateHybridizationValue(8, 6, 0, 0);
  assert.equal(xef6.stericNumber, 7);
  assert.equal(xef6.hybridization, 'sp3d3');
  assert.equal(xef6.electronGeometry, 'Pentagonal Bipyramidal');

  // Invalid steric numbers (H = 1 or fractional H = 2.5)
  const invalidOne = calculateHybridizationValue(2, 0, 0, 0);
  assert.equal(invalidOne.isValid, false);
  assert.equal(invalidOne.hybridization, null);

  const invalidFrac = calculateHybridizationValue(5, 0, 0, 0);
  assert.equal(invalidFrac.isValid, false);
  assert.equal(invalidFrac.hybridization, null);
});

test('predictVseprShape returns exact textbook shapes and angles', () => {
  const nh3 = predictVseprShape(4, 1);
  assert.ok(nh3);
  assert.equal(nh3.molecularShape, 'Trigonal Pyramidal');
  assert.equal(nh3.expectedAngle, '107°');

  const h2o = predictVseprShape(4, 2);
  assert.ok(h2o);
  assert.equal(h2o.molecularShape, 'Bent / Angular (V-shaped)');
  assert.equal(h2o.expectedAngle, '104.5°');

  const xef6 = predictVseprShape(7, 1);
  assert.ok(xef6);
  assert.equal(xef6.hybridization, 'sp3d3');
  assert.equal(xef6.molecularShape, 'Distorted Octahedral (Capped)');
});

test('3D coordinates in MOLECULES yield accurate bond angles matching HSC textbook values', () => {
  for (const mol of MOLECULES) {
    const atomMap = new Map(mol.atoms.map((a) => [a.id, a]));
    for (const angleSpec of mol.angles) {
      const a = atomMap.get(angleSpec.atomA);
      const v = atomMap.get(angleSpec.vertex);
      const b = atomMap.get(angleSpec.atomB);
      assert.ok(a && v && b, `Missing atoms for angle in ${mol.id}`);
      const computed = computeBondAngleDegrees(a.position, v.position, b.position);
      assert.ok(
        Math.abs(computed - angleSpec.degrees) < 0.75,
        `${mol.id} angle ${angleSpec.id}: expected ~${angleSpec.degrees}°, got ${computed.toFixed(2)}°`,
      );
    }
  }
});

test('molecule filtering and hybridization formatting work deterministically', () => {
  assert.equal(formatHybridizationLabel('sp3d3'), 'sp³d³');
  const sp3d3List = filterMolecules(MOLECULES, 'sp3d3', '');
  assert.ok(sp3d3List.some((m) => m.id === 'xef6'));
  assert.ok(sp3d3List.some((m) => m.id === 'if7'));

  const xenonSearch = filterMolecules(MOLECULES, 'all', 'xenon');
  assert.equal(xenonSearch.length, 3); // XeF2, XeF4, XeF6
});

test('quiz scoring computes accuracy and mastery thresholds accurately', () => {
  const sample = QUIZ_QUESTIONS.slice(0, 4);
  const allCorrect: Record<string, number> = {};
  for (const q of sample) {
    allCorrect[q.id] = q.correctIndex;
  }
  const summary = scoreQuizAnswers(sample, allCorrect);
  assert.equal(summary.correct, 4);
  assert.equal(summary.accuracyPercent, 100);
  assert.equal(summary.masteryLabel, 'Board Ready');
});
