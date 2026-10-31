// Dibujo que comparten la arena 3D y lo que queda en 2D (2026-10-28, sacado de towerPixelFx.js al separarse de
// Infinite Tower).
//   - withCtx: el canvas principal pasa a ser otro por un momento (todo lo que se dibuja usa la variable ctx). Con esto
//     los efectos del piso se dibujan sobre el piso 3D (match3d.js).
//   - NÚMEROS DE DAÑO: letra gruesa con contorno negro (s: el tamaño, en el grosor de la vieja fuente de píxeles).
function withCtx(c, fn) { const old = ctx; ctx = c; try { fn(); } finally { ctx = old; } }

function pxNumberText(text) { return /^[+-]?\d+!?$/.test(text); }
function pxDrawNumber(text, x, y, color, s) {
    ctx.font = `700 ${Math.round(s * 7)}px "Chakra Petch", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, s * 1.6); ctx.strokeStyle = '#14151a'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
}
