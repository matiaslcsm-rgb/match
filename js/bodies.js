// Cuerpos físicos: las unidades no se atraviesan libremente. Entrar a una casilla ocupada por otra unidad viva (héroe,
// creep o jefe) cuesta más tiempo según el tamaño del que está ahí ("cuerpo blando": nunca te quedás trabado).
// Reglas: DISEÑO.md §8 bis.
//
//   Tamaño     quiénes                                   el paso tarda
//   chico      Chusma, Enjambre (type.size = 'small')    +25%
//   mediano    héroes y creeps normales                  +75%
//   grande     jefes de oleada y jefes de ronda          +150%
//
// Los creeps, además, prueban otro camino libre antes de empujar. Las habilidades que teletransportan o saltan no
// frenan, y con el estado 'phasing' (ej: Paso Fantasma) se atraviesa todo sin frenar.

const BODY_SLOW = { small: 0.25, medium: 0.75, large: 1.5 };
let BODIES_ON = true; // se puede apagar para medir

function bodySize(u) {
    if (u.isRoundBoss || u.isBoss) return 'large';
    if (u.type && u.type.size) return u.type.size;
    return 'medium';
}

// ¿Se puede pisar (x, y)? Dentro del mundo y sin pared (arena.walls: para las columnas de la arena de duelo).
function walkable(arena, x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    return !(arena && arena.walls && arena.walls[y][x]);
}

// ¿Se ve b desde a? Sin columnas en el medio (las paredes de la arena frenan los proyectiles, combat.js).
function lineOfSight(arena, a, b) {
    if (!arena || !arena.walls) return true;
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d * 4);
    for (let i = 1; i < n; i++) if (!walkable(arena, Math.round(a.x + (b.x - a.x) * i / n), Math.round(a.y + (b.y - a.y) * i / n))) return false;
    return true;
}

// Mueve a una unidad a la fuerza, de a una casilla, en la dirección (dx, dy) que venga normalizada. Los jefes no se mueven, ni
// el que está anclado ('anchored'). Se frena antes de una pared o de otro cuerpo. wall: chocó una columna.
function dragUnit(unit, dx, dy, cells) {
    if (unit.isBoss || unit.isRoundBoss || hasFlag(unit, 'anchored')) return { moved: 0, wall: false };
    const x0 = unit.x, y0 = unit.y;
    let moved = 0, wall = false;
    for (let i = 1; i <= cells; i++) {
        const x = Math.round(x0 + dx * i), y = Math.round(y0 + dy * i);
        if (x === unit.x && y === unit.y) continue;
        if (!walkable(unit.arena, x, y)) { wall = !!(unit.arena && unit.arena.walls) && x >= 0 && y >= 0 && x < COLS && y < ROWS; break; }
        if (bodiesAt(unit.arena, x, y, unit).length) break;
        unit.x = x; unit.y = y; moved++;
    }
    if (moved) unit.moveTarget = null;
    return { moved, wall };
}

// Unidades vivas de la arena que ocupan una casilla (sin contar a `self`).
function bodiesAt(arena, x, y, self) {
    if (!arena) return [];
    const heroes = arena.heroes.filter(h => !h.eliminated && !h.inRest && h.isAlive());
    return [...heroes, ...arena.creeps.filter(c => c.isAlive())].filter(u => u !== self && u.x === x && u.y === y);
}

// Cuánto más tarda `unit` en entrar a (x, y): 0 si está libre o si atraviesa cuerpos.
function bodyPenalty(unit, x, y) {
    if (!BODIES_ON || (unit.effects && hasFlag(unit, 'phasing'))) return 0;
    return bodiesAt(unit.arena, x, y, unit).reduce((m, u) => Math.max(m, BODY_SLOW[bodySize(u)]), 0);
}
