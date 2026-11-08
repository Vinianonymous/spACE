import { MathUtils, Quaternion, Vector3 } from 'three';

/** Flight-relative guidance stays meaningful even while the camera is padlocked. */
export function targetGuide(position: Vector3, rotation: Quaternion, target: Vector3) {
  const offset = target.clone().sub(position);
  const distance = offset.length();
  const local = offset.applyQuaternion(rotation.clone().invert());
  const behind = local.z > 0;
  const aligned = !behind && Math.hypot(local.x, local.y) < Math.abs(local.z) * 0.07;
  const angle = aligned ? 0 : Math.hypot(local.x, local.y) < 0.001 ? 180 : MathUtils.radToDeg(Math.atan2(local.x, local.y));
  const proximity = MathUtils.clamp((distance - 350) / 1250, 0, 1);
  // Green at <=350m, amber midrange, red at >=1600m. Text also conveys distance.
  const hue = Math.round(MathUtils.lerp(100, 6, proximity));
  return { distance, angle, behind, aligned, color: `hsl(${hue}, 85%, 70%)` };
}
