// Show statuses (user decision 2026-11-02): a few shared states that some skills apply and others exploit, so a draft
// becomes a combo instead of loose skills. They are plain effects (effects.js) with stacks kept in `data`.
//   Overcharge  electric charges; at STATUS.overcharge.max it blows up with the stored power. Some skills discharge it early.
//   Dent        stacking dent: each one adds damage taken; heavy skills consume them for a bonus (crusher).
//   Overheat    magical burn over time. Overheat + Overcharge on the same target = short circuit: stun and discharge.
//   Marked      the next direct hit on the target lands harder and goes through shields (combat.js, dealDamage).
// The word "expuesto" is already taken (exposedUntil: the caster can't cast after a whiffed windup), hence "Marcado".

const STATUS = {
    overcharge: { id: 'OVERCHARGE', name: 'Sobrecarga', max: 3, duration: 5, blastMult: 1.5 },
    dent: { id: 'DENT', name: 'Abolladura', max: 5, duration: 6, takenPerStack: 0.05 },
    overheat: { id: 'OVERHEAT', name: 'Recalentado', tick: 0.5 },
    shortCircuit: { stun: 0.6 },
    mark: { id: 'MARKED', name: 'Marcado', duration: 4, bonus: 0.5 }
};

function statusStacks(unit, key) {
    const e = unit.effects && getEffect(unit, STATUS[key].id);
    return e ? e.data.stacks || 0 : 0;
}

// --- OVERCHARGE ---
// Adds `charges` charges, each one storing `power` magical damage. Reaching the max blows them all.
function applyOvercharge(source, target, charges, power) {
    if (!target.isAlive() || !target.effects) return;
    const S = STATUS.overcharge;
    const prev = getEffect(target, S.id);
    const stacks = Math.min(S.max, (prev ? prev.data.stacks : 0) + charges);
    const stored = (prev ? prev.data.power : 0) + power * charges;
    addEffect(target, { id: S.id, name: `${S.name} ×${stacks}`, duration: S.duration, tags: ['PERJUICIO'], data: { stacks, power: stored, source } });
    fxText(target, `⚡${stacks}`, '#ffe066', 10, 0.6);
    if (shortCircuit(source, target)) return;
    if (stacks >= S.max) dischargeOvercharge(source, target, S.blastMult);
}

// Blows the stored charges now (with any number of them). Returns how many charges it had.
function dischargeOvercharge(source, target, mult = 1) {
    const e = target.effects && getEffect(target, STATUS.overcharge.id);
    if (!e) return 0;
    removeEffect(target, e.id);
    fxRing(target, '#ffe066', 1.4, 0.4);
    fxText(target, '¡Descarga!', '#ffe066', 12);
    dealDamage(source || e.data.source, target, e.data.power * mult, 'magical');
    return e.data.stacks;
}

// --- DENT ---
function applyDent(target, stacks = 1) {
    if (!target.isAlive() || !target.effects) return;
    const S = STATUS.dent;
    const n = Math.min(S.max, statusStacks(target, 'dent') + stacks);
    addEffect(target, { id: S.id, name: `${S.name} ×${n}`, duration: S.duration, tags: ['PERJUICIO'], mods: { dmgTakenPct: n * S.takenPerStack }, data: { stacks: n } });
    fxText(target, `▼${n}`, '#c9c9c9', 10, 0.6);
}
// Removes every dent and returns how many there were (for the crusher twist)
function consumeDents(target) {
    const n = statusStacks(target, 'dent');
    if (n) removeEffect(target, STATUS.dent.id);
    return n;
}

// --- OVERHEAT ---
// Magical burn: `dps` per second for `duration`. Re-applying refreshes it and keeps the strongest burn.
function applyOverheat(source, target, dps, duration) {
    if (!target.isAlive() || !target.effects) return;
    const S = STATUS.overheat;
    const prev = getEffect(target, S.id);
    addEffect(target, {
        id: S.id, name: S.name, duration, tags: ['PERJUICIO', 'DAÑO_EN_EL_TIEMPO'], data: { dps: Math.max(dps, prev ? prev.data.dps : 0), source },
        hooks: {
            onTick(owner, { dt }) {
                if (everyInterval(owner, S.id, dt, S.tick) && this.data.source) dealDamage(this.data.source, owner, this.data.dps * S.tick, 'magical');
            }
        }
    });
    shortCircuit(source, target);
}

// Overheat + Overcharge: stuns, removes the burn and blows the charges. true if it happened.
function shortCircuit(source, target) {
    if (!target.isAlive() || !getEffect(target, STATUS.overheat.id) || !getEffect(target, STATUS.overcharge.id)) return false;
    removeEffect(target, STATUS.overheat.id);
    fxText(target, '¡Cortocircuito!', '#ff9f1c', 13, 1.1);
    addEffect(target, { id: 'STUN', name: 'Aturdido', duration: STATUS.shortCircuit.stun, flags: ['stun'] });
    dischargeOvercharge(source, target, 1);
    return true;
}

// --- SPREAD ---
// Copies the show statuses of `from` to every other enemy within `radius` (the "spread" part, data/skillParts.js)
function spreadStatuses(source, from, radius) {
    const charges = getEffect(from, STATUS.overcharge.id), heat = getEffect(from, STATUS.overheat.id);
    const dents = statusStacks(from, 'dent'), marked = !!getEffect(from, STATUS.mark.id);
    if (!charges && !heat && !dents && !marked) return 0;
    const others = enemiesOf(source).filter(e => e !== from && e.isAlive() && Math.hypot(e.x - from.x, e.y - from.y) <= radius);
    others.forEach(e => {
        if (heat) applyOverheat(source, e, heat.data.dps, heat.until - gameClock);
        if (charges) applyOvercharge(source, e, charges.data.stacks, charges.data.power / charges.data.stacks);
        if (dents) applyDent(e, dents);
        if (marked) applyMark(e);
    });
    if (others.length) fxText(from, '¡Contagio!', '#c77dff', 12);
    return others.length;
}

// --- MARKED ---
function applyMark(target) {
    if (!target.isAlive() || !target.effects) return;
    addEffect(target, { id: STATUS.mark.id, name: STATUS.mark.name, duration: STATUS.mark.duration, tags: ['PERJUICIO'] });
    fxText(target, '◎', '#ff5d8f', 13, 0.7);
}
// Called by dealDamage on a direct hit: true (and the mark goes away) if the target was marked
function consumeMark(target) {
    if (!target.effects || !getEffect(target, STATUS.mark.id)) return false;
    removeEffect(target, STATUS.mark.id);
    fxText(target, '¡Marcado!', '#ff5d8f', 12);
    return true;
}
