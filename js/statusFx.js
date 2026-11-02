// What the show statuses (statuses.js) look like (user decision 2026-11-02: the combos have to be readable while
// playing). Two things:
//   badges   a row of small chips under each health bar, one per status with its stacks, plus a crosshair over the
//            head of a Marked unit. Drawn on the 2D canvas on top of the 3D arena (ui.js, render3d).
//   combos   the moment a status pays off (overcharge blowing, short circuit, dents crushed, a mark spent) gets a hit:
//            lightning, particles, a short freeze and screen shake.

const STATUS_LOOK = {
    overcharge: { color: '#ffe066', label: 'Sobrecarga' },
    dent: { color: '#c9c9c9', label: 'Abolladura' },
    overheat: { color: '#ff9f1c', label: 'Recalentado' },
    mark: { color: '#ff5d8f', label: 'Marcado' }
};

// The statuses a unit has right now, in a fixed order: [{ key, n }]
function unitStatuses(u) {
    if (!u.effects || !u.effects.length) return [];
    const out = [];
    const oc = statusStacks(u, 'overcharge'); if (oc) out.push({ key: 'overcharge', n: oc });
    const dn = statusStacks(u, 'dent'); if (dn) out.push({ key: 'dent', n: dn });
    if (getEffect(u, STATUS.overheat.id)) out.push({ key: 'overheat', n: 0 });
    if (getEffect(u, STATUS.mark.id)) out.push({ key: 'mark', n: 0 });
    return out;
}

// --- BADGES ---
const BADGE = 13, BADGE_GAP = 3;
function drawStatusIcon(g, key, cx, cy, t) {
    const c = STATUS_LOOK[key].color;
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 1.6;
    g.beginPath();
    if (key === 'overcharge') { // lightning bolt
        g.moveTo(cx + 1.5, cy - 5); g.lineTo(cx - 2.5, cy + 0.5); g.lineTo(cx + 0.5, cy + 0.5); g.lineTo(cx - 1.5, cy + 5); g.lineTo(cx + 2.8, cy - 1); g.lineTo(cx - 0.2, cy - 1); g.closePath(); g.fill();
    } else if (key === 'dent') { // a dent: a plate pushed in
        g.moveTo(cx - 4.5, cy - 3); g.lineTo(cx, cy + 3); g.lineTo(cx + 4.5, cy - 3); g.stroke();
    } else if (key === 'overheat') { // a flickering flame
        const f = 1 + 0.15 * Math.sin(t * 18);
        g.moveTo(cx, cy - 5 * f); g.quadraticCurveTo(cx + 5, cy, cx, cy + 4.5); g.quadraticCurveTo(cx - 5, cy, cx, cy - 5 * f); g.fill();
    } else { // marked: crosshair
        g.arc(cx, cy, 3.6, 0, Math.PI * 2); g.moveTo(cx - 6, cy); g.lineTo(cx - 2, cy); g.moveTo(cx + 2, cy); g.lineTo(cx + 6, cy);
        g.moveTo(cx, cy - 6); g.lineTo(cx, cy - 2); g.moveTo(cx, cy + 2); g.lineTo(cx, cy + 6); g.stroke();
    }
}

// The chips centered on x, starting at y (just under the health bar), and the crosshair over a marked head (headY)
function drawStatusBadges(g, u, x, y, headY) {
    const list = unitStatuses(u);
    if (!list.length) return;
    const t = fxClock, w = list.length * BADGE + (list.length - 1) * BADGE_GAP;
    g.save();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 9px "Chakra Petch", sans-serif';
    list.forEach((s, i) => {
        const bx = x - w / 2 + i * (BADGE + BADGE_GAP), cx = bx + BADGE / 2, cy = y + BADGE / 2;
        const ready = s.key === 'overcharge' && s.n >= STATUS.overcharge.max - 1; // one more charge and it blows
        g.fillStyle = 'rgba(10,10,14,0.85)'; g.fillRect(bx, y, BADGE, BADGE);
        g.strokeStyle = STATUS_LOOK[s.key].color; g.lineWidth = ready ? 2 : 1;
        g.globalAlpha = ready ? 0.6 + 0.4 * Math.sin(t * 14) : 1;
        g.strokeRect(bx + 0.5, y + 0.5, BADGE - 1, BADGE - 1);
        g.globalAlpha = 1;
        drawStatusIcon(g, s.key, cx, cy, t);
        if (s.n) { // stacks, in the corner
            g.lineWidth = 2.5; g.strokeStyle = '#000'; g.strokeText(s.n, bx + BADGE - 1, y + BADGE - 1);
            g.fillStyle = '#fff'; g.fillText(s.n, bx + BADGE - 1, y + BADGE - 1);
        }
    });
    if (list.some(s => s.key === 'mark')) { // a slowly turning crosshair over the head, so the target can be spotted from afar
        const r = 9, a = t * 2;
        g.translate(x, headY - 22); g.rotate(a);
        g.strokeStyle = STATUS_LOOK.mark.color; g.lineWidth = 2;
        g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
        g.beginPath();
        for (let k = 0; k < 4; k++) { const ang = k * Math.PI / 2; g.moveTo(Math.cos(ang) * (r - 4), Math.sin(ang) * (r - 4)); g.lineTo(Math.cos(ang) * (r + 4), Math.sin(ang) * (r + 4)); }
        g.stroke();
    }
    g.restore();
}

// --- COMBOS ---
// kind: 'discharge' (overcharge blows) · 'short' (short circuit) · 'crush' (dents consumed) · 'mark' (a mark spent)
function fxCombo(unit, kind, n = 0) {
    const arena = fxArena(unit);
    if (!arena) return;
    if (kind === 'discharge' || kind === 'short') {
        const el = ELEMENTS.lightning;
        pushFxAt(arena, { kind: 'skybolt', x: unit.x, y: unit.y, color: el.c2, color2: kind === 'short' ? ELEMENTS.fire.c1 : el.c1, life: 0.4 });
        fxImpact(arena, unit.x, unit.y, 'lightning', true);
        if (kind === 'short') fxParticles(arena, unit.x, unit.y, 'fire', 14, 5);
        fxShake(kind === 'short' ? 5 : 3); fxHitStop(kind === 'short' ? 0.09 : 0.05);
    } else if (kind === 'crush') {
        fxImpact(arena, unit.x, unit.y, 'steel', n >= 3);
        fxParticles(arena, unit.x, unit.y, 'steel', 6 + n * 3, 5);
        fxShake(2 + Math.min(4, n)); fxHitStop(0.03 + 0.015 * Math.min(4, n));
    } else if (kind === 'mark') {
        fxImpact(arena, unit.x, unit.y, 'blood', false);
        fxShake(2); fxHitStop(0.04);
    }
}
