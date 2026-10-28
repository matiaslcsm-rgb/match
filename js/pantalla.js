// La pantalla de MATCH (2026-10-28, al separarse de Infinite Tower): el mapa de la arena entra entero, así que la vista
// 2D no se mueve (la cámara 3D está en js/m3d/match3d.js). Antes esto venía de los archivos de la Torre (towerView.js,
// tower.js), que tenían zoom y cámara que sigue al héroe.
const camera = { x: 0, y: 0 };
function viewCols() { return VIEW_COLS; }
function viewRows() { return VIEW_ROWS; }
function screenW() { return MAP_W; }
function screenH() { return MAP_H; }
// Tema de la interfaz en pixel art (paneles oscuros con borde de píxeles y fuente Tiny5, style.css): en todo menos la portada
function pxUiSync() { document.body.classList.toggle('pixel-ui', gameState !== 'MENU'); }
