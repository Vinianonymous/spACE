import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipId } from './catalog';
import type { Faction, TargetKind } from './campaign';

const metal = new THREE.MeshStandardMaterial({ color: 0xb4c4c6, roughness: 0.7, metalness: 0.5, flatShading: true });
const dark = new THREE.MeshStandardMaterial({ color: 0x263843, roughness: 0.8, metalness: 0.6, flatShading: true });
const glass = new THREE.MeshStandardMaterial({ color: 0x091c27, emissive: 0x143f4f, roughness: 0.2, metalness: 0.8 });
const engine = new THREE.MeshBasicMaterial({ color: 0xbaff80 });

function box(parent: THREE.Group, size: number[], position: number[], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material);
  mesh.position.set(...position as [number, number, number]);
  parent.add(mesh);
  return mesh;
}

export function createShip(enemy = false, variant: ShipId = 'kestrel') {
  const ship = new THREE.Group();
  const colors = { kestrel: 0xb4c4c6, viper: 0x8bb0bd, bastion: 0xa9a18b, specter: 0x777c9c, peregrine: 0x91b5a2, paladin: 0xdbceb6 };
  const shell = enemy ? new THREE.MeshStandardMaterial({ color: 0x934f3c, roughness: 0.85, flatShading: true }) : variant === 'kestrel' ? metal : new THREE.MeshStandardMaterial({ color: colors[variant], roughness: 0.7, metalness: 0.5, flatShading: true });
  box(ship, [2.8, 1.6, 8], [0, 0, 0], shell);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.55, 5, 4), shell);
  nose.rotation.x = -Math.PI / 2;
  nose.rotation.z = Math.PI / 4;
  nose.position.z = -6;
  ship.add(nose);
  box(ship, [1.65, 1.1, 3], [0, 1.15, -1.1], glass);
  for (const side of [-1, 1]) {
    const wing = box(ship, [7.3, 0.45, 3.5], [side * 4.1, -0.2, 1.7], shell);
    wing.rotation.y = side * -0.28;
    box(ship, [1.5, 1.7, 5.7], [side * 3.2, 0, 3], dark);
    box(ship, [0.35, 0.8, 5], [side * 7, 0.3, 1.2], dark);
    box(ship, [0.8, 0.3, 1.5], [side * 6.6, 0.6, -0.5], engine);
    const fin = box(ship, [0.25, 2.8, 2.8], [side * 3.1, 1.7, 3.5], shell);
    fin.rotation.z = side * -0.3;
    const glow = box(ship, [1.1, 1.1, 0.25], [side * 3.2, 0, 5.9], engine);
    glow.name = 'engine';
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 5, 5), new THREE.MeshBasicMaterial({ color: enemy ? 0xff7755 : 0x9bffbb, transparent: true, opacity: 0.6 }));
    flame.rotation.x = Math.PI / 2;
    flame.position.set(side * 3.2, 0, 7.8);
    flame.name = 'flame';
    ship.add(flame);
  }
  if (!enemy) {
    if (variant === 'viper') {
      for (const child of ship.children) { child.position.x *= 0.72; child.position.z *= 1.2; }
      box(ship, [0.5, 2.5, 5], [0, 2, 3], shell);
    } else if (variant === 'bastion') {
      box(ship, [6, 2.6, 9], [0, -0.6, 0], shell);
      for (const side of [-1, 1]) { box(ship, [3.4, 2.7, 7], [side * 6, -0.6, 2], dark); box(ship, [1, 1, 8], [side * 6, 0, -3], shell); }
    } else if (variant === 'specter') {
      for (const side of [-1, 1]) { box(ship, [1.2, 0.7, 12], [side * 5.5, 0.6, -1], shell); box(ship, [3.8, 0.25, 2], [side * 3.7, -0.1, -4], dark); }
    } else if (variant === 'peregrine') {
      for (const side of [-1, 1]) { const blade = box(ship, [7, 0.3, 2.5], [side * 6, 1.4, 1], shell); blade.rotation.y = side * 0.55; blade.rotation.z = side * 0.2; }
    } else if (variant === 'paladin') {
      for (const side of [-1, 1]) { box(ship, [5.5, 0.45, 2], [side * 3.3, 0.2, -4], shell); box(ship, [1.7, 1.2, 4], [side * 7, 0.3, 3], dark); }
      box(ship, [2, 1.2, 4], [0, -1.1, 3], shell);
    }
  }
  ship.name = enemy ? 'trusan' : variant;
  // Batch static pieces by material: keep the silhouette without a draw call per panel.
  // Engine flames remain separate because the simulation animates their scale.
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const child of [...ship.children]) {
    if (!(child instanceof THREE.Mesh) || child.name === 'flame' || Array.isArray(child.material)) continue;
    child.updateMatrix();
    const transformed = child.geometry.clone().applyMatrix4(child.matrix);
    const batch = batches.get(child.material) || [];
    batch.push(transformed);
    batches.set(child.material, batch);
    ship.remove(child);
    child.geometry.dispose();
  }
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    if (!merged) throw new Error('Ship geometry batching failed');
    ship.add(new THREE.Mesh(merged, material));
    for (const geometry of geometries) geometry.dispose();
  }
  return ship;
}

const aiMetal = new THREE.MeshStandardMaterial({ color: 0x495468, emissive: 0x09243a, metalness: 0.7, roughness: 0.5, flatShading: true });
const aiGlow = new THREE.MeshBasicMaterial({ color: 0x88cfff });
const vextra = new THREE.MeshStandardMaterial({ color: 0xbaff80, emissive: 0x497b29, roughness: 0.4, flatShading: true });
const pirateMetal = new THREE.MeshStandardMaterial({ color: 0x8d5140, roughness: 0.9, flatShading: true });

export function createCommandVessel() {
  const group = new THREE.Group();
  box(group, [115, 32, 270], [0, 0, 0], aiMetal);
  box(group, [48, 65, 160], [0, 15, -10], dark);
  for (const side of [-1, 1]) {
    const wing = box(group, [100, 10, 150], [side * 100, -5, 20], aiMetal);
    wing.rotation.y = side * 0.4;
    box(group, [10, 18, 190], [side * 75, 6, 10], aiGlow);
    box(group, [38, 36, 40], [side * 90, 0, 145], dark);
    box(group, [28, 25, 4], [side * 90, 0, 166], aiGlow);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(145, 3, 6, 40), aiGlow);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

export function createActor(faction: Faction, kind: TargetKind) {
  if (kind === 'boss') { const vessel = createCommandVessel(); vessel.scale.setScalar(0.45); return vessel; }
  if (faction === 'trusan' && (kind === 'fighter' || kind === 'heavy')) return createShip(true);
  const group = new THREE.Group();
  if (kind === 'fighter' || kind === 'heavy') {
    group.add(new THREE.Mesh(new THREE.OctahedronGeometry(kind === 'heavy' ? 4 : 2.8), aiMetal));
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const fin = box(group, [7, 0.4, 3.5], [Math.cos(angle) * 4, Math.sin(angle) * 4, 0], aiMetal);
      fin.rotation.z = angle;
    }
    box(group, [1.2, 1.2, 11], [0, 0, 0], aiGlow);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(kind === 'heavy' ? 6 : 4, 0.18, 4, 12), aiGlow);
    group.add(ring);
  } else if (kind === 'turret') {
    box(group, [35, 10, 35], [0, -7, 0], pirateMetal);
    box(group, [15, 14, 18], [0, 4, 0], dark);
    box(group, [5, 5, 32], [0, 7, -18], pirateMetal);
  } else if (kind === 'cache') {
    box(group, [36, 24, 28], [0, 0, 0], pirateMetal);
    for (const side of [-1, 1]) box(group, [3, 26, 30], [side * 11, 0, 0], vextra);
  } else {
    group.add(new THREE.Mesh(new THREE.OctahedronGeometry(kind === 'core' ? 23 : 14), faction === 'naurae' ? aiGlow : vextra));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(kind === 'core' ? 32 : 22, 2, 6, 16), faction === 'naurae' ? aiMetal : pirateMetal);
    ring.rotation.x = kind === 'engine' ? 0 : Math.PI / 2;
    group.add(ring);
  }
  return group;
}

export function createObjective(kind: 'convoy' | 'beacon' | 'depot' | 'extraction') {
  const group = new THREE.Group();
  if (kind === 'convoy') {
    box(group, [18, 14, 85], [0, 0, 0], metal);
    for (const side of [-1, 1]) {
      box(group, [18, 18, 55], [side * 20, 0, 7], dark);
      box(group, [13, 13, 3], [side * 20, 0, 36], engine);
      box(group, [22, 3, 40], [side * 20, 10, 0], vextra);
    }
  } else if (kind === 'beacon') {
    group.add(new THREE.Mesh(new THREE.OctahedronGeometry(35), vextra));
    const perimeter = new THREE.Mesh(new THREE.TorusGeometry(650, 1.5, 4, 80), new THREE.MeshBasicMaterial({ color: 0x6bafc3, transparent: true, opacity: 0.45 }));
    perimeter.rotation.x = Math.PI / 2; group.add(perimeter);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(65, 2, 4, 24), aiGlow); group.add(ring);
  } else {
    const material = kind === 'depot' ? pirateMetal : metal;
    box(group, [240, 35, 140], [0, -25, 0], material);
    box(group, [60, 100, 65], [0, 20, 0], dark);
    for (const side of [-1, 1]) {
      box(group, [130, 6, 90], [side * 190, -10, 0], kind === 'depot' ? dark : glass);
      box(group, [10, 40, 10], [side * 110, 0, 30], vextra);
    }
  }
  return group;
}

function random(seed: number) {
  let state = seed;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

export function createWorld(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x060d16);
  scene.fog = new THREE.FogExp2(0x0b1721, 0.000055);
  scene.add(new THREE.AmbientLight(0x9cbed4, 1.7));
  const sun = new THREE.DirectionalLight(0xffd6b0, 3.8);
  sun.position.set(-700, 800, -500);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x84bdcf, 2.2);
  rim.position.set(500, 0, 500);
  scene.add(rim);

  const rng = random(2256);
  const stars = new Float32Array(4500 * 3);
  for (let i = 0; i < stars.length; i += 3) {
    const direction = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize().multiplyScalar(17000);
    stars.set(direction.toArray(), i);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbdd5dc, size: 13, sizeAttenuation: true, fog: false })));

  // Procedural color bands: no external texture downloads or asset licensing dependencies.
  const planetGeometry = new THREE.IcosahedronGeometry(3700, 5);
  const colors: number[] = [];
  const vertices = planetGeometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const band = Math.sin(y * 0.004 + Math.sin(x * 0.002) + Math.cos(z * 0.003)) * 0.5 + 0.5;
    const color = new THREE.Color().lerpColors(new THREE.Color(0x462c29), new THREE.Color(0xa16d4c), band);
    colors.push(color.r, color.g, color.b);
  }
  planetGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const planet = new THREE.Mesh(planetGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  planet.position.set(5200, -3000, -8500);
  scene.add(planet);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(3750, 48, 32), new THREE.MeshBasicMaterial({ color: 0xb37c53, transparent: true, opacity: 0.055, side: THREE.BackSide, depthWrite: false }));
  atmosphere.position.copy(planet.position);
  scene.add(atmosphere);

  const asteroidGeometry = new THREE.IcosahedronGeometry(1, 0);
  const asteroidMaterial = new THREE.MeshStandardMaterial({ color: 0x536066, roughness: 1, flatShading: true });
  const asteroids = new THREE.InstancedMesh(asteroidGeometry, asteroidMaterial, 160);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 160; i++) {
    dummy.position.set((rng() - 0.5) * 7000, (rng() - 0.5) * 2600 - 350, (rng() - 0.5) * 7000 - 1200);
    // Keep the initial tutorial firing corridor unobstructed.
    if (Math.abs(dummy.position.x) < 180) dummy.position.x += 400;
    dummy.rotation.set(rng() * 6, rng() * 6, rng() * 6);
    const size = 7 + rng() * 65;
    dummy.scale.set(size, size * (0.6 + rng()), size * (0.6 + rng()));
    dummy.updateMatrix();
    asteroids.setMatrixAt(i, dummy.matrix);
  }
  scene.add(asteroids);

  const station = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(230, 9, 6, 48), dark);
  station.add(ring);
  box(station, [620, 12, 16], [0, 0, 0], metal);
  box(station, [50, 170, 50], [0, 0, 0], dark);
  for (const side of [-1, 1]) {
    box(station, [110, 150, 5], [side * 370, 0, 0], new THREE.MeshStandardMaterial({ color: 0x284d5b, metalness: 0.7, roughness: 0.4 }));
    box(station, [8, 18, 8], [side * 230, 0, 0], engine);
  }
  station.position.set(-1100, 400, -2400);
  station.rotation.set(0.15, 0.4, -0.3);
  scene.add(station);
  return { planet, station };
}
