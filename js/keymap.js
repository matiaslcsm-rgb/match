// Teclas configurables (REWORK.md, lista de interfaz, 2026-10-07). En la pausa → "⌨️ Teclas": clic en una acción y apretás la
// tecla nueva; si otra acción la usaba, se intercambian (nunca quedan dos con la misma). Se guarda en el navegador.
// Esc siempre pausa (no se cambia). Se camina con el mouse, como en un MOBA.

const KEY_DEFAULTS = {
    map: 'm', shop: 'b', autocast: 'h', autopilot: 'p', skillKeys: 'k', panels: 'l'
};
const KEY_LABELS = {
    map: 'Mapa grande', shop: 'Tienda', autocast: 'Habilidades automáticas', autopilot: 'Piloto automático', skillKeys: 'Acomodar habilidades', panels: 'Retraer los paneles'
};
// Fijas: Esc, G (pixel art), las de las habilidades (hero.js, SKILL_KEYS) y las de los ítems
const KEY_FIXED = ['escape', 'g', 'q', 'w', 'e', 'r', 'd', 'f', 't', 'v', '1', '2', '3', '4', '5', '6'];
const ITEM_KEYS = ['1', '2', '3', '4', '5', '6']; // los ítems activos, una por casilla del inventario (items.js, useItem)
const KEYMAP = Object.assign({}, KEY_DEFAULTS);
try { const saved = JSON.parse(localStorage.getItem('chc-keys') || '{}'); Object.keys(KEY_DEFAULTS).forEach(a => { if (saved[a] && !KEY_FIXED.includes(saved[a])) KEYMAP[a] = saved[a]; }); } catch (e) { /* las de fábrica */ }

function keyName(k) { return k === ' ' ? 'ESP' : k === undefined ? '—' : k.length === 1 ? k.toUpperCase() : k.replace('arrow', '↑').toUpperCase(); }
function actionForKey(k) { return Object.keys(KEYMAP).find(a => KEYMAP[a] === k) || null; }

// Cambia la tecla de una acción (intercambiando si hace falta) y actualiza las habilidades que la usaban
function setKey(action, key) {
    if (KEY_FIXED.includes(key) || !KEY_DEFAULTS.hasOwnProperty(action)) return false;
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
function toggleSkillKeys(open = !skillKeysOpen) {
    if (open && !player) return;
    skillKeysOpen = open; skillKeyPicked = null;
    showPanel('skill-keys-container', open);
    if (open) renderSkillKeys();
}
function renderSkillKeys() {
    const box = document.getElementById('skill-keys-list');
    box.innerHTML = '';
    SKILL_KEYS.forEach(k => {
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
