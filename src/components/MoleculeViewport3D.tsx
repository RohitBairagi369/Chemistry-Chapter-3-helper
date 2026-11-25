import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  RotateCcw,
  RotateCw,
  Compass,
} from 'lucide-react';
import { ELEMENT_STYLES } from '../data/molecules';
import { formatHybridizationLabel } from '../utils/chemistryMath';
import {
  computeAtomLabelAnchor,
  computeMoleculeShapeGeometry,
  formatAtomBadgeLabel,
} from '../utils/shapeGeometry';
import type { AtomNode, MoleculeSpec } from '../types/chemistry';

interface MoleculeViewport3DProps {
  molecule: MoleculeSpec;
}

type CameraPreset = 'default' | 'top' | 'side';

interface ProjectedLabelMeta {
  id: string;
  text: string;
  kind: 'angle' | 'atom-central' | 'atom-ligand' | 'lone-pair';
}

interface LabelAnchor {
  id: string;
  kind: ProjectedLabelMeta['kind'];
  basePos: THREE.Vector3;
  explodeDir: THREE.Vector3;
  explodeWeight: number;
}

interface ExplodablePart {
  group: THREE.Group;
  basePos: THREE.Vector3;
  dir: THREE.Vector3;
  factor: number;
}

// Pre-allocated math helpers outside render loop (zero GC)
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vMid = new THREE.Vector3();
const _vUp = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _proj = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createTeardropGeometry(length: number, maxRadius: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * length;
    // Smooth orbital teardrop profile: narrow at origin, wide near 72%, rounded cap at top
    const r =
      t === 0 || t === 1
        ? 0
        : maxRadius * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.85) * (0.35 + 0.65 * t);
    pts.push(new THREE.Vector2(Math.max(0, r), y));
  }
  return new THREE.LatheGeometry(pts, 20);
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  });
}

export const MoleculeViewport3D: React.FC<MoleculeViewport3DProps> = ({
  molecule,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [showOrbitals, setShowOrbitals] = useState(true);
  const [showLonePairs, setShowLonePairs] = useState(true);
  const [showShapeOutline, setShowShapeOutline] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? false
      : true,
  );
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [dockCollapsed, setDockCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );
  const [selectedAtom, setSelectedAtom] = useState<AtomNode | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const shapeGeom = React.useMemo(
    () => computeMoleculeShapeGeometry(molecule),
    [molecule],
  );

  const labelItems = React.useMemo<ProjectedLabelMeta[]>(() => {
    const items: ProjectedLabelMeta[] = [];
    if (showAngles) {
      for (const ang of molecule.angles) {
        items.push({
          id: `angle:${ang.id}`,
          text: ang.displayLabel,
          kind: 'angle',
        });
      }
    }
    if (showLabels) {
      for (const atom of molecule.atoms) {
        items.push({
          id: `atom:${atom.id}`,
          text: formatAtomBadgeLabel(atom),
          kind: atom.isCentral ? 'atom-central' : 'atom-ligand',
        });
      }
      if (showLonePairs) {
        for (const lp of molecule.lonePairsVec) {
          items.push({
            id: `lp:${lp.id}`,
            text: 'LP',
            kind: 'lone-pair',
          });
        }
      }
    }
    return items;
  }, [molecule, showAngles, showLabels, showLonePairs]);

  const labelDomRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Refs synced to Three.js engine so React updates never tear down the WebGL context
  const stateRef = useRef({
    molecule,
    showOrbitals,
    showLonePairs,
    showShapeOutline,
    showAngles,
    showLabels,
    autoRotate,
    explodeTarget: explodeFactor,
    explodeCurrent: explodeFactor,
  });

  const engineRef = useRef<{
    rebuildMolecule: (mol: MoleculeSpec) => void;
    updateToggles: () => void;
    animateToCamera: (pos: [number, number, number]) => void;
    requestRender: () => void;
  } | null>(null);

  stateRef.current.molecule = molecule;
  stateRef.current.showOrbitals = showOrbitals;
  stateRef.current.showLonePairs = showLonePairs;
  stateRef.current.showShapeOutline = showShapeOutline;
  stateRef.current.showAngles = showAngles;
  stateRef.current.showLabels = showLabels;
  stateRef.current.autoRotate = autoRotate;
  stateRef.current.explodeTarget = explodeFactor;

  const setAtomCallbackRef = useRef(setSelectedAtom);
  setAtomCallbackRef.current = setSelectedAtom;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = new THREE.FogExp2(0x0b1220, 0.045);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const [dx, dy, dz] = stateRef.current.molecule.defaultCamera;
    camera.position.set(dx * 1.38, dy * 1.32, dz * 1.38);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Studio Environment Reflection (mandatory on all devices)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xcbd5e1, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(4.5, 6.5, 5.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-4.5, 2.5, -4.5);
    scene.add(rimLight);

    // OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 3.0;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.target.set(0, -0.22, 0);

    // Molecule root hierarchy
    const moleculeRoot = new THREE.Group();
    scene.add(moleculeRoot);

    const orbitalsGroup = new THREE.Group();
    const lonePairsGroup = new THREE.Group();
    const shapeGroup = new THREE.Group();
    const anglesGroup = new THREE.Group();
    moleculeRoot.add(orbitalsGroup);
    moleculeRoot.add(lonePairsGroup);
    moleculeRoot.add(shapeGroup);
    moleculeRoot.add(anglesGroup);

    let pickableAtoms: THREE.Object3D[] = [];
    let explodableParts: ExplodablePart[] = [];
    let labelAnchors: LabelAnchor[] = [];
    let selectedAtomRing: THREE.Mesh | null = null;

    // Camera transition target (cleared when arrived or user drags)
    let camTargetPos: THREE.Vector3 | null = null;
    controls.addEventListener('start', () => {
      camTargetPos = null;
    });

    // Shared geometries/materials cache for current molecule build
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.22,
      metalness: 0.88,
    });

    const bondMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.35,
      metalness: 0.25,
    });

    const orbitalMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const lonePairMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.22,
      roughness: 0.2,
      metalness: 0.08,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const electronDotMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.1,
    });

    const angleArcMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.4,
    });

    const shapeOutlineMat = new THREE.LineDashedMaterial({
      color: 0xc7d2fe,
      dashSize: 0.16,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.95,
    });

    const shapeAxisMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.12,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.8,
    });

    const shapeFaceMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.095,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    function buildMolecule(mol: MoleculeSpec) {
      // Dispose old children inside moleculeRoot except sub-groups, then clear sub-groups
      const toRemove = moleculeRoot.children.filter(
        (c) =>
          c !== orbitalsGroup &&
          c !== lonePairsGroup &&
          c !== shapeGroup &&
          c !== anglesGroup,
      );
      toRemove.forEach((c) => {
        moleculeRoot.remove(c);
        disposeObject3D(c);
      });
      [orbitalsGroup, lonePairsGroup, shapeGroup, anglesGroup].forEach((grp) => {
        while (grp.children.length > 0) {
          const ch = grp.children[0];
          grp.remove(ch);
          disposeObject3D(ch);
        }
      });

      pickableAtoms = [];
      explodableParts = [];
      labelAnchors = [];
      selectedAtomRing = null;

      const atomMap = new Map<string, AtomNode>();
      mol.atoms.forEach((a) => atomMap.set(a.id, a));

      // 1. Build composite multi-part Atoms (Sphere + Metallic Valence Collar + Specular Cap)
      mol.atoms.forEach((atom) => {
        const style = ELEMENT_STYLES[atom.element];
        const atomGroup = new THREE.Group();
        atomGroup.position.set(...atom.position);
        atomGroup.userData.atomNode = atom;

        const coreGeo = new THREE.SphereGeometry(style.radius, 28, 22);
        const coreMat = new THREE.MeshPhysicalMaterial({
          color: style.color,
          roughness: style.roughness,
          metalness: style.metalness,
          clearcoat: 0.45,
          clearcoatRoughness: 0.2,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.castShadow = !isSoftwareGl;
        coreMesh.receiveShadow = !isSoftwareGl;
        coreMesh.userData.atomNode = atom;
        atomGroup.add(coreMesh);

        // Secondary silhouette detail: metallic equatorial collar
        const ringGeo = new THREE.TorusGeometry(style.radius * 1.04, 0.022, 10, 32);
        const ringMesh = new THREE.Mesh(ringGeo, collarMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.userData.atomNode = atom;
        atomGroup.add(ringMesh);

        // Accent detail: polar cap pin on central atom
        if (atom.isCentral) {
          const capGeo = new THREE.CylinderGeometry(
            style.radius * 0.22,
            style.radius * 0.28,
            style.radius * 0.16,
            16,
          );
          const capMesh = new THREE.Mesh(capGeo, collarMat);
          capMesh.position.y = style.radius * 0.94;
          capMesh.userData.atomNode = atom;
          atomGroup.add(capMesh);
        }

        // Selection highlight halo (hidden unless clicked)
        const selGeo = new THREE.TorusGeometry(style.radius * 1.32, 0.028, 10, 36);
        const selMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const selMesh = new THREE.Mesh(selGeo, selMat);
        selMesh.visible = false;
        atomGroup.add(selMesh);
        atomGroup.userData.selRing = selMesh;

        moleculeRoot.add(atomGroup);
        pickableAtoms.push(coreMesh);

        const dir = new THREE.Vector3(...atom.position);
        const hasDir = dir.lengthSq() > 1e-4;
        if (hasDir) {
          dir.normalize();
          explodableParts.push({
            group: atomGroup,
            basePos: new THREE.Vector3(...atom.position),
            dir,
            factor: 0.65,
          });
        }

        const anchorVec = computeAtomLabelAnchor(atom, style.radius);
        labelAnchors.push({
          id: `atom:${atom.id}`,
          kind: atom.isCentral ? 'atom-central' : 'atom-ligand',
          basePos: new THREE.Vector3(...anchorVec),
          explodeDir: hasDir ? dir.clone() : new THREE.Vector3(),
          explodeWeight: hasDir ? 0.65 : 0,
        });
      });

      // 2. Build composite Bonds (Cylinder(s) + Junction Collars)
      mol.bonds.forEach((bond) => {
        const a = atomMap.get(bond.from);
        const b = atomMap.get(bond.to);
        if (!a || !b) return;

        _vA.set(...a.position);
        _vB.set(...b.position);
        _vMid.copy(_vA).add(_vB).multiplyScalar(0.5);
        const dist = _vA.distanceTo(_vB);
        const dir = _vB.clone().sub(_vA).normalize();

        const bondGroup = new THREE.Group();
        bondGroup.position.copy(_vMid);
        _quat.setFromUnitVectors(_vUp, dir);
        bondGroup.quaternion.copy(_quat);

        const rA = ELEMENT_STYLES[a.element].radius * 0.72;
        const rB = ELEMENT_STYLES[b.element].radius * 0.72;
        const rodLen = Math.max(0.2, dist - (rA + rB) * 0.55);

        const offsets: number[] =
          bond.order === 1
            ? [0]
            : bond.order === 2
              ? [-0.085, 0.085]
              : [-0.11, 0, 0.11];

        const rodRadius = bond.order === 1 ? 0.075 : bond.order === 2 ? 0.048 : 0.038;

        offsets.forEach((ox) => {
          const cylGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLen, 16);
          const cylMesh = new THREE.Mesh(cylGeo, bondMat);
          cylMesh.position.x = ox;
          cylMesh.castShadow = !isSoftwareGl;
          bondGroup.add(cylMesh);
        });

        // Metallic junction collars
        const collarGeo = new THREE.CylinderGeometry(
          rodRadius * 1.45,
          rodRadius * 1.45,
          0.08,
          16,
        );
        const collarTop = new THREE.Mesh(collarGeo, collarMat);
        collarTop.position.y = rodLen * 0.34;
        const collarBot = new THREE.Mesh(collarGeo, collarMat);
        collarBot.position.y = -rodLen * 0.34;
        bondGroup.add(collarTop, collarBot);

        moleculeRoot.add(bondGroup);
      });

      // 3. Build Hybrid Orbital Lobes along bond directions from central atom(s)
      const centralAtoms = mol.atoms.filter((a) => a.isCentral);
      const lobeGeo = createTeardropGeometry(1.22, 0.34);
      const minorLobeGeo = createTeardropGeometry(0.42, 0.16);

      mol.bonds.forEach((bond) => {
        const a = atomMap.get(bond.from);
        const b = atomMap.get(bond.to);
        if (!a || !b) return;
        const center = a.isCentral ? a : b.isCentral ? b : null;
        const outer = center === a ? b : a;
        if (!center) return;

        _vA.set(...center.position);
        _vB.set(...outer.position);
        const dir = _vB.clone().sub(_vA).normalize();

        const lobeGroup = new THREE.Group();
        lobeGroup.position.copy(_vA);
        _quat.setFromUnitVectors(_vUp, dir);
        lobeGroup.quaternion.copy(_quat);

        const major = new THREE.Mesh(lobeGeo, orbitalMat);
        major.renderOrder = 2;
        lobeGroup.add(major);

        // Minor back lobe
        const minor = new THREE.Mesh(minorLobeGeo, orbitalMat);
        minor.rotation.x = Math.PI;
        minor.renderOrder = 2;
        lobeGroup.add(minor);

        orbitalsGroup.add(lobeGroup);
        explodableParts.push({
          group: lobeGroup,
          basePos: _vA.clone(),
          dir: dir.clone(),
          factor: 0.25,
        });
      });

      // 4. Build Lone Pair (LP) Electron Clouds with twin electron dots
      const lpGeo = createTeardropGeometry(1.38, 0.44);
      const eDotGeo = new THREE.SphereGeometry(0.065, 14, 12);

      mol.lonePairsVec.forEach((lp) => {
        const origin = atomMap.get(lp.originId) ?? centralAtoms[0];
        if (!origin) return;
        const dir = new THREE.Vector3(...lp.direction).normalize();
        const lpGroup = new THREE.Group();
        lpGroup.position.set(...origin.position);
        _quat.setFromUnitVectors(_vUp, dir);
        lpGroup.quaternion.copy(_quat);

        const lobeMesh = new THREE.Mesh(lpGeo, lonePairMat);
        lobeMesh.renderOrder = 3;
        lpGroup.add(lobeMesh);

        // Twin valence electron dots inside the lone pair lobe
        const e1 = new THREE.Mesh(eDotGeo, electronDotMat);
        e1.position.set(-0.11, 0.96, 0);
        const e2 = new THREE.Mesh(eDotGeo, electronDotMat);
        e2.position.set(0.11, 0.96, 0);
        lpGroup.add(e1, e2);

        lonePairsGroup.add(lpGroup);
        explodableParts.push({
          group: lpGroup,
          basePos: new THREE.Vector3(...origin.position),
          dir: dir.clone(),
          factor: 0.35,
        });

        labelAnchors.push({
          id: `lp:${lp.id}`,
          kind: 'lone-pair',
          basePos: new THREE.Vector3(...origin.position).addScaledVector(dir, 1.32),
          explodeDir: dir.clone(),
          explodeWeight: 0.35,
        });
      });

      // 5. Build 3D Bond Angle Arcs
      mol.angles.forEach((ang) => {
        const atomA = atomMap.get(ang.atomA);
        const vertex = atomMap.get(ang.vertex);
        const atomB = atomMap.get(ang.atomB);
        if (!atomA || !vertex || !atomB) return;

        const vPos = new THREE.Vector3(...vertex.position);
        const dirA = new THREE.Vector3(...atomA.position).sub(vPos).normalize();
        const dirB = new THREE.Vector3(...atomB.position).sub(vPos).normalize();

        const arcRadius = 0.88;
        const arcPoints: THREE.Vector3[] = [];
        const segments = 24;

        // Handle 180-degree collinear vectors safely
        const dot = THREE.MathUtils.clamp(dirA.dot(dirB), -1, 1);
        let axis = new THREE.Vector3().crossVectors(dirA, dirB);
        if (axis.lengthSq() < 1e-5) {
          axis.set(0, 0, 1);
          if (Math.abs(dirA.dot(axis)) > 0.95) axis.set(0, 1, 0);
          axis.crossVectors(dirA, axis).normalize();
        } else {
          axis.normalize();
        }
        const totalAngle = Math.acos(dot);

        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * totalAngle;
          const pt = dirA
            .clone()
            .applyAxisAngle(axis, theta)
            .multiplyScalar(arcRadius)
            .add(vPos);
          arcPoints.push(pt);
        }

        const curve = new THREE.CatmullRomCurve3(arcPoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.022, 8, false);
        const tubeMesh = new THREE.Mesh(tubeGeo, angleArcMat);
        anglesGroup.add(tubeMesh);

        const midIdx = Math.floor(arcPoints.length / 2);
        const labelPos = arcPoints[midIdx]
          .clone()
          .sub(vPos)
          .normalize()
          .multiplyScalar(arcRadius + 0.22)
          .add(vPos);

        labelAnchors.push({
          id: `angle:${ang.id}`,
          kind: 'angle',
          basePos: labelPos,
          explodeDir: new THREE.Vector3(),
          explodeWeight: 0,
        });
      });

      // 6. Build 3D Shape Outlines (dashed polyhedral wireframe + translucent geometry faces)
      const shapeData = computeMoleculeShapeGeometry(mol);
      const outlineEdges = shapeData.edges.filter((e) => e.kind === 'outline');
      const axisEdges = shapeData.edges.filter((e) => e.kind === 'axis');

      if (outlineEdges.length > 0) {
        const linePositions = new Float32Array(outlineEdges.length * 6);
        outlineEdges.forEach((edge, idx) => {
          linePositions[idx * 6 + 0] = edge.from[0];
          linePositions[idx * 6 + 1] = edge.from[1];
          linePositions[idx * 6 + 2] = edge.from[2];
          linePositions[idx * 6 + 3] = edge.to[0];
          linePositions[idx * 6 + 4] = edge.to[1];
          linePositions[idx * 6 + 5] = edge.to[2];
        });
        const outlineGeo = new THREE.BufferGeometry();
        outlineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        const outlineLines = new THREE.LineSegments(outlineGeo, shapeOutlineMat);
        outlineLines.computeLineDistances();
        outlineLines.renderOrder = 1;
        shapeGroup.add(outlineLines);
      }

      if (axisEdges.length > 0) {
        const axisPositions = new Float32Array(axisEdges.length * 6);
        axisEdges.forEach((edge, idx) => {
          axisPositions[idx * 6 + 0] = edge.from[0];
          axisPositions[idx * 6 + 1] = edge.from[1];
          axisPositions[idx * 6 + 2] = edge.from[2];
          axisPositions[idx * 6 + 3] = edge.to[0];
          axisPositions[idx * 6 + 4] = edge.to[1];
          axisPositions[idx * 6 + 5] = edge.to[2];
        });
        const axisGeo = new THREE.BufferGeometry();
        axisGeo.setAttribute('position', new THREE.BufferAttribute(axisPositions, 3));
        const axisLines = new THREE.LineSegments(axisGeo, shapeAxisMat);
        axisLines.computeLineDistances();
        axisLines.renderOrder = 1;
        shapeGroup.add(axisLines);
      }

      if (shapeData.faces.length > 0) {
        const facePositions = new Float32Array(shapeData.faces.length * 9);
        shapeData.faces.forEach((tri, idx) => {
          for (let v = 0; v < 3; v++) {
            facePositions[idx * 9 + v * 3 + 0] = tri[v][0];
            facePositions[idx * 9 + v * 3 + 1] = tri[v][1];
            facePositions[idx * 9 + v * 3 + 2] = tri[v][2];
          }
        });
        const faceGeo = new THREE.BufferGeometry();
        faceGeo.setAttribute('position', new THREE.BufferAttribute(facePositions, 3));
        faceGeo.computeVertexNormals();
        const faceMesh = new THREE.Mesh(faceGeo, shapeFaceMat);
        faceMesh.renderOrder = 1;
        shapeGroup.add(faceMesh);
      }

      // Reset explode state cleanly
      stateRef.current.explodeCurrent = stateRef.current.explodeTarget;
      applyExplode(stateRef.current.explodeCurrent);
      updateToggles();
    }

    function applyExplode(amount: number) {
      explodableParts.forEach((p) => {
        p.group.position.copy(p.basePos).addScaledVector(p.dir, amount * p.factor);
      });
      shapeGroup.scale.setScalar(1 + amount * 0.36);
    }

    function updateToggles() {
      orbitalsGroup.visible = stateRef.current.showOrbitals;
      lonePairsGroup.visible = stateRef.current.showLonePairs;
      shapeGroup.visible = stateRef.current.showShapeOutline;
      anglesGroup.visible = stateRef.current.showAngles;
    }

    function projectAllLabels() {
      if (labelAnchors.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const explodeAmount = stateRef.current.explodeCurrent;
      moleculeRoot.updateMatrixWorld(true);

      for (const anchor of labelAnchors) {
        const el = labelDomRefs.current.get(anchor.id);
        if (!el) continue;

        _proj
          .copy(anchor.basePos)
          .addScaledVector(anchor.explodeDir, explodeAmount * anchor.explodeWeight)
          .applyMatrix4(moleculeRoot.matrixWorld)
          .project(camera);

        const visible = _proj.z > -1 && _proj.z < 1;
        if (!visible) {
          el.style.opacity = '0';
          continue;
        }

        const px = ((_proj.x + 1) / 2) * rect.width;
        const py = ((-_proj.y + 1) / 2) * rect.height;
        el.style.opacity = '1';
        el.style.transform = `translate(-50%, -50%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      }
    }

    // Coalesced On-Demand Render Loop with Software WebGL afterDraw() pacing
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        let needsFollowUp = false;

        // Smooth time-based molecular rotation
        if (stateRef.current.autoRotate) {
          moleculeRoot.rotation.y += dt * 0.55;
          needsFollowUp = true;
        }

        // Smooth exponential damping on explode slider
        if (Math.abs(stateRef.current.explodeCurrent - stateRef.current.explodeTarget) > 0.002) {
          stateRef.current.explodeCurrent = THREE.MathUtils.damp(
            stateRef.current.explodeCurrent,
            stateRef.current.explodeTarget,
            10,
            dt,
          );
          applyExplode(stateRef.current.explodeCurrent);
          needsFollowUp = true;
        }

        // Smooth exponential damping on camera presets
        if (camTargetPos) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, camTargetPos.x, 8, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, camTargetPos.y, 8, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, camTargetPos.z, 8, dt);
          if (camera.position.distanceTo(camTargetPos) < 0.02) {
            camera.position.copy(camTargetPos);
            camTargetPos = null;
          } else {
            needsFollowUp = true;
          }
        }

        if (pendingWidth > 0 && pendingHeight > 0 && (pendingWidth !== currentWidth || pendingHeight !== currentHeight)) {
          currentWidth = pendingWidth;
          currentHeight = pendingHeight;
          camera.aspect = currentWidth / currentHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(currentWidth, currentHeight);
        }

        controls.update();
        renderer.render(scene, camera);
        projectAllLabels();

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsFollowUp) {
            requestRender();
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    }

    controls.addEventListener('change', requestRender);

    // Raycasting for atom click inspection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6) return; // Ignore orbit drags

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(pickableAtoms, false);
      if (selectedAtomRing) {
        selectedAtomRing.visible = false;
        selectedAtomRing = null;
      }

      if (hits.length > 0) {
        const hitMesh = hits[0].object;
        const atomNode = hitMesh.userData.atomNode as AtomNode | undefined;
        const parentGroup = hitMesh.parent;
        if (parentGroup?.userData.selRing) {
          selectedAtomRing = parentGroup.userData.selRing as THREE.Mesh;
          selectedAtomRing.visible = true;
        }
        setAtomCallbackRef.current(atomNode ?? null);
      } else {
        setAtomCallbackRef.current(null);
      }
      requestRender();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    let currentWidth = width;
    let currentHeight = height;
    let pendingWidth = width;
    let pendingHeight = height;

    // ResizeObserver for responsive viewport (defer setSize until render frame to prevent blank buffer flashes)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.round(entry.contentRect.width), 200);
        const h = Math.max(Math.round(entry.contentRect.height), 200);
        if (w !== pendingWidth || h !== pendingHeight) {
          pendingWidth = w;
          pendingHeight = h;
          requestRender();
        }
      }
    });
    resizeObserver.observe(container);

    // Build initial molecule & pre-warm shaders on GPU
    buildMolecule(stateRef.current.molecule);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    engineRef.current = {
      rebuildMolecule: (mol: MoleculeSpec) => {
        moleculeRoot.rotation.y = 0;
        buildMolecule(mol);
        const [mx, my, mz] = mol.defaultCamera;
        camTargetPos = new THREE.Vector3(mx * 1.38, my * 1.32, mz * 1.38);
        controls.target.set(0, -0.22, 0);
        requestRender();
      },
      updateToggles: () => {
        updateToggles();
        requestRender();
      },
      animateToCamera: (pos: [number, number, number]) => {
        camTargetPos = new THREE.Vector3(...pos);
        controls.target.set(0, -0.22, 0);
        requestRender();
      },
      requestRender,
    };

    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      disposeObject3D(scene);
      envRT.dispose();
      collarMat.dispose();
      bondMat.dispose();
      orbitalMat.dispose();
      lonePairMat.dispose();
      electronDotMat.dispose();
      angleArcMat.dispose();
      shapeOutlineMat.dispose();
      shapeAxisMat.dispose();
      shapeFaceMat.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
      engineRef.current = null;
    };
  }, []);

  // Sync molecule changes without tearing down WebGLRenderer
  useEffect(() => {
    setSelectedAtom(null);
    engineRef.current?.rebuildMolecule(molecule);
  }, [molecule]);

  // Sync visual toggles & explode factor
  useEffect(() => {
    engineRef.current?.updateToggles();
  }, [showOrbitals, showLonePairs, showShapeOutline, showAngles, showLabels]);

  useEffect(() => {
    engineRef.current?.requestRender();
  }, [explodeFactor, autoRotate]);

  const handleCameraPreset = (preset: CameraPreset) => {
    if (!engineRef.current) return;
    if (preset === 'default') {
      const [mx, my, mz] = molecule.defaultCamera;
      engineRef.current.animateToCamera([mx * 1.38, my * 1.32, mz * 1.38]);
    } else if (preset === 'top') {
      engineRef.current.animateToCamera([0.01, 6.4, 0.45]);
    } else {
      engineRef.current.animateToCamera([6.3, 0.5, 0.5]);
    }
  };

  return (
    <div
      className="relative w-full h-full min-h-[420px] bg-[#0b1220] rounded-xl overflow-hidden border border-slate-800 select-none"
      data-testid="molecule-canvas-stage"
      data-molecule={molecule.id}
    >
      {/* Dedicated WebGL mount container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Projected 3D Labels (Atoms, Lone Pairs, Bond Angles) — positioned directly via refs for zero re-render overhead */}
      {labelItems.map((lbl) => {
        const badgeStyle =
          lbl.kind === 'angle'
            ? 'px-2 py-0.5 rounded bg-slate-900/92 border border-sky-400/60 text-sky-200 text-xs font-mono font-medium tabular-nums shadow-sm'
            : lbl.kind === 'lone-pair'
              ? 'px-1.5 py-0.5 rounded bg-amber-950/92 border border-amber-400/65 text-amber-200 text-[11px] font-mono font-semibold shadow-sm'
              : lbl.kind === 'atom-central'
                ? 'px-1.5 py-0.5 rounded bg-slate-950/95 border border-slate-300/80 text-white text-xs font-mono font-bold shadow-sm'
                : 'px-1.5 py-0.5 rounded bg-slate-900/92 border border-slate-500/75 text-slate-100 text-[11px] font-mono font-semibold shadow-sm';

        return (
          <div
            key={lbl.id}
            ref={(el) => {
              if (el) {
                labelDomRefs.current.set(lbl.id, el);
              } else {
                labelDomRefs.current.delete(lbl.id);
              }
            }}
            data-label-kind={lbl.kind}
            style={{ opacity: 0 }}
            className={`pointer-events-none absolute top-0 left-0 whitespace-nowrap ${badgeStyle}`}
          >
            {lbl.text}
          </div>
        );
      })}

      {/* Top-Left Minimal Spec Readout (unobtrusive, no pill spam) */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 flex items-start justify-between gap-4">
        <div className="pointer-events-auto bg-slate-900/92 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-slate-100 max-w-md">
          <div className="flex items-baseline gap-2.5">
            <span className="text-lg font-bold font-display tracking-tight text-white">
              {molecule.formula}
            </span>
            <span className="text-sm font-medium text-slate-300">
              {molecule.name}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300 tabular-nums">
            <span className="font-mono text-sky-300 font-medium">
              {formatHybridizationLabel(molecule.hybridization)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{molecule.molecularShape}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-amber-300">{molecule.angleSummary}</span>
          </div>
          {selectedAtom && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-700/80 text-xs text-sky-200 flex items-center justify-between gap-3">
              <span>
                Atom: <strong className="text-white">{ELEMENT_STYLES[selectedAtom.element].name} ({selectedAtom.element})</strong>
                {selectedAtom.role ? ` — ${selectedAtom.role}` : ''}
              </span>
              <button
                type="button"
                onClick={() => setSelectedAtom(null)}
                className="text-slate-400 hover:text-white underline cursor-pointer"
                aria-label="Clear atom selection"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Color & Outline legend (clean unboxed text rows) */}
        <div className="hidden sm:flex flex-col gap-1 bg-slate-900/92 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-400/70 border border-sky-300" />
            <span>Hybrid Orbital (σ)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/80 border border-amber-300" />
            <span>Lone Pair (LP e⁻)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-0 border-t-2 border-dashed border-indigo-300" />
            <span>Shape: {shapeGeom.shapeLabel}</span>
          </div>
        </div>
      </div>

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-slate-200">
          <p className="text-base font-semibold">3D graphics context was paused by the browser.</p>
          <p className="mt-1 text-sm text-slate-400">
            Reload or select another molecule to re-initialize the WebGL viewport.
          </p>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (no backdrop-filter over WebGL) */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center z-10"
        style={{ maxWidth: 'min(920px, 96%)' }}
      >
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          aria-expanded={!dockCollapsed}
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-900/95 border border-b-0 border-slate-700 text-xs font-medium text-slate-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>

        {!dockCollapsed && (
          <div className="w-full bg-slate-900/95 border border-slate-700 rounded-xl px-3.5 py-2 flex flex-col gap-2 text-xs text-slate-200 shadow-lg">
            {/* Layer visibility toggles */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-slate-400 mr-0.5 flex items-center gap-1 whitespace-nowrap">
                <Eye className="w-3.5 h-3.5" />
                Layers:
              </span>
              <button
                type="button"
                onClick={() => setShowOrbitals((v) => !v)}
                aria-pressed={showOrbitals}
                className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showOrbitals
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Orbitals
              </button>
              <button
                type="button"
                onClick={() => setShowLonePairs((v) => !v)}
                aria-pressed={showLonePairs}
                className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showLonePairs
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Lone Pairs ({molecule.lonePairs})
              </button>
              <button
                type="button"
                onClick={() => setShowShapeOutline((v) => !v)}
                aria-pressed={showShapeOutline}
                className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showShapeOutline
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Shape Outline
              </button>
              <button
                type="button"
                onClick={() => setShowAngles((v) => !v)}
                aria-pressed={showAngles}
                className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showAngles
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Angles
              </button>
              <button
                type="button"
                onClick={() => setShowLabels((v) => !v)}
                aria-pressed={showLabels}
                className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showLabels
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Labels
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-1 border-t border-slate-800/90">
              {/* Orbital / Bond Separation Slider */}
              <div className="flex items-center gap-2">
                <label htmlFor="explode-slider" className="text-slate-300 whitespace-nowrap">
                  Expand: <span className="font-mono tabular-nums text-sky-300">{Math.round(explodeFactor * 100)}%</span>
                </label>
                <input
                  id="explode-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodeFactor}
                  onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
                  className="lab-slider w-24"
                />
              </div>

              {/* Camera Views & Auto-Rotate */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoRotate((r) => !r)}
                  aria-pressed={autoRotate}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    autoRotate
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{autoRotate ? 'Rotating' : 'Paused'}</span>
                </button>
                <span className="text-slate-600" aria-hidden="true">|</span>
                <span className="text-slate-400 mr-0.5 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" />
                  View:
                </span>
                <button
                  type="button"
                  onClick={() => handleCameraPreset('top')}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Axial Top
                </button>
                <button
                  type="button"
                  onClick={() => handleCameraPreset('side')}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Side
                </button>
                <button
                  type="button"
                  onClick={() => handleCameraPreset('default')}
                  aria-label="Reset camera view"
                  className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
