import * as THREE from 'three';
import { FORWARD } from './flight';

export function guideRotation(player: THREE.Vector3, target: THREE.Vector3, camera: THREE.Quaternion, ship: THREE.Quaternion, padlock: boolean) {
  const inverse = camera.clone().invert();
  if (padlock) return inverse.multiply(ship);
  const direction = target.clone().sub(player).normalize().applyQuaternion(inverse);
  return new THREE.Quaternion().setFromUnitVectors(FORWARD, direction.lengthSq() ? direction : FORWARD);
}

/** A lit 3D mesh rendered into a small HUD viewport, not a rotated 2D icon. */
export class GuideRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
  private arrow = new THREE.Group();
  private material = new THREE.MeshStandardMaterial({ color: 0xbaff80, roughness: 0.35, metalness: 0.25, flatShading: true });
  private size = new THREE.Vector2();

  constructor() {
    this.camera.position.set(0, 0, 6.3);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.AmbientLight(0x9bbed3, 1.4));
    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(-3, 5, 6);
    this.scene.add(light);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.7, 6), this.material);
    shaft.rotation.x = -Math.PI / 2;
    shaft.position.z = 0.15;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.05, 4), this.material);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -1.05;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.65), this.material);
    fin.position.z = 0.85;
    const bankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.65), new THREE.MeshBasicMaterial({ color: 0xf1f6ee }));
    bankStripe.position.set(-0.45, 0.02, 0.85);
    this.arrow.add(shaft, head, fin, bankStripe);
    this.scene.add(this.arrow);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.012, 4, 40), new THREE.MeshBasicMaterial({ color: 0x65888b, transparent: true, opacity: 0.55 }));
    this.scene.add(ring);
  }

  render(renderer: THREE.WebGLRenderer, bounds: DOMRect, rotation: THREE.Quaternion, color: string) {
    const size = this.size;
    renderer.getSize(size);
    const x = bounds.left / innerWidth * size.x;
    const y = (innerHeight - bounds.bottom) / innerHeight * size.y;
    const width = bounds.width / innerWidth * size.x, height = bounds.height / innerHeight * size.y;
    if (width <= 0 || height <= 0) return;
    this.arrow.quaternion.copy(rotation);
    this.material.color.setStyle(color);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.setScissor(x, y, width, height);
    renderer.setScissorTest(true);
    renderer.setViewport(x, y, width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.autoClear = true;
  }
}
