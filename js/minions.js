// Aliados invocados: los Autómatas de M.O.R.T.I.S. (docs/competidores/mortis.md). Son unidades armadas como un creep
// (makeCreep), pero viven en arena.minions y pelean para su dueño: atacan a sus enemigos, los creeps y el rival les pegan, y
// sus golpes cuentan como del dueño (oro, experiencia y bajas). Quien destruye uno cobra lo mismo que por un creep común.

const AUTOMATON = { key: 'AUTOMATON', label: 'Autómata Putrefacto', symbol: 'a', color: '#7dff9b', hp: 120, atk: 10, atkSpeed: 0.6, moveInterval: 420, range: 1.5, attackType: 'physical' };
const AUTOMATON_BASE_CAP = 2, AUTOMATON_LIFE = 25, AUTOMATON_FOLLOW = 2;

function minionsOf(owner) { return ((owner.arena && owner.arena.minions) || []).filter(m => m.owner === owner && m.isAlive()); }
function automatonSkill(owner) { const s = SKILL_INDEX.NECROMANCER_AUTOMATON; return skillLevel(owner, s) > 0 ? s : null; }
function automatonCap(owner) { const s = automatonSkill(owner); return s ? val(s, owner, 'cap') : AUTOMATON_BASE_CAP; }

// Casilla libre más cercana a (x, y), o null si está todo ocupado
function freeSpotNear(arena, unit, x, y) {
    for (let r = 1; r <= 4; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        const cx = Math.round(x) + dx, cy = Math.round(y) + dy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkable(arena, cx, cy) && !bodyAt(arena, cx, cy, unit)) return { x: cx, y: cy };
    }
    return null;
}

// Aparece un Autómata al lado de `near`. Vida y daño crecen con la Inteligencia de su dueño, para que sirvan toda la partida.
function summonAutomaton(owner, near = owner) {
    const arena = owner.arena;
    if (!arena || arena.done || minionsOf(owner).length >= automatonCap(owner)) return null;
    const spot = freeSpotNear(arena, owner, near.x, near.y);
    if (!spot) return null;
    const s = automatonSkill(owner), v = key => valueAt(SKILL_INDEX.NECROMANCER_AUTOMATON, key, s ? skillLevel(owner, s) : 1);
    const m = makeCreep(AUTOMATON, spot.x, spot.y, 1, false, 0);
    m.hp = m.maxHp = Math.round(v('hp') + owner.int * v('intHp'));
    m.atk = Math.round(v('atk') + owner.int * v('intAtk'));
    m.gold = CREEP_TYPES.GRUNT.gold; m.xp = CREEP_TYPES.GRUNT.xp;
    Object.assign(m, { isMinion: true, owner, arena, expires: gameClock + AUTOMATON_LIFE });
    (arena.minions = arena.minions || []).push(m);
    fxRing(m, AUTOMATON.color, 1, 0.5);
    return m;
}
function destroyMinion(m) { m.hp = 0; fxDeath(m); }

// El duelo arranca con Autómatas: el Sello invoca al matar, y en un duelo eso ya lo termina (decisión del usuario; 2 medido con el banco).
const DUEL_AUTOMATONS = 2;
function duelAutomaton(hero) {
    if (skillLevel(hero, SKILL_INDEX.NECROMANCER_AUTOMATON) > 0 || skillLevel(hero, SKILL_INDEX.NECROMANCER_SEAL) > 0) for (let i = 0; i < DUEL_AUTOMATONS; i++) summonAutomaton(hero);
}

function updateMinions(arena, dt) {
    if (!arena.minions || !arena.minions.length) return;
    arena.minions.forEach(m => {
        if (!m.isAlive()) return;
        if (gameClock >= m.expires) { destroyMinion(m); return; }
        if (hasFlag(m, 'stun')) return;
        const target = nearestEnemy(m), rooted = hasFlag(m, 'root');
        if (!target) {
            const o = m.owner;
            if (!rooted && Math.hypot(o.x - m.x, o.y - m.y) > AUTOMATON_FOLLOW) stepCreepToward(m, o.x, o.y, dt);
            return;
        }
        if (Math.hypot(target.x - m.x, target.y - m.y) > m.range) { if (!rooted) stepCreepToward(m, target.x, target.y, dt); return; }
        m.attackTimer += dt;
        if (m.attackTimer < 1 / effAtkSpeed(m)) return;
        m.attackTimer = 0;
        fxAttack(m, target, 'melee');
        dealDamage(m.owner, target, Math.round(effAttack(m)), 'physical', { isAttack: true, fullDuelDamage: true });
    });
    arena.minions = arena.minions.filter(m => m.isAlive());
}
