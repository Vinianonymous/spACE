export type MissionStage = 'flight' | 'cannon' | 'missile' | 'defense' | 'focus' | 'raid' | 'complete';
export const LESSONS: Record<MissionStage, { objective: string; speaker: string; line: string }> = {
  flight: { objective: 'Flight check: pitch and yaw, roll with Q/E, then hold Shift to boost.', speaker: 'TETRAGON 01 · COMMAND', line: 'Lion, form up. Show me pitch, yaw, roll, and a short boost. Mars is behind us; keep it that way.' },
  cannon: { objective: 'Destroy the first moving drone with the pulse cannon. Hold Space / left click.', speaker: 'TETRAGON 03 · STRIKE', line: 'Put your flight reticle on that drone. Pulse cannon is live. Watch your heat; this is not a mining laser.' },
  missile: { objective: 'Hold the next drone in front until lock turns green. Press M / right click.', speaker: 'TETRAGON 02 · TACTICAL', line: 'Green brackets confirm lock. Launch a guided missile. Twenty-four rounds per sortie; make them count.' },
  defense: { objective: 'Incoming practice missile. Press X to deploy countermeasures.', speaker: 'TETRAGON 02 · TACTICAL', line: 'Practice missile inbound. Press X for countermeasures. Your shields recharge after five seconds without damage.' },
  focus: { objective: 'Activate Vextra Focus with V. Hold formation through the five-second implant check.', speaker: 'TETRAGON 01 · COMMAND', line: 'Exavius wants an implant check. Press V. Five seconds of enhanced acquisition. Tell me if anything feels wrong.' },
  raid: { objective: 'Live hostiles! Destroy six Trusan raiders. Protect Tetragon and survive.', speaker: 'TETRAGON 03 · STRIKE', line: 'Those new contacts are not training drones. Trusan raiders, cutting toward Mars. Lion, weapons free!' },
  complete: { objective: 'Sector secure. Return to the debrief.', speaker: 'TETRAGON 01 · COMMAND', line: 'All hostiles down. Mars is still ours. Welcome to Tetragon, Lion.' },
};

export class Mission {
  stage: MissionStage = 'flight';
  pitch = false;
  yaw = false;
  roll = false;
  boost = false;
  countered = false;
  focused = false;
  kills = 0;
  raidTime = 0;

  flightCheck(input: { pitch: number; yaw: number; roll: number; boost: boolean }) {
    this.pitch ||= Math.abs(input.pitch) > 0.15;
    this.yaw ||= Math.abs(input.yaw) > 0.15;
    this.roll ||= Math.abs(input.roll) > 0.15;
    this.boost ||= input.boost;
    if (this.stage === 'flight' && this.pitch && this.yaw && this.roll && this.boost) return this.advance('cannon');
    return false;
  }

  advance(stage: MissionStage) {
    if (this.stage === stage) return false;
    this.stage = stage;
    return true;
  }
}
