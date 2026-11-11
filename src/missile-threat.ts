import { MathUtils, Quaternion, Vector3 } from 'three';

export interface MissileThreat { distance: number; bearing: number; beepInterval: number }

/** Bearing is ship-relative: zero straight ahead, positive toward starboard. */
export function missileThreat(position: Vector3, rotation: Quaternion, missile: Vector3): MissileThreat {
  const relative = missile.clone().sub(position);
  const distance = relative.length();
  relative.applyQuaternion(rotation.clone().invert());
  return {
    distance,
    bearing: MathUtils.radToDeg(Math.atan2(relative.x, -relative.z)),
    beepInterval: MathUtils.clamp(distance / 900, 0.15, 1.2),
  };
}
