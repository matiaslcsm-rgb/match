// Pruebas automáticas del juego. Se ejecutan solas al abrir tests.html (o index.html?test) y muestran
// un panel con el resultado de cada una. Jugando normal no corren.
//
// Para agregar una prueba: test('nombre', () => { ...; checkEq(obtenido, esperado, 'qué se mide'); });
// Por defecto Math.random devuelve 0.99 (sin críticos, sin esquives, sin aturdir por azar) para que los
// resultados sean predecibles. Con { random: true } la prueba usa azar real.
//
// Arranque de MATCH (bifurcado de custom-hero-chaos, docs/MAPA-CODIGO.md, 2026-10-19): este archivo es nuevo, con
// el mismo arnés del proyecto original pero solo un puñado de pruebas de humo para confirmar que el motor
// heredado anda. Falta portar el resto de las ~290 pruebas de Custom Hero del proyecto original (quedan como
// referencia ahí) y escribir las nuevas a medida que MATCH sume contenido propio.

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

// ============================================================ PRUEBAS DE HUMO
// Confirman que el motor heredado de custom-hero-chaos arranca y anda sin la Torre. El resto de las mecánicas
// de Custom Hero (ítems, duelos, apuestas, jefes de ronda, cada héroe...) ya tenían su propia prueba en el
// proyecto original; portarlas de a poco es el próximo paso, no algo para hacer todo de una.

test('El contenido del juego es válido (validador)', () => {
    checkEq(validateContent().length, 0, 'validateContent() no debería encontrar problemas');
});

test('Elegir héroe arma la partida', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.SNIPER);
    check(player && player.key === 'SNIPER', 'el jugador queda con el héroe elegido');
    checkEq(heroes.length, 8, 'arrancan 8 héroes (jugador + 7 rivales)');
    check(heroes.slice(1).every(h => h.key !== 'SNIPER'), 'ningún rival repite el héroe del jugador');
});

test('Daño físico: más armadura reduce más daño', () => {
    const p = newGame('AXE');
    const low = dummy({ armor: 0 }), high = dummy({ armor: 20 });
    const lowBefore = low.hp, highBefore = high.hp;
    dealDamage(p, low, 100, 'physical');
    dealDamage(p, high, 100, 'physical');
    check((lowBefore - low.hp) > (highBefore - high.hp), 'con más armadura, menos daño pasó');
});

test('Invulnerable no recibe daño', () => {
    const p = newGame('AXE');
    const c = dummy();
    addEffect(c, { id: 'TEST_INVULN', name: 'Invulnerable', duration: 5, flags: ['invulnerable'] });
    const before = c.hp;
    dealDamage(p, c, 9999, 'physical');
    checkEq(c.hp, before, 'sin cambios en la vida');
});

test('Habilidad en nivel 0 no se lanza; en nivel 1 cobra maná y enfriamiento', () => {
    const p = newGame('AXE');
    const skill = learn('AXE_GIRO', 0);
    dummy();
    check(!tryCastSkill(p, skill), 'en nivel 0 no se lanza');
    p.skillLevels[skill.id] = 1;
    const manaBefore = p.mana;
    check(tryCastSkill(p, skill), 'en nivel 1 se lanza');
    check(p.mana < manaBefore, 'cobró maná');
    check(p.cooldowns[skill.id] > 0, 'quedó en enfriamiento');
});

test('Elección de héroe: 3 opciones propias + "al azar", sin repetir entre jugadores', () => {
    resetGame();
    const offers = dealHeroOffers();
    checkEq(offers.length, 8, 'una lista de opciones por cada uno de los 8 lugares');
    checkEq(new Set(offers[0]).size, offers[0].length, 'las 3 opciones del jugador son distintas');
});

test('Partida completa (4 rondas) con Axe', () => {
    resetGame();
    selectHero(HERO_TEMPLATES.AXE);
    showPanel('draft-container', false);
    gameState = 'WAVE';
    player.inRest = false;
    arenas = [makeArena('wave', [player])];
    spawnWave(player.arena, TEST_WAVE);
    resetWaveTimer();
    let steps = 0;
    while (waveNumber <= 4 && player.isAlive() && steps < 20000) {
        updateWave(0.1);
        tickPhaseTimer(0.1);
        gameClock += 0.1;
        steps++;
    }
    check(steps < 20000, 'la partida avanzó sin trabarse (no llegó al tope de pasos)');
}, { random: true });

// ============================================================ EJECUCIÓN
function testSandbox() {
    autoCast = false; // las pruebas controlan a mano cuándo se lanza cada habilidad
    wasdMove = true; quickCast = false; // las pruebas de movimiento usan el teclado
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
