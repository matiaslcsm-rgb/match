// Los robots de los competidores (2026-10-30, pedido del usuario: "son todos similares y no son distintivos"): cada uno con
// su armado, su pintura, el brillo de sus ojos, su tamaño y piezas que solo tiene él, que dicen qué hace (el hacha de Axe,
// la guadaña del Nigromante, los tanques del Alquimista...). Mismo formato que los jefes (bosses3d.js); lo usa match3d.js.
// size: multiplica la altura de competidor (solo se ve: no cambia las reglas del juego).
import { box, cyl, ball, cone, both } from './bosses3d.js';

const PI = Math.PI;

export const HERO_ROBOTS = {
    // Grúa: orugas anchas, torso de cabina amarilla, baliza de precaución y un brazo-grúa enorme con gancho
    CRANE: {
        build: { legs: 'oruga', core: 'pesado', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#d9a521', glow: '#ff9a2e', size: 1.15,
        extras: [
            cyl('handR', 0.07, 1.7, [0, 0, 0.75], 'carbon', [PI / 2, 0, 0]),       // el brazo-grúa
            box('handR', [0.1, 0.5, 0.06], [0, -0.26, 1.6], 'metal'),               // el cable
            box('handR', [0.34, 0.1, 0.26], [0, -0.55, 1.62], 'nar'),               // el gancho
            box('handR', [0.08, 0.26, 0.08], [0.14, -0.66, 1.62], 'metal'),
            box('chest', [0.72, 0.5, 0.05], [0, 0.32, 0.45], 'glow'),               // el vidrio de la cabina
            cyl('head', 0.09, 0.14, [0, 0.27, 0], 'nar'),                           // la baliza
            ...both(box('shoulder', [0.42, 0.14, 0.48], [0.12, 0.18, 0], 'carbon'))
        ]
    },
    // Guerrero Vampiro: alto y oscuro, cuello alzado, capa, alas de chapa y colmillos
    VAMPIRE: {
        build: { legs: 'bipedo', core: 'estandar', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#6a1f38', glow: '#ff3b5c', size: 1.05,
        extras: [
            ...both(box('chest', [0.1, 0.55, 0.42], [0.3, 0.72, -0.04], 'carbon', [0, 0, -0.2])),  // el cuello de la capa
            box('chest', [0.95, 1.7, 0.04], [0, -0.15, -0.46], 'carbon', [0.16, 0, 0]),            // la capa
            ...both(box('chest', [0.95, 0.05, 0.5], [0.72, 0.62, -0.34], 'carbon', [0.2, 0, 0.42])), // las alas
            ...both(box('head', [0.04, 0.1, 0.04], [0.07, 0.0, 0.2], 'hueso')),                    // los colmillos
            ...both(box('head', [0.09, 0.04, 0.02], [0.08, 0.17, 0.235], 'glow')),
            ...both(box('hand', [0.05, 0.42, 0.08], [0.03, -0.38, 0.06], 'glow'))                  // las garras
        ]
    },
    // Rec: el camarógrafo. Cabeza de cámara, caña de micrófono, rollos de película y la luz de grabación
    REC: {
        build: { legs: 'ruedas', core: 'estandar', head: 'camara', armL: 'pinza', armR: 'pinza' }, paint: '#d8a23a', glow: '#ff2a2a',
        extras: [
            ...[0.2, 0.62].map(y => cyl('chest', 0.24, 0.07, [0, y, -0.46], 'carbon', [0, 0, PI / 2])), // los rollos
            ...[0.2, 0.62].map(y => cyl('chest', 0.08, 0.09, [0, y, -0.46], 'metal', [0, 0, PI / 2])),
            cyl('chest', 0.025, 1.7, [0.32, 0.95, 0.2], 'metal', [0.9, 0, 0]),                     // la caña
            box('chest', [0.16, 0.16, 0.34], [0.32, 1.52, 0.9], 'carbon'),                         // el micrófono
            box('head', [0.08, 0.08, 0.08], [0.1, 0.33, 0.14], 'glow'),                            // grabando
            ...both(box('thigh', [0.05, 0.75, 0.05], [0.14, -0.35, -0.12], 'metal', [-0.3, 0, 0])) // las patas del trípode
        ]
    },
    // Vector: bípedo fino de competición, máscara de esgrima, un brazo en guardia y una hoja de luz larguísima
    VECTOR: {
        build: { legs: 'bipedo', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'pinza' }, paint: '#d6d2c2', glow: '#ff9a2e', size: 1.05,
        extras: [
            box('handR', [0.05, 0.05, 1.9], [0, 0, 1.0], 'glow'),                  // la hoja de luz
            box('handR', [0.32, 0.06, 0.07], [0, 0, 0.1], 'metal'),                // la guarnición
            box('head', [0.36, 0.34, 0.03], [0, 0.04, 0.24], 'carbon'),            // la máscara de esgrima
            box('head', [0.3, 0.05, 0.02], [0, 0.08, 0.26], 'glow'),
            box('chest', [0.5, 0.42, 0.04], [0, 0.2, 0.36], 'hueso')               // el peto
        ]
    },
    // Danzante Cinético: chiquito y turquesa, sobre patines, con dos aros que giran en la cintura y abanicos en las manos
    DANCER: {
        build: { legs: 'ruedas', core: 'liviano', head: 'sensor', armL: 'pinza', armR: 'pinza' }, paint: '#21b8a6', glow: '#7dfff0', size: 0.96,
        extras: [
            cyl('pelvis', 0.68, 0.04, [0, 0, 0], 'hueso', [0.14, 0, 0.1]),                         // los aros
            cyl('pelvis', 0.52, 0.05, [0, 0.14, 0], 'glow', [-0.12, 0, -0.08]),
            ...both(box('hand', [0.04, 0.55, 0.62], [0.05, -0.3, 0.1], 'hueso', [0, 0, 0.1])),     // los abanicos
            ...both(box('hand', [0.05, 0.08, 0.64], [0.05, -0.08, 0.1], 'glow')),
            box('head', [0.06, 0.08, 0.6], [0, 0.33, -0.34], 'glow', [0.5, 0, 0]),                 // la cola de pelo
            box('head', [0.26, 0.05, 0.02], [0, 0.17, 0.225], 'glow')
        ]
    },
    // Arcanista: sombrero de cono hecho de discos y dos cristales que flotan a los costados
    ARCANIST: {
        build: { legs: 'bipedo', core: 'estandar', head: 'domo', armL: 'canon', armR: 'canon' }, paint: '#3f55d8', glow: '#8fd3ff',
        extras: [
            cyl('head', 0.46, 0.05, [0, 0.34, 0], 'carbon'),                                       // el ala del sombrero
            ...[[0.26, 0.42], [0.2, 0.56], [0.14, 0.7], [0.08, 0.84], [0.04, 0.98]].map(([r, y]) => cyl('head', r, 0.15, [0, y, 0], 'carbon')),
            cyl('head', 0.27, 0.05, [0, 0.43, 0], 'glow'),
            ...both(box('chest', [0.2, 0.42, 0.2], [0.95, 0.72, 0], 'glow', [0.5, 0.4, 0.3])),     // los cristales
            box('chest', [0.22, 0.22, 0.05], [0, 0.32, 0.27], 'glow')
        ]
    },
    // Bruja del Hielo: pollera ancha de chapa, corona de cristales y hombros de escarcha
    FROSTWITCH: {
        build: { legs: 'ruedas', core: 'estandar', head: 'domo', armL: 'pinza', armR: 'pinza' }, paint: '#8fdcf0', glow: '#e8fdff',
        extras: [
            cyl('pelvis', 0.34, 0.3, [0, -0.1, 0], 'hueso'),                                       // la pollera, de a tramos
            cyl('pelvis', 0.46, 0.3, [0, -0.38, 0], 'hueso'),
            cyl('pelvis', 0.58, 0.3, [0, -0.66, 0], 'hueso'),
            ...[0, 1.05, 2.1, 3.14, 4.19, 5.24].map((a, i) => box('head', [0.07, i % 2 ? 0.34 : 0.56, 0.07], [Math.sin(a) * 0.2, i % 2 ? 0.42 : 0.53, Math.cos(a) * 0.2], 'glow', [Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3])),
            ...both(box('shoulder', [0.14, 0.62, 0.14], [0.22, 0.3, 0.06], 'glow', [0.2, 0, -0.6])),
            ...both(box('shoulder', [0.12, 0.46, 0.12], [0.26, 0.24, -0.16], 'glow', [-0.3, 0, -0.9])),
            box('head', [0.3, 0.05, 0.02], [0, 0.18, 0.23], 'glow')
        ]
    },
    // M.O.R.T.I.S.: dibujo del usuario (docs/competidores/mortis.md). Flota sobre tres propulsores de llama verde, con capucha,
    // cráneo, coraza y hombreras de cobre, túnica acampanada en jirones, brazales con luz, garras y el armazón de la espalda
    NECROMANCER: {
        build: { legs: 'ruedas', core: 'liviano', head: 'domo', armL: 'pinza', armR: 'pinza' }, paint: '#2c5a44', glow: '#6dff8f', size: 1.05, float: true,
        extras: [
            ball('head', 0.38, [0, 0.2, -0.07], 'oliva', [1, 1.15, 1.08]),                         // la capucha
            cone('head', 0.03, 0.22, 0.34, [0, 0.62, -0.2], 'oliva', [-0.45, 0, 0]),
            cone('head', 0.3, 0.42, 0.26, [0, -0.08, -0.04], 'oliva'),
            ball('head', 0.21, [0, 0.2, 0.2], 'craneo', [0.9, 1, 0.85]),                           // el cráneo
            box('head', [0.2, 0.09, 0.14], [0, 0.0, 0.24], 'craneo'),
            ...[-0.06, 0, 0.06].map(x => box('head', [0.035, 0.06, 0.03], [x, -0.03, 0.32], 'junta')),
            ...both(ball('head', 0.06, [0.08, 0.22, 0.34], 'junta', [1, 0.9, 0.5])),               // las cuencas y la luz de los ojos
            ...both(ball('head', 0.03, [0.08, 0.22, 0.375], 'glow')),
            cone('chest', 0.34, 0.26, 0.62, [0, 0.2, 0.01], 'cobre'),                              // la coraza
            ...[0.02, 0.18, 0.34].map(y => cone('chest', 0.285 + y * 0.2, 0.28 + y * 0.2, 0.035, [0, y, 0.02], 'hierro')),
            cyl('chest', 0.16, 0.05, [0, 0.26, 0.32], 'cobre', [PI / 2, 0, 0]),                     // el núcleo verde
            ball('chest', 0.11, [0, 0.26, 0.34], 'glow'),
            ...both(ball('shoulder', 0.25, [0.1, 0.12, 0], 'cobre', [1.1, 0.8, 1.15])),             // las hombreras
            ...both(ball('shoulder', 0.1, [0.17, 0.28, 0.1], 'hierro')),
            ...both(cone('upperArm', 0.1, 0.13, 0.36, [0, -0.32, 0], 'oliva')),
            ...both(cone('forearm', 0.17, 0.11, 0.42, [0, -0.3, 0], 'cobre')),                      // los brazales con su luz
            ...both(cyl('forearm', 0.145, 0.05, [0, -0.3, 0], 'glow')),
            ...[-0.07, 0, 0.07].flatMap(z => both(cone('hand', 0.035, 0, 0.3, [0, -0.3, z], 'metal', [0, 0, 0]))), // las garras
            cyl('spine', 0.31, 0.12, [0, 0.03, 0], 'cobre'),                                        // el cinturón
            ball('spine', 0.08, [0, 0.03, 0.31], 'glow'),
            cone('pelvis', 0.3, 0.62, 1.15, [0, -0.62, 0], 'oliva'),                                // la túnica, abierta abajo
            ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * PI / 4, l = 0.3 + (i % 3) * 0.14;   // los jirones
                return box('pelvis', [0.3, l, 0.03], [Math.sin(a) * 0.6, -1.2 - l / 2, Math.cos(a) * 0.6], 'oliva', [0, a, 0]); }),
            ...[0.3, -0.3].flatMap(x => [cyl('chest', 0.03, 1.1, [x, 1, -0.32], 'cobre'), ball('chest', 0.06, [x, 1.56, -0.32], 'hierro')]), // el armazón
            box('chest', [0.72, 0.05, 0.05], [0, 1.42, -0.32], 'cobre'),
            cyl('chest', 0.012, 0.9, [0.1, 1, -0.3], 'junta'),                                      // las sogas y el gancho
            cyl('chest', 0.012, 0.8, [-0.14, 1.05, -0.3], 'junta'),
            ...[0.3, 0, -0.3].flatMap(x => [cone('pelvis', 0.2, 0.13, 0.3, [x, -1.25, x ? 0.08 : -0.1], 'cobre'), cone('pelvis', 0.11, 0, 0.9, [x, -1.82, x ? 0.08 : -0.1], 'glow')]) // propulsores y llamas
        ]
    },    // Sabio del Vacío: un disco negro detrás de la cabeza con un anillo de luz y losas que flotan
    VOIDSAGE: {
        build: { legs: 'ruedas', core: 'estandar', head: 'sensor', armL: 'canon', armR: 'canon' }, paint: '#3a2470', glow: '#c58bff', size: 1.02,
        extras: [
            cyl('head', 0.72, 0.03, [0, 0.2, -0.32], 'glow', [PI / 2, 0, 0]),                      // el anillo
            cyl('head', 0.6, 0.05, [0, 0.2, -0.3], 'junta', [PI / 2, 0, 0]),                       // el vacío
            ...both(box('chest', [0.24, 0.95, 0.12], [1.0, 0.65, -0.1], 'carbon', [0.15, 0.3, 0.15])), // las losas
            ...both(box('chest', [0.26, 0.05, 0.14], [1.0, 0.9, -0.1], 'glow', [0.15, 0.3, 0.15])),
            box('chest', [0.28, 0.28, 0.28], [0, 0.32, 0.32], 'glow', [0.78, 0.78, 0]),            // el núcleo
            box('head', [0.22, 0.05, 0.02], [0, 0.16, 0.23], 'glow')
        ]
    },
    // Alquimista: oruga y panza de barril, tres tanques de ácido en la espalda, mangueras, antiparras y un frasco
    ALCHEMIST: {
        build: { legs: 'oruga', core: 'estandar', head: 'sensor', armL: 'pinza', armR: 'ametralladora' }, paint: '#a0652c', glow: '#9cff3a',
        extras: [
            cyl('chest', 0.42, 0.62, [0, 0.22, 0], 'cobre'),                                       // el barril
            ...[-0.32, 0, 0.32].map(x => cyl('chest', 0.15, 0.82, [x, 0.42, -0.5], 'glow')),       // los tanques
            ...[-0.32, 0, 0.32].map(x => cyl('chest', 0.16, 0.06, [x, 0.85, -0.5], 'metal')),
            cyl('chest', 0.03, 1.1, [0.62, 0.3, -0.2], 'carbon', [0.9, 0, 0.5]),                   // la manguera
            ...both(cyl('head', 0.08, 0.05, [0.08, 0.18, 0.2], 'glow', [PI / 2, 0, 0])),           // las antiparras
            box('head', [0.36, 0.04, 0.3], [0, 0.26, 0.02], 'cobre'),
            cyl('handL', 0.13, 0.22, [0, -0.2, 0.08], 'glow'),                                     // el frasco
            cyl('handL', 0.05, 0.14, [0, -0.04, 0.08], 'metal')
        ]
    },
    // Zeus: dos bobinas de tesla en los hombros, corona de rayos, barba de metal y un rayo en el pecho
    ZEUS: {
        build: { legs: 'bipedo', core: 'pesado', head: 'sensor', armL: 'canon', armR: 'pinza' }, paint: '#254a9a', glow: '#ffe24a', size: 1.06,
        extras: [
            ...[0, 0.17, 0.34].flatMap(y => both(cyl('chest', 0.17 - y * 0.2, 0.08, [0.5, 0.75 + y, -0.05], 'cobre'))), // las bobinas
            ...both(cyl('chest', 0.05, 0.28, [0.5, 1.28, -0.05], 'metal')),
            ...both(box('chest', [0.16, 0.16, 0.16], [0.5, 1.46, -0.05], 'glow', [0.78, 0.78, 0])),
            ...[-0.15, 0, 0.15].map((x, i) => box('head', [0.05, i === 1 ? 0.44 : 0.3, 0.05], [x, 0.42 + (i === 1 ? 0.07 : 0), 0.1], 'glow', [0, 0, -x * 2])), // la corona
            box('head', [0.22, 0.3, 0.06], [0, -0.06, 0.2], 'metal'),                              // la barba
            box('chest', [0.1, 0.44, 0.05], [0.04, 0.42, 0.28], 'glow', [0, 0, 0.5]),              // el rayo
            box('chest', [0.1, 0.44, 0.05], [-0.04, 0.12, 0.28], 'glow', [0, 0, 0.5]),
            box('head', [0.26, 0.05, 0.02], [0, 0.17, 0.235], 'glow'),
            cyl('handR', 0.03, 1.6, [0, 0.1, 0.12], 'cobre')                                       // el rayo de la mano
        ]
    }
};
