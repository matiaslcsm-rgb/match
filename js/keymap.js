// Teclas configurables (REWORK.md, lista de interfaz, 2026-10-07). En la pausa → "⌨️ Teclas": clic en una acción y apretás la
// tecla nueva; si otra acción la usaba, se intercambian (nunca quedan dos con la misma). Se guarda en el navegador.
// Las flechas siempre mueven y Esc siempre pausa (no se cambian).

const KEY_DEFAULTS = {
    up: 'w', left: 'a', down: 's', right: 'd', // W A S D: solo si lo prendés en Opciones (mouse.js)
    map: 'm', shop: 'b', autocast: 'h', autopilot: 'p', skillKeys: 'k'
};
const KEY_LABELS = {
    up: 'Mover arriba', left: 'Mover a la izquierda', down: 'Mover abajo', right: 'Mover a la derecha',
    map: 'Mapa grande', shop: 'Tienda', autocast: 'Habilidades automáticas', autopilot: 'Piloto automático', skillKeys: 'Acomodar habilidades'
};
// Fijas: Esc, las flechas, G (pixel art) y las de las habilidades (hero.js, SKILL_KEYS)
const KEY_FIXED = ['escape', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'g', 'e', 'r', 't', 'f', 'q', 'v'];
const KEY_MOVES = ['up', 'left', 'down', 'right']; // W y D son de movimiento y de habilidades: ninguna otra acción las puede usar
const KEYMAP = Object.assign({}, KEY_DEFAULTS);
try { const saved = JSON.parse(localStorage.getItem('chc-keys') || '{}'); Object.keys(KEY_DEFAULTS).forEach(a => { if (saved[a] && !KEY_FIXED.includes(saved[a])) KEYMAP[a] = saved[a]; }); } catch (e) { /* las de fábrica */ }

function keyName(k) { return k === ' ' ? 'ESP' : k === undefined ? '—' : k.length === 1 ? k.toUpperCase() : k.replace('arrow', '↑').toUpperCase(); }
function actionForKey(k) { return Object.keys(KEYMAP).find(a => KEYMAP[a] === k) || null; }

// Cambia la tecla de una acción (intercambiando si hace falta) y actualiza las habilidades que la usaban
function setKey(action, key) {
    if (KEY_FIXED.includes(key) || !KEY_DEFAULTS.hasOwnProperty(action)) return false;
    if (WASD_SKILL_KEYS.includes(key) && !KEY_MOVES.includes(action)) return false;
    const old = KEYMAP[action], other = actionForKey(key);
    if (old === key) return true;
    KEYMAP[action] = key;
    if (other) KEYMAP[other] = old;
    // las habilidades del héroe atadas a esas teclas siguen a su acción
    if (player && player.keyBindings) Object.keys(player.keyBindings).forEach(id => {
        const b = player.keyBindings[id];
        if (b === old) player.keyBindings[id] = key; else if (other && b === key) player.keyBindings[id] = old;
    });
    saveKeymap();
    return true;
}
function resetKeymap() { Object.keys(KEY_DEFAULTS).forEach(a => { if (KEYMAP[a] !== KEY_DEFAULTS[a]) setKey(a, KEY_DEFAULTS[a]); }); saveKeymap(); }
function saveKeymap() { try { localStorage.setItem('chc-keys', JSON.stringify(KEYMAP)); } catch (e) { /* no se guarda */ } }

// --- VENTANA PARA ACOMODAR LAS HABILIDADES (pedido del usuario 2026-10-30) ---
// Se arrastra una habilidad a otra tecla (o se toca una y después la otra); si esa tecla estaba ocupada, se intercambian.
let skillKeysOpen = false, skillKeyPicked = null;
function assignSkillKey(hero, id, key) {
    const other = hero.skillForKey(key), old = hero.keyBindings[id];
    hero.keyBindings[id] = key;
    if (other && other.id !== id) { if (old) hero.keyBindings[other.id] = old; else delete hero.keyBindings[other.id]; }
}
// Al prender W A S D, las habilidades que estaban en W o D pasan a la próxima tecla libre.
function freeWasdKeys(hero) {
    hero.skills.filter(s => WASD_SKILL_KEYS.includes(hero.keyBindings[s.id])).forEach(s => { delete hero.keyBindings[s.id]; const k = hero.nextSkillKey(s); if (k) hero.keyBindings[s.id] = k; });
}
function toggleSkillKeys(open = !skillKeysOpen) {
    if (open && !player) return;
    skillKeysOpen = open; skillKeyPicked = null;
    showPanel('skill-keys-container', open);
    if (open) renderSkillKeys();
}
function renderSkillKeys() {
    const box = document.getElementById('skill-keys-list');
    box.innerHTML = '';
    skillKeysFree().forEach(k => {
        const s = player.skillForKey(k), cap = document.createElement('div');
        cap.className = 'sk-cap' + (s && s.id === skillKeyPicked ? ' picked' : '') + (s ? (s.isUltimate ? ' ult' : ` ${s.kind}`) : ' empty');
        cap.innerHTML = `<b>${keyName(k)}</b><span>${s ? s.name : 'libre'}</span><small>${s ? (s.isUltimate ? 'Definitiva' : s.kind === 'passive' ? 'Pasiva' : 'Activa') : ''}</small>`;
        cap.draggable = !!s;
        cap.ondragstart = () => { skillKeyPicked = s.id; };
        cap.ondragover = e => e.preventDefault();
        cap.ondrop = e => { e.preventDefault(); dropSkillKey(k); };
        cap.onclick = () => { if (skillKeyPicked) dropSkillKey(k); else if (s) { skillKeyPicked = s.id; renderSkillKeys(); } };
        box.appendChild(cap);
    });
}
function dropSkillKey(k) {
    if (skillKeyPicked) assignSkillKey(player, skillKeyPicked, k);
    skillKeyPicked = null;
    renderSkillKeys();
}

// --- VENTANA ---
let keysOpen = false, keyWaiting = null;
function toggleKeys(open = !keysOpen) {
    keysOpen = open; keyWaiting = null;
    showPanel('keys-container', open);
    if (typeof paused !== 'undefined' && paused) { showPanel('pause-menu', !open); if (!open) renderPauseMenu(); } // se abre en lugar de la pausa y vuelve a ella
    if (open) renderKeys();
}
function renderKeys() {
    const box = document.getElementById('keys-list');
    box.innerHTML = '';
    Object.keys(KEY_DEFAULTS).forEach(a => {
        const row = document.createElement('div'); row.className = 'key-row' + (keyWaiting === a ? ' waiting' : '');
        row.innerHTML = `<span>${KEY_LABELS[a]}</span><button class="key-cap">${keyWaiting === a ? 'Apretá una tecla…' : keyName(KEYMAP[a])}</button>`;
        row.querySelector('button').onclick = () => { keyWaiting = keyWaiting === a ? null : a; renderKeys(); };
        box.appendChild(row);
    });
}
// Mientras espera una tecla, la toma antes que el juego
window.addEventListener('keydown', e => {
    if (!keysOpen || !keyWaiting) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const k = e.key.toLowerCase();
    if (k !== 'escape') { if (!setKey(keyWaiting, k)) log(`⌨️ La tecla ${keyName(k)} está reservada.`); }
    keyWaiting = null; renderKeys();
}, true);
