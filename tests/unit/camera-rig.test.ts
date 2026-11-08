import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { CameraRig } from '../../src/camera-rig';
import { guideRotation } from '../../src/guide-renderer';
import { FORWARD } from '../../src/flight';

describe('player-centered padlock orbit', () => {
  it('keeps the player in frame throughout a 180-degree target transition', () => {
    const rig = new CameraRig();
    const camera = new PerspectiveCamera(65, 16 / 9, 0.5, 30000);
    const player = new Vector3(100, 20, 30);
    rig.update(camera, player, new Quaternion(), undefined, 0);
    for (const target of [new Vector3(100, 20, 1300), new Vector3(-800, 900, 30), new Vector3(100, -1500, 30)]) {
      for (let i = 0; i < 100; i++) {
        rig.update(camera, player, new Quaternion(), target, 1 / 60);
        const projected = player.clone().project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(0.1);
        expect(Math.abs(projected.y)).toBeLessThan(0.6);
        expect(projected.z).toBeLessThan(1);
        expect(camera.position.distanceTo(player)).toBeGreaterThan(40);
      }
      expect(target.clone().project(camera).z).toBeLessThan(1);
    }
  });

  it('returns smoothly to chase orientation on release', () => {
    const rig = new CameraRig();
    const camera = new PerspectiveCamera();
    rig.update(camera, new Vector3(), new Quaternion(), new Vector3(1000, 0, 0), 0);
    for (let i = 0; i < 120; i++) rig.update(camera, new Vector3(), new Quaternion(), undefined, 1 / 60);
    expect(camera.position.x).toBeCloseTo(0, 2);
    expect(camera.position.z).toBeCloseTo(43, 2);
  });
});

describe('3D target/attitude arrow', () => {
  it('expresses the target direction in camera coordinates normally', () => {
    const camera = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    const target = new Vector3(-100, 0, 0);
    const rotation = guideRotation(new Vector3(), target, camera, new Quaternion(), false);
    expect(FORWARD.clone().applyQuaternion(rotation).distanceTo(FORWARD)).toBeLessThan(0.0001);
  });

  it('shows full ship orientation including bank relative to the target-facing camera in padlock', () => {
    const camera = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.9);
    const ship = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.6);
    const rotation = guideRotation(new Vector3(), new Vector3(0, 0, -100), camera, ship, true);
    expect(rotation.angleTo(camera.clone().invert().multiply(ship))).toBeLessThan(0.0001);
  });
});
