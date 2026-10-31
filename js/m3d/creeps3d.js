// Los robots de los creeps (2026-10-30, roadmap de MATCH, fase 4): son los drones del show, cada tipo con su armado, su pintura
// y una o dos piezas que dicen qué hace, para reconocerlo de lejos en una oleada. Mismo formato que los jefes (bosses3d.js);
// lo usa match3d.js. Pocas piezas por robot: en una oleada hay muchos.
import { box, cyl, both } from './bosses3d.js';

const PI = Math.PI;

export const CREEP_ROBOTS = {
    // Autómata Putrefacto (minions.js): el esqueleto mecánico de M.O.R.T.I.S., con cráneo y ojos verdes
    AUTOMATON: {
        build: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#cfc7a8', glow: '#7dff9b',
        extras: [box('head', [0.34, 0.32, 0.34], [0, 0.17, 0], 'metal'), ...both(box('head', [0.09, 0.08, 0.02], [0.08, 0.2, 0.18], 'glow'))]
    },
    // Microdrón: chiquito, sin brazos que importen; viene en cantidad
    CHUSMA: { build: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#8a8f85', glow: '#d9dcd0', extras: [] },
    // Dron de Piso: el soldado básico, con casco de obra
    GRUNT: {
        build: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#c99a2e', glow: '#ffd166',
        extras: [box('head', [0.44, 0.08, 0.5], [0, 0.2, 0.03], 'hueso')]
    },
    // Dron Tirador: mira larga en el brazo
    ARCHER: {
        build: { legs: 'bipedo', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'ametralladora' }, paint: '#6f9fb8', glow: '#8ecae6',
        extras: [cyl('handR', 0.03, 0.9, [0, 0, 0.5], 'carbon', [PI / 2, 0, 0])]
    },
    // Dron Corredor: ruedas y aleta, todo velocidad
    SCOUT: {
        build: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#d6456f', glow: '#ff477e',
        extras: [box('chest', [0.05, 0.42, 0.5], [0, 0.42, -0.3], 'carbon', [0.5, 0, 0])]
    },
    // Dron de Carga: orugas y pala delante
    BRUTE: {
        build: { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'pinza', armR: 'pinza' }, paint: '#b5392f', glow: '#ffb347',
        extras: [box('chest', [1.0, 0.5, 0.08], [0, -0.2, 0.52], 'metal', [-0.25, 0, 0])]
    },
    // Dron Emisor: antena con la punta encendida (daño mágico a distancia)
    SHAMAN: {
        build: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'canon' }, paint: '#7d55a8', glow: '#c77dff',
        extras: [cyl('head', 0.025, 0.7, [0, 0.5, 0], 'metal'), box('head', [0.12, 0.12, 0.12], [0, 0.88, 0], 'glow')]
    },
    // Dron de Boxes: el mecánico que repara a los otros, con cruz en el pecho
    HEALER: {
        build: { legs: 'ruedas', core: 'estandar', head: 'camara', armL: 'pinza', armR: 'pinza' }, paint: '#d9dcd0', glow: '#80ffdb',
        extras: [box('chest', [0.34, 0.1, 0.03], [0, 0.2, 0.42], 'glow'), box('chest', [0.1, 0.34, 0.03], [0, 0.2, 0.42], 'glow')]
    },
    // Dron Fantasma: flaco, con faldón de jirones (esquiva)
    SPECTER: {
        build: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'pinza' }, paint: '#9ba3a8', glow: '#e6f2ff',
        extras: [box('chest', [0.7, 0.8, 0.04], [0, -0.4, -0.3], 'carbon', [0.15, 0, 0]), box('head', [0.34, 0.05, 0.02], [0, 0.04, 0.23], 'glow')]
    },
    // Dron Blindado: placas gruesas al frente y en los hombros
    ARMORED: {
        build: { legs: 'oruga', core: 'pesado', head: 'domo', armL: 'pinza', armR: 'pinza' }, paint: '#6b6f74', glow: '#d0d4d8',
        extras: [box('chest', [0.8, 0.7, 0.1], [0, 0.1, 0.46], 'metal'), ...both(box('shoulder', [0.5, 0.14, 0.56], [0.1, 0.2, 0], 'metal'))]
    },
    // Enjambre: ametralladoras en un chasis mínimo
    SWARM: { build: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'ametralladora', armR: 'ametralladora' }, paint: '#8fae6d', glow: '#b5e48c', extras: [] },
    // Dron Bomba: una carga enorme a la espalda, con la luz de peligro
    KAMIKAZE: {
        build: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#d9791a', glow: '#ff3b1f',
        extras: [cyl('chest', 0.34, 0.8, [0, 0.1, -0.42], 'carbon'), box('chest', [0.14, 0.14, 0.14], [0, 0.58, -0.42], 'glow')]
    },
    // Dron Picana: dos púas eléctricas en las manos
    STUNNER: {
        build: { legs: 'oruga', core: 'pesado', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#b9992f', glow: '#ffd166',
        extras: both(box('hand', [0.07, 0.07, 0.6], [0, 0, 0.42], 'glow'))
    },
    // Dron Hacker: antena doble de señal
    WARLOCK: {
        build: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'canon' }, paint: '#5a3f78', glow: '#e0aaff',
        extras: both(cyl('head', 0.02, 0.6, [0.16, 0.42, 0], 'metal', [0, 0, -0.4]))
    },
    // Dron Criogénico: tanque de frío en la espalda
    FROSTCASTER: {
        build: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'canon' }, paint: '#7fb6c6', glow: '#caf0f8',
        extras: both(cyl('chest', 0.13, 0.7, [0.17, 0.12, -0.4], 'hueso'))
    },
    // Dron Francotirador: cañón larguísimo
    CROSSBOW: {
        build: { legs: 'bipedo', core: 'liviano', head: 'camara', armL: 'pinza', armR: 'canon' }, paint: '#a57f58', glow: '#ffb347',
        extras: [cyl('handR', 0.05, 1.5, [0, 0, 0.8], 'carbon', [PI / 2, 0, 0])]
    },
    // Dron Animador: dos parlantes para arengar a los demás
    DRUMMER: {
        build: { legs: 'ruedas', core: 'estandar', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#c9803f', glow: '#ff9a2e',
        extras: both(box('chest', [0.26, 0.4, 0.26], [0.3, 0.5, 0], 'carbon'))
    },
    // Dron Carterista: bolsa a la espalda y antifaz de luz
    THIEF: {
        build: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#bfa53f', glow: '#ffe066',
        extras: [box('chest', [0.5, 0.5, 0.36], [0, 0, -0.42], 'carbon'), box('head', [0.36, 0.06, 0.02], [0, 0.1, 0.23], 'glow')]
    },
    // Dron Anclador: cadena y ancla colgando de la mano
    ANCHOR: {
        build: { legs: 'bipedo', core: 'pesado', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#3f6a8a', glow: '#8ecae6',
        extras: [box('handR', [0.05, 0.6, 0.05], [0, -0.32, 0], 'metal'), box('handR', [0.5, 0.1, 0.1], [0, -0.62, 0], 'metal')]
    }
};
