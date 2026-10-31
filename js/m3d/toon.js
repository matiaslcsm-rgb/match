// El look de MATCH (2026-10-31, decisión del usuario): dibujo animado en 3D, en vez del de PlayStation 1 que venía de
// arena-robots. Colores planos, luz en tres tramos (sin degradé) y contorno negro alrededor de cada pieza.
import * as THREE from 'three';

export function makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    return r;
}

// Los tres tramos de luz: sombra, medio y claro
const steps = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.RedFormat);
steps.magFilter = steps.minFilter = THREE.NearestFilter; steps.needsUpdate = true;
export function surface(opts) { return new THREE.MeshToonMaterial({ gradientMap: steps, ...opts }); }

// --- CONTORNO ---
// Una copia de la pieza apenas más grande, en negro y vista por dentro: asoma como una línea alrededor. La copia se infla
// empujando cada punto hacia afuera, en caja o en cilindro según la pieza, para que el grosor sea parejo y no se abra en las puntas.
const INK = '#14151a', LINE = 0.03, MIN_SIZE = 0.05;
function ink(key, push) {
    const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + ${push};`); };
    m.customProgramCacheKey = () => key;
    return m;
}
const INK_BOX = ink('box', `sign(position) * ${LINE.toFixed(3)}`);
const INK_CYL = ink('cyl', `vec3(normalize(position.xz + vec2(0.0001)).x, sign(position.y), normalize(position.xz + vec2(0.0001)).y) * ${LINE.toFixed(3)}`);
export function outline(mesh) {
    const g = mesh.geometry;
    const kind = g.type === 'BoxGeometry' ? INK_BOX : g.type === 'CylinderGeometry' ? INK_CYL : null;
    if (!kind) return mesh;
    if (!g.boundingBox) g.computeBoundingBox();
    const size = g.boundingBox.getSize(new THREE.Vector3());
    if (Math.min(size.x, size.y, size.z) < MIN_SIZE) return mesh; // los detalles finos, sin línea: quedarían todos negros
    mesh.add(new THREE.Mesh(g, kind));
    return mesh;
}
export function outlineAll(group) {
    const meshes = [];
    group.traverse(o => { if (o.isMesh && !o.isInstancedMesh) meshes.push(o); });
    meshes.forEach(outline);
}

// --- TEXTURAS hechas en código ---
function canvasTex(size, paint, repeat = 1) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    paint(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4;
    return t;
}
function hazard() {
    return canvasTex(128, (g, n) => {
        g.fillStyle = '#ffc61a'; g.fillRect(0, 0, n, n);
        g.strokeStyle = '#1b1c20'; g.lineWidth = n / 4; g.lineCap = 'square';
        for (let i = -1; i <= 2; i++) { g.beginPath(); g.moveTo(i * n / 2 - n / 2, n + n / 2); g.lineTo(i * n / 2 + n, -n / 2); g.stroke(); }
    }, 2);
}
function tread() {
    return canvasTex(64, (g, n) => {
        g.fillStyle = '#2a2c33'; g.fillRect(0, 0, n, n);
        g.fillStyle = '#50545e'; for (let y = 0; y < n; y += n / 4) g.fillRect(0, y, n, n / 8);
    });
}
// El piso de la arena: baldosas limpias con junta marcada y una seña amarilla
export function floorTex(repeat) {
    return canvasTex(256, (g, n) => {
        g.fillStyle = '#c9d0d8'; g.fillRect(0, 0, n, n);
        g.fillStyle = '#d6dce3'; g.fillRect(0, 0, n / 2, n / 2); g.fillRect(n / 2, n / 2, n / 2, n / 2);
        g.fillStyle = '#8f98a3'; g.fillRect(0, 0, n, 4); g.fillRect(0, 0, 4, n); g.fillRect(0, n / 2, n, 2); g.fillRect(n / 2, 0, 2, n);
        g.fillStyle = '#ffc61a'; g.fillRect(n - 26, 18, 8, 34);
    }, repeat);
}
export function wallTex() {
    return canvasTex(128, (g, n) => {
        g.fillStyle = '#6f8096'; g.fillRect(0, 0, n, n);
        g.fillStyle = '#4e5c70'; g.fillRect(0, 0, n, 5); g.fillRect(0, 0, 5, n); g.fillRect(0, n / 2, n, 3);
    });
}

// Los materiales de las piezas (uno por nombre, compartidos)
const MATS = {};
export function mat(name) {
    if (MATS[name]) return MATS[name];
    const P = { gris: '#8a97a8', oliva: '#7f9a4a', hueso: '#f2ecdc', nar: '#ff8420', ama: '#ffc61a', carbon: '#3b4250', metal: '#b9c3cf',
        hierro: '#565f6e', junta: '#2f3540', cobre: '#c8763e', cableR: '#e0433a', cableV: '#46b04a', cableA: '#3a6fe0' }; // hierro, junta y cobre: el esqueleto
    let m;
    if (name === 'peligro') m = surface({ map: hazard() });
    else if (name === 'oruga') m = surface({ map: tread() });
    else if (name === 'lente') m = new THREE.MeshBasicMaterial({ color: '#3cd8f0' });            // brilla: no le afecta la luz
    else m = surface({ color: P[name] });
    return (MATS[name] = m);
}
