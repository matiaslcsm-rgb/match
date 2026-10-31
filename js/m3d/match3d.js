// MATCH en 3D (2026-10-28, decisión del usuario: "pasemos Custom Hero a 3D y fusionémoslo con MATCH", todo opción A;
// el mismo día MATCH pasa a ser un juego propio, separado de Infinite Tower, y solo en 3D):
//   · Las reglas, la IA, la tienda, el draft y las pruebas son las de Custom Hero. Esto DIBUJA las arenas
//     de combate (oleada, duelo y jefe): lee el mismo estado (arena.heroes, arena.creeps, arena.projectiles) y lo muestra
//     en 3D. La interfaz (tienda, ranking, barra del héroe) sigue igual, encima.
//   · Cámara desde arriba en diagonal, como Dota; se juega igual que siempre (clic derecho caminar, clic izquierdo
//     objetivo, habilidades hacia el cursor): el mouse se traduce a casillas tirando un rayo contra el piso.
//   · Competidores y creeps son robots armados por piezas con el motor de arena-robots (robot.js, parts.js,
//     skeleton.js), con el look de dibujo animado de toon.js.
//   · Las barras de vida y los números de daño se dibujan en el canvas 2D de siempre, que queda transparente encima.
//   · El descanso (2026-10-28) son los boxes del show: portones de garaje, la estación de reparación (donde estaba la
//     fuente) y dos de carga (las fogatas); en el piso, los 8 boxes numerados. Se camina igual.
//   El menú sigue en 2D. Sin WebGL, o en las pruebas, todo se dibuja en 2D (ui.js).
// Expone window.M3D para el código clásico (ui.js, mouse.js, fxSkills.js).
import * as THREE from 'three';
import { buildRobot, animateRobot } from './robot.js';
import { BOSS_ROBOTS, addExtras } from './bosses3d.js';
import { HERO_ROBOTS } from './heroes3d.js';
import { CREEP_ROBOTS } from './creeps3d.js';
import { makeRenderer, floorTex, wallTex, mat, surface, outline, outlineAll } from './toon.js';

const U = 1;                  // una casilla = 1 metro
const COLS = 20, ROWS = 12;   // = VIEW_COLS, VIEW_ROWS (game.js)

// --- QUÉ ROBOT ES CADA UNO ---
// Competidores: cada uno con su robot propio, en heroes3d.js.
// Creeps: cada tipo con su robot, en creeps3d.js; estos armados quedan para el que no tenga uno propio
const CREEP_BUILDS = {
    footman: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' },
    archer: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'ametralladora' },
    mage: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'canon' },
    brute: { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'pinza', armR: 'pinza' },
    golem: { legs: 'oruga', core: 'pesado', head: 'sensor', armL: 'canon', armR: 'canon' },
    wraith: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'pinza' },
    plague: { legs: 'ruedas', core: 'estandar', head: 'camara', armL: 'pinza', armR: 'pinza' },
    swarm: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'ametralladora', armR: 'ametralladora' },
    kamikaze: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' },
    chusma: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }
};
const BOSS_BUILD = { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'canon', armR: 'canon' }; // los creeps jefe de las oleadas; los de ronda tienen el suyo (bosses3d.js)
// Forma de pelear de cada creep (qué armado le toca)
function creepPlan(u) {
    const t = u.type;
    if (!t) return 'footman';
    if (t.key === 'SWARM') return 'swarm';
    if (t.key === 'KAMIKAZE') return 'kamikaze';
    if (t.key === 'CHUSMA') return 'chusma';
    if (t.key === 'SPECTER') return 'wraith';
    if (t.key === 'HEALER') return 'plague';
    if (['BRUTE', 'ARMORED', 'STUNNER'].includes(t.key)) return 'brute';
    if (t.attackType === 'magical' || ['SHAMAN', 'WARLOCK', 'FROSTCASTER', 'DRUMMER'].includes(t.key)) return 'mage';
    if (t.range >= 2.5) return 'archer';
    return 'footman';
}
// Altura (en casillas) de cada uno
const sizeOf = u => u.isRoundBoss ? 3.4 : u.isBoss ? 2.6 : u.isHero ? 2.5 * ((HERO_ROBOTS[u.key] || {}).size || 1) : u.type && u.type.key === 'SWARM' ? 1.1 : u.type && ['BRUTE', 'ARMORED', 'STUNNER'].includes(u.type.key) ? 2.0 : 1.6;

// --- PINTURA: cada robot con el color de su competidor o de su tipo de creep ---
const PAINT = ['gris', 'oliva', 'hueso'];
const tinted = {};
function paintRobot(robot, color) {
    robot.traverse(o => {
        if (!o.isMesh) return;
        const name = Object.keys(MAT_NAMES).find(n => MAT_NAMES[n] === o.material);
        if (!PAINT.includes(name)) return;
        if (!tinted[color]) { const m = MAT_NAMES.hueso.clone(); m.color.set(color); tinted[color] = m; }
        o.material = tinted[color];
    });
}
const MAT_NAMES = Object.fromEntries(PAINT.map(n => [n, mat(n)]));
const lighten = (hex, k) => { const c = new THREE.Color(hex); c.lerp(new THREE.Color('#ffffff'), k); return '#' + c.getHexString(); };

// --- ESCENA ---
const wrap = document.getElementById('map-wrap'), canvas2d = document.getElementById('ascii-canvas');
const cv = document.createElement('canvas');
cv.id = 'match3d-canvas';
cv.style.cssText = 'position:absolute;left:0;top:0;z-index:0;pointer-events:none;display:none;';
wrap.insertBefore(cv, canvas2d);
canvas2d.style.position = 'relative'; canvas2d.style.zIndex = '1'; // el 2D (barras, números, mouse) queda encima del 3D
const renderer = makeRenderer(cv);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#0c0d10', 26, 48);
const camera = new THREE.PerspectiveCamera(36, COLS / ROWS, 0.5, 120);
const hemi = new THREE.HemisphereLight('#dfe6f2', '#6a6458', 1.9);
const sun = new THREE.DirectionalLight('#fff1d6', 1.7); sun.position.set(-8, 20, 12);
scene.add(hemi, sun);

// Arena: piso de hormigón, la franja de afuera más oscura, vallas con franjas de peligro y 4 torres de luz del show
const arenaGroup = new THREE.Group(); scene.add(arenaGroup);
{
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), surface({ map: floorTex(1) }));
    floor.material.map.repeat.set(COLS / 2, ROWS / 2);
    floor.rotation.x = -Math.PI / 2; floor.position.set(COLS / 2, 0, ROWS / 2); arenaGroup.add(floor);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(COLS + 30, ROWS + 30), new THREE.MeshLambertMaterial({ color: '#2a2b2e' }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(COLS / 2, -0.02, ROWS / 2); arenaGroup.add(outer);
    const fence = mat('peligro'), wall = surface({ map: wallTex() });
    const seg = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), fence); m.position.set(x, 0.175, z); arenaGroup.add(m); };
    seg(COLS / 2, -0.15, COLS + 0.6, 0.3); seg(COLS / 2, ROWS + 0.15, COLS + 0.6, 0.3); seg(-0.15, ROWS / 2, 0.3, ROWS); seg(COLS + 0.15, ROWS / 2, 0.3, ROWS);
    for (const [x, z] of [[-1.2, -1.2], [COLS + 1.2, -1.2], [-1.2, ROWS + 1.2], [COLS + 1.2, ROWS + 1.2]]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), wall); post.position.set(x, 3, z); arenaGroup.add(post);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), new THREE.MeshBasicMaterial({ color: '#fff4c8' }));
        lamp.position.set(x, 6.1, z); lamp.lookAt(COLS / 2, 0, ROWS / 2); arenaGroup.add(lamp);
    }
    // "EN VIVO": la luz roja de grabación arriba de la valla del fondo
    const rec = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2a2a' }));
    rec.position.set(COLS / 2, 0.75, -0.25); rec.name = 'rec'; arenaGroup.add(rec);
}
// LOS BOXES DEL SHOW (el área de descanso): lo que no se pisa está donde dice restBlocked (game.js): la estación de
// reparación en lugar de la fuente y las dos de carga en lugar de las fogatas
const restGroup = new THREE.Group(); restGroup.visible = false; scene.add(restGroup);
{
    const at = (m, x, y, h) => { m.position.set((x + 0.5) * U, h, (y + 0.5) * U); restGroup.add(m); return m; };
    const box = (w, h, d, material, x, y, lift = 0) => at(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y, lift + h / 2);
    const glow = c => new THREE.MeshBasicMaterial({ color: c });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), surface({ map: floorTex(1), color: '#d9d3c6' }));
    floor.material.map.repeat.set(COLS / 2, ROWS / 2);
    floor.rotation.x = -Math.PI / 2; floor.position.set(COLS / 2, 0, ROWS / 2); restGroup.add(floor);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(COLS + 30, ROWS + 30), new THREE.MeshLambertMaterial({ color: '#2a2b2e' }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(COLS / 2, -0.02, ROWS / 2); restGroup.add(outer);
    // la pared del fondo: cuatro portones de garaje, con su luz arriba
    const wall = surface({ map: wallTex() });
    box(COLS + 1, 3.2, 0.4, wall, COLS / 2 - 0.5, -1.2);
    for (let i = 0; i < 4; i++) {
        const x = 2 + i * 5;
        box(3.2, 2.4, 0.1, mat('gris'), x, -0.95);
        for (let k = 0; k < 6; k++) box(3.2, 0.05, 0.12, mat('carbon'), x, -0.94, 0.3 + k * 0.38);   // las tablillas del portón
        box(3.4, 0.12, 0.14, mat('peligro'), x, -0.92, 2.45);
        box(2.4, 0.12, 0.2, glow('#fff4c8'), x, -0.9, 2.8);
    }
    // la estación de reparación (donde estaba la fuente): base, columna, grúa y la pantalla
    const sx = 10, sy = 4;
    box(1.5, 0.35, 1.5, mat('carbon'), sx, sy);
    box(1.6, 0.08, 1.6, mat('peligro'), sx, sy, 0.35);
    box(0.4, 2.6, 0.4, mat('oliva'), sx, sy, 0.43);
    const crane = new THREE.Group(); at(crane, sx, sy, 2.9); crane.name = 'crane';                   // la grúa gira sobre la columna
    const part = (w, h, d, m, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, 0); crane.add(b); };
    part(2.2, 0.25, 0.3, mat('ama'), 0.9, 0);
    part(0.08, 0.9, 0.08, mat('metal'), 1.8, -0.55);                                                     // el cable
    part(0.3, 0.2, 0.3, mat('nar'), 1.8, -1.05);                                                         // el gancho
    box(0.9, 0.6, 0.06, glow('#3cd8f0'), sx, sy + 0.25, 1.4).name = 'screen';
    // las estaciones de carga (donde estaban las fogatas): gabinete con el panel naranja, el cable y su luz
    for (const x of [5, 15]) {
        box(0.9, 1.5, 0.7, mat('gris'), x, 7);
        box(0.6, 0.5, 0.04, glow('#ff8a2a'), x, 7.37, 0.7).name = 'charge';
        box(0.95, 0.08, 0.75, mat('peligro'), x, 7, 1.5);
        box(0.12, 0.12, 1.2, mat('ama'), x, 6.3, 0.06);
        at(new THREE.PointLight('#ff9a40', 8, 6, 1.8), x, 7.6, 1.2);
    }
    at(new THREE.PointLight('#fff1d6', 5, 22, 1.4), 10, 6, 6);
    outlineAll(restGroup);
}
// El piso de los boxes: los 8 lugares numerados, la calle de boxes y la cruz de a dónde caminás
function drawRestDecal() {
    const px = v => v * TILE + TILE / 2;
    dctx.strokeStyle = 'rgba(242,194,26,0.85)'; dctx.lineWidth = 2;
    dctx.setLineDash([8, 6]); dctx.beginPath(); dctx.moveTo(0, px(10.6)); dctx.lineTo(MAP_W, px(10.6)); dctx.stroke(); dctx.setLineDash([]);
    dctx.font = 'bold 13px "Chakra Petch", sans-serif'; dctx.fillStyle = 'rgba(242,194,26,0.5)'; dctx.fillText('CALLE DE BOXES', MAP_W / 2, px(11.1));
    (typeof REST_SPOTS !== 'undefined' ? REST_SPOTS : []).forEach(([x, y], i) => {
        dctx.strokeStyle = 'rgba(233,229,216,0.7)'; dctx.strokeRect(px(x) - TILE * 0.6, px(y) - TILE * 0.6, TILE * 1.2, TILE * 1.2);
        dctx.font = 'bold 9px "Chakra Petch", sans-serif'; dctx.fillStyle = 'rgba(233,229,216,0.75)'; dctx.fillText(String(i + 1).padStart(2, '0'), px(x) - TILE * 0.38, px(y) - TILE * 0.42);
    });
    const me = typeof player !== 'undefined' ? player : null;
    if (me && me.inRest && me.moveTarget) {
        const t = me.moveTarget, s = 5;
        dctx.strokeStyle = '#2dc653'; dctx.lineWidth = 2; dctx.beginPath();
        dctx.moveTo(px(t.x) - s, px(t.y) - s); dctx.lineTo(px(t.x) + s, px(t.y) + s); dctx.moveTo(px(t.x) + s, px(t.y) - s); dctx.lineTo(px(t.x) - s, px(t.y) + s); dctx.stroke();
    }
}

// Las columnas de la arena de duelo (arena.walls, duels.js): pilares de chapa con franja de peligro y una luz arriba
const pillars = new THREE.Group(); scene.add(pillars);
let pillarsOf = null;
function placePillars(arena) {
    if (pillarsOf === arena.walls) return;
    pillarsOf = arena.walls;
    while (pillars.children.length) pillars.remove(pillars.children[0]);
    if (!arena.walls) return;
    const wall = surface({ map: wallTex() });
    arena.walls.forEach((row, y) => row.forEach((on, x) => {
        if (!on) return;
        const add = (geo, m, h) => { const o = outline(new THREE.Mesh(geo, m)); o.position.set((x + 0.5) * U, h, (y + 0.5) * U); pillars.add(o); };
        add(new THREE.BoxGeometry(1, 0.2, 1), mat('carbon'), 0.1);
        add(new THREE.BoxGeometry(0.8, 2.4, 0.8), wall, 1.4);
        add(new THREE.BoxGeometry(0.84, 0.25, 0.84), mat('peligro'), 0.6);
        add(new THREE.BoxGeometry(0.5, 0.12, 0.5), new THREE.MeshBasicMaterial({ color: '#fff4c8' }), 2.66);
    }));
}

// EL PÚBLICO (roadmap fase 4, "el público reacciona"): tribunas de hormigón atrás y a los costados de la arena, con
// espectadores (cuerpo y cabeza) que se mueven solos y saltan cuando cae alguien (un competidor, más; un creep, un poco)
const CROWD_COLORS = ['#c8402e', '#f2c21a', '#3f78c8', '#6c7448', '#d2cdbb', '#f27a1a', '#8a6fb0', '#2dc6a0'];
const crowd = { n: 0, base: [], phase: [], cheer: 0 };
const crowdMesh = (() => {
    const spots = [];
    for (let tier = 0; tier < 4; tier++) {
        const h = 0.35 + tier * 0.55, back = -1.9 - tier * 0.8, side = 1.9 + tier * 0.8;
        for (let x = -2; x <= COLS + 2; x += 0.7) spots.push([x, h, back]);                              // atrás
        for (let z = 0.5; z <= ROWS; z += 0.8) { spots.push([-side, h, z]); spots.push([COLS + side, h, z]); } // costados
        const step = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat('gris')); m.position.set(x, h / 2, z); arenaGroup.add(m); };
        step(COLS + 6, 0.8, COLS / 2, back); step(0.8, ROWS + 2, -side, ROWS / 2); step(0.8, ROWS + 2, COLS + side, ROWS / 2);
    }
    const geo = new THREE.BoxGeometry(0.34, 0.5, 0.26); geo.translate(0, 0.25, 0);
    const head = new THREE.BoxGeometry(0.22, 0.2, 0.2); head.translate(0, 0.62, 0);
    const merged = new THREE.BufferGeometry(); // cuerpo y cabeza en una sola forma (un dibujo por espectador)
    const pos = [...geo.attributes.position.array, ...head.attributes.position.array], nor = [...geo.attributes.normal.array, ...head.attributes.normal.array];
    const idx = [...geo.index.array, ...head.index.array.map(i => i + geo.attributes.position.count)];
    merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); merged.setIndex(idx);
    const m = new THREE.InstancedMesh(merged, surface({ color: '#ffffff' }), spots.length);
    const c = new THREE.Color(), mtx = new THREE.Matrix4();
    spots.forEach((p, i) => {
        crowd.base.push(p); crowd.phase.push(Math.random() * Math.PI * 2);
        mtx.makeTranslation(p[0], p[1], p[2]); m.setMatrixAt(i, mtx);
        m.setColorAt(i, c.set(CROWD_COLORS[(Math.random() * CROWD_COLORS.length) | 0]).multiplyScalar(0.75 + Math.random() * 0.25));
    });
    crowd.n = spots.length; arenaGroup.add(m); return m;
})();
const crowdMtx = new THREE.Matrix4();
function cheer(k) { crowd.cheer = Math.min(1.5, crowd.cheer + k); if (k >= 0.5 && typeof sfx === 'function') sfx('crowd'); }
function animateCrowd(dt, t) {
    crowd.cheer = Math.max(0, crowd.cheer - dt * 0.6);
    const amp = 0.04 + crowd.cheer * 0.35;
    for (let i = 0; i < crowd.n; i++) {
        const b = crowd.base[i], ph = crowd.phase[i];
        crowdMtx.makeTranslation(b[0], b[1] + Math.abs(Math.sin(t * (3 + crowd.cheer * 4) + ph)) * amp, b[2]);
        crowdMesh.setMatrixAt(i, crowdMtx);
    }
    crowdMesh.instanceMatrix.needsUpdate = true;
}

// Marca en el piso: el aro de los competidores (celeste vos, naranja los rivales) y el aro de rango del jugador
function ringMesh(r0, r1, color, opacity) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; return m;
}
const rangeRing = ringMesh(0.97, 1, '#e8b4a0', 0.55); scene.add(rangeRing); // (la cruz de a dónde caminás va con los efectos del piso)

// Cámara: arriba y atrás, mirando el centro de la arena con unos 55° de inclinación (como Dota)
// La cámara se acerca y sigue a tu competidor (2026-10-30, pedido del usuario: los robots se veían chicos). En el duelo encuadra
// a los dos y se aleja lo que haga falta; en los boxes se ve todo. Nunca muestra lo que está afuera de la arena.
const ZOOM = 0.92, VIEW_SHIFT = 0.08, cam = { x: COLS / 2, z: ROWS / 2 + 0.9, k: 1, arena: null, peek: null };
const clampTo = (v, half, size) => half * 2 >= size ? size / 2 : Math.max(half, Math.min(size - half, v));
function cameraGoal(arena) {
    const full = { x: COLS / 2, z: ROWS / 2 + 0.9, k: 1 };
    if (arena.kind === 'rest') return full;
    if (cam.peek && performance.now() < cam.peek.until) return { x: clampTo(cam.peek.x, COLS * ZOOM / 2, COLS), z: clampTo(cam.peek.z, ROWS * ZOOM / 2, ROWS) + 0.9, k: ZOOM }; // clic en el minimapa (hud.js)
    const me = [viewedHero, player].find(h => h && arena.heroes.includes(h)) || arena.heroes[0];
    if (!me) return full;
    const spot = u => ({ x: (u.rx ?? u.x) + 0.5, z: (u.ry ?? u.y) + 0.5 });
    const a = spot(me), other = arena.kind === 'duel' ? arena.heroes.find(h => h !== me) : null, b = other ? spot(other) : a;
    const k = Math.min(1, Math.max(ZOOM, (Math.abs(a.x - b.x) + 5) / COLS, (Math.abs(a.z - b.z) + 4) / ROWS));
    return { x: clampTo((a.x + b.x) / 2, COLS * k / 2, COLS), z: clampTo((a.z + b.z) / 2, ROWS * k / 2, ROWS) + 0.9, k };
}
function placeCamera(aspect, arena, dt) {
    camera.aspect = aspect;
    const goal = cameraGoal(arena), ease = cam.arena === arena ? Math.min(1, dt * 5) : 1; // al cambiar de arena, sin barrido
    cam.arena = arena;
    ['x', 'z', 'k'].forEach(n => { cam[n] += (goal[n] - cam[n]) * ease; });
    const pitch = 55 * Math.PI / 180, dist = (18.8 + Math.max(0, 1.75 - aspect) * 8) * cam.k;
    camera.position.set(cam.x, Math.sin(pitch) * dist, cam.z + Math.cos(pitch) * dist + 0.3);
    camera.lookAt(cam.x, 0, cam.z);
    // El HUD de abajo tapa parte de la pantalla: la imagen sube para que tu competidor quede en el centro de lo que se ve
    const size = 1000, shift = arena.kind === 'rest' ? 0 : VIEW_SHIFT;
    camera.setViewOffset(aspect * size, size, 0, shift * size, aspect * size, size);
}

// --- LAS UNIDADES ---
const units = new Map(); // unidad del juego → { robot, scale, yaw, last }
const roundBossRobot = u => u.isRoundBoss && u.type && BOSS_ROBOTS[u.type.key];
const creepRobot = u => !u.isHero && !u.isRoundBoss && u.type && CREEP_ROBOTS[u.type.key];
function buildFor(u) {
    if (u.isHero) return (HERO_ROBOTS[u.key] || HERO_ROBOTS.CRANE).build;
    if (u.isRoundBoss && roundBossRobot(u)) return roundBossRobot(u).build;
    if (u.isRoundBoss || u.isBoss) return BOSS_BUILD;
    return (creepRobot(u) || {}).build || CREEP_BUILDS[creepPlan(u)];
}
// Los competidores, más anchos: el esqueleto es finito y desde la cámara alta la silueta se perdía
const bulkOf = u => u.isHero ? 1.25 : 1;
// El robot pintado y con sus piezas propias. En los competidores la altura se mide sin las piezas: un sombrero o una guadaña no achican al robot.
function makeRobot(u) {
    const robot = buildRobot(buildFor(u)), look = roundBossRobot(u) || (u.isHero && HERO_ROBOTS[u.key]) || creepRobot(u);
    const measure = () => { const b = new THREE.Box3().setFromObject(robot); return Math.max(0.1, b.max.y - b.min.y); };
    const bodyH = measure();
    if (look) addExtras(robot, look);
    paintRobot(robot, look ? look.paint : lighten(u.color || (u.type && u.type.color) || '#9aa0a6', 0.15));
    return { robot, h: u.isHero ? bodyH : measure() };
}
function unitObj(u) {
    let o = units.get(u);
    if (o) return o;
    const { robot, h } = makeRobot(u);
    const scale = sizeOf(u) / h;
    robot.scale.set(scale * bulkOf(u), scale, scale * bulkOf(u));
    const g = new THREE.Group(); g.add(robot);
    if (u.isHero) { const ring = ringMesh(0.36, 0.46, u === (typeof player !== 'undefined' ? player : null) ? '#00f5d4' : '#ffb703', 0.9); g.add(ring); g.userData.ring = ring; }
    scene.add(g);
    o = { g, robot, scale, yaw: u.isHero ? 0 : Math.PI, last: null, seen: 0 };
    units.set(u, o);
    return o;
}

// LOS DRONES DE REC (data/heroes/rec.js): tres drones chiquitos (cuerpo, dos rotores y la luz de su tipo) que flotan
// alrededor de Rec; cuando uno sale a pegar (un proyectil con .drone), vuela ese y falta de su lugar.
const DRONE_LOOK = { aereo: '#a2a8ad', sonido: '#ff3ea5', luz: '#ffd23f' };
const rotorMat = new THREE.MeshBasicMaterial({ color: '#d8dde2', transparent: true, opacity: 0.45, depthWrite: false });
function droneMesh(kind) {
    const g = new THREE.Group(), c = DRONE_LOOK[kind] || '#ffffff';
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.2), mat(kind === 'luz' ? 'gris' : kind === 'sonido' ? 'carbon' : 'oliva'));
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: c })); lamp.position.set(0, -0.02, 0.11);
    g.add(body, lamp);
    for (const x of [-0.17, 0.17]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 10), rotorMat); r.position.set(x, 0.07, 0); g.add(r); }
    g.scale.setScalar(2); // que se lean desde la cámara de arriba
    scene.add(g); return g;
}
const flying = []; let nFly = 0;
function flyingDrone(kind) {
    let m = flying[nFly]; if (!m || m.userData.kind !== kind) { if (m) scene.remove(m); m = flying[nFly] = droneMesh(kind); m.userData.kind = kind; }
    nFly++; m.visible = true; return m;
}
function hoverDrones(o, u, arena, t) {
    if (!o.drones) o.drones = Object.keys(DRONE_LOOK).map(k => droneMesh(k));
    const out = new Set(arena.projectiles.filter(p => p.drone && p.attacker === u).map(p => p.drone));
    Object.keys(DRONE_LOOK).forEach((k, i) => {
        const d = o.drones[i], a = t * 1.2 + i * 2.09;
        d.visible = o.g.visible && !out.has(k);
        d.position.set(o.g.position.x + Math.cos(a) * 0.9, sizeOf(u) * 1.05 + Math.sin(t * 3 + i) * 0.08, o.g.position.z + Math.sin(a) * 0.9);
        d.rotation.y = -a;
    });
}

// Proyectiles: esferitas que brillan, del color de quien dispara
const shots = [];
const shotGeo = new THREE.SphereGeometry(0.12, 8, 6);
function shotMesh(i, color, big) {
    if (!shots[i]) { shots[i] = new THREE.Mesh(shotGeo, new THREE.MeshBasicMaterial({ color })); scene.add(shots[i]); }
    shots[i].material.color.set(color); shots[i].scale.setScalar(big ? 1.6 : 1); shots[i].visible = true;
    return shots[i];
}

// --- EFECTOS DE HABILIDADES (2026-10-28) ---
// Lo que pasa en el PISO (tajos, áreas, aros, zonas, auras, la mira y el área de la habilidad que estás apuntando, el
// aura del jefe) se dibuja con el mismo código 2D de siempre (fx.js, fxSkills.js, mouse.js) en un canvas aparte que
// se apoya sobre el piso 3D como una calcomanía: así cada efecto nuevo del 2D aparece solo en el 3D. Lo que va en el
// AIRE es 3D de verdad: rayos que caen del cielo, rayos en cadena, disparos trazadores, meteoros, chispas y burbujas.
const AIR = new Set(['text', 'particle', 'skybolt', 'zigzag', 'tracer', 'streak', 'bolt', 'bubble', 'corpse']); // corpse: en 3D el robot se cae (ver frame)
const decalCv = document.createElement('canvas');
decalCv.width = MAP_W; decalCv.height = MAP_H;
const dctx = decalCv.getContext('2d');
const decalTex = new THREE.CanvasTexture(decalCv); decalTex.colorSpace = THREE.SRGBColorSpace;
const decal = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), new THREE.MeshBasicMaterial({ map: decalTex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
decal.rotation.x = -Math.PI / 2; decal.position.set(COLS / 2, 0.025, ROWS / 2); decal.renderOrder = 1; scene.add(decal);
function drawDecal(arena) {
    withCtx(dctx, () => {
        dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.clearRect(0, 0, MAP_W, MAP_H);
        dctx.textAlign = 'center'; dctx.textBaseline = 'middle';
        if (arena.kind === 'rest') { drawRestDecal(); return; }
        if (arena.boss && arena.boss.isAlive()) { // el aura del jefe
            const b = arena.boss;
            dctx.strokeStyle = 'rgba(255,0,85,0.55)'; dctx.lineWidth = 2;
            dctx.beginPath(); dctx.arc((b.rx ?? b.x) * TILE + TILE / 2, (b.ry ?? b.y) * TILE + TILE / 2, b.auraRadius * TILE, 0, Math.PI * 2); dctx.stroke();
        }
        const all = arena.fx || [], pass = fxTextPass;
        arena.fx = all.filter(f => !AIR.has(f.kind)); fxTextPass = 'skip'; // sin textos ni el cartel de la definitiva (van encima, en ui.js)
        try { drawArenaFx(arena); } finally { arena.fx = all; fxTextPass = pass; }
        drawMouseOverlay(arena, true);
    });
    decalTex.needsUpdate = true;
}
// Colores (los efectos usan hex y a veces rgba: el alfa se ignora)
const colors = new Map();
const col = c => { let v = colors.get(c); if (!v) { v = new THREE.Color(); try { v.setStyle(String(c)); } catch (e) { v.set('#ffffff'); } colors.set(c, v); } return v; };
// Haces de luz: cajas finas estiradas entre dos puntos, que suman luz (brillan sobre lo oscuro)
const beamGeo = new THREE.BoxGeometry(1, 1, 1); beamGeo.translate(0, 0, 0.5);
const beams = []; let nBeam = 0;
const glowMat = () => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
function beam(a, b, w, color, op = 1) {
    const len = a.distanceTo(b); if (len < 1e-3 || w <= 0) return;
    let m = beams[nBeam]; if (!m) { m = beams[nBeam] = new THREE.Mesh(beamGeo, glowMat()); scene.add(m); }
    nBeam++;
    m.material.color.copy(col(color)); m.material.opacity = op; m.visible = true;
    m.position.copy(a); m.lookAt(b); m.scale.set(w, w, len);
}
// Rayo quebrado de a hacia b (se vuelve a quebrar cada cuadro: titila)
const jit3 = new THREE.Vector3();
function jagged(a, b, jit, w, outer, inner, op) {
    const seg = 7; let prev = a.clone();
    for (let i = 1; i <= seg; i++) {
        const p = a.clone().lerp(b, i / seg);
        if (i < seg) p.add(jit3.set((Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit));
        beam(prev, p, w, outer, op * 0.7); beam(prev, p, w * 0.4, inner, op); prev = p;
    }
}
// Esferas que brillan: cabeza del meteoro, destellos, burbujas de escudo
const orbGeo = new THREE.SphereGeometry(1, 12, 8);
const orbs = []; let nOrb = 0;
function orb(p, r, color, op = 1) {
    let m = orbs[nOrb]; if (!m) { m = orbs[nOrb] = new THREE.Mesh(orbGeo, glowMat()); scene.add(m); }
    nOrb++;
    m.material.color.copy(col(color)); m.material.opacity = op; m.visible = true; m.position.copy(p); m.scale.setScalar(r);
}
// Chispas: puntos que suman luz y se apagan (el color va hacia negro = transparente)
const PMAX = 600, pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
sparks.frustumCulled = false; scene.add(sparks);
// El destello de los rayos que caen: una luz que ilumina a los robots de alrededor
const flash = new THREE.PointLight('#fffbe0', 0, 7, 1.5); scene.add(flash);
const W = (x, y, h) => new THREE.Vector3((x + 0.5) * U, h * U, (y + 0.5) * U);
const CHEST = 0.9;
function drawAirFx(arena) {
    nBeam = 0; nOrb = 0;
    let np = 0, flashK = 0;
    const lightAt = (k, x, y, color) => { if (k > flashK) { flashK = k; flash.position.copy(W(x, y, 1.4)); flash.color.copy(col(color)); } };
    for (const f of arena.fx || []) {
        const t = (fxClock - f.born) / f.life;
        if (t < 0 || t > 1 || !AIR.has(f.kind)) continue;
        const fade = Math.max(0, 1 - t * t);
        if (f.kind === 'particle') {
            if (np >= PMAX) continue;
            const h = f.style === 'drop' ? 1.1 - t : ['smoke', 'ember', 'rune', 'bubble'].includes(f.style) ? 0.4 + t * 1.1 : 0.5 + Math.sin(t * Math.PI) * 0.6;
            pPos[np * 3] = (f.x + 0.5) * U; pPos[np * 3 + 1] = Math.max(0.05, h); pPos[np * 3 + 2] = (f.y + 0.5) * U;
            const c = col(f.color); pCol[np * 3] = c.r * fade; pCol[np * 3 + 1] = c.g * fade; pCol[np * 3 + 2] = c.b * fade; np++;
        } else if (f.kind === 'tracer') {
            const a = W(f.x, f.y, CHEST), b = W(f.tx, f.ty, CHEST), w = (f.wide ? 0.2 : 0.11) * (1 - t);
            beam(a, b, w, f.color2, 0.8); beam(a, b, w * 0.4, f.color, 1);
        } else if (f.kind === 'zigzag') {
            jagged(W(f.x, f.y, CHEST), W(f.tx, f.ty, CHEST), 0.45, 0.13, f.color2, f.color, fade);
        } else if (f.kind === 'skybolt') {
            jagged(W(f.x + (Math.random() - 0.5) * 0.3, f.y, 9), W(f.x, f.y, 0), 0.7, 0.16, f.color2, f.color, fade);
            if (t < 0.3) { orb(W(f.x, f.y, 0.1), 0.8 * (1 - t / 0.3), '#ffffff', 0.5); lightAt(1 - t / 0.3, f.x, f.y, f.color); }
        } else if (f.kind === 'streak') { // meteoro: baja en diagonal desde el cielo
            const a = W(f.tx - 2, f.ty - 1, 8), b = W(f.tx, f.ty, 0), k = Math.min(1, t * 1.2);
            const head = a.clone().lerp(b, k);
            beam(a.clone().lerp(b, Math.max(0, k - 0.4)), head, 0.22, f.color, 0.9); orb(head, 0.25, '#ffffff');
            if (k >= 1) lightAt(Math.max(0, 1 - (t - 0.83) * 6), f.tx, f.ty, f.color);
        } else if (f.kind === 'bolt') {
            const a = W(f.x, f.y, CHEST), b = W(f.tx, f.ty, CHEST), head = Math.min(1, t * 2.5);
            beam(a.clone().lerp(b, Math.max(0, head - 0.35)), a.clone().lerp(b, head), f.cast ? 0.1 : 0.06, f.color, fade);
            orb(a.clone().lerp(b, head), f.cast ? 0.12 : 0.08, '#ffffff', fade);
        } else if (f.kind === 'bubble') { // escudo: una burbuja alrededor del robot
            const ux = f.unit ? (f.unit.rx ?? f.unit.x) : f.x, uy = f.unit ? (f.unit.ry ?? f.unit.y) : f.y, r = (f.unit ? sizeOf(f.unit) : 2) * 0.5;
            orb(W(ux, uy, r), r * (1 + 0.04 * Math.sin(t * 20)), f.color2, 0.22 * fade); orb(W(ux, uy, r), r * 1.06, f.color, 0.1 * fade);
        }
    }
    pGeo.setDrawRange(0, np); pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    flash.intensity = flashK * 40;
}
// Lo que sobró de los haces y esferas de cuadros anteriores se esconde
function hideUnused() {
    for (let i = nBeam; i < beams.length; i++) beams[i].visible = false;
    for (let i = nOrb; i < orbs.length; i++) orbs[i].visible = false;
}
// Proyectiles: estela de luz detrás de cada uno
const trailOf = new WeakMap();
function projectileTrail(pr, pos, color) {
    let tr = trailOf.get(pr); if (!tr) trailOf.set(pr, tr = []);
    tr.push(pos.clone()); if (tr.length > 6) tr.shift();
    if (tr.length > 1) beam(tr[0], pos, pr.radius ? 0.12 : 0.06, color, 0.45);
}

// --- CADA CUADRO ---
let frameNo = 0;
const tmp = new THREE.Vector3(), cvSize = { w: 0, h: 0 };
function frame(arena, dt) {
    frameNo++;
    // Tamaño: el canvas 3D tapa justo el área del mapa (adentro del borde del canvas 2D)
    const w = canvas2d.clientWidth, h = canvas2d.clientHeight;
    cv.style.display = 'block';
    cv.style.left = canvas2d.offsetLeft + canvas2d.clientLeft + 'px'; cv.style.top = canvas2d.offsetTop + canvas2d.clientTop + 'px';
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    if (w !== cvSize.w || h !== cvSize.h) { cvSize.w = w; cvSize.h = h; renderer.setSize(w, h, false); }
    placeCamera(w / Math.max(1, h), arena, dt);
    if (shakeAmount) { camera.position.x += (Math.random() - 0.5) * shakeAmount * 0.03; camera.position.z += (Math.random() - 0.5) * shakeAmount * 0.03; } // temblor de los golpes fuertes
    // Jefe: luz más roja; los boxes, más cálidos
    const boss = arena.kind === 'boss', rest = arena.kind === 'rest';
    hemi.color.set(boss ? '#f0b8b0' : rest ? '#f2e6d2' : '#dfe6f2'); scene.fog.color.set(boss ? '#1a0b0c' : rest ? '#14110e' : '#0c0d10');
    arenaGroup.visible = !rest; restGroup.visible = rest;
    placePillars(arena); pillars.visible = !rest;
    const rec = arenaGroup.getObjectByName('rec'); rec.visible = Math.floor(performance.now() / 600) % 2 === 0;
    if (rest) { // la grúa va y viene, la pantalla titila y los paneles de carga laten
        const now = performance.now() / 1000;
        restGroup.getObjectByName('crane').rotation.y = Math.sin(now * 0.4) * 0.6;
        restGroup.getObjectByName('screen').visible = Math.sin(now * 13) > -0.9;
        restGroup.traverse(o => { if (o.name === 'charge') o.material.color.setHSL(0.07, 1, 0.45 + Math.sin(now * 3) * 0.12); });
    }

    const list = arena.creeps.filter(c => c.isAlive()).concat(arena.heroes.filter(h => !h.eliminated && h.isAlive()));
    for (const u of list) {
        const o = unitObj(u), p = drawPos(u, dt);
        o.seen = frameNo;
        if (o.dieT !== undefined) { o.dieT = undefined; o.robot.rotation.x = 0; o.g.position.y = 0; } // revivió
        const x = (p.x + 0.5) * U, z = (p.y + 0.5) * U;
        let speed = 0;
        if (o.last && dt > 0) { const dx = x - o.last.x, dz = z - o.last.z; speed = Math.hypot(dx, dz) / dt; if (Math.hypot(dx, dz) > 0.004) o.yaw = Math.atan2(dx, dz); }
        if (u.fxAttack) o.yaw = Math.atan2(u.fxAttack.dx, u.fxAttack.dy);
        o.last = { x, z };
        o.g.position.set(x, 0, z);
        let d = o.yaw - o.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        o.g.rotation.y += d * Math.min(1, dt * 12);
        animateRobot(o.robot, dt, speed / o.scale * 0.6, false);
        const hit = u.fxHitAt !== undefined && fxClock - u.fxHitAt < 0.12;
        o.robot.scale.setScalar(o.scale * (hit ? 1.07 : 1));
        o.g.visible = true;
    }
    // Los que ya no están: si se murieron recién, el robot se cae de espaldas, se hunde y larga chispas; los demás
    // (de otra arena) se esconden. Si hace rato que no se ven, se liberan.
    for (const [u, o] of units) {
        if (o.seen === frameNo) continue;
        if (o.dieT === undefined && o.seen === frameNo - 1 && !u.isAlive()) {
            o.dieT = 0;
            cheer(u.isHero || u.isRoundBoss ? 1 : 0.12); // la tribuna grita
            fxParticles(arena, o.g.position.x / U - 0.5, o.g.position.z / U - 0.5, 'lightning', 10, 3, { style: 'spark' });
            fxParticles(arena, o.g.position.x / U - 0.5, o.g.position.z / U - 0.5, 'steel', 6, 1.5, { style: 'smoke', size: 5, life: 0.8 });
        }
        if (o.dieT !== undefined && o.dieT < 1) {
            o.dieT += dt;
            o.robot.rotation.x = -Math.min(1, o.dieT * 3.5) * Math.PI * 0.45;
            o.g.position.y = -Math.max(0, o.dieT - 0.45) * sizeOf(u) * 0.6;
            o.g.visible = true;
        } else o.g.visible = false;
        if (frameNo - o.seen > 600) { scene.remove(o.g); units.delete(u); }
    }
    drawAirFx(arena);
    if (!rest) animateCrowd(dt, performance.now() / 1000);

    // Los drones de Rec, flotando a su alrededor
    const tNow = performance.now() / 1000;
    for (const [u, o] of units) if (u.key === 'REC') { if (o.seen === frameNo) hoverDrones(o, u, arena, tNow); else if (o.drones) o.drones.forEach(d => { d.visible = false; }); }
    // Proyectiles (los de los drones de Rec, como drones que vuelan)
    let n = 0; nFly = 0;
    for (const pr of arena.projectiles) {
        const color = (pr.vfx && pr.vfx.color) || (pr.attacker.isHero ? heroColor(pr.attacker) : pr.attacker.color || '#fefae0');
        if (pr.drone) {
            const d = flyingDrone(pr.drone), tx = pr.target ? pr.target.x : pr.x, ty = pr.target ? pr.target.y : pr.y;
            d.position.set((pr.x + 0.5) * U, 1.1, (pr.y + 0.5) * U); d.rotation.y = Math.atan2(tx - pr.x, ty - pr.y);
            projectileTrail(pr, d.position, color);
            continue;
        }
        const s = shotMesh(n++, pr.isCrit ? '#ffd166' : color, !!pr.radius);
        s.position.set((pr.x + 0.5) * U, 0.8, (pr.y + 0.5) * U);
        projectileTrail(pr, s.position, color);
    }
    for (let i = n; i < shots.length; i++) shots[i].visible = false;
    for (let i = nFly; i < flying.length; i++) flying[i].visible = false;

    // El aro de rango; la cruz de a dónde caminás, el objetivo marcado y la mira van en el piso (drawDecal)
    const me = typeof player !== 'undefined' ? player : null;
    rangeRing.visible = !!(me && me.isAlive() && me.arena === arena);
    if (rangeRing.visible) { const o = units.get(me); if (o) { rangeRing.position.set(o.g.position.x, 0.03, o.g.position.z); rangeRing.scale.setScalar(effRange(me)); } }
    drawDecal(arena);
    hideUnused();

    renderer.render(scene, camera);
}
function hide() { cv.style.display = 'none'; }

// De un punto del mundo (casillas, altura en casillas) a coordenadas del mapa 2D (MAP_W × MAP_H)
function project(x, y, h = 0) {
    tmp.set((x + 0.5) * U, h * U, (y + 0.5) * U).project(camera);
    return { x: (tmp.x + 1) / 2 * viewW, y: (1 - tmp.y) / 2 * MAP_H, behind: tmp.z > 1 };
}
// Altura de la cabeza de una unidad (para la barra de vida)
function headHeight(u) { return sizeOf(u) + 0.15; }
// Del mouse a la casilla: rayo desde la cámara hasta el piso
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
function screenToTile(clientX, clientY) {
    const r = canvas2d.getBoundingClientRect();
    const nx = ((clientX - r.left - canvas2d.clientLeft) / canvas2d.clientWidth) * 2 - 1, ny = -(((clientY - r.top - canvas2d.clientTop) / canvas2d.clientHeight) * 2 - 1);
    camera.updateMatrixWorld(); ray.setFromCamera({ x: nx, y: ny }, camera);
    if (!ray.ray.intersectPlane(plane, hitP)) return null;
    return { x: hitP.x / U - 0.5, y: hitP.z / U - 0.5 };
}

// --- RETRATOS: el robot de verdad, en una foto chica, para la interfaz (ranking, tienda, glosarios, carteles) ---
const PORTRAIT = 192, portraits = {};
let portraitGl = null, portraitScene = null;
// full: el robot entero (la portada). Si no, de la cintura para arriba, que es lo que se reconoce en chico.
function portrait(u, key, full = false) {
    if (!enabled) return null;
    if (portraits[key]) return portraits[key];
    if (!portraitGl) {
        const c = document.createElement('canvas'); c.width = c.height = PORTRAIT;
        portraitGl = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
        portraitGl.setPixelRatio(1); portraitGl.setSize(PORTRAIT, PORTRAIT, false);
        portraitScene = new THREE.Scene();
        const lamp = new THREE.DirectionalLight('#fff1d6', 1.9); lamp.position.set(-3, 5, 6);
        portraitScene.add(new THREE.HemisphereLight('#dfe6f2', '#6a6458', 1.5), lamp);
    }
    const { robot, h } = makeRobot(u);
    robot.scale.set(bulkOf(u), 1, bulkOf(u));
    animateRobot(robot, 0, 0, false);
    portraitScene.add(robot); robot.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(robot), mid = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
    const reach = full ? Math.max(size.y, size.x, size.z * 0.8) * 0.56 + 0.05 : h * 0.3;
    if (!full) mid.y = b.min.y + h * 0.74;
    const cam = new THREE.OrthographicCamera(-reach, reach, reach, -reach, 0.1, 40);
    cam.position.set(mid.x + 2.4, mid.y + 1.4, mid.z + 8); cam.lookAt(mid);
    portraitGl.render(portraitScene, cam);
    portraitScene.remove(robot);
    return (portraits[key] = portraitGl.domElement.toDataURL());
}

// --- CUÁNDO SE USA ---
// Siempre, salvo en las pruebas (index.html?test: corren sin dibujar) o con ?view3d=0 (para revisar el 2D)
const enabled = !/[?&]test/.test(location.search) && !/[?&]view3d=0/.test(location.search);
outlineAll(arenaGroup);
window.M3D = {
    // Minimapa (hud.js): mirar un lugar por un momento, y las cuatro esquinas de lo que muestra la cámara
    peek: (x, y) => { cam.peek = { x: x + 0.5, z: y + 0.5, until: performance.now() + 3000 }; },
    viewCorners: () => {
        const r = canvas2d.getBoundingClientRect();
        const pts = [[0, 0.1], [1, 0.1], [1, 0.8], [0, 0.8]].map(([fx, fy]) => screenToTile(r.left + fx * r.width, r.top + fy * r.height));
        return pts.every(Boolean) ? pts : null;
    },
    // ¿Se dibuja esta arena en 3D? (combate: oleada, duelo o jefe)
    wants: arena => enabled && arena && ['wave', 'duel', 'boss'].includes(arena.kind),
    // los boxes (el descanso) también: ui.js arma una arena de mentira { kind: 'rest', heroes, creeps: [], projectiles: [], fx: [] }
    enabled: () => enabled,
    frame, hide, project, headHeight, screenToTile, portrait, active: false
};
// Este módulo carga después que la interfaz: lo que ya se dibujó con los retratos viejos se vuelve a armar con los robots
if (enabled && typeof refreshPortraits === 'function') refreshPortraits();
