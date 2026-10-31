// HUD estilo Dota 2 (2026-10-31, decisión del usuario): la arena ocupa toda la pantalla y el HUD flota encima, con el look
// de MATCH. Arriba, los 8 competidores y el reloj; abajo, minimapa, tu competidor, habilidades, inventario y tienda.
// La distribución sale de style.css (sección "HUD estilo Dota"): acá va lo que no se resuelve con estilos.

const miniCv = document.getElementById('minimap'), miniCtx = miniCv.getContext('2d');
const MINI_W = 200, MINI_H = 120, TOAST_MAX = 4, TOAST_MS = 4500;
const hudTests = /[?&](test|banco)/.test(location.search);
miniCv.width = MINI_W; miniCv.height = MINI_H;

// --- PANTALLA COMPLETA Y REGISTRO ---
function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { /* el navegador no dejó */ });
}
function toggleLogPanel() { document.body.classList.toggle('log-open'); }

// Avisos que aparecen a la derecha y se van solos; el historial completo se abre con L
function hudToast(msg) {
    if (hudTests) return;
    const box = document.getElementById('hud-toasts'), el = document.createElement('p');
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > TOAST_MAX) box.firstChild.remove();
    setTimeout(() => el.remove(), TOAST_MS);
}

// --- MINIMAPA ---
const miniX = x => (x + 0.5) / COLS * MINI_W, miniY = y => (y + 0.5) / ROWS * MINI_H;
function renderMinimap() {
    const c = miniCtx, hero = viewedHero || player, arena = hero && !hero.inRest ? hero.arena : null;
    c.fillStyle = '#16181a'; c.fillRect(0, 0, MINI_W, MINI_H);
    c.strokeStyle = '#2b2e30'; c.lineWidth = 1;
    for (let i = 1; i < COLS; i += 3) { c.beginPath(); c.moveTo(i / COLS * MINI_W, 0); c.lineTo(i / COLS * MINI_W, MINI_H); c.stroke(); }
    for (let i = 1; i < ROWS; i += 3) { c.beginPath(); c.moveTo(0, i / ROWS * MINI_H); c.lineTo(MINI_W, i / ROWS * MINI_H); c.stroke(); }
    if (!arena || !inCombat()) {
        c.fillStyle = '#8d8b80'; c.font = '14px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('BOXES', MINI_W / 2, MINI_H / 2);
        return;
    }
    if (arena.walls) { c.fillStyle = '#5a5e60'; arena.walls.forEach((row, y) => row.forEach((on, x) => { if (on) c.fillRect(x / COLS * MINI_W, y / ROWS * MINI_H, MINI_W / COLS, MINI_H / ROWS); })); }
    const dot = (u, color, r) => { c.fillStyle = color; c.beginPath(); c.arc(miniX(u.rx ?? u.x), miniY(u.ry ?? u.y), r, 0, Math.PI * 2); c.fill(); };
    arena.creeps.forEach(u => { if (u.isAlive()) dot(u, '#d9402c', u.isBoss || u.isRoundBoss ? 5 : 2.5); });
    arena.heroes.forEach(u => { if (!u.eliminated && u.isAlive()) dot(u, u === player ? '#00f5d4' : '#ffb703', 4); });
    // Lo que muestra la cámara
    const view = window.M3D && M3D.active && M3D.viewCorners();
    if (view) {
        c.strokeStyle = '#e9e5d8'; c.lineWidth = 1; c.beginPath();
        view.forEach((p, i) => { c[i ? 'lineTo' : 'moveTo'](miniX(p.x), miniY(p.y)); });
        c.closePath(); c.stroke();
    }
}
// Clic: mira ese lugar un momento. Clic derecho: camina hasta ahí, como en el mapa.
function miniTile(e) {
    const r = miniCv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * COLS - 0.5, y: (e.clientY - r.top) / r.height * ROWS - 0.5 };
}
miniCv.addEventListener('contextmenu', e => e.preventDefault());
miniCv.addEventListener('mousedown', e => {
    if (paused) return;
    const p = miniTile(e);
    if (e.button === 2) { if (canControlPlayer()) rightClickAt(p); return; }
    if (e.button === 0 && window.M3D) M3D.peek(p.x, p.y);
});

// --- BARRA DE ABAJO ---
function renderHudQuick() {
    const p = player, html = `<span title="Daño">⚔ ${Math.round(effAttack(p))}</span><span title="Armadura">⛨ ${effArmor(p).toFixed(1)}</span><span title="Velocidad de movimiento">➤ ${p.moveSpeed.toFixed(1)}</span>`;
    const box = document.getElementById('hb-quick');
    if (box.dataset.html !== html) { box.dataset.html = html; box.innerHTML = html; }
}
document.getElementById('hb-quick').addEventListener('mouseenter', () => document.body.classList.add('show-stats'));
document.getElementById('hb-quick').addEventListener('mouseleave', () => document.body.classList.remove('show-stats'));

function renderHudShop() {
    document.getElementById('hud-start').style.display = gameState === 'PREP' && !player.eliminated ? 'block' : 'none';
}
document.getElementById('hud-shop-btn').onclick = () => toggleShop();
document.getElementById('hud-start').onclick = () => startWave();

// Lo que cambia en cada cuadro (main.js)
function hudTick() {
    document.body.dataset.gs = gameState;
    if (!player) return;
    renderHudQuick();
    renderHudShop();
    renderMinimap();
}

// --- DESCRIPCIONES AL PASAR EL MOUSE ---
// Toman el texto del title de cada casilla: la primera línea va de título y el resto, abajo.
const hudTip = document.getElementById('hud-tip');
document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('#hero-bar [title], #hero-bar [data-tip], #tv-rank [title], #tv-rank [data-tip], #hud-shop [title], #hud-shop [data-tip]');
    if (!el) { hudTip.style.display = 'none'; return; }
    if (el.title) { el.dataset.tip = el.title; el.removeAttribute('title'); }
    const [head, ...rest] = el.dataset.tip.split('\n');
    hudTip.innerHTML = '<b></b><span></span>';
    hudTip.firstChild.textContent = head;
    hudTip.lastChild.textContent = rest.join('\n');
    hudTip.style.display = 'block';
    const r = el.getBoundingClientRect(), t = hudTip.getBoundingClientRect(), margin = 8;
    hudTip.style.left = `${Math.max(margin, Math.min(window.innerWidth - t.width - margin, r.left + r.width / 2 - t.width / 2))}px`;
    hudTip.style.top = `${r.top - t.height - margin > margin ? r.top - t.height - margin : r.bottom + margin}px`;
});
