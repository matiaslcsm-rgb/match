// Los robots de los jefes de ronda (2026-10-28, roadmap de MATCH, fase 1): cada jefe con su armado, su pintura, el
// brillo de sus ojos y piezas que solo tiene él, que dicen qué hace (la Prensa pisa fuerte, la Reina larga enjambres,
// la Hidra tiene tres cabezas...). Lo usa match3d.js; las reglas de cada jefe están en js/data/bosses.js.
//
// extras: formas como las de las piezas (parts.js), pegadas a un hueso con su lado (headL no existe: la cabeza, el
// pecho, la columna y la pelvis van sin lado; brazos y piernas con L o R). m: un material de ps1.js o 'glow' (brilla
// del color del jefe). both() hace la del lado izquierdo y su espejo del derecho.
import * as THREE from 'three';
import { mat } from './ps1.js';

const LIMBS = ['shoulder', 'upperArm', 'forearm', 'hand', 'thigh', 'shin', 'foot'];
const both = s => { const side = k => LIMBS.includes(s.b) ? s.b + k : s.b; // en el pecho o la cabeza: el mismo hueso, del otro lado
    return [{ ...s, b: side('L') }, { ...s, b: side('R'), p: [-s.p[0], s.p[1], s.p[2]], r: s.r && [s.r[0], -s.r[1], -s.r[2]] }]; };
const box = (b, s, p, m, r) => ({ t: 'box', b, s, p, m, r });
const cyl = (b, rad, h, p, m, r) => ({ t: 'cyl', b, rad, h, p, m, r });

export const BOSS_ROBOTS = {
    // Gólem Ancestral → "La Prensa": orugas, hombros de bloque y puños enormes (pisa y aturde)
    GOLEM: {
        build: { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'pinza', armR: 'pinza' }, paint: '#a3a8ad', glow: '#ffb703',
        extras: [
            ...both(box('shoulder', [0.5, 0.45, 0.55], [0.15, 0.25, 0], 'gris')),
            ...both(box('hand', [0.36, 0.36, 0.36], [0, -0.16, 0], 'carbon')),
            ...both(cyl('chest', 0.08, 0.6, [0.2, 0.75, -0.38], 'metal')),                   // los caños de escape
            box('head', [0.32, 0.06, 0.02], [0, 0.18, 0.23], 'glow')
        ]
    },
    // Reina de la Colmena: panales en la espalda, antenas y el abdomen de la colmena
    HIVE_QUEEN: {
        build: { legs: 'bipedo', core: 'estandar', head: 'sensor', armL: 'ametralladora', armR: 'ametralladora' }, paint: '#b5e48c', glow: '#e9ff70',
        extras: [
            ...[[-0.15, 0.15], [0.15, 0.15], [0, 0.3], [-0.15, 0.45], [0.15, 0.45], [0, 0.6]].map(([x, y]) => cyl('chest', 0.1, 0.12, [x, y, -0.42], 'ama', [Math.PI / 2, 0, 0])),
            ...both(box('head', [0.03, 0.45, 0.03], [0.1, 0.48, 0.04], 'metal', [0.3, 0, -0.3])),
            ...both(box('head', [0.07, 0.07, 0.07], [0.17, 0.7, 0.11], 'glow')),
            box('pelvis', [0.45, 0.4, 0.6], [0, -0.05, -0.45], 'oliva', [0.4, 0, 0]),            // el abdomen
            box('pelvis', [0.47, 0.08, 0.62], [0, 0.0, -0.45], 'peligro', [0.4, 0, 0])
        ]
    },
    // Dragón de Escarcha: mandíbula, aletas en la espalda, alas de chapa y una cola de cuatro tramos
    FROST_DRAGON: {
        build: { legs: 'bipedo', core: 'pesado', head: 'camara', armL: 'pinza', armR: 'canon' }, paint: '#9ad8e8', glow: '#d8fbff',
        extras: [
            box('head', [0.24, 0.08, 0.3], [0, 0.03, 0.3], 'carbon'),                         // la mandíbula
            ...[0.1, 0.3, 0.5].map(y => box('chest', [0.04, 0.26, 0.22], [0, y, -0.42], 'metal')),
            ...both(box('chest', [0.85, 0.04, 0.5], [0.55, 0.6, -0.3], 'hueso', [0.3, 0, 0.45])), // las alas
            ...[[-0.35, -0.05, 0.3], [-0.7, -0.22, 0.25], [-1.0, -0.4, 0.2], [-1.25, -0.58, 0.15]].map(([z, y, w]) => box('pelvis', [w, w, 0.38], [0, y, z], 'hueso')),
            box('head', [0.2, 0.05, 0.02], [0, 0.22, 0.42], 'glow')
        ]
    },
    // Señor del Abismo: cuernos, púas en los hombros y un reactor que brilla en el pecho (se enfurece)
    ABYSS_LORD: {
        build: { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'canon', armR: 'pinza' }, paint: '#8a3a3a', glow: '#ff7a1a',
        extras: [
            ...both(box('head', [0.06, 0.38, 0.06], [0.15, 0.42, 0], 'carbon', [0, 0, -0.5])),
            ...both(box('shoulder', [0.08, 0.42, 0.08], [0.12, 0.38, 0], 'carbon', [0, 0, -0.45])),
            box('chest', [0.24, 0.24, 0.06], [0, 0.3, 0.3], 'glow'),
            box('head', [0.36, 0.05, 0.02], [0, 0.2, 0.235], 'glow')
        ]
    },
    // Hidra de las Ciénagas: dos cabezas más, con su cuello, a los costados del pecho
    HYDRA: {
        build: { legs: 'oruga', core: 'estandar', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#5fbf8f', glow: '#ffd166',
        extras: [
            ...both(box('chest', [0.09, 0.42, 0.09], [0.32, 0.72, 0.05], 'hierro', [0, 0, -0.55])),
            ...both(box('chest', [0.3, 0.22, 0.36], [0.5, 0.92, 0.08], 'hierro')),
            ...both(box('chest', [0.32, 0.08, 0.1], [0.5, 0.94, 0.22], 'cobre')),
            ...both(box('chest', [0.2, 0.04, 0.02], [0.5, 0.94, 0.28], 'glow')),
            box('head', [0.22, 0.05, 0.02], [0, 0.16, 0.235], 'glow')
        ]
    },
    // Liche Eterno: corona de púas, capa de chapa y dos cañones (se cubre con su barrera)
    LICH: {
        build: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'canon', armR: 'canon' }, paint: '#b59ae6', glow: '#e7c6ff',
        extras: [
            ...[0, 1.26, 2.51, 3.77, 5.03].map(a => box('head', [0.05, 0.2, 0.05], [Math.sin(a) * 0.18, 0.42, Math.cos(a) * 0.18], 'metal')),
            box('chest', [0.62, 1.3, 0.04], [0, -0.2, -0.32], 'carbon', [0.15, 0, 0]),         // la capa
            box('head', [0.3, 0.05, 0.02], [0, 0.2, 0.225], 'glow'),
            box('chest', [0.14, 0.14, 0.04], [0, 0.32, 0.23], 'glow')
        ]
    },
    // Titán de Sangre: hojas en los antebrazos y dos tanques en la espalda (se cura con cada golpe)
    BLOOD_TITAN: {
        build: { legs: 'bipedo', core: 'pesado', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#b5404e', glow: '#ff9f1c',
        extras: [
            ...both(box('forearm', [0.03, 0.85, 0.2], [0.09, -0.45, 0.14], 'metal')),
            ...both(cyl('chest', 0.11, 0.55, [0.18, 0.3, -0.45], 'glow')),                     // los tanques de "sangre"
            ...both(box('shoulder', [0.4, 0.14, 0.45], [0.12, 0.2, 0], 'carbon')),
            box('head', [0.26, 0.05, 0.02], [0, 0.16, 0.235], 'glow')
        ]
    },
    // Espectro Errante: liviano, sobre ruedas, con jirones de chapa colgando y una antena (aparece al lado tuyo)
    PHANTOM: {
        build: { legs: 'ruedas', core: 'liviano', head: 'camara', armL: 'pinza', armR: 'pinza' }, paint: '#e6e7e3', glow: '#a9def9',
        extras: [
            ...both(box('chest', [0.16, 0.9, 0.03], [0.22, -0.15, 0.18], 'hueso', [0.1, 0, 0.12])),
            ...both(box('chest', [0.14, 0.7, 0.03], [0.24, -0.05, -0.2], 'hueso', [-0.1, 0, 0.15])),
            box('head', [0.03, 0.5, 0.03], [-0.1, 0.55, -0.1], 'carbon'),
            box('head', [0.06, 0.06, 0.06], [-0.1, 0.82, -0.1], 'glow')
        ]
    }
};

// Le pega al robot las piezas propias del jefe. Si una forma nombra un hueso que no existe, avisa (no se pierde callada).
const GEO = {}, GLOW = {};
export function addExtras(robot, def) {
    const bones = robot.userData.bones;
    def.extras.forEach(s => {
        if (!bones[s.b]) throw new Error(`Jefe: el hueso "${s.b}" no existe`);
        const k = s.t + (s.s || [s.rad, s.h]).join(',');
        const g = GEO[k] || (GEO[k] = s.t === 'box' ? new THREE.BoxGeometry(...s.s) : new THREE.CylinderGeometry(s.rad, s.rad, s.h, 8));
        const m = new THREE.Mesh(g, s.m === 'glow' ? (GLOW[def.glow] || (GLOW[def.glow] = new THREE.MeshBasicMaterial({ color: def.glow }))) : mat(s.m));
        m.position.set(...s.p);
        if (s.r) m.rotation.set(...s.r);
        bones[s.b].add(m);
    });
}
