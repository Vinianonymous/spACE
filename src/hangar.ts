import * as THREE from 'three';
import { DEFAULT_LOADOUT, PARTS, SHIPS, SLOTS, STAT_LABELS, buildStats, fittingIssues, fittingPower, partById, shipById, upgradePrice, type BuildStats, type Loadout, type PartId, type ShipId, type Slot } from './catalog';
import { parseProgress, type ProgressStore } from './progress';
import { createShip } from './world';
import { SHIP_PREREQUISITES, missingPartRequirements, missingShipRequirements, partNodeStatus } from './tech-tree';
import { ABILITIES, abilityById, missingAbilityRequirement, type AbilityId } from './abilities';

const number = (value: number) => Number(value.toFixed(2)).toLocaleString();
const money = (value: number) => `${value.toLocaleString()} CR`;

export class Hangar {
  private selected: ShipId;
  private draft: Loadout;
  private pending?: () => void;
  private renderer?: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  private models = new Map<ShipId, THREE.Group>();
  private frameId = 0;
  private lastFrame = 0;
  private model?: THREE.Group;
  private confirmation: HTMLDialogElement;
  private treeVisible = false;

  constructor(private root: HTMLDialogElement, private store: ProgressStore, private changed: () => void, private closed: () => void) {
    this.selected = store.data.selectedShip;
    this.draft = { ...store.data.loadouts[this.selected]! };
    root.innerHTML = `
      <header class="hangar-header"><div><div class="eyebrow">EXAVIUS / TETRAGON LOGISTICS</div><h2 id="hangar-title">HANGAR <span>03</span></h2></div><div class="hangar-wallet"><span>AVAILABLE CREDITS</span><b id="hangar-credits"></b></div><button id="hangar-tree-toggle" class="secondary-button" aria-controls="hangar-tree" aria-expanded="false">TECH TREE / RESEARCH</button><button id="hangar-close" class="secondary-button">BACK TO SORTIE ↗</button></header>
      <section id="hangar-tree" class="hangar-tree" aria-label="Ship, parts, and ability technology tree" hidden><p>Spend campaign credits to unlock connected hulls, parts, and abilities. Each part upgrade requires the previous tier. Owned equipment stays unlocked; choose one ability to replace Vextra Focus with V.</p><div class="tree-scroll"><div id="tree-map"><section id="tree-ships" aria-label="Ship unlock paths"></section><section id="tree-parts" aria-label="Part and upgrade paths"></section><section id="tree-abilities" aria-label="Vextra ability paths"></section></div></div></section>
      <div class="hangar-grid"><nav class="hangar-roster" aria-label="Ship roster"><div class="eyebrow">FLEET / SIX HULLS</div><div id="ship-roster"></div><p class="manual-note">Kestrel is yours permanently. Every hull includes a ready-to-fly default loadout. Replaying First Light earns credits; exercises do not.</p></nav>
      <section class="hangar-center" aria-label="Ship preview and stat comparison"><div class="hangar-ship-heading"><div><div id="hangar-role" class="eyebrow"></div><h3 id="hangar-ship-name"></h3></div><span id="hangar-ownership"></span></div><p id="hangar-ship-description"></p><canvas id="hangar-preview" aria-label="Rotating 3D preview of selected hull"></canvas><button id="hangar-ship-action" class="primary-button"></button><p id="hangar-ability" class="manual-note"></p><div class="hangar-stats"><div class="eyebrow" id="comparison-label">SAVED → DRAFT / ACTUAL FLIGHT STATS</div><table><thead><tr><th>STAT</th><th id="stats-before">SAVED</th><th>DRAFT</th><th>Δ</th></tr></thead><tbody id="hangar-stats"></tbody></table></div></section>
      <section class="hangar-fitting" aria-label="Parts and loadout"><div class="fitting-heading"><div class="eyebrow">FITTING / FIVE SLOTS</div><b id="fitting-power"></b></div><div id="hangar-parts"></div><div id="fitting-issues" role="status"></div><p class="manual-note">Parts are shared between hulls. Upgrades stay with the part. Tiers do not increase power cost. Drafts are not saved until applied.</p><div class="hangar-fit-actions"><button id="apply-loadout" class="primary-button">APPLY LOADOUT</button><button id="default-loadout" class="secondary-button">RESTORE FREE DEFAULT</button></div></section></div>
      <footer class="hangar-footer"><span id="hangar-message" role="status" aria-live="polite"></span><div><button id="hangar-export" class="secondary-button">EXPORT SAVE ↓</button><button id="hangar-import" class="secondary-button">IMPORT SAVE ↑</button><input id="hangar-file" type="file" accept=".json,application/json" hidden /></div></footer>
      <dialog id="hangar-confirm" aria-labelledby="transaction-title"><div class="eyebrow">LOGISTICS / CONFIRM TRANSACTION</div><h2 id="transaction-title"></h2><p id="transaction-summary"></p><div id="transaction-stats"></div><div class="transaction-actions"><button id="transaction-cancel" class="secondary-button">CANCEL</button><button id="transaction-confirm" class="primary-button">CONFIRM</button></div></dialog>`;
    this.confirmation = this.element<HTMLDialogElement>('hangar-confirm');
    this.element('hangar-tree-toggle').onclick = () => this.setTreeVisible(!this.treeVisible);
    window.addEventListener('resize', () => { if (this.root.open && this.treeVisible) this.drawShipLinks(); });
    this.element('hangar-close').onclick = () => this.close();
    root.addEventListener('cancel', (event) => { event.preventDefault(); if (event.target === root) this.close(); });
    this.confirmation.addEventListener('cancel', (event) => { event.preventDefault(); event.stopPropagation(); this.cancel(); });
    this.element('transaction-cancel').onclick = () => this.cancel();
    this.element('transaction-confirm').onclick = () => {
      try {
        this.pending?.();
        this.confirmation.close();
        this.pending = undefined;
        this.changed();
        this.render();
        this.message(this.store.warning || 'Transaction complete. Progress saved locally.');
      } catch (error) { this.element('transaction-summary').textContent = this.error(error); }
    };
    this.element('apply-loadout').onclick = () => this.action(() => this.store.equip(this.selected, this.draft), 'Loadout applied. This ship is ready to launch.');
    this.element('default-loadout').onclick = () => this.action(() => this.store.restoreDefault(this.selected), 'Default restored at no cost. Owned upgrades are retained.');
    this.element('hangar-export').onclick = () => {
      const url = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'space-progress.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    this.element('hangar-import').onclick = () => this.element<HTMLInputElement>('hangar-file').click();
    this.element<HTMLInputElement>('hangar-file').onchange = async (event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      try {
        if (file.size > 1024 * 1024) throw new Error('Save exceeds the 1 MB import limit.');
        const text = await file.text();
        const parsed = parseProgress(text);
        this.review('Replace current progress?', `Import ${money(parsed.credits)}, ${parsed.ownedShips.length} owned hull(s), and ${Object.keys(parsed.parts).length} parts. This replaces current progress, not merges it. Existing on-disk data is retained in a before-import backup when storage is available.`, () => {
          this.store.import(text);
          this.selected = this.store.data.selectedShip;
          this.draft = { ...this.store.data.loadouts[this.selected]! };
        });
      } catch (error) { this.message(`Import rejected: ${this.error(error)} Your progress is unchanged.`); }
    };
  }

  private element<T extends HTMLElement = HTMLElement>(id: string) { return this.root.querySelector<T>(`#${id}`)!; }
  private error(error: unknown) { return error instanceof Error ? error.message : 'Logistics operation failed.'; }
  private message(text: string) { this.element('hangar-message').textContent = text; }

  open() {
    this.selected = this.store.data.selectedShip;
    this.draft = { ...this.store.data.loadouts[this.selected]! };
    this.root.showModal();
    this.setTreeVisible(false);
    this.render();
    this.message(this.store.warning || 'Select a hull, compare a build, then apply. Mission rewards fund purchases.');
    this.lastFrame = 0;
    this.frameId = requestAnimationFrame((time) => this.animate(time));
  }

  close() {
    if (this.confirmation.open) this.cancel();
    cancelAnimationFrame(this.frameId);
    this.root.close();
    this.closed();
  }

  private action(callback: () => void, message: string) {
    try {
      callback(); this.changed(); this.draft = { ...this.store.data.loadouts[this.selected]! };
      this.render(); this.message(this.store.warning || message);
    } catch (error) { this.message(this.error(error)); }
  }

  private cancel() { this.pending = undefined; this.confirmation.close(); }

  private review(title: string, summary: string, callback: () => void, after?: BuildStats) {
    this.pending = callback;
    this.element('transaction-title').textContent = title;
    this.element('transaction-summary').textContent = summary;
    const before = buildStats(this.selected, this.draft, this.store.data.parts);
    this.element('transaction-stats').innerHTML = after ? `<table class="upgrade-comparison"><thead><tr><th>STAT</th><th>BEFORE</th><th>AFTER</th></tr></thead><tbody>${STAT_LABELS.filter(([key]) => Math.abs(before[key] - after[key]) > 0.001).map(([key, label, unit]) => `<tr><td>${label}</td><td>${number(before[key])} ${unit}</td><td>${number(after[key])} ${unit}</td></tr>`).join('')}</tbody></table>` : '';
    this.confirmation.showModal();
  }

  private setTreeVisible(visible: boolean) {
    this.treeVisible = visible;
    this.element('hangar-tree').hidden = !visible;
    this.root.querySelector<HTMLElement>('.hangar-grid')!.hidden = visible;
    const toggle = this.element<HTMLButtonElement>('hangar-tree-toggle');
    toggle.textContent = visible ? 'BACK TO FITTING' : 'TECH TREE / RESEARCH';
    toggle.setAttribute('aria-expanded', String(visible));
    if (visible) this.renderTree();
  }

  private buyHull(id: ShipId) {
    const ship = shipById(id)!;
    const data = this.store.data;
    this.selected = id;
    this.draft = { ...(data.loadouts[id] || DEFAULT_LOADOUT) };
    this.review(`Requisition ${ship.name}?`, `${money(ship.price)}. Balance ${money(data.credits)} → ${money(data.credits - ship.price)}. Includes a free, complete default loadout. Hull ${ship.hull}; speed ${ship.speed} m/s; capacity ${ship.capacity}. Purchase does not automatically replace your active hull.`, () => this.store.buyShip(id));
  }

  private buyEquipment(id: PartId) {
    const part = partById(id)!, data = this.store.data, tier = data.parts[id] || 0;
    const price = tier ? upgradePrice(id, tier) : part.price;
    this.review(tier ? `Upgrade ${part.name} to T${tier + 1}?` : `Buy ${part.name}?`, `${money(price)}. Balance ${money(data.credits)} → ${money(data.credits - price)}. ${tier ? 'Upgrade persists on this part across every saved hull.' : 'Reusable on every compatible hull; only one purchase is needed.'} ${part.description}`, () => tier ? this.store.upgradePart(id) : this.store.buyPart(id), buildStats(this.selected, { ...this.draft, [part.slot]: id }, { ...data.parts, [id]: tier + 1 }));
  }

  private renderTree() {
    const data = this.store.data;
    const stages: readonly (readonly ShipId[])[] = [['kestrel'], ['viper', 'bastion'], ['specter', 'peregrine'], ['paladin']];
    this.element('tree-ships').innerHTML = `<div class="eyebrow">FLEET / CONNECTED HULL PATHS</div><svg id="tree-links" aria-hidden="true"></svg><div class="tree-ship-stages">${stages.map((stage) => `<div class="tree-stage">${stage.map((id) => {
      const ship = shipById(id)!;
      const owned = data.ownedShips.includes(id), missing = missingShipRequirements(id, data);
      return `<button class="tree-node tree-ship ${owned ? 'owned' : missing.length ? 'locked' : 'available'}" data-tree-ship="${id}" id="tree-ship-${id}" aria-label="${ship.name}: ${owned ? 'owned' : missing.length ? `requires ${missing.join(' and ')}` : `${money(ship.price)} available`}"><small>${ship.code} / ${ship.role}</small><b>${ship.name}</b><span>${owned ? id === data.selectedShip ? 'ACTIVE HULL' : 'OWNED' : missing.length ? `REQUIRES ${missing.join(' + ').toUpperCase()}` : money(ship.price)}</span></button>`;
    }).join('')}</div>`).join('')}</div>`;
    this.element('tree-parts').innerHTML = `<div class="eyebrow">SYSTEMS / ACQUISITION → TIER 2 → TIER 3</div>${SLOTS.map((slot) => `<div class="tree-slot"><h3>${slot.toUpperCase()}</h3>${PARTS.filter((part) => part.slot === slot).map((part) => {
      const missing = missingPartRequirements(part.id, data);
      return `<div class="tree-part-row"><span class="tree-part-name">${part.name}</span>${([1, 2, 3] as const).map((tier) => {
        const status = partNodeStatus(part.id, tier, data);
        const requirements = tier === 1 ? missing.join(' + ') : `T${tier - 1} ${part.name}`;
        const price = tier === 1 ? part.price : upgradePrice(part.id, tier - 1);
        return `<button class="tree-node tree-part ${status}" data-tree-part="${part.id}" data-tree-tier="${tier}" aria-label="${part.name} tier ${tier}: ${status === 'owned' ? 'owned' : status === 'locked' ? `requires ${requirements}` : `${money(price)} available`}"><b>${tier === 1 ? 'ACQUIRE' : `TIER ${tier}`}</b><span>${status === 'owned' ? 'OWNED' : status === 'locked' ? `REQUIRES ${requirements.toUpperCase()}` : money(price)}</span></button>`;
      }).join('')}</div>`;
    }).join('')}</div>`).join('')}`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-tree-ship]').forEach((node) => node.onclick = () => {
      const id = node.dataset.treeShip as ShipId;
      const missing = missingShipRequirements(id, this.store.data);
      if (this.store.data.ownedShips.includes(id)) {
        this.selected = id; this.draft = { ...this.store.data.loadouts[id]! };
        this.setTreeVisible(false); this.render();
        this.message(`${shipById(id)!.name} selected for preview. Set active in fitting to fly it.`);
      } else if (missing.length) this.message(`Requires ${missing.join(' + ')} before buying ${shipById(id)!.name}.`);
      else if (this.store.data.credits < shipById(id)!.price) this.message(`Insufficient credits for ${shipById(id)!.name}.`);
      else this.buyHull(id);
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-tree-part]').forEach((node) => node.onclick = () => {
      const id = node.dataset.treePart as PartId;
      const tier = Number(node.dataset.treeTier) as 1 | 2 | 3;
      if (partNodeStatus(id, tier, this.store.data) === 'owned') { this.message(`${partById(id)!.name} T${tier} already owned. Fit it from the fitting screen.`); return; }
      if (partNodeStatus(id, tier, this.store.data) === 'locked') { this.message(`Requires ${tier === 1 ? missingPartRequirements(id, this.store.data).join(' + ') : `T${tier - 1} ${partById(id)!.name}`} first.`); return; }
      const cost = tier === 1 ? partById(id)!.price : upgradePrice(id, tier - 1);
      if (this.store.data.credits < cost) { this.message(`Insufficient credits for ${partById(id)!.name} T${tier}.`); return; }
      this.buyEquipment(id);
    });
    this.element('tree-abilities').innerHTML = `<div class="eyebrow">VEXTRA / ONE ABILITY EQUIPPED PER SORTIE</div><div class="tree-ability-grid">${ABILITIES.map((ability) => {
      const owned = data.ownedAbilities.includes(ability.id), missing = missingAbilityRequirement(ability.id, data);
      const status = owned ? ability.id === data.selectedAbility ? 'EQUIPPED' : 'OWNED · SELECT' : missing ? `REQUIRES ${missing.toUpperCase()}` : money(ability.price);
      return `<button class="tree-node tree-ability ${owned ? 'owned' : missing ? 'locked' : 'available'}" data-tree-ability="${ability.id}" aria-label="${ability.name}: ${status}"><b>${ability.name}</b><small>${ability.description}</small><span>${status}</span></button>`;
    }).join('')}</div>`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-tree-ability]').forEach((node) => node.onclick = () => {
      const id = node.dataset.treeAbility as AbilityId;
      const ability = abilityById(id)!;
      if (this.store.data.ownedAbilities.includes(id)) {
        if (this.store.data.selectedAbility === id) { this.message(`${ability.name} already equipped.`); return; }
        this.action(() => this.store.selectAbility(id), `${ability.name} equipped for the next sortie.`);
      } else {
        const missing = missingAbilityRequirement(id, this.store.data);
        if (missing) { this.message(`Requires ${missing} before buying ${ability.name}.`); return; }
        if (this.store.data.credits < ability.price) { this.message(`Insufficient credits for ${ability.name}.`); return; }
        this.review(`Unlock ${ability.name}?`, `${money(ability.price)}. Balance ${money(this.store.data.credits)} → ${money(this.store.data.credits - ability.price)}. ${ability.description} Select the ability after purchase to equip it.`, () => this.store.buyAbility(id));
      }
    });
    requestAnimationFrame(() => { if (this.root.open && this.treeVisible) this.drawShipLinks(); });
  }

  private drawShipLinks() {
    const section = this.element('tree-ships'), svg = this.root.querySelector<SVGSVGElement>('#tree-links')!;
    const bounds = section.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    svg.replaceChildren();
    for (const ship of SHIPS) for (const prerequisite of SHIP_PREREQUISITES[ship.id]) {
      const from = this.element(`tree-ship-${prerequisite}`).getBoundingClientRect(), to = this.element(`tree-ship-${ship.id}`).getBoundingClientRect();
      const x1 = from.right - bounds.left, y1 = from.top + from.height / 2 - bounds.top;
      const x2 = to.left - bounds.left, y2 = to.top + to.height / 2 - bounds.top;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`);
      path.setAttribute('class', 'tree-link');
      svg.append(path);
    }
  }

  private render() {
    const data = this.store.data;
    const ship = shipById(this.selected)!;
    const owned = data.ownedShips.includes(ship.id);
    this.element('hangar-credits').textContent = money(data.credits);
    if (this.treeVisible) this.renderTree();
    this.element('ship-roster').innerHTML = SHIPS.map((hull) => `<button id="ship-${hull.id}" class="ship-card ${hull.id === this.selected ? 'selected' : ''}" aria-pressed="${hull.id === this.selected}" data-ship="${hull.id}"><span>${hull.code} / ${hull.role}</span><b>${hull.name.toUpperCase()}</b><small>${data.selectedShip === hull.id ? 'ACTIVE HULL' : data.ownedShips.includes(hull.id) ? 'OWNED' : money(hull.price)}</small></button>`).join('');
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-ship]')) button.onclick = () => {
      this.selected = button.dataset.ship as ShipId;
      this.draft = { ...(data.loadouts[this.selected] || DEFAULT_LOADOUT) };
      this.render();
      this.message('Previewing hull. Unapplied changes to the previous draft were discarded.');
    };
    this.element('hangar-role').textContent = `${ship.code} / ${ship.role.toUpperCase()}`;
    this.element('hangar-ship-name').textContent = ship.name.toUpperCase();
    this.element('hangar-ship-description').textContent = ship.description;
    this.element('hangar-ability').textContent = `EQUIPPED ABILITY / ${abilityById(data.selectedAbility)!.name.toUpperCase()} · Open Tech Tree to unlock or select another.`;
    this.element('hangar-ownership').textContent = data.selectedShip === ship.id ? 'ACTIVE' : owned ? 'OWNED' : 'REQUISITION';
    const shipAction = this.element<HTMLButtonElement>('hangar-ship-action');
    const missingShip = missingShipRequirements(ship.id, data);
    shipAction.textContent = owned ? data.selectedShip === ship.id ? 'ACTIVE HULL' : 'SET ACTIVE · SAVED LOADOUT' : missingShip.length ? `LOCKED · REQUIRES ${missingShip.join(' + ').toUpperCase()}` : `BUY HULL / ${money(ship.price)}`;
    shipAction.disabled = data.selectedShip === ship.id || (!owned && (data.credits < ship.price || missingShip.length > 0));
    shipAction.onclick = () => {
      if (owned) this.action(() => this.store.selectShip(ship.id), `${ship.name} selected with its saved loadout.`);
      else this.buyHull(ship.id);
    };
    const power = fittingPower(this.draft);
    this.element('fitting-power').textContent = `${power} / ${ship.capacity} POWER`;
    const issues = fittingIssues(this.selected, this.draft, data.parts);
    if (!owned) issues.unshift('Purchase this hull before applying a loadout.');
    this.element('fitting-issues').textContent = issues.join(' ');
    this.element<HTMLButtonElement>('apply-loadout').disabled = issues.length > 0;
    this.element<HTMLButtonElement>('default-loadout').disabled = !owned;
    this.element('hangar-parts').innerHTML = SLOTS.map((slot) => {
      const part = partById(this.draft[slot])!;
      const tier = data.parts[part.id] || 0;
      const cost = tier ? upgradePrice(part.id, tier) : part.price;
      const missing = tier ? [] : missingPartRequirements(part.id, data);
      return `<div class="part-row"><label for="part-${slot}">${slot.toUpperCase()} <span>${part.power} POWER</span></label><select id="part-${slot}" data-slot="${slot}">${PARTS.filter((option) => option.slot === slot).map((option) => `<option value="${option.id}" ${part.id === option.id ? 'selected' : ''}>${option.name} / ${data.parts[option.id] ? `T${data.parts[option.id]}` : `LOCKED · ${money(option.price)}`}</option>`).join('')}</select><p>BASE: ${part.description}</p><button id="part-action-${slot}" class="secondary-button" ${tier === 3 || data.credits < cost || missing.length ? 'disabled' : ''}>${tier === 3 ? 'MAX TIER 3' : missing.length ? `REQUIRES ${missing.join(' + ').toUpperCase()}` : tier ? `UPGRADE T${tier + 1} / ${money(cost)}` : `BUY PART / ${money(cost)}`}</button></div>`;
    }).join('');
    for (const slot of SLOTS) {
      this.element<HTMLSelectElement>(`part-${slot}`).onchange = (event) => {
        this.draft[slot] = (event.target as HTMLSelectElement).value as Loadout[Slot];
        this.render(); this.element(`part-${slot}`).focus();
      };
      this.element(`part-action-${slot}`).onclick = () => {
        this.buyEquipment(this.draft[slot]);
      };
    }
    const saved = owned ? buildStats(this.selected, data.loadouts[this.selected]!, data.parts) : buildStats(data.selectedShip, data.loadouts[data.selectedShip]!, data.parts);
    this.element('comparison-label').textContent = owned ? 'SAVED → DRAFT / ACTUAL FLIGHT STATS' : 'ACTIVE HULL → PREVIEW / ACTUAL FLIGHT STATS';
    this.element('stats-before').textContent = owned ? 'SAVED' : 'ACTIVE';
    const draft = buildStats(this.selected, this.draft, data.parts);
    this.element('hangar-stats').innerHTML = STAT_LABELS.map(([key, label, unit]) => {
      const delta = draft[key] - saved[key];
      return `<tr><td>${label}</td><td>${number(saved[key])}</td><td>${number(draft[key])} <small>${unit}</small></td><td>${Math.abs(delta) < 0.001 ? '—' : `${delta > 0 ? '+' : ''}${number(delta)}`}</td></tr>`;
    }).join('');
    this.preview(ship.id);
  }

  private preview(id: ShipId) {
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.element<HTMLCanvasElement>('hangar-preview'), alpha: true, antialias: false });
      this.renderer.setPixelRatio(1);
      this.scene.add(new THREE.AmbientLight(0xc0d7e0, 2));
      const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(-10, 20, 15); this.scene.add(key);
      const rim = new THREE.DirectionalLight(0xbaff80, 2); rim.position.set(10, -3, -10); this.scene.add(rim);
      this.camera.fov = 30;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(16, 10, 18); this.camera.lookAt(0, 0, 0);
    }
    if (this.model) this.scene.remove(this.model);
    this.model = this.models.get(id);
    if (!this.model) { this.model = createShip(false, id); this.models.set(id, this.model); }
    this.scene.add(this.model);
  }

  private animate(time: number) {
    if (!this.root.open || !this.renderer) return;
    if (time - this.lastFrame >= 1000 / 30) {
      const canvas = this.element<HTMLCanvasElement>('hangar-preview');
      const width = Math.max(1, Math.floor(canvas.clientWidth / 1.5)), height = Math.max(1, Math.floor(canvas.clientHeight / 1.5));
      if (canvas.width !== width || canvas.height !== height) { this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); }
      if (this.model) this.model.rotation.y = time * 0.00018;
      this.renderer.render(this.scene, this.camera);
      this.lastFrame = time;
    }
    this.frameId = requestAnimationFrame((next) => this.animate(next));
  }
}
