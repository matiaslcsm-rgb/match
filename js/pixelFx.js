// Dibujo en pixel art que comparten la arena 3D y lo que queda en 2D (2026-10-28, sacado de towerPixelFx.js al
// separarse de Infinite Tower).
//   - withCtx: el canvas principal pasa a ser otro por un momento (todo lo que se dibuja usa la variable ctx). Con esto
//     los efectos del piso se dibujan sobre el piso 3D (match3d.js).
//   - NÚMEROS DE DAÑO con una fuente de píxeles de 3×5 (las palabras siguen en letra común).
function withCtx(c, fn) { const old = ctx; ctx = c; try { fn(); } finally { ctx = old; } }

const PX_DIGITS = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111',
    6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', '+': '000010111010000', '-': '000000111000000', '!': '010010010000010' };
function pxNumberText(text) { return /^[+-]?\d+!?$/.test(text); }
function pxDrawNumber(text, x, y, color, s) {
    const chars = [...text], width = chars.length * 4 - 1, x0 = Math.round(x - width * s / 2), y0 = Math.round(y - 2.5 * s);
    const each = fn => chars.forEach((ch, i) => { const g = PX_DIGITS[ch]; if (g) for (let k = 0; k < 15; k++) if (g[k] === '1') fn(x0 + (i * 4 + k % 3) * s, y0 + Math.floor(k / 3) * s); });
    ctx.fillStyle = '#120c0a'; each((px, py) => ctx.fillRect(px - s, py - s, s * 3, s * 3)); // contorno
    ctx.fillStyle = color; each((px, py) => ctx.fillRect(px, py, s, s));
}
