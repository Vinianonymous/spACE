import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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

export function createShip(enemy = false) {
  const ship = new THREE.Group();
  const shell = enemy ? new THREE.MeshStandardMaterial({ color: 0x934f3c, roughness: 0.85, flatShading: true }) : metal;
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
