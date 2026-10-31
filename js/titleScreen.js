// Portada de MATCH (2026-10-28, al separarse de Infinite Tower; dibujo animado desde el 2026-10-31): el estadio del show de
// noche detrás del nombre del juego. Cielo, ciudad con ventanas que titilan, el estadio con su pantalla gigante, reflectores
// que barren el cielo y adelante los competidores. Lo fijo se arma una vez por tamaño; lo animado, en cada cuadro. Solo corre
// en el menú (body.on-title).

const tsCanvas = document.getElementById('title-canvas'), tsg = tsCanvas.getContext('2d');
let tsStatic = null, tsW = 0, tsH = 0, tsLast = 0, tsT = 0, tsWindows = [], tsCrowd = [], tsStadium = null;
function tsHash(x, y, s = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }

// Lo fijo: cielo, ciudad, estadio y piso
function tsBuild(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), hy = Math.round(h * 0.62), sb = Math.round(h * 0.8), ink = '#14151a';
    const sky = g.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, '#141a33'); sky.addColorStop(0.6, '#3a2a55'); sky.addColorStop(1, '#c8603a');
    g.fillStyle = sky; g.fillRect(0, 0, w, hy);
    // La ciudad: edificios de alturas distintas con ventanas
    tsWindows = [];
    for (let x = 0; x < w;) {
        const bw = 44 + Math.round(tsHash(x, 1, 3) * 80), bh = Math.round(h * (0.12 + tsHash(x, 2, 3) * 0.24)), top = hy - bh;
        g.fillStyle = tsHash(x, 3, 3) < 0.5 ? '#1b1f38' : '#232746'; g.fillRect(x, top, bw, bh + 6);
        for (let wy = top + 12; wy < hy - 8; wy += 20) for (let wx = x + 9; wx < x + bw - 12; wx += 16) if (tsHash(wx, wy, 5) < 0.4) tsWindows.push({ x: wx, y: wy, ph: tsHash(wx, wy, 6) * 6, c: tsHash(wx, wy, 7) < 0.7 ? '#ffc861' : '#ff9a2e' });
        x += bw + Math.round(tsHash(x, 4, 3) * 14);
    }
    // El piso de afuera
    const floor = g.createLinearGradient(0, hy, 0, h);
    floor.addColorStop(0, '#2a2d44'); floor.addColorStop(1, '#14162a');
    g.fillStyle = floor; g.fillRect(0, hy, w, h - hy);
    // El estadio: las gradas, la pantalla gigante arriba y las torres de luz
    const sx = Math.round(w / 2), sw = Math.round(w * 0.62), sh = Math.round(h * 0.2);
    const towers = [-0.5, 0.5].map(k => sx + Math.round(k * sw * 1.02)), lampY = Math.round(h * 0.22);
    towers.forEach(tx => { g.fillStyle = ink; g.fillRect(tx - 5, lampY, 10, sb - lampY); g.fillStyle = '#5b6680'; g.fillRect(tx - 2, lampY, 4, sb - lampY); });
    g.beginPath(); g.moveTo(sx - sw / 2, sb); g.lineTo(sx - sw / 2, sb - sh * 0.45);
    g.quadraticCurveTo(sx - sw / 2, sb - sh, sx - sw * 0.28, sb - sh); g.lineTo(sx + sw * 0.28, sb - sh);
    g.quadraticCurveTo(sx + sw / 2, sb - sh, sx + sw / 2, sb - sh * 0.45); g.lineTo(sx + sw / 2, sb); g.closePath();
    g.fillStyle = '#39415c'; g.fill(); g.lineWidth = 5; g.strokeStyle = ink; g.stroke();
    g.save(); g.clip();
    g.strokeStyle = '#242a40'; g.lineWidth = 4;
    for (let y = sb - 10; y > sb - sh; y -= 24) { g.beginPath(); g.moveTo(sx - sw / 2, y); g.lineTo(sx + sw / 2, y); g.stroke(); }
    g.fillStyle = '#ffc61a'; g.fillRect(sx - sw / 2, sb - 14, sw, 14);
    g.fillStyle = ink; for (let x = sx - sw / 2 - 14; x < sx + sw / 2; x += 34) { g.beginPath(); g.moveTo(x, sb); g.lineTo(x + 14, sb - 14); g.lineTo(x + 28, sb - 14); g.lineTo(x + 14, sb); g.closePath(); g.fill(); }
    g.restore();
    tsCrowd = [];
    for (let y = sb - 26; y > sb - sh + 8; y -= 24) for (let x = sx - sw / 2 + 18; x < sx + sw / 2 - 18; x += 15) tsCrowd.push([x + tsHash(x, y, 2) * 6, y]);
    const scrW = Math.round(sw * 0.3), scrH = Math.round(sh * 0.62), scrY = sb - sh - scrH - 18, scrX = sx - Math.floor(scrW / 2);
    g.fillStyle = ink; g.fillRect(scrX + scrW * 0.18, scrY + scrH, 10, 26); g.fillRect(scrX + scrW * 0.82 - 10, scrY + scrH, 10, 26);
    g.fillRect(scrX - 6, scrY - 6, scrW + 12, scrH + 12);
    tsStadium = { base: sb, scr: { x: scrX, y: scrY, w: scrW, h: scrH }, towers, lampY };
    return c;
}

// Lo animado
function tsFrame(now) {
    requestAnimationFrame(tsFrame);
    if (!document.body.classList.contains('on-title')) { tsLast = now; return; }
    const dt = Math.min(0.1, (now - tsLast) / 1000 || 0); tsLast = now; tsT += dt;
    const w = window.innerWidth, h = window.innerHeight;
    if (w !== tsW || h !== tsH || !tsStatic) { tsW = w; tsH = h; tsCanvas.width = w; tsCanvas.height = h; tsStatic = tsBuild(w, h); }
    const g = tsg, S = tsStadium;
    g.drawImage(tsStatic, 0, 0);
    tsWindows.forEach(wn => { if (Math.sin(tsT * 0.7 + wn.ph) > -0.6) { g.fillStyle = wn.c; g.fillRect(wn.x, wn.y, 7, 9); } });
    // Reflectores: haces que barren el cielo desde las torres de luz
    S.towers.forEach((tx, i) => {
        const a = -Math.PI / 2 + Math.sin(tsT * 0.45 + i * 2.2) * 0.55, len = h * 0.9, half = 0.09;
        const beam = g.createLinearGradient(tx, S.lampY, tx + Math.cos(a) * len, S.lampY + Math.sin(a) * len);
        beam.addColorStop(0, 'rgba(235,240,255,0.42)'); beam.addColorStop(1, 'rgba(235,240,255,0)');
        g.fillStyle = beam; g.beginPath(); g.moveTo(tx, S.lampY);
        g.lineTo(tx + Math.cos(a - half) * len, S.lampY + Math.sin(a - half) * len); g.lineTo(tx + Math.cos(a + half) * len, S.lampY + Math.sin(a + half) * len); g.fill();
        g.fillStyle = '#fff4c8'; g.fillRect(tx - 18, S.lampY - 7, 36, 12);
    });
    // El público: cabezas que se paran y aplauden
    tsCrowd.forEach(([x, y], i) => { const k = tsHash(i, Math.floor(tsT * 5), 3); g.fillStyle = ['#e9e0c8', '#ff9a2e', '#ffc61a', '#7fc06a', '#7da4e8'][i % 5]; g.beginPath(); g.arc(x, y - (k < 0.12 ? 4 : 0), 4, 0, 7); g.fill(); });
    // La pantalla gigante: "MATCH" con barrido y la luz de "en vivo"
    const sc = S.scr;
    g.fillStyle = '#0d2733'; g.fillRect(sc.x, sc.y, sc.w, sc.h);
    g.fillStyle = 'rgba(0,245,212,0.16)'; g.fillRect(sc.x, sc.y + (tsT * 60) % sc.h, sc.w, 8);
    g.font = `700 ${Math.round(sc.h * 0.56)}px "Chakra Petch", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff9a2e';
    g.fillText('MATCH', sc.x + sc.w / 2, sc.y + sc.h / 2);
    if (Math.floor(tsT * 1.6) % 2) { g.fillStyle = '#ff2a2a'; g.beginPath(); g.arc(sc.x + 12, sc.y + 12, 5, 0, 7); g.fill(); }
    // Los competidores, adelante
    const heroes = ['CRANE', 'ZEUS', 'REC', 'FROSTWITCH', 'VECTOR'].map(k => portraitImg(`hero:${k}:full`, { isHero: true, key: k }, true)).filter(Boolean);
    const gy = S.base + Math.round((h - S.base) * 0.62), step = Math.round(w * 0.075), size = Math.round(h * 0.27);
    heroes.forEach((im, i) => {
        const x = Math.round(w / 2 + (i - (heroes.length - 1) / 2) * step), bob = Math.sin(tsT * 3 + i) * 2;
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x, gy, size * 0.26, 7, 0, 0, 7); g.fill();
        g.drawImage(im, x - size / 2, gy - size + bob, size, size);
    });
}
// El dibujito de la tarjeta
function tsCardArt() {
    const urls = ['CRANE', 'VECTOR', 'ZEUS', 'FROSTWITCH'].map(k => heroSpriteUrl({ key: k })).filter(Boolean);
    document.getElementById('ts-art-normal').innerHTML = urls.map(u => `<img src="${u}" style="width:74px;height:74px">`).join('');
}
tsCardArt();
requestAnimationFrame(tsFrame);

// --- MENÚ PREVIO (2026-10-13) ---
// Tocar la tarjeta abre el menú: de qué se trata, cómo es una partida, Jugar, el Tutorial y el glosario. La primera vez
// viene marcado "ver el tutorial antes de jugar": al terminarlo con "¡A jugar!", arranca la partida.
const tsImg = (c, s) => `<img src="${c.toDataURL()}" style="width:${c.width * s}px;height:${c.height * s}px">`;
const TS_LOBBY = {
    normal: { title: '⚔ MATCH', tag: 'arena · 11 competidores', cls: '',
        desc: 'Sos uno de 8 competidores en el show. Armás tu kit mezclando habilidades de cualquiera, peleás oleadas de robots, duelos y jefes, y gana el último en pie.',
        facts: () => ['🎲 Elegís entre 3 competidores (o cualquiera, arrancando sin oro)', '🃏 Rondas 1 a 4: draft de habilidad, tienda y oleada', '⚔ Desde la ronda 5: un duelo por ronda, con apuestas', '👑 Rondas 5, 10, 15 y 20: un jefe para cada uno', '♥ 2 vidas: se pierden contra creeps y jefes'],
        art: () => ['CRANE', 'VAMPIRE', 'REC', 'ZEUS', 'NECROMANCER'].map(k => heroSpriteUrl({ key: k })).filter(Boolean).map(u => `<img src="${u}" style="width:70px;height:70px">`).join(''),
        extra: () => [['🦸 Héroes', () => openGlossary('heroes')], ['👹 Creeps y jefes', () => openGlossary('creeps')], ['🎒 Ítems', () => openGlossary('items')]] }
};
let tsLobbyMode = null;
function openLobby(mode) {
    const L = TS_LOBBY[mode], box = document.getElementById('ts-lobby'), first = !tutorialSeen(mode);
    tsLobbyMode = mode;
    box.className = 'ts-lobby ' + L.cls;
    box.innerHTML = `<div class="ts-lobby-art">${L.art()}</div>
        <h2>${L.title}</h2><em>${L.tag}</em><p class="ts-lobby-desc">${L.desc}</p>
        <ul class="ts-facts">${L.facts().map(f => `<li>${f}</li>`).join('')}</ul>
        ${chProfileSummary() ? `<div class="ts-records">${chProfileSummary()}<br><small>Mejor puesto: ${chProfileHeroesHtml()}</small></div>` : ''}
        <div class="ts-lobby-actions"><button class="ts-play">▶ Jugar</button><button class="ts-tut secondary-btn">📖 Tutorial</button>
            ${L.extra().map((x, i) => `<button class="secondary-btn" data-extra="${i}">${x[0]}</button>`).join('')}</div>
        <label class="ts-first"><input type="checkbox" id="ts-tut-first"${first ? ' checked' : ''}> Ver el tutorial antes de jugar</label>
        <button class="ts-back secondary-btn">← Volver</button>`;
    box.querySelector('.ts-play').onclick = () => lobbyPlay(mode);
    box.querySelector('.ts-tut').onclick = () => openTutorial(0, mode);
    box.querySelector('.ts-back').onclick = closeLobby;
    const extras = L.extra();
    box.querySelectorAll('[data-extra]').forEach(b => { b.onclick = () => extras[Number(b.dataset.extra)][1](); });
    document.getElementById('title-screen').classList.add('lobby-open');
}
function closeLobby() { tsLobbyMode = null; document.getElementById('title-screen').classList.remove('lobby-open'); }
function lobbyPlay(mode) {
    const start = () => { closeLobby(); startHeroPick(); };
    const cb = document.getElementById('ts-tut-first');
    if (cb && cb.checked) openTutorial(0, mode, start); else start();
}
document.querySelectorAll('[data-lobby]').forEach(card => { card.onclick = () => openLobby(card.dataset.lobby); });
window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tsLobbyMode && document.body.classList.contains('on-title') && document.getElementById('tutorial').style.display !== 'flex') closeLobby();
});
