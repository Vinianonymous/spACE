import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { FORWARD } from './flight';

/** The boom orbits the player, never translates the player out of the framing. */
export class CameraRig {
  private orbit = new Quaternion();

  update(camera: PerspectiveCamera, player: Vector3, rotation: Quaternion, target: Vector3 | undefined, dt: number) {
    let desired = rotation;
    if (target && target.distanceToSquared(player) > 1) {
      const direction = target.clone().sub(player).normalize();
      // Stabilize the target-facing view so the ship's bank remains visible.
      let up = new Vector3(0, 1, 0);
      if (Math.abs(up.dot(direction)) > 0.98) up = new Vector3(0, 0, 1);
      desired = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(new Vector3(), direction, up));
    }
    if (dt === 0) this.orbit.copy(desired);
    else this.orbit.slerp(desired, 1 - Math.exp(-dt * 7));
    const up = new Vector3(0, 1, 0).applyQuaternion(this.orbit);
    const forward = FORWARD.clone().applyQuaternion(this.orbit);
    camera.position.copy(player).add(new Vector3(0, 11, 43).applyQuaternion(this.orbit));
    camera.up.copy(up);
    camera.lookAt(player.clone().addScaledVector(forward, 90).addScaledVector(up, 4));
    camera.updateMatrixWorld();
  }
}
