// Pruebas automáticas del juego. Se ejecutan solas al abrir tests.html (o index.html?test) y muestran
// un panel con el resultado de cada una. Jugando normal no corren.
//
// Para agregar una prueba: test('nombre', () => { ...; checkEq(obtenido, esperado, 'qué se mide'); });
// Por defecto Math.random devuelve 0.99 (sin críticos, sin esquives, sin aturdir por azar) para que los
// resultados sean predecibles. Con { random: true } la prueba usa azar real.

const TESTS = [];
function test(name, fn, opts = {}) { TESTS.push({ name, fn, opts }); }

function check(cond, msg) { if (!cond) throw new Error(msg); }
function checkEq(actual, expected, msg) {
    if (actual !== expected) throw new Error(`${msg}: se esperaba ${show(expected)} y dio ${show(actual)}`);
}
// Bichos y héroes tienen referencias circulares (arena ↔ creeps): se muestran por su nombre
function show(v) { try { return JSON.stringify(v); } catch (e) { return v.label || v.name || String(v); } }
function checkNear(actual, expected, msg, tolerance = 0.001) {
    if (Math.abs(actual - expected) > tolerance) throw new Error(`${msg}: se esperaba ${expected} y dio ${actual}`);
}

function withRandom(value, fn) {
    const original = Math.random;
    Math.random = typeof value === 'function' ? value : () => value;
    try { return fn(); } finally { Math.random = original; }
}

// --- AYUDAS PARA ARMAR ESCENARIOS ---
// Oleada fija de Grunts para que las pruebas no dependan del tema sorteado.
const TEST_WAVE = { name: 'Prueba', groups: [{ type: 'GRUNT', count: 10 }], boss: 'GRUNT' };

// Partida en curso con el héroe elegido, en medio de una oleada, con todos los creeps lejos (x = 19).
function newGame(heroKey) {
    resetGame();
    selectHero(HERO_TEMPLATES[heroKey]);
    showPanel('draft-container', false);
    gameState = 'WAVE';
    player.inRest = false;
    arenas = [makeArena('wave', [player])];
    spawnWave(player.arena, TEST_WAVE);
    resetWaveTimer();
    creeps.forEach(c => { c.x = 19; c.spawnX = 19; });
    player.x = 5; player.y = 5;
    return player;
}
function learn(id, level) {
    const skill = SKILL_INDEX[id];
    player.addSkill(skill);
    player.skillLevels[id] = level;
    return skill;
}
// Un creep común (ni jefe ni de un golpe) al lado del jugador, sin armadura salvo que se indique.
function dummy(props = {}) {
    const c = creeps.find(k => k.isAlive() && !k.oneHit && !k.isBoss && !k.__used);
    c.__used = true;
    Object.assign(c, { x: player.x + 1, y: player.y, armor: 0, magicResist: 0 }, props);
    return c;
}
// Avanza el reloj de la oleada hasta que el jugador reviva.
function waitRespawn() { gameClock = player.respawnAt; updateWave(0.016); }
// Termina todos los duelos en curso por tiempo (gana el de más % de vida; empate al azar).
function skipDuels() {
    const duels = arenas.filter(a => a.kind === 'duel' && !a.done);
    if (!duels.length) return;
    duels.forEach(a => { a.elapsed = DUEL_TIME; });
    updateWave(0.016);
}
// Mata a todos los creeps de todas las arenas (si estaba la previa de apuestas, la saltea primero). El duelo de la ronda
// sigue en curso: se termina con skipDuels.
function clearAllWaves(skipBetting = true) {
    if (skipBetting && gameState === 'BETTING') endBetting();
    heroes.forEach(h => { if (h.arena) h.arena.creeps.forEach(c => { c.hp = 0; }); });
    updateWave(0.016);
}
function duelArena() { return arenas.find(a => a.kind === 'duel') || null; }
function lastLog() { const p = document.querySelector('#combat-log p:last-child'); return p ? p.textContent : ''; }

// ============================================================ CONTENIDO
test('El contenido del juego es válido (validador)', () => {
    const problems = validateContent();
    checkEq(problems.length, 0, 'problemas: ' + problems.join(' | '));
});

// ============================================================ ATRIBUTOS
test('Atributos de nivel 1 salen de la plantilla del héroe', () => {
    const h = new Hero(HERO_TEMPLATES.CRANE);
    checkEq(h.str, 24, 'Fuerza base');
    checkEq(h.maxHp, HERO_TEMPLATES.CRANE.baseHp + 24 * 5, 'HP = base + 5 por Fuerza');
    checkEq(h.atk, Math.round(HERO_TEMPLATES.CRANE.baseAtk + 24 * 0.8), 'daño = base + 0.8 por atributo principal');
    checkNear(h.armor, HERO_TEMPLATES.CRANE.baseArmor + 12 * 0.08, 'armadura = base + 0.08 por Agilidad');
    checkNear(h.magicResist, HERO_TEMPLATES.CRANE.baseMagicResist + 14 * 0.1, 'resistencia mágica = base + 0.1 por Inteligencia');
});

test('Subir de nivel suma atributos (más en el principal)', () => {
    newGame('REC');
    const agi0 = player.agi, str0 = player.str;
    gainXp(player, xpToNext(1));
    checkEq(player.level, 2, 'nivel');
    checkNear(player.agi - agi0, 3.0, 'Agilidad ganada (principal)');
    checkNear(player.str - str0, 2.0, 'Fuerza ganada');
});

// ============================================================ DAÑO
test('Daño físico: la armadura reduce 4% por punto', () => {
    newGame('CRANE');
    const c = dummy({ armor: 5, hp: 9999, maxHp: 9999 });
    checkEq(dealDamage(player, c, 100, 'physical').dealt, 80, 'daño con 5 de armadura');
    const c2 = dummy({ armor: 50, hp: 9999, maxHp: 9999 });
    checkEq(dealDamage(player, c2, 100, 'physical').dealt, 20, 'la armadura reduce como máximo 80%');
});

test('Daño mágico: resistencia mágica y amplificación de hechizo', () => {
    newGame('CRANE');
    const c = dummy({ magicResist: 20, hp: 9999, maxHp: 9999 });
    const expected = Math.round(100 * (1 + player.spellAmp / 100) * 0.8);
    checkEq(dealDamage(player, c, 100, 'magical').dealt, expected, 'daño mágico');
    checkEq(dealDamage(player, c, 100, 'pure').dealt, 100, 'el daño puro ignora todo');
});

test('El esquive solo afecta a los ataques básicos', () => {
    newGame('CRANE');
    const c = dummy();
    player.evasion = 100;
    check(dealDamage(c, player, 10, 'physical', { isAttack: true }).evaded, 'un ataque básico se esquiva');
    check(!dealDamage(c, player, 10, 'physical').evaded, 'una habilidad no se esquiva');
});

test('Invulnerable no recibe daño; los creeps de un golpe mueren con cualquier golpe', () => {
    newGame('CRANE');
    addEffect(player, { id: 'T', duration: 5, flags: ['invulnerable'] });
    const hp = player.hp;
    dealDamage(creeps[0], player, 500, 'pure');
    checkEq(player.hp, hp, 'vida del invulnerable');
    const chusma = makeCreep(CREEP_TYPES.CHUSMA, 6, 5, 1, false, 0);
    chusma.arena = player.arena;
    creeps.push(chusma);
    dealDamage(player, chusma, 1, 'physical');
    check(!chusma.isAlive(), 'la Chusma muere de un golpe');
});

// ============================================================ HABILIDADES Y NIVELES
test('Habilidad en nivel 0 no se lanza; en nivel 1 cobra maná y enfriamiento', () => {
    newGame('CRANE');
    const s = learn('VAMP_CLAW', 0);
    const d = dummy({ hp: 9999, maxHp: 9999 });
    const mana = player.mana;
    handleSkillKeypress('q');
    checkEq(player.mana, mana, 'maná en nivel 0');
    checkEq(targeting, null, 'en nivel 0 ni siquiera se apunta');
    player.skillLevels[s.id] = 1;
    handleSkillKeypress('q'); // lanzamiento al instante (estilo Hades): sin cursor, al enemigo más cercano
    checkEq(targeting, null, 'sin paso extra de apuntar');
    checkEq(mana - player.mana, valueAt(s, 'manaCost', 1), 'maná gastado');
    checkNear(player.cooldowns[s.id], valueAt(s, 'cooldown', 1) * COOLDOWN_MULT, 'enfriamiento (25% más corto)');
});

test('Sin objetivo en rango no se cobra maná ni enfriamiento', () => {
    newGame('VAMPIRE');
    const s = learn('VAMP_LEAP', 1);
    const mana = player.mana;
    handleSkillKeypress('q');
    checkEq(player.mana, mana, 'maná');
    checkEq(player.cooldowns[s.id], 0, 'enfriamiento');
});

test('Teclas por tipo: definitivas en R, D y F; pasivas en W y E; activas en Q', () => {
    newGame('CRANE');
    const fake = (id, kind, isUltimate) => { const s = { id, kind, isUltimate, values: {} }; player.addSkill(s); return player.keyBindings[id]; };
    checkEq(fake('A1', 'active'), 'q', 'la activa');
    checkEq(fake('P1', 'passive'), 'w', 'la pasiva');
    checkEq(fake('P2', 'passive'), 'e', 'la segunda pasiva');
    checkEq(fake('U1', 'active', true), 'r', 'la definitiva');
    checkEq(fake('U2', 'active', true), 'd', 'la segunda definitiva');
    checkEq(fake('U3', 'active', true), 'f', 'la tercera definitiva');
    checkEq(fake('A2', 'active'), 't', 'otra activa, a lo libre');
});

test('Acomodar habilidades: se mueven e intercambian', () => {
    newGame('CRANE');
    const fake = (id, kind) => { player.addSkill({ id, kind, values: {} }); };
    fake('A1', 'active'); fake('P1', 'passive');
    assignSkillKey(player, 'A1', 'w');
    checkEq(player.keyBindings.A1, 'w', 'la pone donde querés');
    checkEq(player.keyBindings.P1, 'q', 'y la otra se intercambia');
    assignSkillKey(player, 'P1', 'v');
    checkEq(player.keyBindings.P1, 'v', 'a una tecla libre');
    toggleSkillKeys(true);
    checkEq(document.querySelectorAll('#skill-keys-list .sk-cap').length, SKILL_KEYS.length, 'una casilla por tecla');
    toggleSkillKeys(false);
    check(!setKey('shop', 'w'), 'la W no se le puede dar a otra acción');
    check(!setKey('shop', '3'), 'ni las de los ítems');
});

test('Definitiva: niveles 1/2/3 recién en los niveles 6/12/18 del héroe', () => {
    newGame('CRANE');
    const ult = learn('CRANE_DEMOLITION', 0);
    player.skillPoints = 10;
    player.level = 5; check(!levelUpSkill(player, ult), 'nivel 5 no alcanza');
    player.level = 6; check(levelUpSkill(player, ult), 'nivel 6 sube a 1');
    check(!levelUpSkill(player, ult), 'no sube a 2 en nivel 6');
    player.level = 12; check(levelUpSkill(player, ult), 'nivel 12 sube a 2');
    player.level = 18; check(levelUpSkill(player, ult), 'nivel 18 sube a 3');
    check(!levelUpSkill(player, ult), 'máximo 3 niveles');
});

test('Puntos sin gastar se guardan; con el kit al máximo se vuelven atributos', () => {
    newGame('CRANE');
    ['CRANE_CABIN', 'CRANE_ANCHOR', 'CRANE_BEAM'].forEach(id => learn(id, 4));
    learn('CRANE_DEMOLITION', 1);
    player.level = 10; player.skillPoints = 3;
    resolveExcessPoints(player);
    checkEq(player.skillPoints, 3, 'puntos guardados esperando nivel 12');
    player.level = 18; levelUpSkill(player, SKILL_INDEX.CRANE_DEMOLITION); levelUpSkill(player, SKILL_INDEX.CRANE_DEMOLITION);
    const str0 = player.str;
    checkEq(player.skillPoints, 0, 'el punto sobrante se convirtió');
    checkNear(str0 - 24, 1, 'Fuerza +1 por el punto sobrante');
});

test('Experiencia: cada nivel da 1 punto de habilidad', () => {
    newGame('VAMPIRE');
    gainXp(player, xpToNext(1) + xpToNext(2) + xpToNext(3));
    checkEq(player.level, 4, 'nivel');
    checkEq(player.skillPoints, 4, 'puntos (1 inicial + 3)');
});

// ============================================================ DRAFT Y DESTINO
test('Draft: 3 opciones distintas y siempre al menos 1 natural', () => {
    newGame('CRANE');
    for (let i = 0; i < 200; i++) {
        const o = draftOptions(player, 3);
        checkEq(o.length, 3, 'cantidad de opciones');
        checkEq(new Set(o.map(s => s.id)).size, 3, 'opciones repetidas');
        check(o.some(s => s.heroKey === 'CRANE'), 'falta la habilidad natural');
    }
}, { random: true });

test('Fragmento del Destino: quita una, devuelve puntos, ofrece 4 sin la quitada', () => {
    newGame('ZEUS');
    learn('ZEUS_ARC', 2); learn('ZEUS_NIMBUS', 1);
    player.skillPoints = 0; player.destiny.fragments = 1;
    gameState = 'PREP';
    withRandom(0, () => useFragment()); // quita la primera: Rayo Arco (nivel 2)
    checkEq(gameState, 'DRAFT', 'abre el draft');
    checkEq(player.skillPoints, 2, 'puntos devueltos');
    check(!player.hasSkill('ZEUS_ARC'), 'la habilidad fue quitada');
    const names = [...document.querySelectorAll('#draft-options .skill-card h4')].map(h => h.textContent);
    checkEq(names.length, 4, 'opciones');
    check(!names.includes('Rayo Arco'), 'no ofrece la quitada');
    document.querySelector('#draft-options .skill-card').click();
    checkEq(player.keyBindings[player.skills[1].id], SKILL_KEY_ORDER[player.skills[1].kind === 'passive' ? 'passive' : 'active'][0], 'la nueva toma la tecla de su tipo que quedó libre');
});

// Antes, el botón de la tienda le pasaba el clic a startWave como si fuera el plan del duelo: la ronda se cortaba sin
// oleada y volvía al draft (2026-10-13)
test('El botón "Comenzar oleada" de la tienda arranca la oleada', () => {
    newGame('CRANE');
    gameState = 'PREP'; waveNumber = 1;
    document.getElementById('start-wave-btn').click();
    checkEq(gameState, 'WAVE', 'empieza la oleada');
    check(arenas.length > 0 && arenas.some(a => a.heroes.includes(player)), 'hay una arena con el jugador');
    check(player.arena && player.arena.creeps.length > 0, 'hay creeps');
});

test('Libro del Destino: elegís cuál cambiar y ofrece 6', () => {
    newGame('ZEUS');
    learn('ZEUS_ARC', 1); learn('ZEUS_NIMBUS', 3);
    player.skillPoints = 0; player.destiny.books = 1;
    gameState = 'PREP';
    useBook();
    document.querySelectorAll('#draft-options .skill-card')[1].click(); // cambia Nimbo de Tormenta
    checkEq(player.skillPoints, 3, 'puntos devueltos');
    checkEq(document.querySelectorAll('#draft-options .skill-card').length, 6, 'opciones');
});

test('Vender un Fragmento del Destino', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.destiny.fragments = 1;
    const gold = player.gold;
    sellFragment();
    checkEq(player.gold - gold, FRAGMENT_SELL_PRICE, 'oro');
    checkEq(player.destiny.fragments, 0, 'fragmentos');
});

// ============================================================ INNATOS Y SINERGIAS
test('Hambre + Sangre Oscura multiplican el robo de vida', () => {
    newGame('VAMPIRE');
    const c = dummy({ hp: 10, maxHp: 100 }); // <30% HP
    player.hp = 10; applyLifesteal(player, 100, c);
    const ls = HERO_TEMPLATES.VAMPIRE.baseLifesteal / 100;
    checkEq(player.hp - 10, Math.round(100 * ls * 2), 'Hambre duplica contra <30% HP');
    const dark = learn('VAMP_DARKBLOOD', 1);
    player.hp = 10; applyLifesteal(player, 100, c);
    checkEq(player.hp - 10, Math.round(100 * ls * (2 + darkBloodSteps(player) * val(dark, player, 'lifestealPerStep'))), 'Sangre Oscura suma al multiplicador según la vida que falta');
});

test('Hambre: cada baja cura 5% de la vida máxima', () => {
    newGame('VAMPIRE');
    player.hp = 50;
    dealDamage(player, dummy(), 99999, 'pure');
    checkEq(player.hp - 50, Math.round(player.maxHp * 0.05), 'curación por baja');
});

test('Velocidad Letal: +5% por golpe al mismo objetivo, se reinicia al cambiar', () => {
    newGame('ASSASSIN');
    const a = dummy({ hp: 9999, maxHp: 9999 }), b = dummy({ y: player.y + 1 });
    learn('ASSASSIN_LETHALSPEED', 2).cast(player);
    const base = effAttack(player);
    const hits = [1, 2, 3].map(() => rollAttackDamage(player, a).dmg);
    checkEq(hits.join(','), [0, 1, 2].map(k => Math.round(base * (1 + k * 0.05))).join(','), 'combo');
    checkEq(rollAttackDamage(player, b).dmg, Math.round(base), 'al cambiar de objetivo se reinicia');
});

// ============================================================ DEFINITIVAS Y ASCENSO
test('Masacre: cada baja extiende la duración y da crítico permanente', () => {
    newGame('ASSASSIN');
    const ult = learn('ASSASSIN_MASACRE', 2);
    ult.cast(player);
    const until = getEffect(player, 'ASSASSIN_MASACRE').until, crit = player.critChance;
    dealDamage(player, dummy(), 99999, 'pure'); dealDamage(player, dummy(), 99999, 'pure');
    checkNear(getEffect(player, 'ASSASSIN_MASACRE').until - until, 2 * valueAt(ult, 'extendPerKill', 2), 'extensión');
    checkNear(player.critChance - crit, 2 * valueAt(ult, 'critPerKill', 2), 'crítico permanente');
});

test('Forma Inmortal: no baja de 1, paga al terminar y da HP máximo por curación', () => {
    newGame('VAMPIRE');
    const ult = learn('VAMP_IMMORTAL', 1);
    ult.cast(player);
    const hpMax = player.maxHp;
    player.hp = 10; healUnit(player, 120);
    checkEq(player.maxHp - hpMax, 2 * valueAt(ult, 'hpPerStep', 1), 'HP máximo por cada 50 curados');
    player.hp = 50;
    dealDamage(creeps[0], player, 1000, 'pure');
    checkEq(player.hp, 1, 'no baja de 1');
    gameClock += 10; tickEffects(player, 0.016);
    checkEq(player.lives, 1, 'el costo al terminar lo mató (pierde una vida)');
    check(!player.isAlive(), 'queda muerto esperando revivir');
    waitRespawn();
    check(!!getEffect(player, 'TITAN_WILL'), 'y revive con Voluntad de Titán');
});

// ============================================================ MUERTE
test('Morir: 3s muerto, los creeps pierden el agro y vuelven a su lugar', () => {
    newGame('CRANE');
    const c = dummy({ atk: 9999, attackTimer: 99, spawnX: 15, spawnY: 5 });
    player.hp = 1;
    updateCreep(c, 0.016);
    checkEq(player.lives, 1, 'pierde una vida');
    check(!player.isAlive(), 'queda muerto');
    checkNear(player.respawnAt - gameClock, RESPAWN_DELAY, 'tiempo para revivir');
    const x0 = c.x;
    for (let i = 0; i < 20; i++) { gameClock += 0.1; updateWave(0.1); }
    check(c.x > x0, 'el creep se aleja hacia su lugar de aparición');
    check(!player.isAlive(), 'sigue muerto antes de los 3s');
    waitRespawn();
    check(player.isAlive(), 'revive a los 3s');
});

test('Voluntad de Titán: revive en el lugar, inmortal, x2 vel. ataque y sin maná', () => {
    newGame('CRANE');
    const s = learn('CRANE_BEAM', 1);
    const c = dummy({ atk: 9999, attackTimer: 99 });
    player.hp = 1;
    updateCreep(c, 0.016);
    waitRespawn();
    checkEq(player.hp, player.maxHp, 'vida llena');
    checkEq([player.x, player.y].join(','), '5,5', 'revive en el lugar');
    checkNear(effAtkSpeed(player) / player.atkSpeed, 1 + TITAN_WILL.atkSpeedPct, 'velocidad de ataque');
    dealDamage(c, player, 500, 'pure');
    checkEq(player.hp, player.maxHp, 'no recibe daño');
    player.mana = 0; c.x = 6; c.y = 5; handleSkillKeypress('q');
    check(player.cooldowns[s.id] > 0, 'lanza sin maná');
    gameClock += TITAN_WILL.duration + 0.1; tickEffects(player, 0.016);
    check(!getEffect(player, 'TITAN_WILL'), 'dura ' + TITAN_WILL.duration + 's');
});

test('Sin vidas contra creeps: queda eliminado (espectador)', () => {
    newGame('CRANE');
    player.lives = 1; player.hp = 1;
    const c = dummy({ atk: 9999, attackTimer: 99 });
    updateCreep(c, 0.016);
    checkEq(player.lives, 0, 'vidas');
    check(player.eliminated, 'eliminado sin pasar por Condenado');
});

test('Los creeps nunca maldicen (aunque queden 3 héroes)', () => {
    newGame('CRANE');
    heroes.slice(3).forEach(h => { h.eliminated = true; });
    player.hp = 1;
    updateCreep(dummy({ atk: 9999, attackTimer: 99 }), 0.016);
    checkEq(player.lives, 1, 'perdió una vida');
    check(!isCondemned(player), 'sin maldición');
});

test('Condenado: si lo mata un creep queda eliminado (una sola vez aunque peguen varios)', () => {
    newGame('CRANE');
    player.lives = 0; setCondemned(player, 0.1); player.hp = 1;
    const attackers = [[4, 5], [6, 5], [5, 4], [5, 6]].map(([x, y]) => dummy({ x, y, attackTimer: 99, atk: 999 }));
    attackers.forEach(c => updateCreep(c, 0.016));
    check(player.eliminated, 'quedó eliminado');
    checkEq([...document.querySelectorAll('#combat-log p')].filter(p => p.textContent.includes('ELIMINADO')).length, 1, 'mensajes de eliminación');
});

test('Condenado: cada duelo perdido suma +10% de daño recibido', () => {
    newGame('CRANE');
    setCondemned(player, CONDEMNED.initialPct);
    registerDuelLoss(player); registerDuelLoss(player);
    checkNear(player.condemnPct, 0.30, '10% + 2 duelos');
    checkNear(sumMod(player, 'dmgTakenPct'), 0.30, 'el efecto aplica el 30%');
});

test('Libro de talento: +5 permanentes al atributo, sin espacio, y cada libro encarece el siguiente', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 5000;
    const str = player.str, hp = player.maxHp, slots = player.inventory.length;
    checkEq(itemCost(ITEMS.TALENT_STR, player), 500, 'primer precio');
    check(buyItem(ITEMS.TALENT_STR), 'se compra');
    checkNear(player.str, str + 5, '+5 Fuerza');
    checkEq(player.maxHp, hp + 5 * ATTRIBUTE_RULES.str.hp, 'la Fuerza suma vida');
    checkEq(player.inventory.length, slots, 'no ocupa espacio');
    checkEq(itemCost(ITEMS.TALENT_INT, player), 750, 'el siguiente (de cualquier atributo) cuesta +250');
    buyItem(ITEMS.TALENT_INT);
    checkEq(player.gold, 5000 - 500 - 750, 'cobró 500 + 750');
    checkEq(itemCost(ITEMS.TALENT_AGI, player), 1000, 'y sigue subiendo');
});

test('Injusticia de los Codiciosos: solo Condenado, vida y precio doble', () => {
    newGame('CRANE');
    check(!itemAvailable(ITEMS.GREED, player), 'no aparece sin estar Condenado');
    player.lives = 1; setCondemned(player, 0.3);
    check(itemAvailable(ITEMS.GREED, player), 'aparece estando Condenado');
    checkEq(itemCost(ITEMS.GREED, player), GREED.baseCost, 'primer precio');
    gameState = 'PREP'; player.gold = 1000;
    buyItem(ITEMS.GREED);
    checkEq(player.lives, 2, 'compró una vida');
    check(!isCondemned(player), 'deja de estar Condenado');
    checkEq(itemCost(ITEMS.GREED, player), GREED.baseCost * 2, 'la próxima cuesta el doble');
});

test('Oleada: pasado el límite los creeps se enfurecen', () => {
    newGame('CRANE');
    checkEq(enrageMult(), 1, 'sin enfurecer al empezar');
    tickWaveTimer(WAVE_TIME.limit + 10);
    checkNear(enrageMult(), 1 + 10 * WAVE_TIME.enragePerSecond, '10s de más');
    const c = dummy({ atk: 100, attackTimer: 99 });
    const hp = player.hp;
    updateCreep(c, 0.016);
    const expected = Math.round(mitigate(player, Math.round(100 * enrageMult()), 'physical'));
    checkEq(hp - player.hp, expected, 'el golpe del creep enfurecido');
});

test('Temporizadores: al vencer, el juego elige por vos', () => {
    resetGame();
    startHeroPick();
    tickPhaseTimer(PHASE_TIMES.heroSelect + 1);
    checkEq(gameState, 'DRAFT', 'elige un héroe al azar y pasa al draft');
    tickPhaseTimer(PHASE_TIMES.draft + 1);
    checkEq(player.skills.length, 1, 'elige una habilidad al azar');
    checkEq(gameState, 'PREP', 'pasa a preparación');
    tickPhaseTimer(PHASE_TIMES.prep + 1);
    checkEq(gameState, 'WAVE', 'empieza la oleada');
});

test('Usar un Fragmento no reinicia el tiempo de preparación', () => {
    newGame('CRANE');
    learn('CRANE_BEAM', 0);
    gameState = 'PREP'; setPhaseTimer(12); player.destiny.fragments = 1;
    useFragment();
    document.querySelector('#draft-options .skill-card').click();
    checkEq(gameState, 'PREP', 'vuelve a preparación');
    checkEq(phaseTimeLeft, 12, 'con el tiempo que le quedaba');
});

test('Magos (Inteligencia): amplificación de hechizo extra respecto a un no-mago', () => {
    const mage = new Hero({ ...HERO_TEMPLATES.CRANE, primaryAttr: 'INT' });
    const warrior = new Hero(HERO_TEMPLATES.CRANE);
    checkNear(mage.spellAmp - warrior.spellAmp, ATTRIBUTE_RULES.mageSpellAmp, 'amplificación extra');
});

// ============================================================ CONTROL
test('Aturdido no se mueve; ralentizar reduce la velocidad', () => {
    newGame('VAMPIRE');
    const c = dummy({ x: 10 });
    addEffect(c, { id: 'STUN', duration: 1, flags: ['stun'] });
    c.moveTimer = 99999; updateCreep(c, 0.05);
    checkEq(c.x, 10, 'posición del aturdido');
    removeEffect(c, 'STUN');
    c.x = 8; c.hp = c.maxHp = 9999;
    learn('VAMP_LEAP', 1).cast(player);
    checkNear(effMoveMult(c), 1 - SKILL_INDEX.VAMP_LEAP.values.slow, 'Salto Sangriento ralentiza');
});

// ============================================================ MAGOS Y MOTOR
test('Pasiva en nivel 0 no hace nada; en nivel 1 actúa una vez por segundo', () => {
    newGame('FROSTWITCH');
    const aura = learn('FROSTWITCH_AURA', 0);
    const c = dummy({ hp: 9999, maxHp: 9999 });
    for (let i = 0; i < 60; i++) tickEffects(player, 1 / 60);
    checkEq(c.hp, 9999, 'nivel 0: sin daño');
    player.skillLevels[aura.id] = 1;
    for (let i = 0; i < 59; i++) tickEffects(player, 1 / 60);
    check(c.hp > 9999 - 1, 'todavía no pasó un segundo');
    tickEffects(player, 1 / 60); tickEffects(player, 1 / 60);
    check(c.hp < 9999, 'al segundo hace daño');
});

test('Resonancia Arcana: +8% de amplificación por carga (máx. 5)', () => {
    newGame('ARCANIST');
    const base = effSpellAmp(player);
    for (let i = 0; i < 7; i++) emit(player, 'onCast', { skill: null });
    checkNear(effSpellAmp(player) - base, 40, '5 cargas');
});

test('Escarcha Profunda: el daño mágico ralentiza 15%', () => {
    newGame('FROSTWITCH');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    dealDamage(player, c, 10, 'physical');
    checkEq(effMoveMult(c), 1, 'el físico no ralentiza');
    dealDamage(player, c, 10, 'magical');
    checkNear(effMoveMult(c), 0.85, 'el mágico sí');
});

test('Armadura de Escarcha: +armadura y ralentiza el ataque de quien te pega', () => {
    newGame('FROSTWITCH');
    const armor0 = effArmor(player);
    const s = learn('FROSTWITCH_ARMOR', 1);
    s.cast(player);
    checkNear(effArmor(player) - armor0, valueAt(s, 'armorBonus', 1), 'armadura');
    const c = dummy();
    dealDamage(c, player, 10, 'physical');
    checkNear(effAtkSpeed(c) / c.atkSpeed, 1 - valueAt(s, 'attackerSlow', 1), 'velocidad de ataque del atacante');
});

test('Pulverización Ácida: quita armadura y hace daño por segundo', () => {
    newGame('ALCHEMIST');
    const s = learn('ALCHEMIST_ACID', 1);
    const c = dummy({ armor: 3, hp: 9999, maxHp: 9999 });
    s.cast(player);
    checkNear(effArmor(c), 3 - valueAt(s, 'armorReduction', 1), 'armadura del enemigo');
    for (let i = 0; i < 61; i++) tickEffects(c, 1 / 60);
    check(c.hp < 9999, 'daño por segundo');
});

test('Paso Etéreo: +20% de evasión al lanzar', () => {
    newGame('VOIDSAGE');
    const ev = effEvasion(player);
    emit(player, 'onCast', { skill: null });
    checkNear(effEvasion(player) - ev, 20, 'evasión');
});

test('Sobrecarga Mágica: el ataque después de lanzar suma daño mágico una sola vez', () => {
    newGame('ARCANIST');
    learn('ARCANIST_SURGE', 1);
    const c = dummy({ hp: 9999, maxHp: 9999 });
    emit(player, 'onCast', { skill: null });
    resolveBasicHit(player, c, 10, false);
    const withSurge = 9999 - c.hp;
    c.hp = 9999;
    resolveBasicHit(player, c, 10, false);
    check(withSurge > 9999 - c.hp, 'el primer golpe hace daño extra');
    checkEq(9999 - c.hp, 10, 'el segundo golpe es normal');
});

test('Furia Química: el Ascenso sube la Inteligencia', () => {
    newGame('ALCHEMIST');
    const s = learn('ALCHEMIST_CHEMICAL', 1);
    s.cast(player);
    const int0 = player.int, mana0 = player.maxMana;
    dealDamage(player, dummy(), 99999, 'pure');
    checkNear(player.int - int0, valueAt(s, 'intPerKill', 1), 'Inteligencia');
    check(player.maxMana > mana0, 'y con ella el maná máximo');
});

test('Sadista: cada baja da una carga de regeneración que se acumula y se renueva; una baja de héroe da 6 de una', () => {
    newGame('NECROMANCER');
    const c = dummy({ hp: 1 });
    const before = effHpRegen(player);
    emit(player, 'onKill', { victim: c });
    checkNear(effHpRegen(player) - before, 3, '1 carga = +3 regen. de vida/s (y otro tanto de maná)');
    emit(player, 'onKill', { victim: c });
    checkNear(effHpRegen(player) - before, 6, '2 cargas se acumulan');
    const rival = dummy(); rival.isHero = true; // una baja "de héroe" da varias cargas de una
    emit(player, 'onKill', { victim: rival });
    checkNear(effHpRegen(player) - before, 3 * 6, 'tope de 6 cargas (la baja de héroe ya suma 6 de una)');
});

test('Pulso de Muerte: daño mágico en área a tu alrededor y te cura según lo que dañaste', () => {
    newGame('NECROMANCER');
    const s = learn('NECROMANCER_PULSE', 1);
    const near = dummy({ hp: 9999, maxHp: 9999 });
    const far = dummy({ x: player.x + 15, y: player.y, hp: 9999, maxHp: 9999 });
    player.hp = 1;
    s.cast(player);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - near.hp, expected, 'daño a un enemigo en el radio');
    checkEq(far.hp, 9999, 'no llega a uno lejos');
    checkEq(player.hp, Math.min(player.maxHp, 1 + Math.round(expected * valueAt(s, 'healPct', 1))), 'se cura según el daño hecho');
});

test('Manto Fantasma: inmune a físico y desarmado, pierde resistencia mágica y cura más; ralentiza al activarse', () => {
    newGame('NECROMANCER');
    const s = learn('NECROMANCER_SHROUD', 1);
    const near = dummy({ hp: 9999, maxHp: 9999 });
    const magicResist0 = effMagicResist(player);
    player.hp = 1;
    s.cast(player);
    check(hasFlag(player, 'physicalImmune'), 'inmune a daño físico');
    check(hasFlag(player, 'disarm'), 'desarmado');
    checkNear(effMagicResist(player), magicResist0 - valueAt(s, 'magicResistPenalty', 1), 'pierde resistencia mágica');
    const { dealt } = dealDamage(near, player, 100, 'physical');
    checkEq(dealt, 0, 'el daño físico no le hace nada');
    checkEq(player.hp, 1, 'vida sin cambios');
    const healed = healUnit(player, 100);
    checkNear(healed, Math.round(100 * (1 + valueAt(s, 'healingBonusPct', 1))), 'cura más mientras está espectral');
    checkNear(effMoveMult(near), 1 - valueAt(s, 'slowPct', 1), 'ralentiza al activarse');
});

test('Guadaña del Segador: aturde y, al terminar, hace daño puro según la vida que falta (ejecuta si alcanza)', () => {
    newGame('NECROMANCER');
    const s = learn('NECROMANCER_REAP', 1);
    const a = dummy({ hp: 500, maxHp: 1000, armor: 50 }); // le falta 500: con ratio 0.7 son 350, no alcanza a matarlo
    s.cast(player);
    check(hasFlag(a, 'stun'), 'aturdido de entrada');
    checkEq(a.hp, 500, 'el daño todavía no se aplicó, se calcula al terminar el aturdimiento');
    const hpRegen0 = player.hpRegen;
    gameClock += valueAt(s, 'stunDuration', 1) + 0.1;
    tickEffects(a, 0.016);
    const expected = Math.round((1000 - 500) * valueAt(s, 'missingHpRatio', 1));
    checkEq(500 - a.hp, expected, 'daño puro (ignora la armadura) según lo que le faltaba');
    check(a.isAlive(), 'no le alcanzó para matarlo');
    checkEq(player.hpRegen, hpRegen0, 'sin matarlo, no gana regeneración permanente');

    a.hp = 0; // fuera de juego: si no, nearestEnemy lo sigue eligiendo a él (mismo lugar que el nuevo dummy)
    const b = dummy({ hp: 50, maxHp: 200 }); // le falta 150: con ratio 0.7 son 105, más que sus 50 de vida
    s.cast(player);
    gameClock += valueAt(s, 'stunDuration', 1) + 0.1;
    tickEffects(b, 0.016);
    check(!b.isAlive(), 'con poca vida, lo ejecuta');
    checkNear(player.hpRegen - hpRegen0, valueAt(s, 'hpRegenPerKill', 1), 'Ascenso: regeneración de vida permanente por la baja');
});

// Daño mágico esperado tras pasar por dealDamage: aplica la amplificación de hechizo del que lanza
// (spellAmp) antes de redondear. Los dummy() no tienen resistencia mágica, así que no hace falta mitigar.
function magicDmg(rawAmount) { return Math.round(rawAmount * (1 + effSpellAmp(player) / 100)); }

test('Campo Estático: cada hechizo lanzado hace daño mágico a los enemigos cercanos, % de su vida actual', () => {
    newGame('ZEUS');
    const near = dummy({ hp: 1000, maxHp: 1000 }); // pegado al jugador, adentro del radio 4
    const far = dummy({ x: player.x + 15, y: player.y, hp: 1000, maxHp: 1000 }); // bien lejos, afuera del radio
    emit(player, 'onCast', { skill: null });
    checkEq(1000 - near.hp, magicDmg(Math.max(player.innate.minDmg, 1000 * player.innate.pct)), 'daño a un enemigo cercano (% de su vida)');
    checkEq(far.hp, 1000, 'no llega a un enemigo lejos del radio');
});

test('Rayo Arco: salta entre varios enemigos y hace el mismo daño en cada salto', () => {
    newGame('ZEUS');
    const s = learn('ZEUS_ARC', 1);
    const a = dummy({ hp: 9999, maxHp: 9999 }), b = dummy({ x: a.x + 1, y: a.y, hp: 9999, maxHp: 9999 });
    const far = dummy({ x: player.x + 15, y: player.y, hp: 9999, maxHp: 9999 }); // fuera del alcance del primer salto
    s.cast(player);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - a.hp, expected, 'daño al primero (el más cercano)');
    checkEq(9999 - b.hp, expected, 'daño al segundo (salta hacia el más cercano al anterior)');
    checkEq(far.hp, 9999, 'no llega a uno lejos de la cadena');
});

test('Rayo Relámpago: proyectil real que viaja y aturde; si apuntás a un punto vacío, no le pega a nadie', () => {
    newGame('ZEUS');
    const s = learn('ZEUS_BOLT', 1);
    const c = dummy({ hp: 9999, maxHp: 9999 }); // adyacente: sin aimPoint, cast() cae en nearestEnemy como destino
    s.cast(player);
    checkEq(player.arena.projectiles.length, 1, 'dispara un proyectil (no daña al instante)');
    checkEq(c.hp, 9999, 'no le pega apenas se lanza, tiene que viajar');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(player.arena.projectiles.length, 0, 'el proyectil llega y se consume');
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - c.hp, expected, 'daño al llegar');
    check(hasFlag(c, 'stun'), 'aturdido');

    // Apuntando a un punto vacío (lejos de cualquier enemigo, fuera del camino del rayo): no le pega a nadie.
    const off = dummy({ x: player.x, y: player.y + 5, hp: 9999, maxHp: 9999 }); // lejos de la línea de tiro
    player.aimPoint = { x: player.x + 5, y: player.y };
    s.cast(player);
    player.aimPoint = null;
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(off.hp, 9999, 'apuntar a un punto vacío no le pega a nadie');
});

test('Nimbo de Tormenta: daño en área alrededor de Zeus', () => {
    newGame('ZEUS');
    const s = learn('ZEUS_NIMBUS', 1);
    const near = dummy({ hp: 9999, maxHp: 9999 });
    const far = dummy({ x: player.x + 15, y: player.y, hp: 9999, maxHp: 9999 });
    s.cast(player);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - near.hp, expected, 'daño a un enemigo en el radio');
    checkEq(far.hp, 9999, 'no llega a uno lejos');
});

test('Ira del Dios del Trueno: golpea a TODOS los enemigos vivos, sin importar la distancia', () => {
    newGame('ZEUS');
    const s = learn('ZEUS_WRATH', 1);
    const near = dummy({ hp: 9999, maxHp: 9999 });
    const far = dummy({ x: player.x + 15, y: player.y, hp: 9999, maxHp: 9999 });
    const dead = dummy({ hp: 0, maxHp: 9999 });
    // El daño se calcula una sola vez al lanzar; medirlo antes del cast, porque golpea también a los Grunts
    // reales de la oleada (mueren y su baja escala la Inteligencia de Zeus a mitad del propio lanzamiento).
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    s.cast(player);
    checkEq(9999 - near.hp, expected, 'daño al cercano');
    checkEq(9999 - far.hp, expected, 'daño al lejano (sin límite de rango)');
    checkEq(dead.hp, 0, 'no revive al que ya estaba muerto');
});

// El resto de los nukes de un solo objetivo del roster, convertidos a pointTarget (ver DISEÑO.md §9 quater):
// mismo patrón que Rayo Relámpago, viajan de verdad y pueden fallar si apuntás a un punto vacío.
test('Proyectil Arcano: proyectil de punto de efecto con área; si apuntás mal, no le pega a nadie', () => {
    newGame('ARCANIST');
    const s = learn('ARCANIST_BOLT', 1);
    check(s.pointTarget, 'está marcado como punto de efecto');
    const a = dummy({ hp: 9999, maxHp: 9999 }); // adyacente: sin aimPoint, cast() cae en nearestEnemy
    const b = dummy({ x: a.x + 1, y: a.y, hp: 9999, maxHp: 9999 }); // dentro del radio de a
    s.cast(player);
    checkEq(a.hp, 9999, 'no daña al instante, tiene que viajar');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - a.hp, expected, 'daño al del punto');
    checkEq(9999 - b.hp, expected, 'y a quien estaba en el área alrededor');

    a.hp = 0; b.hp = 0; // fuera de juego: que no lo vuelva a agarrar el segundo disparo, que pasa por su línea
    const off = dummy({ x: player.x, y: player.y + 5, hp: 9999, maxHp: 9999 });
    player.aimPoint = { x: player.x + 5, y: player.y };
    s.cast(player);
    player.aimPoint = null;
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(off.hp, 9999, 'apuntar a un punto vacío no le pega a nadie');
});

test('Explosión Helada: proyectil de punto de efecto que aturde en área; si apuntás mal, no aturde a nadie', () => {
    newGame('FROSTWITCH');
    const s = learn('FROSTWITCH_BLAST', 1);
    check(s.pointTarget, 'está marcado como punto de efecto');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    s.cast(player);
    checkEq(c.hp, 9999, 'no daña al instante, tiene que viajar');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - c.hp, expected, 'daño al llegar');
    check(hasFlag(c, 'stun'), 'aturdido');

    c.hp = 0; // fuera de juego: que no lo vuelva a agarrar el segundo disparo, que pasa por su línea
    const off = dummy({ x: player.x, y: player.y + 5, hp: 9999, maxHp: 9999 });
    player.aimPoint = { x: player.x + 5, y: player.y };
    s.cast(player);
    player.aimPoint = null;
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(off.hp, 9999, 'apuntar a un punto vacío no le pega a nadie');
    check(!hasFlag(off, 'stun'), 'y sin daño no hay aturdimiento');
});

test('Mezcla Inestable: proyectil de punto de efecto que aturde; si falla, no aturde a nadie', () => {
    newGame('ALCHEMIST');
    const s = learn('ALCHEMIST_BREW', 1);
    check(s.pointTarget, 'está marcado como punto de efecto');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    s.cast(player);
    checkEq(c.hp, 9999, 'no daña al instante, tiene que viajar');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    const expected = magicDmg(valueAt(s, 'baseDmg', 1) + player.int * valueAt(s, 'intRatio', 1));
    checkEq(9999 - c.hp, expected, 'daño al llegar');
    check(hasFlag(c, 'stun'), 'aturdido');

    c.hp = 0; // fuera de juego: que no lo vuelva a agarrar el segundo disparo, que pasa por su línea
    const off = dummy({ x: player.x, y: player.y + 5, hp: 9999, maxHp: 9999 });
    player.aimPoint = { x: player.x + 5, y: player.y };
    s.cast(player);
    player.aimPoint = null;
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(off.hp, 9999, 'apuntar a un punto vacío no le pega a nadie');
    check(!hasFlag(off, 'stun'), 'y sin daño no hay aturdimiento');
});

// ============================================================ CREEPS E ÍTEMS DE CONTRA
// Agrega un creep de un tipo al lado del jugador (o donde se indique).
function spawnType(key, props = {}) {
    const c = makeCreep(CREEP_TYPES[key], player.x + 1, player.y, 1, false, 0);
    c.arena = player.arena;
    Object.assign(c, props);
    creeps.push(c);
    return c;
}

test('Oleadas: tema sorteado, cantidades correctas y el aviso coincide con lo que aparece', () => {
    newGame('CRANE');
    waveNumber = 1;
    const wave = { name: 'Enjambre', groups: [{ type: 'SWARM', count: 2 }, { type: 'GRUNT', count: 2 }], boss: 'SCOUT' };
    spawnWave(player.arena, wave);
    checkEq(creeps.filter(c => c.key === 'SWARM').length, 8, 'el Enjambre viene de a 4');
    checkEq(creeps.length, 8 + 2 + 1, 'total con el jefe');
    check(boss.isBoss && boss.key === 'SCOUT', 'jefe del tipo del tema');
    checkEq(new Set(creeps.map(c => c.x + ',' + c.y)).size, creeps.length, 'cada uno en su casilla');
    resetGame(); selectHero(HERO_TEMPLATES.CRANE); learnSkill(SKILL_INDEX.CRANE_BEAM);
    const preview = nextWave;
    check(!!preview && document.getElementById('wave-preview').textContent.includes(preview.name), 'el aviso muestra el tema');
    startWave();
    const expected = preview.groups.reduce((n, g) => n + groupUnits(g), 0) + 1;
    checkEq(creeps.length, expected, 'la oleada que aparece es la avisada');
}, { random: true });

test('Chamán: su daño es mágico (lo frena la resistencia mágica, no la armadura)', () => {
    newGame('CRANE');
    const c = spawnType('SHAMAN', { attackTimer: 99 });
    player.armor = 50; player.magicResist = 0;
    let hp = player.hp; updateCreep(c, 0.016);
    checkEq(hp - player.hp, Math.round(c.atk), 'la armadura no lo reduce');
    giveItem(player, 'CLOAK');
    hp = player.hp; c.attackTimer = 99; updateCreep(c, 0.016);
    check(effMagicResist(player) >= 25, 'la Capa da resistencia mágica');
    checkEq(hp - player.hp, Math.round(c.atk * (1 - effMagicResist(player) / 100)), 'y reduce el daño del Chamán');
});

test('Sanador: cura al más herido cada 3s; la Lanza Cortacuras lo reduce a la mitad', () => {
    newGame('CRANE');
    player.x = 12; // el Sanador (rango 3) ya está a distancia de ataque y no se mueve
    const healer = spawnType('HEALER', { x: 15, y: 5 });
    const hurt = spawnType('GRUNT', { x: 16, y: 5 }); hurt.hp = 5;
    const heal = CREEP_TYPES.HEALER.healAmount;
    for (let i = 0; i < 3 * 60 + 1; i++) updateCreep(healer, 1 / 60);
    checkEq(hurt.hp, 5 + heal, 'curación fija');
    giveItem(player, 'SPEAR');
    hurt.hp = 5; dealDamage(player, hurt, 1, 'pure');
    for (let i = 0; i < 3 * 60 + 1; i++) updateCreep(healer, 1 / 60);
    checkEq(hurt.hp, 4 + Math.round(heal * (1 - ITEMS.SPEAR.antiHeal)), 'con Cortacuras cura menos');
});

test('Espectro: esquiva ataques básicos; la Hoja Certera no falla', () => {
    newGame('CRANE');
    const e = spawnType('SPECTER', { hp: 9999, maxHp: 9999 });
    check(withRandom(0.3, () => dealDamage(player, e, 10, 'physical', { isAttack: true })).evaded, 'con 50% de evasión esquiva (azar 0.3)');
    giveItem(player, 'TRUESTRIKE');
    check(!withRandom(0.3, () => dealDamage(player, e, 10, 'physical', { isAttack: true })).evaded, 'con Hoja Certera no');
});

test('Acorazado: armadura alta; el Martillo Rompecorazas se la baja golpe a golpe', () => {
    newGame('CRANE');
    const armor = CREEP_TYPES.ARMORED.armor;
    const a = spawnType('ARMORED', { hp: 9999, maxHp: 9999 });
    checkEq(dealDamage(player, a, 100, 'physical').dealt, Math.round(100 * (1 - armor * 0.04)), 'reducción por armadura');
    giveItem(player, 'HAMMER');
    for (let i = 0; i < 5; i++) resolveBasicHit(player, a, 1, false);
    const maxBreak = ITEMS.HAMMER.armorPerHit * ITEMS.HAMMER.maxStacks;
    checkNear(effArmor(a), armor - maxBreak, 'baja hasta el máximo de acumulaciones');
});

test('Kamikaze: explota al llegar, muere y no da oro', () => {
    newGame('CRANE');
    const k = spawnType('KAMIKAZE');
    const hp = player.hp, gold = player.gold;
    updateCreep(k, 0.016);
    check(!k.isAlive(), 'se destruyó');
    check(player.hp < hp, 'hizo daño');
    checkEq(player.gold, gold, 'sin oro por su muerte');
});

test('Aturdidor: aturde cada N golpes; aturdido no te movés ni lanzás; las Botas Firmes lo acortan', () => {
    newGame('CRANE');
    const s = learn('CRANE_BEAM', 1);
    const { stunEvery, stunDuration } = CREEP_TYPES.STUNNER;
    const t = spawnType('STUNNER', { atk: 1 });
    for (let i = 0; i < stunEvery - 1; i++) { t.attackTimer = 99; updateCreep(t, 0.016); }
    check(!hasFlag(player, 'stun'), 'todavía no');
    t.attackTimer = 99; updateCreep(t, 0.016);
    check(hasFlag(player, 'stun'), 'aturdido al golpe ' + stunEvery);
    keys = { arrowright: true }; const x = player.x;
    updateWave(1);
    keys = {};
    checkEq(player.x, x, 'no se mueve');
    check(!tryCastSkill(player, s, { quiet: true }), 'no lanza habilidades');
    removeEffect(player, 'STUN');
    player.stunImmuneUntil = 0;
    giveItem(player, 'BOOTS');
    for (let i = 0; i < stunEvery; i++) { t.attackTimer = 99; updateCreep(t, 0.016); }
    checkNear(getEffect(player, 'STUN').until - gameClock, stunDuration * (1 - ITEMS.BOOTS.mods.statusResist), 'dura menos');
});

test('Inmunidad tras aturdimiento: un héroe no puede quedar aturdido para siempre', () => {
    newGame('CRANE');
    addEffect(player, { id: 'STUN', duration: 1, flags: ['stun'] });
    gameClock += 1.1; tickEffects(player, 0.016);
    check(!addEffect(player, { id: 'STUN', duration: 1, flags: ['stun'] }), 'recién salido del aturdimiento, es inmune');
    gameClock += STUN_IMMUNITY_AFTER;
    check(!!addEffect(player, { id: 'STUN', duration: 1, flags: ['stun'] }), 'pasada la inmunidad, se lo puede aturdir');
    const c = dummy();
    addEffect(c, { id: 'STUN', duration: 1, flags: ['stun'] }); gameClock += 1.1;
    check(!!addEffect(c, { id: 'STUN', duration: 1, flags: ['stun'] }), 'a los creeps no se les aplica');
});

test('Ladrón: roba oro y huye; si lo matás recuperás el oro +50%', () => {
    newGame('CRANE');
    player.gold = 100;
    const steal = CREEP_TYPES.THIEF.steal;
    const t = spawnType('THIEF', { attackTimer: 99, hp: 9999, maxHp: 9999 });
    updateCreep(t, 0.016);
    checkEq(player.gold, 100 - steal, 'robó');
    const x0 = t.x;
    for (let i = 0; i < 60; i++) updateCreep(t, 1 / 60);
    check(t.x > x0, 'huye');
    t.hp = 1; dealDamage(player, t, 99, 'pure');
    check(player.gold >= 100 - steal + Math.round(steal * 1.5), 'recupera lo robado +50% (más el oro por matarlo)');
});

test('Recetas: un compuesto usa los básicos que ya tenés y cobra solo lo que falta', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 1000;
    const hoja = ITEMS.TRUESTRIKE;
    checkEq(itemCost(hoja, player), itemTotalCost(hoja), 'sin componentes cuesta el total');
    checkEq(itemTotalCost(hoja), ITEMS.BLADE.cost + ITEMS.QUICK_GLOVES.cost + hoja.recipe, 'total = componentes + receta');
    buyItem(ITEMS.BLADE);
    checkEq(itemCost(hoja, player), ITEMS.QUICK_GLOVES.cost + hoja.recipe, 'con la Espada, paga los Guantes y la receta');
    const atk0 = effAttack(player);
    buyItem(hoja);
    checkEq(player.inventory.map(i => i.key).join(','), 'TRUESTRIKE', 'la Espada se usó para armarla');
    checkEq(effAttack(player) - atk0, hoja.mods.flatAtk - ITEMS.BLADE.mods.flatAtk, 'daño del compuesto (en vez del de la Espada)');
    check(hasFlag(player, 'trueStrike'), 'y su efecto especial');
    check(!buyItem(hoja), 'un compuesto no se puede tener dos veces');
});

test('Recetas con componentes repetidos (Martillo = 2 Espadas) y básicos que se acumulan', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 1000;
    const atk0 = effAttack(player);
    buyItem(ITEMS.BLADE); buyItem(ITEMS.BLADE);
    checkEq(effAttack(player) - atk0, 2 * ITEMS.BLADE.mods.flatAtk, 'dos Espadas suman');
    checkEq(itemCost(ITEMS.HAMMER, player), ITEMS.HAMMER.recipe, 'con las dos Espadas solo paga la receta');
    buyItem(ITEMS.HAMMER);
    checkEq(countItem(player, 'BLADE'), 0, 'usó las dos');
    checkEq(countItem(player, 'HAMMER'), 1, 'y armó el Martillo');
});

test('Inventario: 6 casillas + 3 de reserva; un compuesto entra si libera los espacios de sus componentes', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 5000;
    ['BLADE', 'QUICK_GLOVES', 'CHAINMAIL', 'RUNE_CAPE', 'VITALITY', 'VITALITY', 'FANG', 'FANG', 'FANG'].forEach(k => buyItem(ITEMS[k]));
    checkEq(player.inventory.length, INVENTORY_SLOTS + RESERVE_SLOTS, 'inventario y reserva llenos');
    checkEq(itemBlocker(ITEMS.FANG, player), 'Inventario lleno', 'uno más no entra');
    check(buyItem(ITEMS.TRUESTRIKE), 'la Hoja Certera entra: usa 2 espacios y ocupa 1');
    checkEq(player.inventory.length, INVENTORY_SLOTS + RESERVE_SLOTS - 1, 'quedó un espacio libre');
    check(buyItem(ITEMS.HEART), 'el Corazón usa las 2 Piedras que ya tenía');
});

test('Reserva: no da stats, sirve para armar, y los ítems se mueven a donde quieras', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 5000;
    const atk = effAttack(player);
    giveItem(player, 'BLADE');
    checkEq(effAttack(player) - atk, ITEMS.BLADE.mods.flatAtk, 'en las 6 da stats');
    moveItem(player, 0, INVENTORY_SLOTS);
    checkEq(effAttack(player), atk, 'en la reserva no');
    moveItem(player, INVENTORY_SLOTS, 4);
    checkEq(itemInSlot(player, 4).key, 'BLADE', 'va a la casilla que elijas');
    checkEq(effAttack(player) - atk, ITEMS.BLADE.mods.flatAtk, 'y vuelve a dar stats');
    giveItem(player, 'FANG');
    moveItem(player, 4, 0);
    checkEq(itemInSlot(player, 0).key, 'BLADE', 'ocupada: se intercambian');
    checkEq(itemInSlot(player, 4).key, 'FANG', 'el otro va a la casilla libre');
    moveItem(player, 0, INVENTORY_SLOTS + 2);
    check(buyItem(ITEMS.HAMMER), 'arma con piezas de la reserva');
    checkEq(countItem(player, 'BLADE'), 0, 'la Espada de la reserva se usó');
    player.inventory = []; applyInventory(player);
    giveItem(player, 'SHOCK_MACE');
    moveItem(player, 0, INVENTORY_SLOTS);
    check(!useItem(player, INVENTORY_SLOTS), 'un activo en la reserva no se usa');
});

test('La IA y el piloto no usan la reserva', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    const rival = heroes[1];
    checkEq(inventoryCap(rival), INVENTORY_SLOTS, 'la IA, 6');
    checkEq(inventoryCap(player), INVENTORY_SLOTS + RESERVE_SLOTS, 'vos, 9');
    autopilot = true;
    checkEq(inventoryCap(player), INVENTORY_SLOTS, 'el piloto, 6');
    autopilot = false;
    resetGame();
});

test('Paneles retráctiles: el mapa ocupa lo que dejan', () => {
    const before = mapScale;
    togglePanels();
    check(document.body.classList.contains('hide-left') && document.body.classList.contains('hide-right'), 'se retraen los dos');
    togglePanel('right');
    check(!document.body.classList.contains('hide-right'), 'se muestran de a uno');
    togglePanel('left');
    check(!document.body.classList.contains('hide-left'), 'y se vuelven a mostrar');
    checkEq(mapScale, before, 'el mapa vuelve a su tamaño');
});

test('Ítem de atributo: suma al atributo y a sus stats; venderlo devuelve la mitad y lo quita', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 1000;
    const str0 = player.attr('str'), hp0 = player.maxHp;
    buyItem(ITEMS.BELT);
    checkEq(player.attr('str') - str0, ITEMS.BELT.mods.str, 'Fuerza');
    checkEq(player.maxHp - hp0, ITEMS.BELT.mods.str * ATTRIBUTE_RULES.str.hp, 'vida extra');
    const gold = player.gold;
    sellItem('BELT');
    checkEq(player.gold - gold, Math.floor(itemTotalCost(ITEMS.BELT) * SELL_REFUND), 'devuelve la mitad del precio total');
    checkEq(player.attr('str'), str0, 'pierde la Fuerza del ítem');
    checkEq(player.maxHp, hp0, 'y la vida');
});

test('Égida Inquebrantable: por debajo del 40% da inmunidad mágica (sin daño mágico ni aturdimientos)', () => {
    newGame('CRANE');
    giveItem(player, 'AEGIS');
    const c = dummy();
    player.hp = player.maxHp;
    dealDamage(c, player, player.maxHp * 0.7, 'pure');
    check(hasFlag(player, 'magicImmune'), 'se activó');
    const hp = player.hp;
    dealDamage(c, player, 100, 'magical');
    checkEq(player.hp, hp, 'sin daño mágico');
    check(!addEffect(player, { id: 'STUN', duration: 1, flags: ['stun'] }), 'sin aturdimientos');
    dealDamage(c, player, 10, 'physical');
    check(player.hp < hp, 'el daño físico sí entra');
});

test('Coraza de Espinas devuelve daño cuerpo a cuerpo; Corazón del Titán regenera por segundo', () => {
    newGame('CRANE');
    giveItem(player, 'THORNS');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    const { dealt } = dealDamage(c, player, 100, 'physical');
    checkEq(9999 - c.hp, Math.round(dealt * ITEMS.THORNS.reflect), 'reflejo');
    giveItem(player, 'HEART');
    player.hp = 10;
    for (let i = 0; i < 61; i++) tickEffects(player, 1 / 60);
    checkEq(player.hp, 10 + Math.round(player.maxHp * ITEMS.HEART.regenPct), 'curación por segundo');
});

test('Brujo: rayo cada 5s con daño mágico y aturdimiento; Escarchador ralentiza; Tamborilero acelera', () => {
    newGame('CRANE');
    const w = spawnType('WARLOCK', { x: player.x + 3 });
    const hp = player.hp;
    for (let i = 0; i < CREEP_TYPES.WARLOCK.boltEvery * 60 + 1; i++) updateCreep(w, 1 / 60);
    check(player.hp < hp, 'el rayo hizo daño');
    check(hasFlag(player, 'stun'), 'y aturdió');
    newGame('CRANE');
    const f = spawnType('FROSTCASTER', { attackTimer: 99 });
    updateCreep(f, 0.016);
    checkNear(effMoveMult(player), 1 - CREEP_TYPES.FROSTCASTER.slow, 'ralentizado');
    const d = spawnType('DRUMMER', { x: 15, y: 5 }), ally = spawnType('GRUNT', { x: 16, y: 5 });
    for (let i = 0; i < 31; i++) updateCreep(d, 1 / 60);
    checkNear(effAtkSpeed(ally) / ally.atkSpeed, 1 + CREEP_TYPES.DRUMMER.auraAtkSpeed, 'aliado acelerado');
});

test('Cuerpos sólidos: nadie pisa a nadie y el que está en fase pasa', () => {
    newGame('CRANE');
    keyboardMove = true;
    const c = creeps[0], step = heroStepTime(player);
    creeps.slice(1).forEach(o => { o.hp = 0; });
    player.x = 5; player.y = 5; c.x = 6; c.y = 5; c.moveInterval = 1e9;
    check(!bodyFree(player, 6, 5), 'ocupada');
    check(bodyFree(player, 6, 6), 'libre');
    player.moveTarget = { x: 9, y: 5, arena: player.arena };
    player.moveTimer = step + 0.01; keys = {}; updateHero(player, player.arena, 0);
    check(!(player.x === 6 && player.y === 5), 'no la pisa');
    check(player.x === 6 || player.y !== 5, 'rodea');
    player.x = 5; player.y = 5; player.moveTarget = null;
    addEffect(player, { id: 'PHASE', duration: 5, flags: ['phasing'] });
    check(bodyFree(player, 6, 5), 'en fase pasa');
    keys = { arrowright: true }; player.moveTimer = step + 0.01; updateHero(player, player.arena, 0); keys = {};
    checkEq(player.x, 6, 'y pisa la casilla');
    check(!bodyAt(player.arena, 6, 5, c), 'en fase no ocupa lugar');
    removeEffect(player, 'PHASE');
    separateBodies(player.arena);
    check(player.x !== c.x || player.y !== c.y, 'al salir de fase, se separan');
});

test('Cuerpos sólidos: rodeado no se mueve, los creeps rodean y un salto no deja a dos en la misma casilla', () => {
    newGame('CRANE');
    const list = creeps.slice(0, 9);
    creeps.slice(9).forEach(o => { o.hp = 0; });
    player.x = 5; player.y = 5;
    list.slice(0, 8).forEach((c, i) => { const [dx, dy] = CIRCLE_STEPS[i]; c.x = 5 + dx; c.y = 5 + dy; });
    checkEq(bodyStep(player, 9, 5), null, 'rodeado: no hay por dónde');
    const a = list[0], b = list[8];
    a.hp = 100; b.hp = 100;
    b.x = 2; b.y = 2; a.x = 3; a.y = 2;
    list.slice(1, 8).forEach(o => { o.hp = 0; });
    b.moveTimer = 1e9;
    stepCreepToward(b, 5, 2, 0.05);
    check(!(b.x === 3 && b.y === 2), 'el creep no pisa al otro');
    check(b.x !== 2 || b.y !== 2, 'y rodea');
    b.x = a.x; b.y = a.y;
    separateBodies(player.arena);
    check(a.x !== b.x || a.y !== b.y, 'el que cayó encima se corre');
    check(walkable(player.arena, b.x, b.y), 'a una casilla válida');
});

test('Cuerpos sólidos: en una oleada entera nunca hay dos en la misma casilla', () => {
    newGame('CRANE');
    autopilot = true;
    try {
        const a = player.arena;
        creeps.forEach((c, i) => { c.x = 10 + (i % 5); c.y = 3 + (i % 3) * 2; });
        for (let f = 0; f < 200 && a.creeps.some(c => c.isAlive()) && player.isAlive(); f++) {
            gameClock += 0.05; updateArena(a, 0.05);
            separateBodies(a);
            const seen = new Set();
            [...a.creeps.filter(c => c.isAlive()), player].forEach(u => { const k = u.x * 100 + u.y; check(!seen.has(k), `dos en ${u.x},${u.y}`); seen.add(k); });
        }
    } finally { autopilot = false; }
});
test('Cuerpos físicos: un creep bloqueado prueba el otro camino si está libre', () => {
    newGame('CRANE');
    const a = spawnType('GRUNT', { x: 10, y: 5 }), b = spawnType('GRUNT', { x: 12, y: 6 });
    // b va hacia (10, 4): su camino principal (x) está libre
    b.moveTimer = 0; stepCreepToward(b, 9, 5, 5);
    checkEq([b.x, b.y].join(), '11,6', 'avanza por x');
    b.x = 11; b.y = 5; // ahora (10,5) está ocupada por a: prueba por y
    b.moveTimer = 0; stepCreepToward(b, 8, 4, 5);
    checkEq([b.x, b.y].join(), '11,4', 'rodea por y');
});

test('Pasivas nuevas: Trípode, Golpe Crítico y Sangre Oscura', () => {
    newGame('REC');
    const tri = learn('REC_TRIPODE', 2), as0 = effAtkSpeed(player);
    gameClock += 2; // quieto hace más de 1 s
    updateArena(player.arena, 0.016);
    check(effAtkSpeed(player) > as0, 'quieto: +velocidad de ataque');
    player.skillLevels.REC_TRIPODE = 0; player.skills = player.skills.filter(s => s !== tri);
    updateArena(player.arena, 0.016);
    checkNear(effAtkSpeed(player), as0, 'si deja el kit, se va el bonus');
    newGame('ASSASSIN');
    learn('ASSASSIN_CRITSTRIKE', 4);
    updateArena(player.arena, 0.016);
    const saved = Math.random; Math.random = () => 0;
    try { checkEq(rollAttackDamage(player, dummy()).dmg, Math.round(Math.round(effAttack(player)) * 2.8), 'crítico x2,8'); } finally { Math.random = saved; }
    newGame('VAMPIRE');
    const dark = learn('VAMP_DARKBLOOD', 4);
    player.hp = player.maxHp * 0.5;
    updateArena(player.arena, 0.016);
    checkNear(getEffect(player, 'VAMP_DARKBLOOD').mods.atkPct, 5 * val(dark, player, 'atkPerStep'), 'a mitad de vida: 5 tramos de daño');
});

test('Cetro del Eclipse: el daño mágico suma % de la vida máxima (una vez por segundo por enemigo)', () => {
    newGame('ARCANIST');
    giveItem(player, 'ECLIPSE_STAFF');
    const c = dummy({ hp: 10000, maxHp: 10000 });
    dealDamage(player, c, 10, 'magical');
    const extra = Math.round(10000 * ITEMS.ECLIPSE_STAFF.maxHpPct);
    check(10000 - c.hp >= extra, 'sumó el % de vida máxima');
    const hp = c.hp;
    dealDamage(player, c, 10, 'magical');
    check(hp - c.hp < extra, 'no se repite en el mismo segundo');
    gameClock += 1.1;
    const hp2 = c.hp;
    dealDamage(player, c, 10, 'physical');
    check(hp2 - c.hp < extra, 'el daño físico no lo activa');
});

test('Jefes de ronda: desde la ronda 20 crecen +4% por ronda en vez de +10%', () => {
    checkNear(bossStatMult(20), creepStatMult(20), 'igual que los creeps hasta la 20');
    checkNear(bossStatMult(25), creepStatMult(20) * Math.pow(BOSS_LATE.growth, 5), 'más lento después');
    check(bossStatMult(30) < creepStatMult(30) * 0.6, 'en la 30, menos del 60% de los creeps');
});

test('Banco de duelos: cada duelo anota cuánto duró, si fue por tiempo, los cambios de quién va ganando y el daño evitable', () => {
    newGame('CRANE');
    const a = heroes[1], b = heroes[2];
    const [arena] = makeDuelArenas({ pairs: [[a, b]], bye: null }); arenas.push(arena);
    duelLog = [];
    dealDamage(a, b, 60, 'pure');
    check(arena.stats.dmg > 0 && arena.stats.avoidable === 0, 'cuenta el daño entre héroes (un golpe común no se podía evitar)');
    dodgeableHit = {}; const before = arena.stats.avoidable; dealDamage(a, b, 20, 'pure'); dodgeableHit = null;
    check(arena.stats.avoidable > before, 'el de un proyectil de habilidad cuenta como evitable');
    b.hp = b.maxHp * 0.5; a.hp = a.maxHp; updateDuelArena(arena, 0.1);
    check(arena.stats.lead === a, 'va ganando el de más vida');
    a.hp = a.maxHp * 0.2; updateDuelArena(arena, 0.1);
    checkEq(arena.stats.changes, 1, 'el otro pasó adelante: un cambio');
    arena.elapsed = DUEL_TIME; updateDuelArena(arena, 0.1);
    const d = duelLog[duelLog.length - 1];
    check(d && d.byTime && d.changes === 1 && d.secs >= DUEL_TIME, 'al terminar por tiempo queda anotado');
    const sum = benchDuels([{ secs: 10, byTime: false, changes: 0, dmg: 100, avoidable: 25 }, { secs: 30, byTime: true, changes: 2, dmg: 100, avoidable: 0 }]);
    check(sum.n === 2 && sum.byTimePct === 50 && sum.avgChanges === 1 && sum.avoidablePct === 13, 'el resumen del banco cuenta bien');
    resetGame();
});

test('Teclas configurables: cambiar, intercambiar y reservadas (las de las habilidades y Esc no se pueden usar)', () => {
    const saved = Object.assign({}, KEYMAP);
    try {
        check(setKey('shop', 'z') && KEYMAP.shop === 'z', 'la tienda pasa a la Z');
        setKey('map', 'z');
        check(KEYMAP.map === 'z' && KEYMAP.shop === KEY_DEFAULTS.map, 'se intercambian');
        check(!setKey('map', 'escape'), 'Esc no se puede usar');
        check(!setKey('map', 'e'), 'las teclas de las habilidades tampoco');
    } finally { resetKeymap(); Object.assign(KEYMAP, saved); saveKeymap(); keys = {}; }
}, { random: true });

test('Ancla: cada golpe ralentiza y quita evasión', () => {
    newGame('CRANE');
    const ev = effEvasion(player);
    const a = spawnType('ANCHOR', { x: player.x + 3, attackTimer: 99 });
    updateCreep(a, 0.016);
    checkNear(effMoveMult(player), 1 - CREEP_TYPES.ANCHOR.slow, 'ralentizado');
    checkNear(effEvasion(player), ev - CREEP_TYPES.ANCHOR.evasionLoss, 'sin evasión');
});

test('Danza Cinética: moverse 2 casillas y pegar da cargas; con 5, el próximo golpe hace un golpe extra', () => {
    newGame('DANCER');
    const c = dummy({ hp: 5000, maxHp: 5000 });
    const inn = player.innate;
    resolveBasicHit(player, c, 10, false);
    check(!getEffect(player, 'DANCER_DANCE'), 'quieto no carga');
    emit(player, 'onMove', { steps: 1 }); emit(player, 'onMove', { steps: 1 });
    resolveBasicHit(player, c, 10, false);
    checkEq(getEffect(player, 'DANCER_DANCE').data.charges, 1, 'una carga');
    checkNear(effEvasion(player), player.evasion + inn.evasionPerCharge, '+1% evasión por carga');
    for (let i = 0; i < 4; i++) resolveBasicHit(player, c, 10, false);
    checkEq(getEffect(player, 'DANCER_DANCE').data.charges, 5, 'cinco cargas');
    const hp = c.hp;
    resolveBasicHit(player, c, 10, false);
    checkEq(hp - c.hp, 10 + Math.round(player.atk * inn.burstMult), 'golpe normal + golpe extra');
    check(!getEffect(player, 'DANCER_DANCE'), 'consumió las cargas');
    gameClock += inn.moveWindow + 0.1;
    resolveBasicHit(player, c, 10, false);
    check(!getEffect(player, 'DANCER_DANCE'), 'el movimiento viejo ya no cuenta');
});

test('Ritmo Letal: suma daño contra el mismo objetivo y se borra al cambiar', () => {
    newGame('DANCER');
    const skill = learn('DANCER_RHYTHM', 1);
    const a = dummy(), b = dummy({ y: player.y + 1 });
    const hitDmg = t => { const ctx = { target: t, dmg: 100 }; emit(player, 'beforeAttack', ctx); return ctx.dmg; };
    checkNear(hitDmg(a), 100, 'primer golpe sin bonus');
    checkNear(hitDmg(a), 100 * (1 + val(skill, player, 'dmgPerStack')), 'segundo golpe con 1 carga');
    checkNear(hitDmg(b), 100, 'cambiar de objetivo borra las cargas');
});

test('Tormenta Cinética: onda cada N ataques y +vel. de ataque permanente por baja (Ascenso)', () => {
    newGame('DANCER');
    const ult = learn('DANCER_STORM', 1);
    const c = dummy({ hp: 5000, maxHp: 5000 }), other = dummy({ x: player.x, y: player.y + 1, hp: 5000, maxHp: 5000 });
    tryCastSkill(player, ult);
    for (let i = 0; i < val(ult, player, 'waveEvery'); i++) resolveBasicHit(player, c, 1, false);
    check(other.hp < 5000, 'la onda golpeó al de al lado');
    const as = player.atkSpeed;
    emit(player, 'onKill', { victim: c });
    checkNear(player.atkSpeed, as + player.baseAtkSpeed * val(ult, player, 'atkSpeedPerKill') / 100, 'Ascenso: vel. de ataque permanente');
});

test('Área de Descanso: al terminar la oleada vas ahí y volvés con vida, maná completos y sin mejoras temporales', () => {
    newGame('CRANE');
    const giro = learn('CRANE_BEAM', 1);
    waveNumber = 1;
    creeps.forEach(c => { c.hp = 0; });
    player.hp = 5; player.mana = 0;
    player.cooldowns[giro.id] = 20; // a mitad de recargar, como si lo hubiese lanzado justo antes de ganar
    addEffect(player, { id: 'TEMP', duration: 99, mods: { atkPct: 1 } });
    updateWave(0.016); // su arena quedó limpia: terminan las oleadas
    skipDuels();
    check(player.inRest, 'está en el Área de Descanso');
    checkEq(player.hp, player.maxHp, 'vida llena');
    check(!getEffect(player, 'TEMP'), 'sin mejoras temporales');
    check(player.cooldowns[giro.id] > 19, 'en el Área de Descanso el enfriamiento no se toca'); // salvo el propio frame en que termina la oleada
    if (gameState === 'DRAFT') learnSkill(currentDraft.options[0]);
    player.hp = 5; player.x = 0;
    startWave();
    check(!player.inRest, 'volvió al combate');
    checkEq(player.hp, player.maxHp, 'con la vida llena');
    checkEq(player.mana, player.maxMana, 'y el maná lleno');
    checkEq(`${player.x},${player.y}`, `${WAVE_START.x},${WAVE_START.y}`, 'en el punto de inicio');
    checkEq(player.cooldowns[giro.id], 0, 'al arrancar la ronda siguiente, los enfriamientos se reinician');
});

test('IA: con el inventario lleno vende un contra que no sirve para comprar el que necesita', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 500;
    ['BELT', 'TRUESTRIKE', 'SPEAR', 'BOOTS', 'CLOAK', 'THORNS'].forEach(k => giveItem(player, k));
    nextWave = { name: 'Muralla', groups: [{ type: 'ARMORED', count: 3 }], boss: 'ARMORED' };
    autopilot = true; // la IA no usa la reserva
    try { aiShop(player); } finally { autopilot = false; }
    checkEq(countItem(player, 'HAMMER'), 1, 'compró el Martillo');
    check(player.inventory.length <= INVENTORY_SLOTS, 'no pasó de 6');
    checkEq(countItem(player, 'BELT'), 1, 'no vendió su ítem de atributo');
});

test('IA: el contra desplaza a lo propio de su build tardía, y lo propio no desplaza contras', () => {
    newGame('REC');
    gameState = 'PREP'; player.gold = ITEMS.CLOAK.recipe;
    [...AI_BUILDS.REC, 'BOOTS', 'JET_PACK'].forEach(k => giveItem(player, k));
    nextWave = { name: 'Asedio', groups: [{ type: 'SHAMAN', count: 3 }, { type: 'STUNNER', count: 3 }], boss: 'SHAMAN' };
    autopilot = true;
    try {
        player.gold = 0; aiShop(player);
        checkEq(countItem(player, 'JET_PACK'), 1, 'sin oro para el contra no vende nada');
        player.gold = 500; aiShop(player);
        checkEq(countItem(player, 'CLOAK'), 1, 'compró la Capa contra Emisores');
        checkEq(countItem(player, 'JET_PACK'), 0, 'vendiendo lo propio');
        check(countItem(player, 'BOOTS') === 1 && countItem(player, 'CRIMSON') === 1, 'sin tocar el otro contra ni la build');
        nextWave = { name: 'Muralla', groups: [{ type: 'GRUNT', count: 3 }], boss: 'GRUNT' };
        player.gold = 2000; aiShop(player);
        checkEq(countItem(player, 'CLOAK'), 1, 'después, lo propio no le saca el contra');
    } finally { autopilot = false; }
});

test('IA: Grúa arma su build propia, primero el robo de vida; los demás, la de su atributo', () => {
    newGame('VAMPIRE');
    checkEq(aiBuild(player), AI_BUILDS.STR, 'sin build propia, la de su atributo');
    newGame('CRANE');
    checkEq(aiBuild(player), AI_BUILDS.CRANE, 'la suya');
    aiBuild(player).forEach(k => check(ITEMS[k], `existe ${k}`));
    nextWave = null; player.gold = 5000;
    aiShop(player);
    aiBuild(player).forEach(k => check(countItem(player, k) > 0, `compró ${k}`));
    checkEq(countItem(player, 'BELT'), 0, 'el Cinturón de la build de Fuerza no');
    check(player.gold < 5000 - aiBuild(player).reduce((a, k) => a + itemTotalCost(ITEMS[k]), 0), 'con su build armada, sigue con los libros de talento');
});

test('IA: la Bruja y Rec arman su build propia, con aguante y sin lo que no les rinde', () => {
    [['FROSTWITCH', 'TOME'], ['REC', 'SWIFT_BLADE']].forEach(([key, not]) => {
        newGame(key);
        checkEq(aiBuild(player), AI_BUILDS[key], `${key}: la suya`);
        nextWave = null; player.gold = 5000;
        aiShop(player);
        aiBuild(player).forEach(k => check(countItem(player, k) > 0, `${key}: compró ${k}`));
        checkEq(countItem(player, 'HEART'), 1, `${key}: el Corazón`);
        checkEq(countItem(player, not), 0, `${key}: ${not} no`);
    });
});

test('IA: arma los contras de la próxima oleada (de a componentes si no le alcanza)', () => {
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 1000;
    nextWave = { name: 'Muralla', groups: [{ type: 'ARMORED', count: 2 }, { type: 'SHAMAN', count: 3 }, { type: 'SPECTER', count: 1 }], boss: 'ARMORED' };
    aiShop(player);
    checkEq(countItem(player, 'HAMMER'), 1, 'Martillo contra Acorazados');
    checkEq(countItem(player, 'CLOAK'), 1, 'Capa contra Chamanes');
    checkEq(countItem(player, 'TRUESTRIKE'), 0, 'no compra contra un solo Espectro');
    newGame('CRANE');
    gameState = 'PREP'; player.gold = 120;
    nextWave = { name: 'Muralla', groups: [{ type: 'ARMORED', count: 3 }], boss: 'ARMORED' };
    aiShop(player);
    checkEq(countItem(player, 'BLADE'), 1, 'sin oro para el Martillo entero, compra una Espada para ir armándolo');
});

test('Prioridad: el ataque automático va primero por el Sanador si está a tiro', () => {
    newGame('REC');
    const grunt = spawnType('GRUNT');
    const healer = spawnType('HEALER', { x: player.x + 4 });
    checkEq(pickAttackTarget(player, effRange(player)), healer, 'elige al Sanador aunque el Grunt esté más cerca');
    healer.x = 19;
    checkEq(pickAttackTarget(player, effRange(player)), grunt, 'fuera de rango, el más cercano');
});

// ============================================================ IA
test('IA a distancia: avanza si no hay nadie a tiro y retrocede si se le acercan', () => {
    newGame('REC');
    const c = dummy({ x: 15, y: 5 });
    checkEq(aiMoveDirection(player).dx, 1, 'avanza hacia el enemigo lejano');
    c.x = 6;
    const dir = aiMoveDirection(player);
    checkEq(dir.dx, -1, 'retrocede alejándose del enemigo pegado');
    c.x = 9; // a 4 casillas, dentro del rango (5) y fuera de la zona de peligro (3)
    checkEq(JSON.stringify(aiMoveDirection(player)), JSON.stringify({ dx: 0, dy: 0 }), 'se queda disparando');
});

test('IA a distancia acorralada en una esquina se queda quieta', () => {
    newGame('ARCANIST');
    player.x = 0; player.y = 0;
    dummy({ x: 1, y: 1 });
    const dir = aiMoveDirection(player);
    checkEq(dir.dx === 1 && dir.dy === 1, false, 'no camina hacia el enemigo');
});

test('IA cuerpo a cuerpo: va al enemigo más cercano', () => {
    newGame('CRANE');
    dummy({ x: 10, y: 8 });
    const dir = aiMoveDirection(player);
    checkEq(`${dir.dx},${dir.dy}`, '1,1', 'dirección');
});

test('IA: habilidades de área solo con 2+ enemigos cerca, sin ensuciar el registro', () => {
    newGame('CRANE');
    const giro = learn('CRANE_BEAM', 1);
    dummy({ hp: 9999, maxHp: 9999 });
    aiCastSkills(player);
    checkEq(player.cooldowns[giro.id], 0, 'con 1 enemigo no la usa');
    dummy({ y: player.y + 1, hp: 9999, maxHp: 9999 });
    aiCastSkills(player);
    check(player.cooldowns[giro.id] > 0, 'con 2 enemigos sí');
    const hacha = learn('VAMP_CLAW', 1);
    creeps.forEach(k => { k.x = 19; });
    const logs = document.querySelectorAll('#combat-log p').length;
    aiCastSkills(player);
    checkEq(document.querySelectorAll('#combat-log p').length, logs, 'un intento fallido no deja mensajes');
    checkEq(player.cooldowns[hacha.id], 0, 'ni gasta el enfriamiento');
});

test('IA: definitiva primero al repartir puntos y prefiere habilidades naturales en el draft', () => {
    newGame('CRANE');
    const ult = learn('CRANE_DEMOLITION', 0), giro = learn('CRANE_BEAM', 0);
    player.level = 6; player.skillPoints = 2;
    aiSpendPoints(player);
    checkEq(skillLevel(player, ult), 1, 'definitiva');
    checkEq(skillLevel(player, giro), 1, 'y el resto');
    const pick = aiPickDraft(player, [SKILL_INDEX.REC_TRIPODE, SKILL_INDEX.CRANE_CABIN, SKILL_INDEX.VAMP_CLAW]);
    checkEq(pick.id, 'CRANE_CABIN', 'natural');
});

// ============================================================ MUNDO DE 8 HÉROES (fase F1)
test('Partida de 8: el jugador + 7 rivales con otros héroes, cada uno en su arena', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    checkEq(heroes.length, MAX_HEROES, 'héroes');
    check(heroes.slice(1).every(h => h.isAI && h.key !== 'CRANE'), 'rivales con otros héroes');
    check(heroes.slice(1).every(h => h.skills.length === 1), 'los rivales ya draftearon');
    learnSkill(currentDraft.options[0]);
    startWave();
    checkEq(arenas.length, MAX_HEROES, 'una arena por héroe');
    checkEq(new Set(arenas.map(a => a.creeps)).size, MAX_HEROES, 'cada arena con sus propios creeps');
    check(arenas.every(a => a.creeps.length === arenas[0].creeps.length), 'todos pelean la misma oleada');
    check(heroes.every(h => enemiesOf(h) === h.arena.creeps), 'cada héroe pelea contra los creeps de su arena');
});

test('Las arenas se juegan en paralelo; al terminar todas, la ronda suma puntos y sigue', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.REC);
    learnSkill(currentDraft.options[0]);
    waveNumber = DUEL_START_ROUND + 1;
    startWave();
    heroes.forEach(h => addEffect(h, { id: 'TEST_GOD', duration: 1e9, flags: ['invulnerable', 'persistent'] }));
    autopilot = true;
    try {
        for (let f = 0; (inCombat() || gameState === 'BETTING') && f < 20000; f++) {
            if (gameState === 'BETTING') endBetting();
            gameClock += 0.05; updateWave(0.05);
        }
    } finally { autopilot = false; }
    check(!inCombat(), 'terminó la ronda (oleadas, previa y duelos)');
    checkEq(waveNumber, DUEL_START_ROUND + 2, 'pasó a la ronda siguiente');
    const total = heroes.reduce((s, h) => s + h.points, 0);
    checkEq(total, (MAX_HEROES - 2) * POINTS.waveClean + POINTS.duelWin, 'puntos: 6 oleadas limpias + 1 duelo (los duelistas no hacen oleada)');
    check(heroes.every(h => h.inRest && !h.arena), 'todos en el Área de Descanso');
});

test('Solo se ven los mensajes de la arena que estás mirando', () => {
    newGame('CRANE');
    const rival = heroes[1];
    rival.inRest = false;
    arenas.push(makeArena('wave', [rival]));
    spawnWave(rival.arena, TEST_WAVE);
    rival.hp = 1;
    const c = rival.arena.creeps[0];
    Object.assign(c, { x: rival.x + 1, y: rival.y, atk: 999, attackTimer: 99 });
    const before = document.querySelectorAll('#combat-log p').length;
    updateWave(0.016);
    check(!rival.isAlive(), 'el rival murió en su arena');
    checkEq(document.querySelectorAll('#combat-log p').length, before, 'sin mensajes de su arena');
});

test('Rival Condenado que muere contra creeps queda eliminado y no juega la ronda siguiente', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    startWave();
    const rival = heroes[3];
    rival.lives = 0; setCondemned(rival, 0.1);
    dealDamage(rival.arena.creeps[0], rival, 99999, 'pure');
    check(rival.eliminated, 'eliminado');
    check(rival.arena.done, 'su arena terminó');
    checkEq(heroRank(rival), MAX_HEROES, 'último en el ranking');
    clearAllWaves();
    check(!arenas.some(a => a.heroes.includes(rival)), 'no duela');
    skipDuels();
    if (gameState === 'DRAFT') learnSkill(currentDraft.options[0]);
    startWave();
    check(!arenas.some(a => a.heroes.includes(rival)), 'no tiene arena en la ronda 2');
    checkEq(arenas.length, MAX_HEROES - 1, 'juegan los otros 7');
});

test('Espectador: si el jugador queda eliminado, la partida sigue y mira a otro héroe', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    startWave();
    player.lives = 0; setCondemned(player, 0.1);
    dealDamage(player.arena.creeps[0], player, 99999, 'pure');
    check(player.eliminated, 'eliminado');
    check(viewedHero !== player && !viewedHero.eliminated, 'pasa a mirar a un héroe en juego');
    clearAllWaves();
    skipDuels();
    checkEq(gameState, 'PREP', 'la partida sigue (sin draft para el eliminado)');
    startWave();
    checkEq(arenas.length, MAX_HEROES - 1, 'juegan los otros 7');
});

test('Fin de partida al llegar al máximo de rondas: gana el primero del ranking', () => {
    const saved = MAX_ROUNDS;
    try {
        MAX_ROUNDS = 1;
        resetGame();
        selectHero(HERO_TEMPLATES.CRANE);
        learnSkill(currentDraft.options[0]);
        startWave();
        heroes[2].points = 10;
        clearAllWaves();
        skipDuels();
        checkEq(gameState, 'ENDED', 'terminó');
        checkEq(rankedHeroes()[0], heroes[2], 'gana el de más puntos');
    } finally { MAX_ROUNDS = saved; }
});

// ============================================================ DUELOS (fase F2)
// Deja la partida lista en el duelo de la ronda (todas las oleadas limpias). Por defecto el jugador pelea contra heroes[1]
// (la rotación elige a los que menos duelos pelearon).
function toDuels(heroKey = 'CRANE', playerFights = true) {
    resetGame();
    selectHero(HERO_TEMPLATES[heroKey]);
    learnSkill(currentDraft.options[0]);
    waveNumber = DUEL_START_ROUND + 1; // los duelos arrancan en la ronda 5 (y la 5 tiene jefe)
    heroes.forEach((h, i) => { h.duelWins = playerFights ? (i < 2 ? 0 : 5) : (i === 0 ? 5 : 0); });
    startWave();
    clearAllWaves(); // saltea la previa y termina las oleadas de los demás: queda el duelo en curso
    return arenas;
}

test('Un duelo por ronda: pelean los que menos pelearon, sin repetir la pareja anterior; los demás miran', () => {
    toDuels();
    checkEq(gameState, 'WAVE', 'el duelo se pelea en la misma fase que las oleadas');
    checkEq(arenas.filter(a => a.kind === 'duel').length, 1, 'un solo duelo');
    check(arenas[0].heroes.includes(player) && arenas[0].heroes.includes(heroes[1]), 'los que menos pelearon');
    check(heroes.slice(2).every(h => h.inRest), 'los demás, en la sala');
    for (let i = 0; i < 20; i++) {
        heroes.forEach(h => { h.duelWins = 0; h.duelLosses = 0; });
        lastDuelPair = [heroes[2], heroes[3]];
        const pair = pickDuelPair(heroes.slice(2, 5));
        check(!(pair.includes(heroes[2]) && pair.includes(heroes[3])), 'no repite la pareja anterior');
    }
    toDuels('CRANE', false);
    check(!arenas[0].heroes.includes(player) && viewedHero === player, 'si no peleás, la cámara sigue en tu héroe');
    check(arenas[0].heroes.every(h => heroStatusIcon(h) === '🔥') && heroStatusIcon(player) === '🏕', 'el 🔥 marca a los duelistas');
}, { random: true });

test('Duelo: gana quien mata al otro (+3 puntos); con 5 o más en juego perder no cuesta nada', () => {
    toDuels();
    const arena = arenas.find(a => a.heroes.includes(player));
    const rival = arena.heroes.find(h => h !== player);
    const points = player.points, lives = rival.lives;
    dealDamage(player, rival, 99999, 'pure');
    check(arena.done, 'el duelo terminó');
    checkEq(player.points - points, POINTS.duelWin, 'puntos del ganador');
    checkEq(rival.lives, lives, 'los duelos no cuestan vidas');
    check(!isCondemned(rival), 'con 8 en juego, sin maldición');
    check(player.inRest && rival.inRest, 'los dos descansan');
    checkEq(rival.hp, rival.maxHp, 'el perdedor se recupera en el descanso');
});

test('Duelo con 3 héroes o menos: el perdedor queda maldito (aunque tenga vidas)', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    heroes.filter(h => h !== a && h !== b).slice(1).forEach(h => { h.eliminated = true; }); // quedan 3
    checkEq(aliveHeroes().length, DUEL_CURSE_ALIVE, 'quedan 3');
    dealDamage(a, b, 99999, 'pure');
    check(isCondemned(b) && b.lives === 2, 'maldito y con sus 2 vidas');
});

test('La maldición amplifica el daño de creeps y héroes sin maldición, no el de otro maldito', () => {
    newGame('CRANE');
    const cursed = heroes[1], clean = heroes[2];
    setCondemned(player, 0.5);
    const c = dummy();
    const hp = player.hp;
    dealDamage(c, player, 100, 'pure'); checkEq(hp - player.hp, 150, 'creep: +50%');
    player.hp = hp; dealDamage(clean, player, 100, 'pure'); checkEq(hp - player.hp, 150, 'héroe sin maldición: +50%');
    setCondemned(cursed, 0.1);
    player.hp = hp; dealDamage(cursed, player, 100, 'pure'); checkEq(hp - player.hp, 100, 'héroe maldito: sin extra');
});

test('Maldito con vidas: un creep lo mata y pierde una vida (no queda eliminado)', () => {
    newGame('CRANE');
    setCondemned(player, 0.1);
    player.hp = 1;
    updateCreep(dummy({ atk: 9999, attackTimer: 99 }), 0.016);
    check(!player.eliminated, 'sigue en juego');
    checkEq(player.lives, 1, 'perdió una vida');
});

test('Duelo: con más de 3 en juego, perder no cambia nada aunque esté maldito', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    heroes.filter(h => h !== a && h !== b).slice(2).forEach(h => { h.eliminated = true; }); // quedan 4
    setCondemned(b, 0.1);
    dealDamage(a, b, 99999, 'pure');
    checkNear(b.condemnPct, 0.1, 'sin castigo extra');
    check(!b.eliminated, 'sigue en la partida');
});

test('Con 3 en juego, cada duelo perdido suma una instancia; con 2, además cuesta una vida', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    heroes.filter(h => h !== a && h !== b).slice(1).forEach(h => { h.eliminated = true; }); // quedan 3
    setCondemned(b, 0.1);
    dealDamage(a, b, 99999, 'pure');
    checkNear(b.condemnPct, 0.2, 'una instancia más');
    checkEq(b.lives, 2, 'con 3 no cuesta vidas');
    check(!b.eliminated, 'sigue');
    toDuels();
    const [c, d] = arenas[0].heroes;
    heroes.forEach(h => { if (h !== c && h !== d) h.eliminated = true; }); // quedan 2
    dealDamage(c, d, 99999, 'pure');
    checkEq(d.lives, 1, 'con 2 pierde una vida');
    check(isCondemned(d), 'y una instancia de maldición');
    d.lives = 1; d.eliminated = false;
    toDuels();
    const [e, f] = arenas[0].heroes;
    heroes.forEach(h => { if (h !== e && h !== f) h.eliminated = true; });
    f.lives = 1;
    dealDamage(e, f, 99999, 'pure');
    check(f.eliminated, 'sin vidas: eliminado');
});

test('Duelo: si se acaba el tiempo gana el que tiene más % de vida; los enfriamientos arrancan en 0', () => {
    toDuels();
    check(arenas.every(a => a.heroes.every(h => Object.values(h.cooldowns).every(cd => cd === 0))), 'enfriamientos reiniciados');
    const arena = arenas[0];
    const [a, b] = arena.heroes;
    a.hp = a.maxHp * 0.3; b.hp = b.maxHp * 0.6;
    arena.elapsed = DUEL_TIME;
    updateWave(0.016);
    check(arena.done, 'terminó por tiempo');
    check(b.points > a.points, 'gana el de más % de vida');
});

test('Duelo: la IA usa su definitiva y habilidades de área contra un solo rival', () => {
    toDuels();
    const arena = arenas[0];
    const [a, b] = arena.heroes;
    a.skills.slice().forEach(s => a.removeSkill(s));
    const ult = SKILL_INDEX.CRANE_BEAM; // de área
    a.addSkill(ult); a.skillLevels[ult.id] = 1; a.mana = a.maxMana;
    b.x = a.x + 1; b.y = a.y;
    aiCastSkills(a);
    check(a.cooldowns[ult.id] > 0, 'la lanzó contra un solo enemigo');
});

test('Coraza de Espinas también devuelve daño a héroes cuerpo a cuerpo en los duelos', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    giveItem(b, 'THORNS');
    a.baseAttackRange = 1.5; a.recalculateStats();
    const hp = a.hp;
    const { dealt } = dealDamage(a, b, 100, 'physical');
    checkEq(hp - a.hp, Math.round(dealt * ITEMS.THORNS.reflect * (1 - DUEL_DAMAGE_REDUCTION)), 'reflejo al atacante (con la reducción de duelo)');
});

// ============================================================ APUESTAS Y PREMIOS (fase F3)
// Deja la partida en la previa del duelo, con oro para apostar. El jugador no pelea (la rotación elige a otros), salvo
// que se pida lo contrario.
function toBetting(gold = 400, playerFights = false) {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    waveNumber = DUEL_START_ROUND + 1;
    heroes.forEach((h, i) => { h.duelWins = playerFights ? (i < 2 ? 0 : 5) : (i === 0 ? 5 : 0); });
    player.gold = gold;
    startWave(); // la ronda arranca con la previa de apuestas
}

test('Ronda con duelo: los duelistas pelean mientras los demás hacen su oleada; los enfriamientos corren en el descanso', () => {
    toBetting(400);
    endBetting();
    const duel = duelArena();
    check(duel && !duel.done, 'duelo en curso');
    const others = aliveHeroes().filter(h => !duel.heroes.includes(h));
    check(others.every(h => h.arena && h.arena.kind === 'wave' && h.arena.creeps.length), 'los demás, en su oleada');
    check(duel.heroes.every(h => !arenas.some(a => a.kind === 'wave' && a.heroes.includes(h))), 'los duelistas no hacen oleada');
    clearAllWaves();
    check(player.inRest, 'el jugador terminó y descansa');
    player.cooldowns.X = 5;
    updateRestArea(2);
    checkNear(player.cooldowns.X, 3, 'el enfriamiento sigue corriendo en el descanso');
    skipDuels();
    check(!inCombat(), 'terminó la ronda');
});

test('Previa: al empezar la ronda se eligen los duelistas y los demás apuestan; después pelean mientras los demás hacen su oleada', () => {
    toBetting();
    checkEq(gameState, 'BETTING', 'previa');
    checkEq(bettablePairs().length, 1, 'un solo duelo para apostar');
    const pair = duelPlan.pairs[0].slice();
    tickPhaseTimer(PHASE_TIMES.betting + 0.1);
    checkEq(gameState, 'WAVE', 'al vencer el tiempo arranca la ronda');
    check(arenas[0].kind === 'duel', 'con el duelo');
    checkEq(arenas[0].heroes.join(), pair.join(), 'los mismos de la previa');
});

test('Apuesta: tope del 50% del oro y una por ronda', () => {
    toBetting(400);
    const [a, b] = bettablePairs()[0];
    check(!placeBet(a, 201), 'más del tope (200g)');
    check(placeBet(a, 100), 'apuesta válida');
    checkEq(player.gold, 300, 'se descuenta al apostar');
    check(!placeBet(b, 1), 'una sola apuesta por ronda');
});

test('Pozo compartido: los que aciertan recuperan lo suyo y se reparten lo apostado al perdedor', () => {
    toBetting(400);
    const [a, b] = bettablePairs()[0];
    const other = heroes.find(h => h !== player && h !== a && h !== b);
    duelBets = []; other.gold = 1000;
    duelBets.push({ bettor: other, on: b, against: a, amount: 300 });
    checkEq(potPayout(a, 100, 100), 400, 'la ventana calcula lo que cobrarías');
    placeBet(a, 100);
    endBetting();
    dealDamage(a, b, 99999, 'pure');
    checkEq(player.gold, 300 + 100 + 300, 'recupera sus 100 y se lleva los 300 del otro lado');
    toBetting(400);
    const [c, d] = bettablePairs()[0];
    duelBets = [];
    placeBet(c, 100);
    endBetting();
    dealDamage(d, c, 99999, 'pure');
    checkEq(player.gold, 300, 'perdió lo apostado');
});

test('La IA apuesta (nunca a su propio duelo) y el ganador cobra el 25% de lo que le apostaron', () => {
    toBetting(400, true); // el jugador pelea: no hay ventana, pero la IA apuesta igual
    checkEq(gameState, 'WAVE', 'directo a la ronda');
    const rival = arenas[0].heroes.find(h => h !== player);
    for (let i = 0; i < 30; i++) { const saved = duelBets; duelBets = []; aiPlaceBets(); check(duelBets.every(b => !(b.bettor === b.on || b.bettor === b.against)), 'nadie apuesta a su propio duelo'); duelBets = saved; }
    const other = heroes.find(h => h !== player && h !== rival);
    duelBets = [{ bettor: other, on: player, against: rival, amount: 200 }];
    const gold = player.gold, otherGold = other.gold;
    dealDamage(player, rival, 99999, 'pure');
    checkEq(player.gold - gold, Math.round(200 * BACKING_BONUS), 'respaldo: 25% de lo que te apostaron');
    checkEq(other.gold - otherGold, 200, 'el que te apostó recupera lo suyo (nadie apostó al otro lado)');
});

test('Sin oro para apostar (o eliminado) no hay previa: los duelos arrancan directo', () => {
    toBetting(1);
    checkEq(gameState, 'WAVE', 'con 1g el tope es 0');
});

test('Premios: la mitad de abajo de los que siguen en juego recibe un Fragmento; el último, además un Libro', () => {
    toDuels();
    heroes.forEach((h, i) => { h.points = 1000 - i * 10; });  // ranking = orden de heroes
    heroes[7].eliminated = true;                          // quedan 7: premio para los 3 últimos en juego
    skipDuels();
    const frags = heroes.map(h => h.destiny.fragments), books = heroes.map(h => h.destiny.books);
    checkEq(frags.join(), '0,0,0,0,1,1,1,0', 'Fragmentos');
    checkEq(books.join(), '0,0,0,0,0,0,1,0', 'Libro para el último en juego');
});

test('IA: usa el Libro en una habilidad que no es natural y vende el Fragmento si su kit es casi todo natural', () => {
    const h = new Hero(HERO_TEMPLATES.CRANE);
    const natural = Object.values(HERO_SKILLS.CRANE).filter(s => !s.isUltimate);
    const foreign = Object.values(HERO_SKILLS.REC).find(s => !s.isUltimate);
    natural.forEach(s => h.addSkill(s));
    h.addSkill(foreign);
    h.destiny.books = 1; h.destiny.fragments = 1;
    const gold = h.gold;
    aiUseDestiny(h);
    check(!h.skills.includes(foreign), 'cambió la habilidad ajena');
    checkEq(h.skills.length, natural.length + 1, 'kit completo');
    checkEq(h.destiny.books + h.destiny.fragments, 0, 'usó todo');
    checkEq(h.gold, gold + FRAGMENT_SELL_PRICE, 'vendió el Fragmento');
});

// ============================================================ JEFES DE RONDA Y NEUTRALES (fase G)
// Deja la partida en la pelea contra el jefe de la ronda 5 (cada héroe en su arena).
function toBoss() {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    waveNumber = ROUND_BOSS_EVERY;
    startWave();
    clearAllWaves();
    skipDuels();
    return player.arena;
}

test('Jefe de ronda: en la ronda 5, después de los duelos, cada héroe pelea contra el mismo jefe en su arena', () => {
    const arena = toBoss();
    checkEq(gameState, 'BOSS', 'fase del jefe');
    checkEq(arenas.length, MAX_HEROES, 'una arena por héroe');
    check(arenas.every(a => a.heroes.length === 1 && a.boss.isRoundBoss), 'cada uno con su jefe');
    checkEq(new Set(arenas.map(a => a.boss.type)).size, 1, 'el mismo tipo de jefe para todos');
    checkEq(arena.boss.type, lastRoundBoss, 'el jefe sorteado');
    checkEq(enrageMult(arena), 1, 'todavía no se enfureció');
    arena.elapsed = BOSS_FIGHT.enrageAfter + 10;
    check(enrageMult(arena) > 1, 'pasado el tiempo se enfurece');
});

test('Jefe de ronda: como contra los creeps, morir cuesta una vida y se revive con Voluntad de Titán', () => {
    const arena = toBoss();
    const lives = player.lives;
    dealDamage(arena.boss, player, 99999, 'pure');
    checkEq(player.lives, lives - 1, 'perdió una vida');
    waitRespawn();
    check(player.isAlive() && getEffect(player, 'TITAN_WILL'), 'revivió con Voluntad de Titán');
    player.lives = 0; setCondemned(player, 0.1); removeEffect(player, 'TITAN_WILL');
    dealDamage(arena.boss, player, 99999, 'pure');
    check(player.eliminated, 'sin vidas y Condenado: eliminado por el jefe');
});

test('Jefe de ronda: al matarlo cobrás oro y elegís neutral; los 3 más rápidos cobran extra', () => {
    toBoss();
    const realEndRound = endRound;
    window.endRound = () => {}; // para mirar el oro antes de que la IA compre en la ronda siguiente
    const gold = heroes.map(h => h.gold);
    try {
        heroes.forEach((h, i) => { h.arena.elapsed = 10 + i; dealDamage(h, h.arena.boss, 1e9, 'pure'); }); // el jugador, el más rápido
        updateWave(0.016);
    } finally { window.endRound = realEndRound; }
    const base = BOSS_FIGHT.gold[0];
    const got = heroes.map((h, i) => h.gold - gold[i]);
    checkEq(got[0], base + Math.round(base * BOSS_FIGHT.fastBonus[0]) + 1, '1º más rápido: +50% (y 1g por el último golpe)');
    checkEq(got[1], base + Math.round(base * BOSS_FIGHT.fastBonus[1]) + 1, '2º: +30%');
    checkEq(got[5], base + 1, 'el 6º: el oro de todos');
    checkEq(player.neutralOffer.length, BOSS_FIGHT.neutralOptions, '3 neutrales para elegir');
    check(player.neutralOffer.every(k => NEUTRAL_ITEMS[k].tier === 1), 'del escalón 1');
    check(heroes.slice(1).every(h => h.neutral), 'la IA ya eligió');
});

test('Jefes: cada uno se pone más difícil a su manera', () => {
    toBoss();
    const make = key => { const c = makeRoundBoss(ROUND_BOSSES.find(b => b.key === key)); c.arena = player.arena; player.arena.creeps.push(c); return c; };
    const golem = make('GOLEM'), armor = golem.armor;
    golem.hp = golem.maxHp * 0.5; golem.type.update(golem, 0.01);
    checkEq(golem.armor, armor + 3, 'Gólem: fase 2 con más armadura');
    const hydra = make('HYDRA');
    hydra.hp = hydra.maxHp * 0.4; hydra.type.update(hydra, 0.01);
    checkEq(hydra.heads, 2, 'Hidra: 2 cabezas nuevas con 60% de vida perdida');
    check(effAttack(hydra) > hydra.atk, 'Hidra: pega más');
    const lich = make('LICH');
    lich.type.update(lich, 12); const d1 = getEffect(lich, 'LICH_BARRIER').until - gameClock;
    lich.type.update(lich, 12); const d2 = getEffect(lich, 'LICH_BARRIER').until - gameClock;
    checkNear(d2 - d1, 1, 'Liche: cada barrera dura 1s más');
    const queen = make('HIVE_QUEEN');
    const before = player.arena.creeps.length; queen.type.update(queen, 8); const first = player.arena.creeps.length - before;
    queen.type.update(queen, 8); const second = player.arena.creeps.length - before - first;
    checkEq(second, first + 1, 'Reina: cada invocación trae uno más');
});

test('Neutrales: uno solo, da sus stats; al cambiarlo el anterior se vende solo', () => {
    newGame('CRANE');
    const armor = effArmor(player);
    player.neutralOffer = ['BRUTE_AMULET', 'WOLF_FANG', 'STALKER_DAGGER'];
    check(equipNeutral(player, 'BRUTE_AMULET'), 'equipado');
    check(effArmor(player) > armor, 'más armadura');
    const gold = player.gold;
    player.neutralOffer = ['OAK_SHIELD'];
    equipNeutral(player, 'OAK_SHIELD');
    checkEq(player.neutral, 'OAK_SHIELD', 'cambiado');
    checkEq(player.gold - gold, neutralSellPrice('BRUTE_AMULET'), 'el anterior se vendió');
    checkEq(player.effects.filter(e => e.id === 'NEUTRAL').length, 1, 'un solo efecto de neutral');
    checkEq(sellNeutral(player), 2 * NEUTRAL_SELL_PER_TIER, 'se vende por escalón × 60');
    checkEq(player.neutral, null, 'sin neutral');
});

test('Las oleadas ya no traen el tema "Jefe Final" (lo reemplaza el jefe de ronda)', () => {
    for (let r = 1; r <= 20; r++) check(rollWave(r).name !== 'Jefe Final', 'ronda ' + r);
});

// ============================================================ MENÚ Y ELECCIÓN DE HÉROE
test('Elección de héroe: 3 opciones propias + "al azar" (uno que no está entre ellas)', () => {
    resetGame();
    startHeroPick();
    checkEq(gameState, 'HERO_SELECT', 'fase de elección');
    checkEq(heroOffers[0].length, HERO_PICK_OPTIONS, '3 opciones');
    checkEq(document.querySelectorAll('#hero-options .skill-card').length, HERO_PICK_OPTIONS + 1, '3 cartas + al azar');
    for (let i = 0; i < 20; i++) check(!heroOffers[0].includes(randomHeroPick()), 'al azar: fuera de tus opciones');
    for (let i = 1; i < MAX_HEROES; i++) check(heroOffers[i].every(t => !heroOffers[0].includes(t)), 'tus opciones son solo tuyas');
});

test('Elegir cualquier héroe: el panel muestra los 11 (no solo tus 3 opciones) y penaliza el oro inicial', () => {
    resetGame();
    startHeroPick();
    const totalHeroes = Object.keys(HERO_TEMPLATES).length;
    openHeroDrawer();
    check(document.getElementById('hero-any-drawer').classList.contains('open'), 'el panel se abre');
    checkEq(document.querySelectorAll('#hero-any-options .skill-card').length, totalHeroes, 'una carta por cada héroe del roster');
    // Elegir uno que no está entre las 3 opciones que te tocaron (si hay alguno disponible), haciendo clic
    // en su carta real (no llamando a selectHero directo) para probar el cierre del panel también.
    const notOffered = Object.values(HERO_TEMPLATES).find(t => !heroOffers[0].includes(t)) || Object.values(HERO_TEMPLATES)[0];
    const card = [...document.querySelectorAll('#hero-any-options .skill-card')].find(c => c.textContent.includes(notOffered.name));
    card.click();
    checkEq(player.key, notOffered.key, 'te deja elegir uno que no estaba en tus opciones');
    checkEq(player.gold, GOLD_PENALTY_FREE_PICK, 'arranca con la penalización de oro');
    check(!document.getElementById('hero-any-drawer').classList.contains('open'), 'el panel se cierra al elegir');

    resetGame();
    startHeroPick();
    document.querySelectorAll('#hero-options .skill-card')[0].click();
    checkEq(player.gold, 100, 'elegir de las 3 opciones normales no penaliza');
});

test('Elección de héroe: los rivales eligen de sus opciones y ningún héroe se repite', () => {
    for (let n = 0; n < 10; n++) {
        resetGame();
        startHeroPick();
        const offers = heroOffers;
        document.querySelectorAll('#hero-options .skill-card')[0].click();
        checkEq(new Set(heroes.map(h => h.key)).size, MAX_HEROES, 'sin repetidos');
        heroes.slice(1).forEach((h, i) => {
            const own = offers[i + 1].filter(t => t !== offers[0][0]);
            // elige de las suyas salvo que ya se las hayan tomado todas
            check(own.some(t => t.key === h.key) || own.every(t => heroes.some(o => o !== h && o.key === t.key)), 'eligió de sus opciones');
        });
    }
});

test('Con héroes de sobra, cada jugador tiene opciones que no se repiten', () => {
    const fake = Array.from({ length: MAX_HEROES * HERO_PICK_OPTIONS }, (_, i) => ({ key: 'H' + i }));
    const all = dealHeroOffers(fake).flat();
    checkEq(new Set(all).size, all.length, 'las 24 opciones son distintas');
});

test('Tutorial: se abre, avanza y se cierra', () => {
    openTutorial();
    checkEq(document.getElementById('tutorial').style.display, 'flex', 'abierto');
    for (let i = 0; i < TUTORIAL_PAGES.length - 1; i++) tutorialStep(1);
    checkEq(tutorialPage, TUTORIAL_PAGES.length - 1, 'última página');
    tutorialStep(1);
    checkEq(document.getElementById('tutorial').style.display, 'none', 'cerrado');
});

test('Rondas 1 a 4 sin duelos: al terminar las oleadas se pasa directo a la ronda siguiente', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    startWave();
    clearAllWaves(false);
    check(gameState !== 'BETTING' && gameState !== 'DUEL', 'sin previa ni duelos en la ronda 1');
    checkEq(waveNumber, 2, 'ronda 2');
});

test('Tienda en ventana: se abre sola en la preparación, se cierra y se vuelve a abrir con B', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    checkEq(gameState, 'PREP', 'preparación');
    checkEq(document.getElementById('shop-container').style.display, 'block', 'abierta');
    closeShop();
    checkEq(document.getElementById('shop-container').style.display, 'none', 'cerrada');
    toggleShop();
    checkEq(document.getElementById('shop-container').style.display, 'block', 'reabierta');
    startWave();
    checkEq(document.getElementById('shop-container').style.display, 'none', 'se cierra al empezar la oleada');
});

test('Cartel del duelo: presenta a los dos y la frase del presentador sale de cómo llegan', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    const [a, b] = heroes;
    check(duelTagline(a, b).includes('Se estrenan'), 'sin duelos jugados');
    a.duelWins = 2;
    check(duelTagline(a, b).includes(`${a.name} no perdió`), 'invicto');
    a.duelLosses = 1; a.points = 5; b.points = 5;
    check(duelTagline(a, b).includes('Parejos'), 'empatados');
    b.points = 9;
    check(duelTagline(a, b).includes(`${b.name} viene arriba`), 'favorito');
    heroes.slice(2).forEach(h => { h.eliminated = true; });
    check(duelTagline(a, b).includes('final'), 'quedan dos');
    heroes.slice(2).forEach(h => { h.eliminated = false; });
    const card = document.getElementById('duel-card');
    showDuelCard(a, b);
    check(card.textContent.includes(a.name) && card.textContent.includes(b.name), 'muestra a los dos');
    check(card.textContent.includes('¡Te toca!'), 'avisa si peleás vos');
    resetGame();
    checkEq(card.innerHTML, '', 'se limpia con la partida');
});

test('Cartel del resultado: cuenta cómo terminó el duelo, con el golpe más fuerte y su habilidad', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    const [a, b] = heroes;
    const stats = { dmg: 0, avoidable: 0, changes: 0, tape: [] };
    noteDuelHit(stats, a, 30);
    dodgeableHit = { skillName: 'Rayo de prueba' };
    noteDuelHit(stats, b, 50);
    dodgeableHit = null;
    noteDuelHit(stats, a, 10);
    checkEq(stats.dmg, 90, 'suma todo');
    checkEq(stats.avoidable, 50, 'solo el proyectil se podía evitar');
    checkEq(stats.bestHit.dmg, 50, 'se queda con el más fuerte');
    checkEq(stats.bestHit.by, b, 'y con quién lo pegó');
    checkEq(stats.bestHit.skill, 'Rayo de prueba', 'y con qué');
    a.hp = a.maxHp; b.hp = 0;
    check(duelVerdict(a, b, 0, true).includes('tiempo'), 'por tiempo');
    check(duelVerdict(a, b, 3, false).includes('3 veces'), 'peleado');
    check(duelVerdict(a, b, 0, false).includes('Paseo'), 'con la vida casi llena');
    a.hp = Math.round(a.maxHp * 0.1);
    check(duelVerdict(a, b, 0, false).includes('Por un pelo'), 'con poca vida');
    a.hp = Math.round(a.maxHp * 0.5);
    check(duelVerdict(a, b, 0, false).includes(`${POINTS.duelWin} puntos`), 'normal');
    const card = document.getElementById('duel-card');
    showDuelResult({ stats, elapsed: 16.4 }, a, b, false);
    check(card.textContent.includes(`Gana ${a.name}`), 'dice quién ganó');
    check(card.textContent.includes('16 s'), 'cuánto duró');
    check(card.textContent.includes('Rayo de prueba'), 'el mejor golpe');
    check(card.textContent.includes('¡Ganaste!'), 'si ganaste vos');
    resetGame();
});

test('Repetición: la cinta del duelo guarda la jugada y el cartel la muestra, sin tocar el combate', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    const [a, b] = heroes, arena = makeDuelArenas({ pairs: [[a, b]], bye: null })[0];
    const hpA = a.hp, hpB = b.hp;
    for (let i = 0; i < 100; i++) updateDuelArena(arena, 0.05);
    checkEq(arena.stats.tape.length, 50, 'un cuadro cada 0,1 s');
    checkEq(arena.stats.tape[0].length, 6, 'dos competidores: lugar y vida');
    check(a.hp === hpA && b.hp === hpB, 'mirar no cambia la vida');
    const tape = arena.stats.tape;
    checkEq(duelReplayClip(arena, false).length, 30, 'los últimos 3 s');
    checkEq(duelReplayClip(arena, false)[29], tape[49], 'hasta el final');
    check(!duelReplayClip(arena, true), 'por tiempo y sin golpes, nada para mostrar');
    arena.stats.bestHit = { by: a, dmg: 5, frame: 20 };
    const clip = duelReplayClip(arena, true);
    checkEq(clip[clip.length - 1], tape[29], 'por tiempo, termina 1 s después del mejor golpe');
    check(!duelReplayClip({ stats: { tape: [] } }, false), 'sin cinta no hay repetición');
    const frames = [[3, 6, 1, 16, 6, 1], [3, 6, 1, 15, 6, 1], [3, 6, 0.5, 14, 6, 0]];
    const ctx = document.createElement('canvas').getContext('2d');
    drawDuelReplay(ctx, frames, 1.5, [true, false]); // no revienta con vida 0 y entre dos cuadros
    drawDuelReplay(ctx, frames, -0.2, [true, false]); // ni antes de empezar
    drawDuelReplay(ctx, frames, 9, [true, false]); // ni después del final
    arena.elapsed = 5;
    a.hp = a.maxHp; b.hp = 1;
    showDuelResult(arena, a, b, false);
    const card = document.getElementById('duel-card');
    check(card.querySelector('canvas'), 'el cartel trae el tablero');
    check(card.textContent.includes('el golpe final'), 'y dice qué jugada es');
    resetGame();
    checkEq(card.innerHTML, '', 'se limpia con la partida');
});

test('Ítems nuevos: Batería de Arranque solo pega más a los creeps', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.ALCHEMIST);
    learnSkill(currentDraft.options[0]);
    giveItem(player, 'STARTER_CELL');
    const hit = target => { const ctx = { target, dmg: 10 }; emit(player, 'beforeAttack', ctx); return ctx.dmg; };
    checkEq(hit({ isHero: false }), 10 + ITEMS.STARTER_CELL.creepDmg, 'contra un creep');
    checkEq(hit(heroes[1]), 10, 'contra un competidor no cambia');
    check(ITEM_ICONS.STARTER_CELL && ITEM_ICONS.EVO_CORE && ITEM_ICONS.BOSS_PLATE && ITEM_ICONS.EMERGENCY_CELL, 'los cuatro tienen ícono');
});

test('Ítems nuevos: Núcleo Evolutivo escala con los creeps, no con los competidores', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    giveItem(player, 'EVO_CORE');
    const str = player.str, n = ITEMS.EVO_CORE.killsPerPoint;
    for (let i = 0; i < n - 1; i++) emit(player, 'onKill', { victim: { isHero: false } });
    checkEq(player.str, str, 'todavía no');
    emit(player, 'onKill', { victim: heroes[1] });
    checkEq(player.str, str, 'un competidor no cuenta');
    emit(player, 'onKill', { victim: { isHero: false } });
    checkEq(player.str, str + 1, 'suma su atributo principal');
});

test('Ítems nuevos: Placa de Producción baja el daño de los jefes y de nadie más', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    const hurt = source => { player.hp = player.maxHp; const hp = player.hp; dealDamage(source, player, 100, 'pure'); return hp - player.hp; };
    const other = heroes[1], boss = other, grunt = other; // cualquier fuente sirve: lo que cuenta es la marca de jefe
    other.isRoundBoss = true;
    const before = hurt(boss);
    giveItem(player, 'BOSS_PLATE');
    checkEq(hurt(boss), Math.round(before * 0.7), '30% menos del jefe');
    other.isRoundBoss = false;
    checkEq(hurt(grunt), before, 'de otro, igual');
});

test('Ítems nuevos: Carga de Emergencia salva una vez y después recarga', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.ALCHEMIST);
    learnSkill(currentDraft.options[0]);
    giveItem(player, 'EMERGENCY_CELL');
    player.mana = 0;
    player.hp = Math.round(player.maxHp * 0.5);
    emit(player, 'onDamaged', {});
    checkEq(player.mana, 0, 'con vida de sobra no salta');
    player.hp = Math.round(player.maxHp * 0.2);
    const hp = player.hp;
    emit(player, 'onDamaged', {});
    check(player.hp > hp && player.mana > 0, 'salta y recupera');
    const after = player.hp = Math.round(player.maxHp * 0.2);
    emit(player, 'onDamaged', {});
    checkEq(player.hp, after, 'una sola vez');
});

test('Ítems activos: silencio, aturdir y atrapar, con enfriamiento y sin objetivo no se gastan', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    a.inventory = []; b.inventory = [];
    ['INHIBITOR', 'SHOCK_MACE', 'NET_GUN'].forEach(k => giveItem(a, k));
    b.x = a.x + 2; b.y = a.y;
    check(useItem(a, 0), 'silencia');
    check(hasFlag(b, 'silence'), 'quedó callado');
    check(!useItem(a, 0), 'en enfriamiento');
    checkEq(a.cooldowns.ITEM_INHIBITOR, ITEMS.INHIBITOR.active.cooldown, 'enfriamiento');
    check(useItem(a, 1), 'aturde');
    check(hasFlag(b, 'stun'), 'quedó aturdido');
    check(useItem(a, 2), 'atrapa');
    check(hasFlag(b, 'root'), 'quedó atrapado');
    checkNear(getEffect(b, 'ROOT').until - gameClock, ITEMS.NET_GUN.root * (1 - DUEL_CONTROL_REDUCTION), 'en duelo el control dura la mitad');
    b.x = a.x + 12;
    a.cooldowns.ITEM_NET_GUN = 0;
    check(!useItem(a, 2), 'lejos no sale');
    checkEq(a.cooldowns.ITEM_NET_GUN, 0, 'y no gasta el enfriamiento');
    check(!useItem(a, 5), 'casilla vacía');
    addEffect(a, { id: 'STUN', name: 'Aturdido', duration: 2, flags: ['stun'] });
    b.x = a.x + 2;
    check(!useItem(a, 2), 'aturdido no se usa');
});

test('Atrapado: no camina pero sigue pegando; la Tenaza atrapa cada 5 golpes', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    a.inventory = []; giveItem(a, 'CLAMP');
    for (let i = 0; i < ITEMS.CLAMP.every - 1; i++) emit(a, 'onHit', { target: b });
    check(!hasFlag(b, 'root'), 'todavía no');
    emit(a, 'onHit', { target: b });
    check(hasFlag(b, 'root'), 'al quinto golpe');
    b.moveTimer = 10;
    const x = b.x, y = b.y;
    b.isAI = true;
    updateHero(b, arenas[0], 0.05);
    check(b.x === x && b.y === y, 'no caminó');
});

test('Una Bobina se arma en cuatro ítems y la tienda lo dice', () => {
    checkEq(itemBuildsInto('COIL').length, 4, 'cuatro caminos');
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    player.gold = 1000;
    buyItem(ITEMS.COIL);
    check(itemCost(ITEMS.SHOCK_MACE, player) < itemTotalCost(ITEMS.SHOCK_MACE), 'la Bobina que tenés ya cuenta');
    buyItem(ITEMS.SHOCK_MACE);
    checkEq(countItem(player, 'COIL'), 0, 'se usó');
    checkEq(countItem(player, 'SHOCK_MACE'), 1, 'se armó');
    check(shopCard(ITEMS.COIL).textContent.includes('Se arma en: '), 'la carta lo muestra');
    resetGame();
});

test('La IA usa los activos contra un competidor en rango', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    a.inventory = []; giveItem(a, 'SHOCK_MACE');
    b.x = a.x + 1; b.y = a.y;
    aiUseItems(a, false);
    check(hasFlag(b, 'stun'), 'lo usó');
});

test('Mochila Cohete: salta lejos, sin atravesar columnas ni caer arriba de otro', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    a.inventory = []; giveItem(a, 'JET_PACK');
    a.x = 10; a.y = 6; b.x = 12; b.y = 6;
    autopilot = true; // sin cursor: como la IA
    try {
        check(useItem(a, 0), 'sale aunque nadie esté a tiro');
        checkEq(a.x, 10 - ITEMS.JET_PACK.jump, 'se aleja');
        checkEq(a.y, 6, 'derecho');
        a.x = 8; a.y = 3; b.x = 10; b.y = 3; // la columna (7, 3) está justo atrás
        a.cooldowns.ITEM_JET_PACK = 0;
        useItem(a, 0);
        check(walkable(a.arena, a.x, a.y), 'cae en un lugar válido');
    } finally { autopilot = false; }
});

test('Domo de Contención: no te pegan, pero tampoco pegás ni lanzás', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    a.inventory = []; giveItem(a, 'STASIS_DOME');
    useItem(a, 0);
    const hp = a.hp;
    dealDamage(b, a, 500, 'pure');
    checkEq(a.hp, hp, 'no recibe daño');
    check(hasFlag(a, 'disarm') && hasFlag(a, 'silence'), 'tampoco pega ni lanza');
    checkEq(getEffect(a, 'STASIS').until - gameClock, ITEMS.STASIS_DOME.stasis, 'dura entero: no es control enemigo');
});

test('Onda de Choque: pega y frena a los que están cerca', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    a.inventory = []; giveItem(a, 'PULSE_WAVE');
    b.x = a.x + 2; b.y = a.y;
    const hp = b.hp;
    check(useItem(a, 0), 'sale');
    check(b.hp < hp, 'pega');
    check(getEffect(b, 'PULSE_SLOW'), 'frena');
    b.x = a.x + 9;
    a.cooldowns.ITEM_PULSE_WAVE = 0;
    check(!useItem(a, 0), 'sin nadie cerca no se gasta');
});

test('La IA guarda el Domo para cuando le queda poca vida', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    a.inventory = []; giveItem(a, 'STASIS_DOME');
    b.x = a.x + 1; b.y = a.y;
    a.hp = a.maxHp;
    aiUseItems(a, false);
    check(!getEffect(a, 'STASIS'), 'con vida, no');
    a.hp = Math.round(a.maxHp * 0.2);
    aiUseItems(a, false);
    check(getEffect(a, 'STASIS'), 'con poca vida, sí');
});

test('La IA: la Batería solo temprano y lo propio de cada competidor existe', () => {
    Object.values(AI_HERO_ITEMS).forEach(o => [...(o.early || []), ...(o.late || [])].forEach(k => check(ITEMS[k], `existe ${k}`)));
    resetGame();
    selectHero(HERO_TEMPLATES.ALCHEMIST);
    learnSkill(currentDraft.options[0]);
    waveNumber = 1; player.gold = ITEMS.STARTER_CELL.cost;
    aiShop(player);
    checkEq(countItem(player, 'STARTER_CELL'), 1, 'temprano la compra primero');
    resetGame();
});

test('Grúa: el gancho arrastra y contra una columna aturde; los jefes y el anclado no se mueven', () => {
    toDuels('CRANE');
    const [a, b] = arenas[0].heroes;
    a.x = 3; a.y = 6; b.x = 9; b.y = 6;
    check(dragUnit(b, -1, 0, 5).moved === 5 && b.x === 4, 'arrastra hasta pegarlo');
    b.x = 9; b.y = 3; a.x = 3; a.y = 3; // la columna (7, 3) queda en el medio
    const r = dragUnit(b, -1, 0, 5);
    check(r.wall && b.x === 8, 'la columna lo frena');
    addEffect(b, { id: 'X', name: 'x', duration: 5, flags: ['anchored'] });
    b.x = 9; b.y = 6;
    checkEq(dragUnit(b, -1, 0, 3).moved, 0, 'el anclado no se mueve');
    removeEffect(b, 'X');
    b.isRoundBoss = true;
    checkEq(dragUnit(b, -1, 0, 3).moved, 0, 'el jefe tampoco');
    b.isRoundBoss = false;
});

test('Grúa: Carga Pesada suma al próximo golpe, una vez', () => {
    toDuels('CRANE');
    const [a, b] = arenas[0].heroes;
    emit(a, 'onForcedMove', { target: b });
    const hit = () => { const ctx = { target: b, dmg: 100 }; emit(a, 'beforeAttack', ctx); return ctx.dmg; };
    checkNear(hit(), 140, 'el primero +40%');
    checkEq(hit(), 100, 'el segundo, normal');
});

test('Grúa: Viga empuja y el gancho en vano la deja expuesta', () => {
    toDuels('CRANE');
    const [a, b] = arenas[0].heroes;
    a.x = 3; a.y = 6; b.x = 4; b.y = 6;
    const hp = b.hp;
    a.mana = a.maxMana;
    HERO_SKILLS.CRANE.CRANE_BEAM.cast(a);
    check(b.hp < hp, 'pega');
    checkEq(b.x, 6, 'empuja 2');
    a.skills = [HERO_SKILLS.CRANE.CRANE_HOOK]; a.skillLevels.CRANE_HOOK = 1;
    b.x = 16; b.y = 11;
    a.aimPoint = { x: 8, y: 6 };
    a.exposedUntil = 0;
    HERO_SKILLS.CRANE.CRANE_HOOK.cast(a);
    a.aimPoint = null;
    for (let i = 0; i < 20; i++) updateProjectiles(a.arena, 0.05);
    check(a.exposedUntil > gameClock, 'expuesta al fallar');
});

test('Escudo: se come el daño, en duelo vale menos y Cabina Reforzada salta una vez por pelea', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    addShield(player, 50, 5);
    checkEq(absorbShield(player, 30), 0, 'se lo come');
    checkEq(absorbShield(player, 30), 10, 'lo que sobra pasa');
    check(!getEffect(player, 'SHIELD'), 'gastado, se va');
    toDuels('CRANE');
    const [a, b] = arenas[0].heroes;
    addShield(a, 100, 5);
    checkEq(getEffect(a, 'SHIELD').data.left, Math.round(100 * (1 - DUEL_HEAL_REDUCTION)), 'en duelo, menos');
    removeEffect(a, 'SHIELD');
    a.skills = [HERO_SKILLS.CRANE.CRANE_CABIN]; a.skillLevels.CRANE_CABIN = 1;
    a.hp = Math.round(a.maxHp * 0.3);
    emit(a, 'onDamaged', {});
    check(getEffect(a, 'SHIELD'), 'salta');
    removeEffect(a, 'SHIELD');
    emit(a, 'onDamaged', {});
    check(!getEffect(a, 'SHIELD'), 'una vez por pelea');
});

test('Zócalo de TV: en combate muestra la tabla y un clic mira la arena de ese competidor', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    learnSkill(currentDraft.options[0]);
    renderScoreboard();
    check(!document.body.classList.contains('tv-rank-on'), 'en la preparación no está');
    startWave();
    renderScoreboard();
    const strip = document.getElementById('tv-rank'), ranked = rankedHeroes();
    check(document.body.classList.contains('tv-rank-on'), 'en combate está');
    checkEq(strip.children.length, heroes.length, 'uno por competidor');
    check(strip.children[0].textContent.startsWith('1º'), 'en orden');
    strip.children[3].click();
    checkEq(viewedHero, ranked[3], 'el clic cambia la arena que mirás');
    resetGame();
    checkEq(strip.innerHTML, '', 'se limpia con la partida');
    check(!document.body.classList.contains('tv-rank-on'), 'y se apaga');
});

test('Mapa agrandable: M cambia el tamaño del mapa y vuelve', () => {
    const w = canvas.style.width;
    toggleBigMap();
    check(canvas.style.width !== w, 'más grande');
    toggleBigMap();
    checkEq(canvas.style.width, w, 'vuelve al tamaño normal');
});

test('Habilidades automáticas: con H prendido el jugador lanza sus habilidades solo; apagado, no', () => {
    const saved = autoCast;
    try {
        for (const on of [true, false]) {
            autoCast = on;
            newGame('CRANE');
            const skill = learn('CRANE_ANCHOR', 1);
            player.mana = player.maxMana;
            const c = creeps[0]; c.x = player.x + 1; c.y = player.y; c.hp = c.maxHp = 1e6;
            creeps.slice(1).forEach(o => { o.hp = 0; });
            for (let i = 0; i < 30; i++) { gameClock += 0.05; updateHero(player, player.arena, 0.05); }
            checkEq((player.cooldowns[skill.id] || 0) > 0, on, on ? 'la lanzó sola' : 'no la lanzó');
        }
    } finally { autoCast = saved; }
});

test('Apuntar con el mouse: la habilidad va al enemigo más cercano al cursor (dentro de su alcance)', () => {
    newGame('VAMPIRE');
    const skill = learn('VAMP_LEAP', 1);
    check(isAimedSkill(skill), 'se apunta');
    check(!isAimedSkill(SKILL_INDEX.CRANE_ANCHOR), 'el Contrapeso (sobre uno mismo) no se apunta');
    const near = dummy(), far = dummy();
    creeps.forEach(c => { if (c !== near && c !== far) c.hp = 0; });
    [near, far].forEach(c => { c.hp = c.maxHp = 5000; });
    near.x = player.x + 1; near.y = player.y;
    far.x = player.x + 3; far.y = player.y + 2;
    player.mana = player.maxMana;
    check(castAt(player, skill, far.x, far.y), 'se lanzó');
    check(far.hp < 5000 && near.hp === 5000, 'le pegó al del cursor, no al más cercano');
});

test('pointTarget (proyectil de habilidad): a diferencia de nearestEnemy, si apuntás mal con el mouse no le pega a nadie', () => {
    newGame('ZEUS');
    const skill = learn('ZEUS_BOLT', 1);
    check(isAimedSkill(skill), 'se apunta con el mouse');
    check(skill.pointTarget, 'está marcada como punto de efecto');
    // A más de 4 del jugador para que no lo alcance de paso el innato Campo Estático (radio 4 alrededor tuyo).
    const c = dummy({ hp: 9999, maxHp: 9999 });
    c.x = player.x; c.y = player.y + 5;
    // Clic bien lejos del enemigo y fuera de su línea de tiro (con nearestEnemy pegaría igual; acá, no).
    check(castAt(player, skill, player.x + 5, player.y), 'se lanzó igual (había rango para el punto)');
    gameClock += skill.windup; tickWindup(player); // golpe anunciado: sale después de la preparación
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(c.hp, 9999, 'clic errado, no le pegó a nadie');
});

test('Golpe anunciado: se prepara con la marca en el piso, sale al punto fijado (se esquiva), aturdir lo corta y después queda expuesto', () => {
    newGame('ZEUS');
    const skill = learn('ZEUS_BOLT', 1);
    check(skill.windup >= 0.7, 'el Rayo Relámpago avisa al menos 0,7 s');
    const c = dummy({ hp: 9999, maxHp: 9999 });
    c.x = player.x + 3; c.y = player.y;
    creeps.forEach(o => { if (o !== c) o.hp = 0; });
    player.mana = player.maxMana; const mana0 = player.mana;
    check(tryCastSkill(player, skill), 'arranca a prepararlo');
    check(player.windup && player.windup.aimX === c.x, 'la marca va donde estaba el rival');
    checkEq(player.arena.projectiles.length, 0, 'todavía no salió');
    checkEq(player.mana, mana0, 'no gastó maná todavía');
    const x0 = player.x; player.moveTarget = { x: 0, y: player.y, arena: player.arena };
    updateHero(player, player.arena, 0.2);
    checkEq(player.x, x0, 'mientras prepara, no camina');
    c.y += 3; // el rival se corre de la marca
    gameClock += skill.windup; updateHero(player, player.arena, 0.01);
    check(!player.windup && player.arena.projectiles.length === 1, 'salió al cumplirse el tiempo');
    check(player.mana < mana0 && player.cooldowns[skill.id] > 0, 'recién ahí gasta maná y entra en enfriamiento');
    check(!tryCastSkill(player, learn('ZEUS_ARC', 1)), 'expuesto: no puede tirar otra cosa enseguida');
    for (let i = 0; i < 30 && player.arena.projectiles.length; i++) updateProjectiles(player.arena, 0.05);
    checkEq(c.hp, 9999, 'el que se corrió a tiempo lo esquivó');
    // aturdirlo mientras prepara lo corta, sin gastar maná ni enfriamiento
    gameClock += 1; player.cooldowns[skill.id] = 0; player.mana = player.maxMana;
    c.x = player.x + 3; c.y = player.y;
    check(tryCastSkill(player, skill), 'prepara otra vez');
    addEffect(player, { id: 'STUN', name: 'Aturdido', duration: 1, flags: ['stun'] });
    updateHero(player, player.arena, 0.01);
    check(!player.windup && !player.cooldowns[skill.id] && player.mana === player.maxMana, 'aturdido: se cortó y no gastó nada');
});

test('La IA lee los golpes anunciados: con tiempo de persona sale de la marca; si no la ve, se la come', () => {
    newGame('ZEUS');
    const skill = learn('ZEUS_BOLT', 1), ai = new Hero(HERO_TEMPLATES.CRANE);
    gameState = 'DUEL'; arenas = [makeArena('duel', [player, ai])];
    player.x = 5; player.y = 5; ai.x = player.x + 3; ai.y = player.y;
    const sawIt = Math.random; Math.random = () => 0.99; // la ve y tarda lo máximo (0,5 s)
    try {
        player.mana = player.maxMana; tryCastSkill(player, skill);
        checkEq(aiThreat(ai), null, 'recién empieza: todavía no reaccionó');
        gameClock += 0.55;
        const w = aiThreat(ai); check(w === player.windup, 'a los 0,55 s ya la vio');
        const step = dodgeStep(ai, w), d0 = Math.hypot(ai.x - w.aimX, ai.y - w.aimY);
        check(Math.hypot(ai.x + step.dx - w.aimX, ai.y + step.dy - w.aimY) > d0, 'el paso lo saca de la marca');
        player.windup = null; player.exposedUntil = 0; player.cooldowns[skill.id] = 0;
        Math.random = () => 0; // no la ve
        tryCastSkill(player, skill); gameClock += 2;
        checkEq(aiThreat(ai), null, 'si no la vio, no se mueve');
    } finally { Math.random = sawIt; }
});

test('Arena de duelo con columnas: no se pisan, frenan los proyectiles, sin verlo no se le tira y la IA rodea para verlo', () => {
    newGame('REC');
    const rival = new Hero(HERO_TEMPLATES.CRANE);
    gameState = 'DUEL'; arenas = makeDuelArenas({ pairs: [[player, rival]] });
    const a = player.arena, [cx, cy] = DUEL_COLUMNS[0];
    check(a.walls && !walkable(a, cx, cy), 'la columna no se pisa');
    check(lineOfSight(a, player, rival), 'arrancan a la vista (la línea del medio está libre)');
    player.x = cx - 2; player.y = cy; rival.x = cx + 2; rival.y = cy; // la columna en el medio
    check(!lineOfSight(a, player, rival), 'con la columna en el medio no se ven');
    checkEq(pickAttackTarget(player, effRange(player)), null, 'a distancia no le tira a uno que no ve');
    fireSkillProjectile(player, { tx: rival.x, ty: rival.y, speed: 10, radius: 0.5, dmg: 50, skillName: 'prueba' });
    const hp0 = rival.hp;
    for (let i = 0; i < 20 && a.projectiles.length; i++) updateProjectiles(a, 0.05);
    check(!a.projectiles.length && rival.hp === hp0, 'la columna frenó el proyectil');
    let moved = false;
    for (let i = 0; i < 4 && !lineOfSight(a, player, rival); i++) { const s = stepToward(player, rival, true); if (s.dx || s.dy) moved = true; player.x += s.dx; player.y += s.dy; }
    check(moved && lineOfSight(a, player, rival), 'la IA rodea la columna hasta verlo');
});

test('Panel del rival en el duelo: muestra al otro (no a vos) y se dibuja también mientras prepara un golpe', () => {
    newGame('ZEUS');
    const rival = new Hero(HERO_TEMPLATES.FROSTWITCH);
    gameState = 'DUEL'; arenas = makeDuelArenas({ pairs: [[player, rival]] });
    checkEq(rivalOf(player.arena), rival, 'el rival es el otro');
    rival.addSkill(SKILL_INDEX.FROSTWITCH_BLAST); rival.skillLevels.FROSTWITCH_BLAST = 1; rival.mana = rival.maxMana;
    rival.windup = { skill: SKILL_INDEX.FROSTWITCH_BLAST, at: gameClock, until: gameClock + 1, fromX: 1, fromY: 1, aimX: 2, aimY: 2, r: 1 };
    let ok = true; try { drawRivalPanel(player.arena); } catch (e) { ok = false; }
    check(ok, 'se dibuja sin errores');
    checkEq(rivalOf(makeArena('wave', [player])), null, 'fuera del duelo, no hay panel');
});

test('Rec: pegan sus 3 drones en orden (físico, mágico, puro que quema), cada uno con su velocidad; callado, solo el aéreo', () => {
    newGame('REC');
    const c = dummy({ hp: 9999, maxHp: 9999 }); c.x = player.x + 3; c.y = player.y;
    creeps.forEach(o => { if (o !== c) o.hp = 0; });
    player.innate.fireBasic(player, c, 20, false);
    const ps = player.arena.projectiles;
    checkEq(ps.map(p => p.drone).join(','), 'aereo,sonido,luz', 'salen los tres');
    checkEq(ps.map(p => p.dmgType || 'basico').join(','), 'basico,magical,pure', 'el aéreo es el golpe básico; los otros, mágico y puro');
    check(ps[0].speed > ps[1].speed && ps[1].speed > ps[2].speed, 'el aéreo es el más rápido y el de luz el más lento');
    const order = [];
    for (let i = 0; i < 60 && ps.length; i++) { const before = ps.map(p => p.drone); updateProjectiles(player.arena, 0.02); before.forEach(k => { if (!ps.some(p => p.drone === k)) order.push(k); }); }
    checkEq(order.join(','), 'aereo,sonido,luz', 'llegan en orden');
    check(getEffect(c, 'REC_BURN'), 'el de luz lo deja quemándose');
    addEffect(player, { id: 'SILENCE', name: 'Callado', duration: 2, flags: ['silence'] });
    player.innate.fireBasic(player, c, 20, false);
    checkEq(ps.map(p => p.drone).join(','), 'aereo', 'callado: solo el aéreo');
    check(!tryCastSkill(player, learn('REC_TRAVELLING', 1)), 'callado: no tira habilidades');
});

test('Rec: Travelling rueda alejándose y da rango; Cámara Fija canaliza (quieto), pega con los 3 drones y aturdirlo la corta', () => {
    newGame('REC');
    const c = dummy({ hp: 9999, maxHp: 9999 }); c.x = player.x + 1; c.y = player.y;
    creeps.forEach(o => { if (o !== c) o.hp = 0; });
    const trav = learn('REC_TRAVELLING', 1), r0 = effRange(player), x0 = player.x;
    player.mana = player.maxMana;
    check(tryCastSkill(player, trav), 'rueda');
    checkEq(player.x, x0 - 3, 'tres casillas, alejándose del enemigo');
    check(effRange(player) > r0, 'más rango');
    check(aiWantsToCast(player, trav, 1, false, 2, c) && !aiWantsToCast(player, trav, 0, false, 6, c), 'la IA la usa cuando la alcanzan, no para acercarse');
    const ult = learn('REC_CAMARA_FIJA', 1);
    player.cooldowns = {}; player.mana = player.maxMana; c.x = player.x + 3; c.y = player.y;
    check(tryCastSkill(player, ult), 'encuadra (golpe anunciado)');
    gameClock += ult.windup; updateHero(player, player.arena, 0.01);
    check(player.channel && getEffect(c, 'REC_FIJADO'), 'canaliza y el objetivo queda lento');
    const x1 = player.x; player.moveTarget = { x: 0, y: player.y, arena: player.arena };
    updateHero(player, player.arena, 0.3);
    checkEq(player.x, x1, 'canalizando no camina');
    check(player.arena.projectiles.filter(p => p.drone).length >= 3, 'los tres drones salen a pegar');
    addEffect(player, { id: 'STUN', name: 'Aturdido', duration: 1, flags: ['stun'] });
    updateHero(player, player.arena, 0.01);
    check(!player.channel && !getEffect(c, 'REC_FIJADO'), 'aturdido: se cortó y el objetivo ya no está lento');
});

test('Los mensajes nombran a los competidores (no "undefined")', () => {
    newGame('CRANE');
    checkEq(player.label, player.displayName, 'un competidor se llama por su nombre de jugador');
});

test('Clic derecho: el héroe camina hasta el destino; el teclado lo cancela', () => {
    newGame('CRANE');
    creeps.forEach(c => { c.hp = 0; });
    creeps[0].hp = 1; creeps[0].x = 19; creeps[0].y = 0; // que la oleada no termine
    player.x = 2; player.y = 2;
    player.moveTarget = { x: 6, y: 2, arena: player.arena };
    for (let i = 0; i < 200 && player.moveTarget; i++) { gameClock += 0.05; updateHero(player, player.arena, 0.05); }
    checkEq(player.x + ',' + player.y, '6,2', 'llegó');
    checkEq(player.moveTarget, null, 'sin destino');
});

test('Pausa: congela la partida y Esc la abre y la cierra', () => {
    newGame('CRANE');
    setPaused(true);
    check(paused, 'en pausa');
    checkEq(document.getElementById('pause-menu').style.display, 'block', 'menú de pausa visible');
    openGlossary('items');
    check(isGlossaryOpen(), 'glosario abierto desde la pausa');
    handleEscape();
    check(!isGlossaryOpen() && paused, 'Esc cierra el glosario y vuelve a la pausa');
    handleEscape();
    check(!paused, 'Esc reanuda');
    resetGame();
    setPaused(true);
    check(!paused, 'en el menú no se pausa');
});

test('Presión al líder: los creeps se adaptan al poder del héroe (entre −15% y +25%)', () => {
    newGame('CRANE');
    heroes.forEach(h => { h.level = 5; h.inventory = []; });
    checkNear(pressureMult(player), 1, 'igual al promedio: sin cambio');
    player.level = 20;
    checkNear(pressureMult(player), PRESSURE.max, 'mucho más fuerte: el tope');
    player.level = 1;
    checkNear(pressureMult(player), PRESSURE.min, 'mucho más débil: el piso');
    player.level = 5; giveItem(player, 'HEART');
    check(pressureMult(player) > 1, 'los ítems cuentan');
    const arena = makeArena('wave', [player]);
    spawnWave(arena, TEST_WAVE);
    checkNear(arena.creeps[0].statMult, creepStatMult(waveNumber) * arena.pressure, 'se aplica a los creeps de su arena');
});

test('Íconos: cada ítem y cada neutral tiene el suyo, con formas de 12×12', () => {
    Object.entries(ITEM_ICON_SHAPES).forEach(([name, rows]) => {
        checkEq(rows.length, 12, name + ': 12 filas');
        rows.forEach((r, i) => checkEq(r.length, 12, `${name} fila ${i}`));
    });
    [...Object.keys(ITEMS), ...Object.keys(NEUTRAL_ITEMS)].forEach(k => {
        check(ITEM_ICONS[k] && ITEM_ICON_SHAPES[ITEM_ICONS[k][0]], 'ícono para ' + k);
        check(itemIconUrl(k), 'se dibuja ' + k);
    });
});

test('Guía de ítems: cada héroe tiene la suya y la tienda la muestra primero', () => {
    newGame('CRANE');
    startPreparation();
    shopTab = 'guide'; renderShop();
    const cards = [...document.querySelectorAll('#shop-options .skill-card h4')].map(h => h.textContent);
    const g = guideOf(player);
    GUIDE_STAGES.forEach(([stage]) => g[stage].forEach(k => check(cards.some(t => t.includes(ITEMS[k].name)), 'muestra ' + ITEMS[k].name)));
    check(isSuggested(player, 'THORNS') && !isSuggested(player, 'ARCANE_STAFF'), 'marca solo los sugeridos');
});

test('Estadísticas debajo del ranking', () => {
    newGame('REC');
    updateHud();
    checkEq(document.getElementById('hero-stats-panel').style.display, 'block', 'visible');
    check(document.getElementById('hero-stats').textContent.includes('Agilidad ★'), 'marca el atributo principal');
});

test('Sala de espera: el jugador camina con el teclado y no pisa la fuente', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.CRANE);
    check(player.inRest, 'en la sala de espera');
    player.x = REST_SPOT.x; player.y = REST_SPOT.y - 2; // justo debajo de la fuente
    keys['arrowup'] = true;
    try { for (let i = 0; i < 10; i++) updateRestArea(1); } finally { keys['arrowup'] = false; }
    check(!restBlocked(player.x, player.y), 'no está sobre la fuente');
    checkEq(player.y, REST_SPOT.y - 2, 'la fuente lo frena');
    keys['arrowleft'] = true;
    try { updateRestArea(1); } finally { keys['arrowleft'] = false; }
    checkEq(player.x, REST_SPOT.x - 1, 'caminó a la izquierda');
});

test('Elección de héroe agrupada por atributo', () => {
    resetGame();
    startHeroPick();
    const heads = [...document.querySelectorAll('#hero-options .attr-head')].map(h => h.textContent);
    const attrs = [...new Set(heroOffers[0].map(t => ATTR_INFO[t.primaryAttr].label))];
    checkEq(heads.length, attrs.length, 'un título por atributo presente');
    checkEq(document.querySelectorAll('#hero-options .skill-card').length, HERO_PICK_OPTIONS + 1, '3 héroes + al azar');
});

test('Sprites: plantillas de 12×12 y un sprite para cada héroe, creep y jefe', () => {
    Object.entries(SPRITE_TEMPLATES).forEach(([name, rows]) => {
        checkEq(rows.length, 12, name + ': 12 filas');
        rows.forEach((r, i) => checkEq(r.length, 12, `${name} fila ${i}: 12 columnas`));
    });
    Object.keys(HERO_TEMPLATES).forEach(k => check(spriteFor({ isHero: true, key: k }), 'héroe ' + k));
    Object.values(CREEP_TYPES).forEach(t => check(spriteFor({ type: t }), 'creep ' + t.key));
    ROUND_BOSSES.forEach(b => check(spriteFor({ isRoundBoss: true, type: b, color: b.color }), 'jefe ' + b.key));
});

test('Objetivo marcado con clic: el ataque lo prioriza aunque haya otro más cerca, y se camina hasta tenerlo a tiro', () => {
    newGame('REC');
    const near = dummy(), far = dummy();
    creeps.forEach(c => { if (c !== near && c !== far) c.hp = 0; });
    near.x = player.x + 1; near.y = player.y;
    far.x = player.x + 3; far.y = player.y + 1;
    checkEq(pickAttackTarget(player, effRange(player)), near, 'sin marca: el más cercano');
    player.focus = far;
    checkEq(pickAttackTarget(player, effRange(player)), far, 'con marca: el marcado');
    checkEq(nearestEnemy(player, 20), far, 'las habilidades también lo priorizan');
    far.x = player.x + 15; far.y = player.y; player.focusChase = true;
    check(focusChaseDirection(player).dx === 1, 'lejos: camina hacia él');
    far.hp = 0;
    checkEq(validFocus(player), null, 'si muere se desmarca');
});

test('Ataque al moverse: libre por defecto; con la regla "reset", moverse reinicia el ataque', () => {
    const saved = MOVE_ATTACK_RULE;
    try {
        for (const rule of ['free', 'reset']) {
            MOVE_ATTACK_RULE = rule;
            newGame('REC');
            dummy({ x: player.x + 3 });
            player.attackTimer = 0.5; player.moveTimer = 99;
            keys = { arrowleft: true };
            updateWave(0.001);
            keys = {};
            check(rule === 'reset' ? player.attackTimer < 0.01 : player.attackTimer >= 0.5, rule + ': ' + player.attackTimer);
        }
    } finally { MOVE_ATTACK_RULE = saved; }
    checkEq(saved, 'free', 'por defecto se ataca caminando');
});

test('En duelo, la curación y el control entre héroes bajan (el robo de vida no)', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    b.hp = 1;
    checkEq(healUnit(b, 100), Math.round(100 * (1 - DUEL_HEAL_REDUCTION)), 'curación reducida');
    b.hp = 1;
    checkEq(healUnit(b, 100, { fromDamage: true }), 100, 'robo de vida sin reducir');
    addEffect(b, { id: 'STUN', name: 'Aturdido', duration: 2, flags: ['stun'] });
    checkNear(getEffect(b, 'STUN').until - gameClock, 2 * (1 - DUEL_CONTROL_REDUCTION) * (1 - Math.min(0.8, sumMod(b, 'statusResist'))), 'aturdimiento más corto');
});

test('En duelo los héroes se hacen menos daño entre sí; contra creeps no cambia', () => {
    toDuels();
    const [a, b] = arenas[0].heroes;
    const hp = b.hp;
    dealDamage(a, b, 100, 'pure');
    checkEq(hp - b.hp, Math.round(100 * (1 - DUEL_DAMAGE_REDUCTION)), 'daño reducido en duelo');
    checkNear(creepStatMult(3, false), CREEP_GROWTH * CREEP_GROWTH, 'los creeps crecen x' + CREEP_GROWTH + ' por ronda');
});

// ============================================================ PARTIDAS COMPLETAS
// Juega varias rondas con la IA (draft, puntos, tienda y combate de los 8 héroes). Con godMode el jugador es
// invulnerable, para probar que el flujo completo funciona; sin godMode sirve para medir la dificultad.
function simulateGame(heroIndex, godMode = true, rounds = 4) {
    const savedMax = MAX_ROUNDS;
    MAX_ROUNDS = rounds;
    resetGame();
    selectHero(Object.values(HERO_TEMPLATES)[heroIndex]);
    autopilot = true;
    try {
        let guard = 0;
        while (gameState !== 'ENDED' && guard++ < rounds * 4 + 10) {
            if (gameState === 'DRAFT') learnSkill(aiPickDraft(player, currentDraft.options));
            if (gameState === 'PREP') {
                if (!player.eliminated) { aiUseDestiny(player); if (player.neutralOffer) aiPickNeutral(player, player.neutralOffer); aiSpendPoints(player); aiShop(player); }
                startWave();
            }
            if (inCombat() || gameState === 'BETTING') {
                if (godMode) addEffect(player, { id: 'TEST_GOD', duration: 1e9, flags: ['invulnerable', 'persistent'] });
                for (let f = 0; (inCombat() || gameState === 'BETTING') && f < 20000; f++) {
                    if (gameState === 'BETTING') endBetting();
                    gameClock += 0.05; updateWave(0.05);
                }
                if (inCombat()) throw new Error('una ronda no terminó');
            }
        }
    } finally { autopilot = false; MAX_ROUNDS = savedMax; }
    return { state: gameState, eliminated: player.eliminated, skills: player.skills.length, level: player.level, rank: heroRank(player), round: waveNumber };
}

// --- BANCO DE BALANCE DE CUSTOM HERO (index.html?banco=N, fase B0 del roadmap) ---
// Juega partidas completas con la IA (60 rondas como tope), con semilla fija: la misma semilla da la misma partida.
// Cada partida rota el héroe del jugador (también lo juega la IA) y cuenta a los 8 de la mesa.
// Devuelve una fila por partida: ganador, ronda final y, por héroe, puesto y ronda en que quedó afuera.
function benchGame(seed, rounds = 60) {
    const keys = Object.keys(HERO_TEMPLATES), out = {};
    duelLog = [];
    const realEliminate = eliminateHero, realSound = soundOn;
    eliminateHero = (h, cause) => { h.benchOut = waveNumber; return realEliminate(h, cause); };
    soundOn = false; matchSummaryOff = true; // los sonidos usan Math.random y se saltean según el tiempo real: con sonido, la semilla no repite
    try {
        withRandom(seededRandom(seed), () => quietly(() => simulateGame(seed % keys.length, false, rounds)));
    } finally { eliminateHero = realEliminate; soundOn = realSound; matchSummaryOff = false; }
    rankedHeroes().forEach((h, i) => { out[h.name] = { place: i + 1, out: h.benchOut || null }; });
    return { seed, winner: rankedHeroes()[0].name, round: waveNumber, heroes: out, duels: duelLog.slice() };
}
// Junta las partidas en una tabla por héroe: partidas jugadas, ganadas, puesto promedio y ronda promedio de eliminación.
function benchTable(games) {
    const t = {};
    games.forEach(g => Object.entries(g.heroes).forEach(([name, r]) => {
        const s = t[name] || (t[name] = { name, games: 0, wins: 0, place: 0, outs: 0, outRound: 0 });
        s.games++; s.place += r.place; if (g.winner === name) s.wins++;
        if (r.out) { s.outs++; s.outRound += r.out; }
    }));
    return Object.values(t).map(s => ({ name: s.name, games: s.games, wins: s.wins, winPct: Math.round(100 * s.wins / s.games),
        place: +(s.place / s.games).toFixed(1), outRound: s.outs ? Math.round(s.outRound / s.outs) : null }))
        .sort((a, b) => b.winPct - a.winPct || a.place - b.place);
}
// Corre el banco de a una partida por vez (sin trabar la página) y muestra la tabla. Semillas 1..n.
// Resumen de los duelos del banco (docs/MATCH.md §5: qué medir en los duelos)
function benchDuels(list) {
    const secs = list.map(d => d.secs).sort((a, b) => a - b), q = f => secs.length ? secs[Math.min(secs.length - 1, Math.floor(f * secs.length))] : 0;
    const dmg = list.reduce((a, d) => a + d.dmg, 0), avoid = list.reduce((a, d) => a + d.avoidable, 0);
    return { n: list.length, medianSecs: q(0.5), p25: q(0.25), p75: q(0.75), byTimePct: Math.round(100 * list.filter(d => d.byTime).length / (list.length || 1)),
        avgChanges: Math.round(10 * list.reduce((a, d) => a + d.changes, 0) / (list.length || 1)) / 10, avoidablePct: Math.round(100 * avoid / (dmg || 1)) };
}
function runBench(n) {
    testSandbox();
    windupStats.fired = windupStats.hit = 0;
    const games = [], panel = document.createElement('div');
    panel.id = 'test-report'; document.body.appendChild(panel);
    const step = () => {
        if (games.length < n) {
            games.push(benchGame(games.length + 1));
            document.title = `📊 banco ${games.length}/${n}`;
            return setTimeout(step, 0);
        }
        resetGame();
        const rows = benchTable(games), avgRound = Math.round(games.reduce((a, g) => a + g.round, 0) / n);
        const duels = benchDuels(games.flatMap(g => g.duels));
        duels.windupFired = windupStats.fired; duels.windupDodgedPct = Math.round(100 * (1 - windupStats.hit / (windupStats.fired || 1)));
        window.benchResult = { n, avgRound, rows, games, duels };
        panel.innerHTML = `<h3>📊 Banco de Custom Hero: ${n} partidas, ronda final promedio ${avgRound}</h3>` +
            `<p>⚔️ ${duels.n} duelos: duran ${duels.medianSecs} s (la mitad entre ${duels.p25} y ${duels.p75} s), ${duels.byTimePct}% por tiempo, ` +
            `${duels.avgChanges} cambios de quién va ganando en promedio, ${duels.avoidablePct}% del daño entre héroes se podía evitar caminando; ` +
            `${duels.windupFired} golpes anunciados, ${duels.windupDodgedPct}% esquivados</p>` +
            rows.map(r => `<div>${r.name}: ${r.wins}/${r.games} ganadas (${r.winPct}%), puesto ${r.place}, afuera en la ronda ${r.outRound ?? '—'}</div>`).join('');
        document.title = `📊 banco ${n}/${n} listo`;
        console.log('Banco de Custom Hero', window.benchResult);
    };
    step();
}

Object.keys(HERO_TEMPLATES).forEach((key, i) => {
    test(`Partida completa (4 rondas) con ${HERO_TEMPLATES[key].name}`, () => {
        const r = simulateGame(i);
        checkEq(r.state, 'ENDED', 'la partida terminó');
        check(!r.eliminated, 'el jugador sigue en juego');
        checkEq(r.skills, KIT_SIZE, 'kit completo');
        check(r.level > 1, 'subió de nivel');
    }, { random: true });
});

test('Custom Hero: pantalla de fin de partida — puesto, rondas, duelos, oro, build y otra partida', () => {
    chProfileMemory = null; check(!chProfilePersist, 'en las pruebas el perfil no toca lo guardado');
    const r = simulateGame(1, true, 3); // el héroe 1, con dios: llega al final de la ronda 3
    checkEq(r.state, 'ENDED', 'la partida termina');
    const box = document.getElementById('match-summary');
    check(box && box.style.display === 'block', 'se ve el resumen');
    const txt = box.textContent;
    check(txt.includes(`${heroRank(player)}º de 8`), 'con el puesto');
    check(/Rondas\s*3/.test(txt), 'las rondas');
    check(txt.includes(`${player.duelWins} ganados`), 'los duelos');
    check(player.goldEarned > 0 && txt.includes(`${player.goldEarned}g`), 'el oro ganado en la partida');
    player.skills.forEach(s => check(txt.includes(s.name), `la habilidad ${s.name}`));
    check(!box.querySelector('#ms-watch'), 'terminada la partida, no hay "seguir mirando"');
    box.querySelector('#ms-again').click();
    checkEq(gameState, 'HERO_SELECT', '"Otra partida" lleva a elegir héroe');
    const rsum = document.getElementById('round-summary'); check(!rsum || rsum.style.display === 'none', 'sin la tarjeta de la última ronda');
    check(box.style.display === 'none', 'y cierra el resumen');
    // eliminado a mitad de partida: el resumen con "seguir mirando"
    newGame('CRANE'); eliminateHero(player, 'Prueba');
    check(box.style.display === 'block' && box.querySelector('#ms-watch'), 'eliminado: resumen con "seguir mirando"');
    box.querySelector('#ms-watch').click();
    check(box.style.display === 'none', 'seguir mirando lo cierra');
    endGame(); // la partida termina después: no se cuenta dos veces
    // el perfil: 2 partidas, una con el héroe 1 y otra con Grúa (eliminada), sin contar dos veces
    const p = chProfile(), k0 = Object.keys(HERO_TEMPLATES)[1];
    checkEq(p.games, 2, 'el perfil cuenta las 2 partidas');
    checkEq(p.heroes.CRANE.games, 1, 'Grúa, una sola vez aunque después terminó la partida');
    check(p.heroes[k0].best >= 1 && p.heroes[k0].best <= 8, 'guarda el mejor puesto con cada héroe');
    check(chProfileSummary().includes('2 partidas') && chProfileHeroesHtml().includes(chHeroName('CRANE')), 'y se resume para el menú');
    resetGame(); chProfileMemory = null;
});

// Riesgo 1 del mapa (docs/MAPA-CODIGO.md): lo que un modo deja escrito no le puede llegar al otro
test('Banco de balance: la misma semilla juega la misma partida y la tabla cuenta a los 8 de la mesa', () => {
    const a = benchGame(7, 6), b = benchGame(7, 6);
    checkEq(JSON.stringify(b), JSON.stringify(a), 'misma semilla, mismo resultado');
    checkEq(Object.keys(a.heroes).length, 8, 'los 8 héroes de la mesa');
    const rows = benchTable([a, b]);
    checkEq(rows.reduce((s, r) => s + r.wins, 0), 2, 'un ganador por partida');
    resetGame();
}, { random: true });

test('Economía de la ronda — interés al terminar la ronda, racha (ganada o perdida) y la cuenta de dónde salió el oro', () => {
    newGame('CRANE');
    player.gold = 40; player.streak = 1; ledgerStart();
    player.gold += 12; player.diedThisRound = false; // 12 de bajas
    endRoundEconomy();
    checkEq(player.gold, 40 + 12 + 5 + ECON.streakGold[2], 'interés +5 (52g) y racha de 2 ganadas');
    const g = roundIncome(player);
    check(g.kills === 12 && g.interest === 5 && g.streak === ECON.streakGold[2], 'la cuenta separa bajas, interés y racha');
    showRoundSummary(player);
    const box = document.getElementById('round-summary');
    check(box.style.display === 'block' && box.textContent.includes('bajas') && box.textContent.includes('interés') && box.textContent.includes('Ronda'), 'la tarjeta del resumen');
    box.style.display = 'none';
    check(incomeHint(player).startsWith('+' + interestFor(player)) && incomeHint(player).includes('🔥2'), 'la barra de oro muestra lo que vas a cobrar');
    player.streak = 0; ledgerStart(); player.diedThisRound = true; endRoundEconomy(); ledgerStart(); player.diedThisRound = true; const before = player.gold; endRoundEconomy();
    check(player.streak === -2 && player.gold === before + interestFor({ gold: before }) + ECON.streakGold[2], 'perder seguido también paga la racha');
    player.gold = 999; checkEq(interestFor(player), ECON.interestMax, 'el interés tiene tope');
}, { random: true });
test('Nueva Partida deja todo como al empezar', () => {
    newGame('CRANE');
    resetGame();
    checkEq(player, null, 'jugador');
    checkEq(gameState, 'MENU', 'estado');
    checkEq(document.getElementById('menu-panel').style.display, 'block', 'menú visible');
});

test('MATCH 3D: los efectos del piso se dibujan en otro canvas (la calcomanía del 3D) sin tocar la pantalla', () => {
    const c = document.createElement('canvas'); c.width = MAP_W; c.height = MAP_H;
    const g = c.getContext('2d'), before = ctx;
    const arena = { fx: [] };
    pushFx(arena, { kind: 'ring', x: 5, y: 5, color: '#ff0000', radius: 2, life: 1 });
    pushFx(arena, { kind: 'zone', x: 8, y: 6, color: '#00ff00', color2: '#ffffff', radius: 2, life: 1 });
    pushFx(arena, { kind: 'slash', x: 3, y: 3, angle: 0, flip: true, color: '#ffffff', width: 5, life: 1 });
    arena.fx.forEach(f => { f.born = fxClock - 0.1; });
    withCtx(g, () => drawArenaFx(arena));
    check(ctx === before, 'la pantalla vuelve a ser el contexto de dibujo');
    const px = g.getImageData(0, 0, MAP_W, MAP_H).data;
    let painted = 0; for (let i = 3; i < px.length; i += 4) if (px[i]) painted++;
    check(painted > 100, 'los efectos quedaron pintados en el canvas aparte');
    check(typeof drawTargetingHint === 'function' && drawMouseOverlay.length === 2, 'el cartel de apuntar se puede dibujar aparte del piso');
});

function testSandbox() {
    autoCast = false; // las pruebas controlan a mano cuándo se lanza cada habilidad (la de habilidades automáticas lo prende)
    keyboardMove = true; quickCast = false; // las pruebas de movimiento usan las flechas; las de controles estilo Dota lo apagan
}

function runTests() {
    testSandbox();
    const results = TESTS.map(t => {
        try {
            if (t.opts.random) t.fn(); else withRandom(0.99, t.fn);
            return { name: t.name, ok: true };
        } catch (e) {
            return { name: t.name, ok: false, error: e.message };
        }
    });
    keys = {};
    resetGame();
    const failed = results.filter(r => !r.ok);
    const panel = document.createElement('div');
    panel.id = 'test-report';
    panel.innerHTML = `<h3>${failed.length ? '❌' : '✅'} Pruebas: ${results.length - failed.length}/${results.length} OK</h3>` +
        results.map(r => `<div class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : `<br><small>${r.error}</small>`}</div>`).join('');
    document.body.appendChild(panel);
    document.title = `${failed.length ? '❌' : '✅'} ${results.length - failed.length}/${results.length} pruebas`;
    console.log(`Pruebas: ${results.length - failed.length}/${results.length} OK`);
    failed.forEach(r => console.error(`❌ ${r.name}: ${r.error}`));
    return results;
}

if (/[?&]test\b/.test(location.search)) window.addEventListener('load', () => setTimeout(runTests, 0));
const benchN = +new URLSearchParams(location.search).get('banco');
if (benchN > 0) window.addEventListener('load', () => setTimeout(() => runBench(benchN), 0));
