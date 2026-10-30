// Portada de MATCH (2026-10-28, al separarse de Infinite Tower; antes era la portada de los dos juegos, con el coliseo y
// la torre): el estadio del show de noche, en pixel art animado, detrás del nombre del juego.
//
//   Cielo nocturno con tramado, la ciudad de fondo con ventanas que titilan, el estadio industrial (gradas con el público
//   que se mueve, la pantalla gigante con el logo, vallas con franjas de peligro), reflectores que barren el cielo, la
//   luz roja de "en vivo" y adelante los competidores esperando. La escena se dibuja en una imagen chica (1 píxel = 2 a
//   5 píxeles de la pantalla, según el alto) que el CSS agranda sin suavizar. Lo fijo se arma una vez por tamaño; lo
//   animado, en cada cuadro. Solo corre en el menú (body.on-title).

const TS = { sky: ['#080a08', '#10130f', '#1a1e18', '#2a2d24', '#4a4030', '#7a5530'], steel: ['#0e100e', '#191c18', '#262a24', '#353b32', '#4a5145'] };
const tsCanvas = document.getElementById('title-canvas'), tsg = tsCanvas.getContext('2d');
let tsStatic = null, tsW = 0, tsH = 0, tsLast = 0, tsT = 0, tsWindows = [], tsCrowd = [], tsStadium = null;
const TS_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16); // tramado ordenado 4×4
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function tsBayer(x, y) { return TS_BAYER[(y & 3) * 4 + (x & 3)]; }
function tsHash(x, y, s = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
function tsNoise(x, y, s = 0) { // ruido suave (valor interpolado)
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = tsHash(xi, yi, s), b = tsHash(xi + 1, yi, s), c = tsHash(xi, yi + 1, s), d = tsHash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Lo fijo: cielo, ciudad, estadio y piso
function tsBuild(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    const hy = Math.round(h * 0.62), gy = Math.round(h * 0.8), sky = TS.sky.map(hexRgb), steel = TS.steel.map(hexRgb);
    const put = (x, y, rgb) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const o = (y * w + x) * 4; d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // cielo: más claro abajo (la ciudad lo ilumina); abajo, la explanada
        if (y >= hy) { put(x, y, hexRgb(tsNoise(x / 10, y / 4, 5) > 0.6 ? '#171a16' : '#121410')); continue; }
        const f = y / hy * (sky.length - 1), lo = Math.floor(f);
        put(x, y, sky[Math.min(sky.length - 1, lo + (f - lo > tsBayer(x, y) ? 1 : 0))]);
    }
    // La ciudad: edificios de alturas distintas con ventanas
    tsWindows = [];
    for (let x = 0; x < w;) {
        const bw = 6 + Math.round(tsHash(x, 1, 3) * 12), bh = Math.round(h * (0.12 + tsHash(x, 2, 3) * 0.22)), top = hy - bh;
        for (let xx = x; xx < Math.min(w, x + bw); xx++) for (let y = top; y < hy + 6; y++) put(xx, y, hexRgb(xx === x ? '#141713' : '#0c0e0c'));
        for (let wy = top + 3; wy < hy; wy += 4) for (let wx = x + 2; wx < x + bw - 1; wx += 3) if (tsHash(wx, wy, 5) < 0.35) tsWindows.push({ x: wx, y: wy, ph: tsHash(wx, wy, 6) * 6, c: tsHash(wx, wy, 7) < 0.7 ? '#ffb347' : '#ff9a2e' });
        x += bw + Math.round(tsHash(x, 4, 3) * 3);
    }
    // El estadio: gradas en anillo (una elipse vista de costado), la pantalla gigante arriba y las torres de luz
    const sx = Math.round(w / 2), sw = Math.round(w * 0.62), sh = Math.round(h * 0.2), sb = gy;
    tsCrowd = [];
    for (let x = -Math.floor(sw / 2); x <= Math.floor(sw / 2); x++) {
        const nx = x / (sw / 2), top = sb - Math.round(sh * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(nx), 4))));
        for (let y = top; y < sb; y++) {
            const ty = sb - 1 - y, band = ty % 6;
            let col = steel[nx < -0.5 ? 3 : nx > 0.55 ? 1 : 2];
            if (y === top) col = steel[4];
            else if (band === 5) col = steel[4]; // baranda de cada grada
            else if (band >= 2 && band <= 3 && Math.abs(nx) < 0.95) { col = steel[0]; if (y < sb - 3) tsCrowd.push([sx + x, y]); } // fila de público
            put(sx + x, y, col);
        }
        // franja de peligro abajo
        for (let y = sb - 3; y < sb; y++) put(sx + x, y, hexRgb(((x + y) >> 1) % 2 ? '#f2c230' : '#151714'));
    }
    const scrW = Math.round(sw * 0.3), scrH = Math.round(sh * 0.55), scrY = sb - sh - scrH - 4;
    for (let y = scrY - 1; y <= scrY + scrH; y++) for (let x = -Math.floor(scrW / 2) - 1; x <= Math.floor(scrW / 2) + 1; x++) put(sx + x, y, steel[y === scrY - 1 || y === scrY + scrH || Math.abs(x) > scrW / 2 ? 4 : 0]);
    for (let y = scrY + scrH; y < sb - sh + 2; y++) { put(sx - Math.floor(scrW / 3), y, steel[3]); put(sx + Math.floor(scrW / 3), y, steel[3]); } // patas de la pantalla
    const towers = [-0.5, 0.5].map(k => sx + Math.round(k * sw * 1.02));
    towers.forEach(tx => { for (let y = Math.round(h * 0.22); y < sb; y++) { put(tx, y, steel[3]); put(tx + 1, y, steel[1]); } });
    tsStadium = { x: sx, w: sw, h: sh, base: sb, scr: { x: sx - Math.floor(scrW / 2), y: scrY, w: scrW, h: scrH }, towers, lampY: Math.round(h * 0.22) };
    // El piso de afuera: asfalto con charcos que reflejan
    for (let y = sb; y < h; y++) for (let x = 0; x < w; x++) {
        const v = tsNoise(x / 14, y / 5, 2), wet = tsNoise(x / 9, y / 3, 8) > 0.68;
        put(x, y, hexRgb(wet ? '#1a2030' : v > 0.55 ? '#16181e' : '#121318'));
    }
    g.putImageData(img, 0, 0);
    return c;
}

// Lo animado
function tsFrame(now) {
    requestAnimationFrame(tsFrame);
    if (!document.body.classList.contains('on-title')) { tsLast = now; return; }
    const dt = Math.min(0.1, (now - tsLast) / 1000 || 0); tsLast = now; tsT += dt;
    const s = Math.max(2, Math.round(window.innerHeight / 210)), w = Math.ceil(window.innerWidth / s), h = Math.ceil(window.innerHeight / s);
    if (w !== tsW || h !== tsH || !tsStatic) { tsW = w; tsH = h; tsCanvas.width = w; tsCanvas.height = h; tsStatic = tsBuild(w, h); }
    const g = tsg, S = tsStadium; g.imageSmoothingEnabled = false;
    g.drawImage(tsStatic, 0, 0);
    tsWindows.forEach(wn => { if (Math.sin(tsT * 0.7 + wn.ph) > -0.6) { g.fillStyle = wn.c; g.fillRect(wn.x, wn.y, 1, 1); } });
    // Reflectores: haces que barren el cielo desde las torres de luz (con tramado)
    S.towers.forEach((tx, i) => {
        const a = -Math.PI / 2 + Math.sin(tsT * 0.45 + i * 2.2) * 0.55, len = h * 0.9;
        for (let k = 4; k < len; k += 1) {
            const half = k * 0.09, cx = tx + Math.cos(a) * k, cy = S.lampY + Math.sin(a) * k, alpha = 0.5 * (1 - k / len);
            for (let o = -half; o <= half; o++) {
                const px = Math.round(cx - Math.sin(a) * o), py = Math.round(cy + Math.cos(a) * o);
                if (alpha * (1 - Math.abs(o) / (half + 1)) > tsBayer(px, py) * 0.9) { g.fillStyle = 'rgba(220,235,255,0.22)'; g.fillRect(px, py, 1, 1); }
            }
        }
        g.fillStyle = '#fff4c8'; g.fillRect(tx - 1, S.lampY - 1, 4, 2);
    });
    // El público: puntitos que titilan (se paran, aplauden)
    tsCrowd.forEach(([x, y], i) => { const k = tsHash(i, Math.floor(tsT * 5), 3); if (k < 0.42) { g.fillStyle = ['#d8d2bc', '#ff9a2e', '#f2c230', '#8aa05a', '#a3a595'][Math.floor(k * 13) % 5]; g.fillRect(x, y - (k < 0.06 ? 1 : 0), 1, 1); } });
    // La pantalla gigante: "MATCH" con barrido y la luz de "en vivo"
    const sc = S.scr;
    g.fillStyle = '#0a1a22'; g.fillRect(sc.x, sc.y, sc.w, sc.h);
    const scan = Math.floor(tsT * 18) % (sc.h + 6);
    g.fillStyle = 'rgba(0,245,212,0.18)'; g.fillRect(sc.x, sc.y + scan - 3, sc.w, 2);
    tsDrawWord(g, 'MATCH', sc.x + sc.w / 2, sc.y + sc.h / 2, Math.max(1, Math.floor(sc.h / 9)), '#ff9a2e');
    if (Math.floor(tsT * 1.6) % 2) { g.fillStyle = '#ff2a2a'; g.fillRect(sc.x + 2, sc.y + 2, 2, 2); }
    // Los competidores, adelante, mirando al estadio
    const heroes = ['AXE', 'ZEUS', 'REC', 'FROSTWITCH', 'ASSASSIN'].map(k => spriteFor({ isHero: true, key: k })).filter(Boolean);
    const gy = S.base + Math.round((h - S.base) * 0.55), step = Math.round(w * 0.07);
    heroes.forEach((sp, i) => {
        const x = Math.round(w / 2 + (i - (heroes.length - 1) / 2) * step), bob = Math.round(Math.sin(tsT * 3 + i) * 0.6), im = sp.img;
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x - 5, gy, 10, 1);
        g.drawImage(im, x - im.width / 2, gy - im.height + bob);
    });
}
// Letras de píxel de 3×5 para la pantalla (solo las de MATCH)
const TS_FONT = { M: '101111111101101', A: '010101111101101', T: '111010010010010', C: '011100100100011', H: '101101111101101' };
function tsDrawWord(g, word, cx, cy, s, color) {
    const x0 = Math.round(cx - (word.length * 4 - 1) * s / 2), y0 = Math.round(cy - 2.5 * s);
    g.fillStyle = color;
    [...word].forEach((ch, i) => { const f = TS_FONT[ch]; if (f) for (let k = 0; k < 15; k++) if (f[k] === '1') g.fillRect(x0 + (i * 4 + k % 3) * s, y0 + Math.floor(k / 3) * s, s, s); });
}
// El dibujito de la tarjeta
function tsCardArt() {
    const img = (src, scale) => `<img src="${src.toDataURL()}" style="width:${src.width * scale}px;height:${src.height * scale}px">`;
    const heroes = ['AXE', 'ASSASSIN', 'ZEUS', 'FROSTWITCH'].map(k => spriteFor({ isHero: true, key: k })).filter(Boolean);
    document.getElementById('ts-art-normal').innerHTML = heroes.map(s => img(s.img, 1.6)).join('');
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
        art: () => ['AXE', 'VAMPIRE', 'REC', 'ZEUS', 'NECROMANCER'].map(k => spriteFor({ isHero: true, key: k })).filter(Boolean).map(s => tsImg(s.img, 2.2)).join(''),
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
