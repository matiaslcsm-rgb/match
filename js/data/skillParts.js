// Show skills (user decision 2026-11-02): abilities built from parts (a shape, what each hit does and an optional twist)
// instead of hand-written code. The builder writes the values per level, the description, the tags (the AI and the VFX
// read them) and cast()/hooks, and prices cooldown and mana from a power budget, so a new skill is born roughly balanced.
// They have no natural competitor (heroKey SHOW_KEY, progression.js). The skills themselves live in data/showSkills.js.
//
// def: { id, name, shape: { type, ... }, hits: [{ type, ... }], twist: { type, ... } or a list of them (optional),
//        ultimate: true (optional: 3 levels, bigger numbers, much longer cooldown) }
//   shapes  strike { range }                 the nearest enemy in range (1.5 = melee)
//           bolt { range, radius, pierce }   projectile toward the aim point; stops on the first one unless pierce
//           blast { range, radius }          area at the aim point (or on the nearest enemy)
//           nova { radius }                  area around the caster
//           dash { cells, radius }           charges toward the nearest enemy and hits whoever is next to it at the end
//           zone { range, radius, duration } area at a point that hits every ZONE_TICK seconds (damage is per second)
//           everywhere {}                    every enemy alive in the arena (for ultimates)
//           self {}                          only the caster: for skills made of shield / heal / haste
//           everyHit { every }               passive: every `every` basic attacks
//           whenHit { every }                passive: every `every` hits taken, on whoever hit you
//   hits    damage { dmgType, base, ratio }  physical scales with attack damage, magical with Intelligence, pure with nothing
//           stun / root / silence { duration }, slow { pct, duration }, push / pull { cells } (pushed into a column: +1 Dent)
//           overcharge { charges, power }, dent { stacks }, overheat { dps, duration }, mark {}, discharge { mult }
//           shield { amount, duration }, heal { amount } and haste { atkSpeed, move, duration } go on the caster, once per cast
//   twists  windup { time }          announced (game.js): it can be dodged, so it hits 25% harder and costs less
//           crusher { perDent }      consumes the target's dents: +perDent damage for each one
//           execute { below, bonus } more damage to targets under `below` of their life
//           close { bonus } / far { bonus }  more damage at 2 cells or less / 4 or more

const SHOW_KEY = 'SHOW';
const SHOW_SKILLS = {};
const PART_LEVELS = [1, 1.45, 1.9, 2.35]; // what damage, shields and stored power grow per skill level
const ULT_PART_LEVELS = [1, 1.5, 2];
const PASSIVE_SHAPES = ['everyHit', 'whenHit'];
const ZONE_TICK = 0.5;
const WINDUP_BONUS = 0.25;
const SELF_HITS = ['shield', 'heal', 'haste'];

// Power points of each part at level 1. Cooldown and mana come from the total (partCosts).
const PART_POINTS = {
    damage: h => h.base / 25, stun: h => h.duration * 6, root: h => h.duration * 3.5, silence: h => h.duration * 2,
    slow: h => h.pct * h.duration * 4, push: h => h.cells * 0.5, pull: h => h.cells * 0.5,
    overcharge: h => h.charges + h.power / 40, dent: h => h.stacks, overheat: h => h.dps * h.duration / 30,
    mark: () => 1.5, discharge: () => 2, shield: h => h.amount / 30, heal: h => h.amount / 30,
    haste: h => (h.atkSpeed * 3 + h.move * 2) * h.duration
};
const SHAPE_POINTS = { strike: 1, bolt: 0.9, blast: 1.25, nova: 1.25, dash: 1.15, zone: 1, everywhere: 2, self: 1, everyHit: 1, whenHit: 1 };
const TWIST_POINTS = { windup: 0.8, crusher: 1.15, execute: 1.15, close: 1.1, far: 1.1 };

function partPoints(def) {
    let pts = def.hits.reduce((s, h) => s + PART_POINTS[h.type](h) * (def.shape.type === 'zone' && h.type === 'damage' ? def.shape.duration * 0.8 : 1), 0);
    pts *= SHAPE_POINTS[def.shape.type] * (def.shape.pierce ? 1.2 : 1);
    twistsOf(def).forEach(t => { pts *= TWIST_POINTS[t.type]; });
    return pts;
}
function twistsOf(def) { return [].concat(def.twist || []); }
const round5 = x => Math.round(x / 5) * 5;
function partCosts(def) {
    const pts = partPoints(def);
    if (def.ultimate) {
        const ucd = Math.max(70, Math.min(110, Math.round((3 + pts * 1.1) * 5 / 5) * 5)); // like the competitors' ultimates (Zeus: 90)
        const umana = round5((30 + pts * 8) * 1.4);
        return { cooldown: [0, 10, 20].map(d => ucd - d), manaCost: [0, 25, 50].map(d => umana + d) };
    }
    const cd = Math.max(5, Math.min(22, Math.round((3 + pts * 1.1) * 2) / 2));
    const mana = round5(30 + pts * 8);
    return { cooldown: [0, 0.5, 1, 1.5].map(d => cd - d), manaCost: [0, 10, 20, 30].map(d => mana + d) };
}

// --- VALUES ---
function partValues(def) {
    const v = {}, s = def.shape, levels = def.ultimate ? ULT_PART_LEVELS : PART_LEVELS;
    const perLevel = (x, step = 0) => levels.map((m, i) => +(step ? x + step * i : x * m).toFixed(2));
    if (s.range) v.range = s.range;
    if (s.radius) v.radius = s.radius;
    if (s.cells) v.cells = s.cells;
    if (s.duration) v.zoneDur = s.duration;
    if (s.every) v.every = s.every;
    def.hits.forEach(h => {
        if (h.type === 'damage') { v.dmg = perLevel(h.base).map(Math.round); if (h.ratio) v.ratio = h.ratio; }
        if (h.type === 'stun') v.stun = perLevel(h.duration, 0.1);
        if (h.type === 'root') v.root = perLevel(h.duration, 0.1);
        if (h.type === 'silence') v.silence = perLevel(h.duration, 0.25);
        if (h.type === 'slow') { v.slow = h.pct; v.slowDur = h.duration; }
        if (h.type === 'push') v.push = h.cells;
        if (h.type === 'pull') v.pull = h.cells;
        if (h.type === 'overcharge') { v.charges = h.charges; v.chargePower = perLevel(h.power).map(Math.round); }
        if (h.type === 'dent') v.dents = h.stacks;
        if (h.type === 'overheat') { v.heatDps = perLevel(h.dps).map(Math.round); v.heatDur = h.duration; }
        if (h.type === 'discharge') v.dischargeMult = h.mult;
        if (h.type === 'shield') { v.shield = perLevel(h.amount).map(Math.round); v.shieldDur = h.duration; }
        if (h.type === 'heal') v.heal = perLevel(h.amount).map(Math.round);
        if (h.type === 'haste') { v.hasteAtk = perLevel(h.atkSpeed, 0.1); v.hasteMove = h.move; v.hasteDur = h.duration; }
    });
    twistsOf(def).forEach(t => {
        if (t.type === 'windup') v.windupTime = t.time;
        if (t.type === 'crusher') v.perDent = t.perDent;
        if (t.type === 'execute') { v.execBelow = t.below; v.execBonus = t.bonus; }
        if (t.type === 'close') v.closeBonus = t.bonus;
        if (t.type === 'far') v.farBonus = t.bonus;
    });
    if (!PASSIVE_SHAPES.includes(s.type)) Object.assign(v, partCosts(def));
    return v;
}

// --- DESCRIPTION (Spanish: the player reads it) ---
const DMG_TEXT = {
    physical: '{dmg} + {ratio%} de tu daño de ataque como daño físico',
    magical: '{dmg} + {ratio%} de tu Inteligencia como daño mágico',
    pure: '{dmg} de daño puro'
};
const HIT_TEXT = {
    stun: 'aturde {stun}s', root: 'enraiza {root}s', silence: 'calla {silence}s',
    slow: 'ralentiza un {slow%} durante {slowDur}s', push: 'empuja {push} casillas (contra una columna: +1 Abolladura)',
    pull: 'atrae {pull} casillas', mark: 'lo deja Marcado (su próximo golpe directo pega un 50% más y atraviesa escudos)',
    overcharge: 'pone {charges} carga(s) de Sobrecarga de {chargePower} cada una (a las 3, explotan)',
    dent: 'pone {dents} Abolladura(s) (+5% de daño recibido cada una)',
    overheat: 'lo Recalienta ({heatDps} de daño mágico por segundo durante {heatDur}s; con Sobrecarga: cortocircuito)',
    discharge: 'hace estallar su Sobrecarga (x{dischargeMult})',
    shield: 'te da un escudo de {shield} por {shieldDur}s', heal: 'te cura {heal}',
    haste: 'ganás {hasteAtk%} de velocidad de ataque y {hasteMove%} de velocidad de movimiento por {hasteDur}s'
};
const SHAPE_TEXT = {
    strike: 'Golpea al enemigo más cercano (rango {range}):',
    bolt: 'Dispara un proyectil hacia donde apuntes (rango {range}, radio {radius}) que',
    blast: 'Estalla en el punto que apuntes (rango {range}, radio {radius}):',
    nova: 'Estalla a tu alrededor (radio {radius}):',
    dash: 'Cargás hasta {cells} casillas contra el enemigo más cercano y, a los que quedan pegados,',
    zone: 'Deja una zona en el punto que apuntes (rango {range}, radio {radius}) durante {zoneDur}s:',
    everywhere: 'A TODOS los enemigos de la arena, estén donde estén:',
    everyHit: 'Pasiva: cada {every} ataques básicos, el golpe además',
    whenHit: 'Pasiva: cada {every} golpes que recibís, contraatacás al que te pegó:'
};
const TWIST_TEXT = {
    windup: 'Golpe anunciado: se prepara {windupTime}s y se puede esquivar, pero pega un 25% más.',
    crusher: 'Consume las Abolladuras del objetivo: +{perDent%} de daño por cada una.',
    execute: '+{execBonus%} de daño a los que tengan menos del {execBelow%} de su vida.',
    close: '+{closeBonus%} de daño a los que estén a 2 casillas o menos.',
    far: '+{farBonus%} de daño a los que estén a 4 casillas o más.'
};
function joinList(xs) { return xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]; }
function partDescription(def) {
    const s = def.shape;
    let lead = SHAPE_TEXT[s.type];
    if (s.type === 'bolt') lead += s.pierce ? ' atraviesa a todos los que toca:' : ' se frena en el primero que toca:';
    const onTarget = def.hits.filter(h => !SELF_HITS.includes(h.type)).map(h =>
        h.type === 'damage' ? DMG_TEXT[h.dmgType] + (s.type === 'zone' ? ' por segundo' : '') : HIT_TEXT[h.type]);
    const self = def.hits.filter(h => SELF_HITS.includes(h.type)).map(h => HIT_TEXT[h.type]);
    let text = s.type === 'self' ? `Te potenciás: ${joinList(self)}.` : `${lead} ${joinList(onTarget)}.`;
    if (self.length && s.type !== 'self') text += ` Además, ${joinList(self)}.`;
    if (def.ultimate) text = 'DEFINITIVA. ' + text;
    twistsOf(def).forEach(t => { text += ' ' + TWIST_TEXT[t.type]; });
    return text;
}

function partTags(def) {
    const tags = new Set(), types = def.hits.map(h => h.type), s = def.shape;
    def.hits.forEach(h => { if (h.type === 'damage') tags.add({ physical: 'FÍSICO', magical: 'MÁGICO', pure: 'PURO' }[h.dmgType]); });
    if (types.some(t => ['stun', 'root', 'silence', 'slow', 'push', 'pull'].includes(t))) tags.add('CONTROL');
    if (['blast', 'nova', 'zone', 'everywhere'].includes(s.type) || s.pierce || (s.type === 'dash' && s.radius > 1.5)) tags.add('ÁREA');
    if (s.type === 'zone' || types.includes('overheat')) tags.add('DAÑO_EN_EL_TIEMPO');
    if (types.some(t => ['overcharge', 'dent', 'overheat', 'mark'].includes(t))) tags.add('PERJUICIO');
    if (s.type === 'dash') tags.add('MOVILIDAD');
    if (s.type === 'everyHit') tags.add('AL_GOLPEAR');
    if (s.type === 'whenHit') tags.add('AL_RECIBIR_DAÑO');
    if (types.includes('shield') || types.includes('haste')) tags.add('MEJORA');
    if (types.includes('heal')) tags.add('CURACIÓN');
    return [...tags];
}

// --- WHAT A HIT DOES ---
function partStat(caster, dmgType) { return dmgType === 'physical' ? effAttack(caster) : dmgType === 'magical' ? caster.int : 0; }

// Extra damage on this target from the twist (and the windup)
function partMult(skill, caster, target) {
    let m = skill.windup ? 1 + WINDUP_BONUS : 1;
    const d = Math.hypot(target.x - caster.x, target.y - caster.y);
    twistsOf(skill.parts).forEach(t => {
        if (t.type === 'crusher') m *= 1 + consumeDents(target) * t.perDent;
        if (t.type === 'execute' && target.hp < target.maxHp * t.below) m *= 1 + t.bonus;
        if (t.type === 'close' && d <= 2) m *= 1 + t.bonus;
        if (t.type === 'far' && d >= 4) m *= 1 + t.bonus;
    });
    return m;
}

// Applies the skill's hits to one target, in the order they are listed. tickScale: the zone's share per tick.
function applyPartHits(skill, caster, target, tickScale = 1) {
    if (!target.isAlive()) return;
    const v = key => val(skill, caster, key);
    const mult = partMult(skill, caster, target);
    const dx = target.x - caster.x, dy = target.y - caster.y, dist = Math.hypot(dx, dy) || 1;
    skill.parts.hits.forEach(h => {
        if (!target.isAlive() || SELF_HITS.includes(h.type)) return;
        switch (h.type) {
            case 'damage': dealDamage(caster, target, (v('dmg') + partStat(caster, h.dmgType) * (v('ratio') || 0)) * mult * tickScale, h.dmgType); break;
            case 'stun': addEffect(target, { id: 'STUN', name: 'Aturdido', duration: v('stun'), flags: ['stun'] }); break;
            case 'root': addEffect(target, { id: 'ROOT', name: 'Enraizado', duration: v('root'), flags: ['root'] }); break;
            case 'silence': addEffect(target, { id: 'SILENCE', name: 'Callado', duration: v('silence'), flags: ['silence'] }); break;
            case 'slow': addEffect(target, { id: skill.id + '_SLOW', name: 'Ralentizado', duration: v('slowDur'), mods: { moveSpeedPct: -v('slow') } }); break;
            case 'push': if (dragUnit(target, dx / dist, dy / dist, v('push')).wall) { applyDent(target, 1); fxText(target, '¡CRASH!', '#ff9f1c', 13); } break;
            case 'pull': dragUnit(target, -dx / dist, -dy / dist, Math.min(v('pull'), Math.max(0, Math.round(dist) - 1))); break;
            case 'overcharge': applyOvercharge(caster, target, v('charges'), v('chargePower') * tickScale); break;
            case 'dent': applyDent(target, v('dents')); break;
            case 'overheat': applyOverheat(caster, target, v('heatDps'), v('heatDur')); break;
            case 'mark': applyMark(target); break;
            case 'discharge': dischargeOvercharge(caster, target, v('dischargeMult')); break;
        }
    });
}
function applySelfHits(skill, caster) {
    skill.parts.hits.forEach(h => {
        if (h.type === 'shield') addShield(caster, val(skill, caster, 'shield'), val(skill, caster, 'shieldDur'), skill.name);
        if (h.type === 'heal') healUnit(caster, val(skill, caster, 'heal'));
        if (h.type === 'haste') addEffect(caster, { id: skill.id + '_HASTE', name: skill.name, duration: val(skill, caster, 'hasteDur'), tags: ['MEJORA'],
            mods: { atkSpeedPct: val(skill, caster, 'hasteAtk'), moveSpeedPct: val(skill, caster, 'hasteMove') } });
    });
}

function enemiesNear(caster, x, y, radius) { return enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - x, c.y - y) <= radius); }
// Aimed shapes: the mouse point, or the nearest enemy (keyboard and AI). null if it is out of range.
function partAim(skill, caster) {
    const range = val(skill, caster, 'range');
    const aim = caster.aimPoint || nearestEnemy(caster, range);
    if (!aim || Math.hypot(aim.x - caster.x, aim.y - caster.y) > range + 0.5) { log(`${skill.name}: sin objetivo en rango.`); return null; }
    return { x: aim.x, y: aim.y, aimed: !!caster.aimPoint };
}
function partImpact(skill, caster, x, y) {
    const a = fxArena(caster);
    if (a) fxImpact(a, x, y, skillVfx(skill).el, true);
}

// --- CAST BY SHAPE ---
const PART_CAST = {
    strike(skill, caster) {
        const t = nearestEnemy(caster, val(skill, caster, 'range'));
        if (!t) { log(`${skill.name}: sin enemigo en rango.`); return false; }
        applyPartHits(skill, caster, t);
        return true;
    },
    bolt(skill, caster) {
        const aim = partAim(skill, caster);
        if (!aim) return false;
        fireSkillProjectile(caster, {
            tx: aim.x, ty: aim.y, speed: 13, radius: val(skill, caster, 'radius'), noDamage: true, stopOnHit: !skill.parts.shape.pierce,
            vfx: { color: SKILL_FX_COLORS[skill.tags[0]] || '#ffffff' }, skillName: skill.name,
            onHit: target => applyPartHits(skill, caster, target)
        });
        return true;
    },
    blast(skill, caster) {
        const aim = partAim(skill, caster);
        if (!aim) return false;
        const targets = enemiesNear(caster, aim.x, aim.y, val(skill, caster, 'radius'));
        if (!targets.length && !aim.aimed) return false;
        partImpact(skill, caster, aim.x, aim.y);
        targets.forEach(t => applyPartHits(skill, caster, t));
        if (!targets.length) log(`${skill.name}: no le pegó a nadie.`);
        return true;
    },
    nova(skill, caster) {
        const targets = enemiesNear(caster, caster.x, caster.y, val(skill, caster, 'radius'));
        if (!targets.length) { log(`${skill.name}: sin enemigos en el radio.`); return false; }
        targets.forEach(t => applyPartHits(skill, caster, t));
        return true;
    },
    dash(skill, caster) {
        const cells = val(skill, caster, 'cells');
        const t = nearestEnemy(caster, cells + 1.5);
        if (!t) { log(`${skill.name}: sin enemigo cerca.`); return false; }
        const dx = t.x - caster.x, dy = t.y - caster.y, dist = Math.hypot(dx, dy) || 1;
        const moved = dragUnit(caster, dx / dist, dy / dist, Math.min(cells, Math.max(0, Math.round(dist) - 1))).moved;
        if (moved) emit(caster, 'onMove', { steps: moved });
        enemiesNear(caster, caster.x, caster.y, skill.parts.shape.radius || 1.5).forEach(e => applyPartHits(skill, caster, e));
        return true;
    },
    everywhere(skill, caster) {
        const targets = enemiesOf(caster).filter(c => c.isAlive());
        if (!targets.length) { log(`${skill.name}: no hay enemigos vivos.`); return false; }
        targets.forEach(t => applyPartHits(skill, caster, t));
        fxShake(5);
        return true;
    },
    self() { return true; },
    zone(skill, caster) {
        const aim = partAim(skill, caster);
        if (!aim) return false;
        const radius = val(skill, caster, 'radius'), spot = { x: aim.x, y: aim.y, arena: caster.arena };
        partImpact(skill, caster, aim.x, aim.y);
        addEffect(caster, {
            id: 'ZONE_' + skill.id, name: skill.name, duration: val(skill, caster, 'zoneDur'), tags: ['MEJORA'],
            hooks: {
                onTick(owner, { dt }) {
                    if (!everyInterval(owner, this.id, dt, ZONE_TICK)) return;
                    fxRing(spot, SKILL_FX_COLORS[skill.tags[0]] || '#ffffff', radius, ZONE_TICK);
                    enemiesNear(owner, spot.x, spot.y, radius).forEach(t => applyPartHits(skill, owner, t, ZONE_TICK));
                }
            }
        });
        return true;
    }
};

function buildShowSkill(def) {
    const passive = PASSIVE_SHAPES.includes(def.shape.type);
    const skill = {
        id: def.id, name: def.name, kind: passive ? 'passive' : 'active', parts: def, isUltimate: !!def.ultimate,
        tags: partTags(def), values: partValues(def), description: partDescription(def)
    };
    const windup = twistsOf(def).find(t => t.type === 'windup');
    if (windup) skill.windup = windup.time;
    if (['bolt', 'blast', 'zone'].includes(def.shape.type)) skill.pointTarget = true;
    // Passives count events and fire on the `every`-th one
    const proc = (skill, owner, target) => {
        const key = 'parts_' + skill.id;
        owner[key] = (owner[key] || 0) + 1;
        if (owner[key] < val(skill, owner, 'every')) return;
        owner[key] = 0;
        applyPartHits(skill, owner, target);
        applySelfHits(skill, owner);
    };
    if (def.shape.type === 'everyHit') skill.hooks = { onHit(owner, { target }) { proc(this, owner, target); } };
    else if (def.shape.type === 'whenHit') {
        skill.hooks = { onDamaged(owner, { source }) { if (source && source.isAlive() && enemiesOf(owner).includes(source)) proc(this, owner, source); } };
    } else {
        skill.cast = function (caster) {
            const ok = PART_CAST[def.shape.type](this, caster);
            if (ok) applySelfHits(this, caster);
            return ok;
        };
    }
    return skill;
}

function registerShowSkills(defs) { defs.forEach(def => { SHOW_SKILLS[def.id] = buildShowSkill(def); }); }
