import './style.css';
import { Game } from './game';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main id="flight-deck" aria-label="spACE flight prototype">
    <canvas id="viewport" aria-label="3D flight scene. Keyboard controls are listed in the flight manual."></canvas>
    <div class="vignette"></div>
    <header class="topbar">
      <a class="wordmark" href="./" aria-label="spACE home">sp<span>ACE</span><i> / </i><small>FLIGHT PROTOTYPE</small></a>
      <div class="sector"><span class="status-dot"></span> SOL SYSTEM <b>/</b> MARS ORBIT <b>/</b> 2256</div>
      <button class="text-button" id="help-button">FLIGHT MANUAL <kbd>H</kbd></button>
    </header>

    <aside class="mission-panel">
      <div class="eyebrow">EXAVIUS FLIGHT COMMAND</div>
      <div class="mission-title"><span class="small-cross">+</span> <span id="mission-name">FIRST LIGHT</span></div>
      <div class="mission-rule"></div>
      <div class="objective-label">01 <span>ACTIVE DIRECTIVE</span></div>
      <p id="objective">A rookie’s first patrol. A nation’s last frontier.</p>
      <div class="mission-count"><span id="kills">00</span><span class="muted">/ 08 TARGETS</span></div>
      <div class="coordinate">SECTOR 04.77 <span> // </span> VEXTRA SALVAGE BELT</div>
      <div class="squad-list" id="squad-list" hidden><span>TETRAGON 01 · COMMAND</span><span>TETRAGON 02 · TACTICAL</span><span>TETRAGON 03 · STRIKE</span></div>
      <canvas id="radar" width="130" height="90" aria-label="Radar: contacts relative to your ship" hidden></canvas>
    </aside>

    <aside class="telemetry">
      <div class="eyebrow">EX-01 KESTREL</div>
      <div class="pilot">LION <span> / TETRAGON 04</span></div>
      <div class="telemetry-rule"></div>
      <div class="stat-row"><span>FLIGHT STATUS</span><b id="flight-status">STANDBY</b></div>
      <div class="stat-row"><span>HULL INTEGRITY</span><b id="hull">100%</b></div>
      <div class="meter defense-meter"><i id="hull-bar"></i></div>
      <div class="stat-row"><span>SHIELDS</span><b id="shields">100%</b></div>
      <div class="meter defense-meter"><i id="shield-bar"></i></div>
      <div class="stat-row"><span>ENGINE OUTPUT</span><b id="throttle">45%</b></div>
      <div class="stat-row"><span>BOOST RESERVE</span><b id="boost">100%</b></div>
      <div class="meter"><i id="boost-bar"></i></div>
      <div class="stat-row system-row"><span>VEXTRA FOCUS <kbd>V</kbd></span><b id="focus-state">READY</b></div>
      <div class="meter"><i id="focus-bar"></i></div>
      <div class="stat-row system-row"><span>COUNTERMEASURES <kbd>X</kbd></span><b id="flare-state">READY</b></div>
    </aside>

    <div id="target-marker" class="target-marker" hidden><i></i><span id="target-label">TRUSAN / DRONE 01</span><small id="target-range"></small></div>
    <div id="target-guide" class="target-guide" hidden aria-label="Selected target direction and distance">
      <span class="guide-caption" id="guide-caption">SELECTED TARGET</span>
      <div class="guide-compass" id="guide-arrow" role="img" aria-label="3D direction to selected target"><span class="guide-tick"></span></div>
      <span id="guide-distance">000 M</span><small id="guide-bearing">AHEAD</small>
    </div>
    <div id="padlock-status" class="padlock-status" hidden><kbd>C</kbd> PADLOCK CAMERA <span> / RELEASE TO RETURN</span></div>
    <div class="reticle" aria-hidden="true"><div></div><span>+</span></div>
    <div class="heading-scale" aria-hidden="true"><span>270</span><i></i><span>300</span><i></i><b id="heading">000</b><i></i><span>030</span><i></i><span>060</span></div>
    <div id="notice" class="notice" role="status" aria-live="polite"></div>
    <div id="missile-warning" class="missile-warning" hidden role="status">MISSILE INBOUND <kbd>X</kbd> COUNTERMEASURES</div>
    <div id="save-status" class="save-status" role="status" hidden></div>

    <section class="launch-panel" id="launch-panel" aria-labelledby="launch-title">
      <div class="eyebrow"><span class="status-dot"></span> TETRAGON SQUADRON / SORTIE 001</div>
      <h1 id="launch-title">THE VOID<br>IS NOT <em>EMPTY.</em></h1>
      <p>Mars is all we have left. Out here, everything else<br class="wide-break"> is worth fighting for.</p>
      <div class="launch-meta"><span>2256</span><span>EXAVIUS TERRITORY</span><span>LIVE-FIRE EXERCISE</span></div>
      <button class="primary-button" id="launch">MISSION 01 / FIRST LIGHT <span>↗</span></button>
      <div class="launch-actions"><button class="secondary-button" id="exercise">PROVING GROUND</button><button class="secondary-button" id="view-last" hidden>LAST DEBRIEF</button><span id="credits">0 CR</span></div>
      <div class="launch-note">VERTICAL SLICE <span>•</span> v0.2 / ROADMAP 02</div>
    </section>

    <section class="modal-panel briefing-panel" id="briefing-panel" aria-labelledby="briefing-title" hidden>
      <div class="eyebrow">EXAVIUS / MISSION 01 / MARS PERIMETER</div><h2 id="briefing-title">FIRST LIGHT</h2>
      <p>Vextra is running short. Exavius cannot afford to lose another salvage route. Today, Lion joins Tetragon for a live-fire patrol above Mars.</p>
      <ol><li>Complete flight, weapons, and defensive-system checks.</li><li>Demonstrate your Vextra implant’s Focus mode.</li><li>Respond to any Trusan incursion. Survive and clear the sector.</li></ol>
      <p class="briefing-reward">BASE REWARD <b>1,500 CR</b> · HULL BONUS <b>UP TO 500 CR</b></p>
      <div class="settings-row"><label for="difficulty">DIFFICULTY</label><select id="difficulty"><option value="standard">STANDARD</option><option value="assist">ASSIST · HALF INCOMING DAMAGE</option></select></div>
      <button class="primary-button" id="launch-mission">LAUNCH MISSION <span>↗</span></button><button class="secondary-button" id="briefing-back">BACK TO TITLE</button>
    </section>

    <section class="modal-panel" id="pause-panel" aria-labelledby="pause-title" hidden>
      <div class="eyebrow">TETRAGON / COMMS ON HOLD</div>
      <h2 id="pause-title">FLIGHT PAUSED</h2>
      <p id="pause-reason">Take a breath, Lion. We’re holding position.</p>
      <button class="primary-button" id="resume">RESUME FLIGHT <span>↗</span></button>
      <button class="secondary-button" id="restart">RESTART EXERCISE</button>
      <button class="secondary-button" id="return-title">ABANDON / RETURN TO TITLE</button>
    </section>

    <section class="modal-panel" id="complete-panel" aria-labelledby="complete-title" hidden>
      <div class="eyebrow" id="result-label">SORTIE COMPLETE / SECTOR SECURE</div>
      <h2 id="complete-title">NICE FLYING, LION.</h2>
      <p id="result-story">The proving ground is clear. Tetragon is ready for you.</p>
      <div class="result-grid"><div><span>REWARD</span><b id="result-reward">0 CR</b></div><div><span>SORTIE TIME</span><b id="result-time">00:00</b></div></div>
      <button class="primary-button" id="fly-again">FLY AGAIN <span>↗</span></button>
      <button class="secondary-button" id="complete-report">EXPORT PERFORMANCE REPORT</button>
      <button class="secondary-button" id="export-save">EXPORT PROGRESS</button><button class="secondary-button" id="debrief-title">RETURN TO TITLE</button>
    </section>

    <section class="modal-panel" id="failure-panel" aria-labelledby="failure-title" hidden><div class="eyebrow">EXAVIUS / SIGNAL LOST</div><h2 id="failure-title">SORTIE FAILED</h2><p id="failure-reason">Lion’s hull was destroyed. No credits awarded. Your previously earned credits are safe.</p><button class="primary-button" id="retry-mission">RESTART SORTIE <span>↗</span></button><button class="secondary-button" id="failure-title-button">RETURN TO TITLE</button></section>

    <dialog id="manual">
      <div class="dialog-heading"><div><div class="eyebrow">KESTREL / PILOT REFERENCE</div><h2>FLIGHT MANUAL</h2></div><button id="close-help" class="close-button" aria-label="Close flight manual">×</button></div>
      <p>Fly the reticle onto a drone. Hold your target in the acquisition cone until the brackets turn green, then launch a missile.</p>
      <div class="controls-grid">
        <span>Pitch / yaw</span><b>MOUSE MOTION or W A S D / ARROWS</b>
        <span>Roll left / right</span><b>Q / E</b>
        <span>Increase / decrease throttle</span><b>R / F</b>
        <span>Boost</span><b>HOLD SHIFT</b>
        <span>Pulse cannon</span><b>LEFT CLICK / SPACE</b>
        <span>Lock-on missile</span><b>RIGHT CLICK / M</b>
        <span>Cycle target</span><b>TAB</b>
        <span>Padlock target camera</span><b>HOLD C</b>
        <span>Countermeasures / Vextra Focus</span><b>X / V</b>
        <span>Pause / resume</span><b>ESC</b>
      </div>
      <p class="manual-note" id="mouse-description">Relative flight captures the cursor: move the mouse to pitch and yaw; stop moving to fly straight. Escape releases the cursor and pauses. Click Launch or Resume to recapture. Screen-position steering is available below as a fallback.</p>
      <div class="settings-row"><label for="mouse-mode">MOUSE CONTROL</label><select id="mouse-mode"><option value="relative">RELATIVE FLIGHT (DEFAULT)</option><option value="position">SCREEN-POSITION STEERING</option></select></div>
      <div class="settings-row"><label for="mouse-sensitivity">SENSITIVITY <output id="sensitivity-value">1.00×</output></label><input id="mouse-sensitivity" type="range" min="0.25" max="2" step="0.05" value="1" /></div>
      <div class="settings-row"><label for="invert-pitch">INVERT MOUSE PITCH</label><input id="invert-pitch" type="checkbox" /></div>
      <p class="manual-note" id="settings-status" role="status">Mouse preferences and earned mission credits save locally. Clearing browser data can remove them; use Export Progress to back up credits.</p>
      <p class="manual-note">First Light has hostile fire, shields, hull damage, weapon heat, and 24 missiles per sortie. Shields recharge after five damage-free seconds. Countermeasures recharge in eight seconds. Focus lasts five seconds, then recharges for 30. Scenery is non-collidable. The separate proving ground has no incoming fire or rewards.</p>
      <p class="manual-note">The lit 3D arrow uses the camera’s current rotation to point to your target. During padlock it instead shows your ship’s pitch, yaw, and bank relative to the target-facing view; align the arrow into the target to line up your nose. Green is close (≤350 m), red is far (≥1,600 m), with numeric range. Hold C to orbit the camera around your ship toward the target, keeping your ship in frame. Flight axes and weapon direction never follow the camera.</p>
      <div class="settings-row"><label for="quality">RENDER QUALITY</label><select id="quality"><option value="low">LOW · 480p</option><option value="medium" selected>MEDIUM · 640p</option><option value="high">HIGH · 900p</option></select></div>
      <div class="settings-row"><label for="audio-volume">EFFECTS VOLUME</label><input id="audio-volume" type="range" min="0" max="0.3" step="0.01" value="0.12" /></div>
      <div class="report-actions"><button id="reset-benchmark" class="secondary-button">RESET BENCHMARK</button><button id="export-report" class="secondary-button">EXPORT REPORT ↓</button></div>
      <p class="manual-note">Reports contain frame timing, browser/GPU information, and resolution. Nothing is uploaded. Capture performance on real hardware before declaring a milestone pass.</p>
    </dialog>

    <footer class="bottom-hud">
      <section class="speed-block"><span class="eyebrow">VELOCITY</span><div><b id="speed">080</b><span>M/S</span></div><div class="speed-line"></div><small>INERTIAL DRIVE <span id="drive-state">/ CRUISE</span></small></section>
      <section class="weapon-block"><div class="weapon-row"><span class="weapon-icon">⌁</span><div><span class="eyebrow">PRIMARY / PULSE CANNON</span><b id="cannon-state">READY [SPACE]</b><div class="lock-meter heat-meter"><i id="heat-bar"></i></div></div></div><div class="weapon-row"><span class="weapon-icon">↟</span><div><span class="eyebrow">SECONDARY / GUIDED MISSILE <span id="ammo">24</span></span><b id="lock-status">ACQUIRING TARGET</b><div class="lock-meter"><i id="lock-bar"></i></div></div></div></section>
      <section class="radio-block"><span class="eyebrow"><i class="status-dot"></i> TETRAGON / SQUADRON CHANNEL</span><p id="radio">“Systems green. The proving ground is yours, Lion.”</p><span class="radio-speaker"><span id="radio-speaker">TETRAGON 01</span> <span>▂ ▅ ▃ ▇ ▂ ▄ ▆ ▃</span></span></section>
    </footer>
    <div class="statusbar"><span><i class="status-dot"></i> <span id="system-state">SYSTEMS ONLINE</span><b> / </b> WEBGL 2</span><span id="performance">INITIALIZING RENDERER</span><span><kbd>TAB</kbd> TARGET <b> / </b><kbd>H</kbd> CONTROLS <b> / </b><kbd>ESC</kbd> PAUSE</span></div>
    <div id="fatal" role="alert" hidden><h2>FLIGHT SYSTEM UNAVAILABLE</h2><p id="fatal-message"></p><button id="retry">RETRY</button></div>
  </main>
`;

document.querySelector<HTMLButtonElement>('#retry')!.onclick = () => location.reload();

try {
  new Game();
} catch (error) {
  document.querySelector<HTMLElement>('#fatal')!.hidden = false;
  document.querySelector<HTMLElement>('#fatal-message')!.textContent =
    `Your browser could not start WebGL 2. Enable hardware acceleration, update your graphics driver, or try a current desktop Chrome, Edge, or Firefox. ${error instanceof Error ? error.message : ''}`;
}
