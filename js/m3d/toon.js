// El look de MATCH (2026-10-31, decisión del usuario): dibujo animado en 3D, en vez del de PlayStation 1 que venía de
// arena-robots. Colores planos, luz en tres tramos (sin degradé) y contorno negro alrededor de cada pieza.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
const INK_BALL = ink('ball', `normalize(position) * ${LINE.toFixed(3)}`);
const INK_CYL = ink('cyl', `vec3(normalize(position.xz + vec2(0.0001)).x, sign(position.y), normalize(position.xz + vec2(0.0001)).y) * ${LINE.toFixed(3)}`);
export function outline(mesh) {
    const g = mesh.geometry;
    const kind = g.type === 'BoxGeometry' ? INK_BOX : g.type === 'CylinderGeometry' ? INK_CYL : g.type === 'SphereGeometry' ? INK_BALL : null;
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

// --- ONE MESH PER MATERIAL ---
// A robot has ~90 parts and each one is drawn twice (color and outline): ~170 draw calls per robot. bakeParts joins
// them into one skinned mesh per material plus one for all the outlines. Each part leaves an empty stand-in in its
// place, and the skeleton follows the stand-ins, so the animation does not change. Hidden parts are dropped.
// Returns part → stand-in, for whoever kept a reference to a part (the wheels). Joining takes ~30 ms, so robots with
// the same key (same pieces, same paint) share the joined geometry: a wave of drones of one kind joins it once.
const INK_FLAT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const PUSH = {
    box: (p, out) => out.set(Math.sign(p.x), Math.sign(p.y), Math.sign(p.z)),
    ball: (p, out) => out.copy(p).normalize(),
    cyl: (p, out) => { const x = p.x + 0.0001, z = p.z + 0.0001, l = Math.hypot(x, z); return out.set(x / l, Math.sign(p.y), z / l); }
};
// The outline copy inflated on the CPU, the same way the INK_* shaders do it
function inkGeometry(g, ink) {
    const push = PUSH[ink === INK_BOX ? 'box' : ink === INK_BALL ? 'ball' : 'cyl'], out = g.clone(), pos = out.attributes.position;
    const p = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        push(p.fromBufferAttribute(pos, i), d);
        pos.setXYZ(i, p.x + d.x * LINE, p.y + d.y * LINE, p.z + d.z * LINE);
    }
    return out;
}
function bindTo(g, bone) {
    const n = g.attributes.position.count, idx = new Uint16Array(n * 4), w = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { idx[i * 4] = bone; w[i * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(w, 4));
    return g;
}
const shown = (o, root) => { for (; o && o !== root; o = o.parent) if (!o.visible) return false; return true; };
const BAKED = new Map();
export function bakeParts(root, key) {
    const parts = [], stands = new Map(), bones = [], byMat = new Map(), lines = [], cached = BAKED.get(key);
    root.traverse(o => { if (o.isMesh && !o.parent.isMesh) parts.push(o); });
    for (const m of parts) {
        const stand = new THREE.Object3D();
        stand.position.copy(m.position); stand.quaternion.copy(m.quaternion); stand.scale.copy(m.scale);
        m.parent.add(stand); stands.set(m, stand);
        const visible = shown(m, root);
        m.parent.remove(m);
        if (!visible) continue;
        const bone = bones.push(stand) - 1;
        if (cached) continue;
        if (!byMat.has(m.material)) byMat.set(m.material, []);
        byMat.get(m.material).push(bindTo(m.geometry.clone(), bone));
        const line = m.children.find(c => c.isMesh);
        if (line) lines.push(bindTo(inkGeometry(m.geometry, line.material), bone));
    }
    const skeleton = new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4()));
    const joined = cached || [...byMat].map(([material, geos]) => [material, mergeGeometries(geos)]);
    if (!cached && lines.length) joined.push([INK_FLAT, mergeGeometries(lines)]);
    if (!cached && key !== undefined) BAKED.set(key, joined);
    joined.forEach(([material, geometry]) => {
        const s = new THREE.SkinnedMesh(geometry, material);
        s.bind(skeleton, new THREE.Matrix4());
        s.frustumCulled = false; // its bounds would be measured standing still
        root.add(s);
    });
    root.userData.skeleton = skeleton;
    return stands;
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
    const P = { craneo: '#e9dfc2', gris: '#8a97a8', oliva: '#7f9a4a', hueso: '#f2ecdc', nar: '#ff8420', ama: '#ffc61a', carbon: '#3b4250', metal: '#b9c3cf',
        hierro: '#565f6e', junta: '#2f3540', cobre: '#c8763e', cableR: '#e0433a', cableV: '#46b04a', cableA: '#3a6fe0' }; // hierro, junta y cobre: el esqueleto
    let m;
    if (name === 'peligro') m = surface({ map: hazard() });
    else if (name === 'oruga') m = surface({ map: tread() });
    else if (name === 'lente') m = new THREE.MeshBasicMaterial({ color: '#3cd8f0' });            // brilla: no le afecta la luz
    else m = surface({ color: P[name] });
    return (MATS[name] = m);
}
