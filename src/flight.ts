import { MathUtils, Quaternion, Vector3 } from 'three';

export const FORWARD = new Vector3(0, 0, -1);
export const MAX_LOCK_RANGE = 1600;
export const LOCK_SECONDS = 1.2;
export const LOCK_CONE = Math.cos(MathUtils.degToRad(18));

export interface FlightInput {
  pitch: number;
  yaw: number;
  roll: number;
  throttle: number;
  boost: boolean;
}

export class Flight {
  position = new Vector3(0, 0, 180);
  rotation = new Quaternion();
  throttle = 0.45;
  speed = 80;
  boost = 100;
  boosting = false;

  update(input: FlightInput, dt: number) {
    this.throttle = MathUtils.clamp(this.throttle + input.throttle * dt * 0.35, 0, 1);
    this.boosting = input.boost && this.boost > 2;
    this.boost = MathUtils.clamp(this.boost + (this.boosting ? -26 : 14) * dt, 0, 100);
    const targetSpeed = this.boosting ? 260 : MathUtils.lerp(40, 150, this.throttle);
    this.speed = MathUtils.damp(this.speed, targetSpeed, 2, dt);
    // Local-axis rotation keeps pitch and yaw consistent after rolling.
    const delta = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -input.yaw * dt * 0.85);
    delta.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), input.pitch * dt * 0.85));
    delta.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -input.roll * dt * 1.65));
    this.rotation.multiply(delta).normalize();
    this.position.addScaledVector(FORWARD.clone().applyQuaternion(this.rotation), this.speed * dt);
    if (this.position.length() > 5500) {
      // A soft, safe course correction rather than an invisible kill boundary.
      const inward = new Quaternion().setFromUnitVectors(FORWARD, this.position.clone().negate().normalize());
      this.rotation.slerp(inward, 1 - Math.exp(-dt * 2));
    }
  }
}

export function canLock(position: Vector3, rotation: Quaternion, target: Vector3) {
  const offset = target.clone().sub(position);
  const distance = offset.length();
  return distance > 0 && distance <= MAX_LOCK_RANGE &&
    FORWARD.clone().applyQuaternion(rotation).dot(offset.normalize()) >= LOCK_CONE;
}

export function lockProgress(progress: number, eligible: boolean, dt: number) {
  return eligible ? Math.min(1, progress + dt / LOCK_SECONDS) : 0;
}

// Swept collision avoids fast projectiles tunneling through small ships.
export function segmentHitsSphere(start: Vector3, end: Vector3, center: Vector3, radius: number) {
  const segment = end.clone().sub(start);
  const t = MathUtils.clamp(center.clone().sub(start).dot(segment) / (segment.lengthSq() || 1), 0, 1);
  return start.clone().addScaledVector(segment, t).distanceToSquared(center) <= radius * radius;
}
