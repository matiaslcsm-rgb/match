// Cuerpos sólidos (pedido del usuario 2026-10-30): nadie pisa ni atraviesa a nadie, como en un MOBA. Una casilla con una
// unidad viva está ocupada; solo el que está en fase ('phasing', ej: Paso Fantasma) pasa por encima de los demás, y a él
// tampoco lo choca nadie. El que se topa con alguien rodea (bodyStep). Si un salto o un teletransporte cae encima de otro, al
// cuadro siguiente pasa a la casilla libre más cercana (separateBodies). Reglas: DISEÑO.md §8 bis.

let BODIES_ON = true; // se puede apagar para medir

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
        if (bodyAt(unit.arena, x, y, unit)) break;
        unit.x = x; unit.y = y; moved++;
    }
    if (moved) unit.moveTarget = null;
    return { moved, wall };
}

// Corre muchas veces por cuadro, por eso son bucles simples y no listas nuevas. El que está en fase no ocupa lugar.
function bodyBlocks(u, x, y, self) { return u !== self && u.x === x && u.y === y && u.isAlive() && !u.eliminated && !u.inRest && !(u.effects && hasFlag(u, 'phasing')); }
function bodyAt(arena, x, y, self) {
    if (!arena) return false;
    for (const u of arena.creeps) if (bodyBlocks(u, x, y, self)) return true;
    for (const u of arena.heroes) if (bodyBlocks(u, x, y, self)) return true;
    if (arena.minions) for (const u of arena.minions) if (bodyBlocks(u, x, y, self)) return true;
    return false;
}

// ¿`unit` se puede parar en (x, y)? El que está en fase pasa por arriba de todos.
function bodyFree(unit, x, y) {
    return !BODIES_ON || (unit.effects && hasFlag(unit, 'phasing')) || !bodyAt(unit.arena, x, y, unit);
}
function canStep(unit, x, y) {
    const a = unit.arena, cut = x !== unit.x && y !== unit.y && (!walkable(a, x, unit.y) || !walkable(a, unit.x, y)); // no corta esquinas de columnas
    return walkable(a, x, y) && !cut && bodyFree(unit, x, y);
}
// Casilla vecina libre para seguir hacia (gx, gy) cuando la directa está ocupada: la que más acerca, sin volver para atrás.
// null: no hay por dónde (rodeado: se queda).
function bodyStep(unit, gx, gy) {
    const here = Math.hypot(gx - unit.x, gy - unit.y);
    let best = null, bestD = here + 0.75;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const x = unit.x + dx, y = unit.y + dy;
        if ((!dx && !dy) || !canStep(unit, x, y)) continue;
        const d = Math.hypot(gx - x, gy - y);
        if (d < bestD) { bestD = d; best = { x, y }; }
    }
    return best;
}

// Si dos quedaron en la misma casilla (un salto, el fin de una fase, una oleada que aparece), el que llegó después pasa a la
// casilla libre más cercana. Los jefes no se corren.
function separateBodies(arena) {
    if (!BODIES_ON) return;
    const grid = new Uint8Array(COLS * ROWS), key = (x, y) => y * COLS + x, solid = u => u.isAlive() && !u.eliminated && !u.inRest && !(u.effects && hasFlag(u, 'phasing'));
    let stacked = false;
    const minions = arena.minions || [];
    for (const list of [arena.creeps, arena.heroes, minions]) for (const u of list) if (solid(u)) { if (grid[key(u.x, u.y)]++) stacked = true; }
    if (!stacked) return; // lo normal: nadie encimado
    grid.fill(0);
    [...arena.creeps, ...arena.heroes, ...minions].filter(solid).sort((a, b) => !!(b.isBoss || b.isRoundBoss) - !!(a.isBoss || a.isRoundBoss)).forEach(u => {
        if (grid[key(u.x, u.y)]) {
            search: for (let r = 1; r < COLS; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
                const x = u.x + dx, y = u.y + dy;
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !walkable(arena, x, y) || grid[key(x, y)]) continue;
                u.x = x; u.y = y;
                break search;
            }
        }
        grid[key(u.x, u.y)] = 1;
    });
}
