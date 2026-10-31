// Íconos de ítems dibujados a medida (2026-10-31, decisión del usuario: reemplazan a los de pixel art). Cada ítem usa una
// forma (espada, guante, anillo…) y su color principal. Cada forma es una lista de capas [tono, trazo SVG] sobre un cuadro de
// 64×64, con contorno negro; los tonos salen del color del ítem:
//   m color principal · d oscuro · l claro · w metal · h mango
// Se usan en la tienda, el inventario, las recetas, la guía y el glosario (itemNameHtml los agrega solo).

const circlePath = (x, y, r) => `M${x} ${y - r}a${r} ${r} 0 1 0 .01 0Z`;
const ITEM_ICON_SHAPES = {
    sword: [['w', 'M50 6L58 14 26 46 18 38Z'], ['l', 'M50 6L54 10 24 42 18 38Z'], ['m', 'M12 32L18 28 36 46 32 52Z'], ['h', 'M22 42L28 48 14 60 8 54Z']],
    dagger: [['w', 'M54 8L50 28 30 42 24 36 36 16Z'], ['m', 'M18 32L24 30 36 42 34 48Z'], ['h', 'M24 42L30 46 16 58 10 52Z']],
    hammer: [['h', 'M26 34H36V60H26Z'], ['m', 'M10 12H50Q56 12 56 18V30Q56 36 50 36H10Z'], ['l', 'M14 16H50V21H14Z']],
    spear: [['h', 'M10 50L14 54 46 22 42 18Z'], ['m', 'M38 16L48 26 44 30 34 20Z'], ['w', 'M58 6L52 26 38 12Z']],
    staff: [['h', 'M29 24H35V60H29Z'], ['m', circlePath(32, 18, 14)], ['l', circlePath(27, 13, 5)]],
    glove: [['d', 'M22 48H44V60H22Z'], ['m', 'M16 34V14a4 4 0 0 1 8 0V8a4 4 0 0 1 8 0V12a4 4 0 0 1 8 0V18a4 4 0 0 1 8 0V38Q48 50 38 50H26Q16 50 16 34Z']],
    boot: [['m', 'M20 8H42V36L56 44Q60 48 58 52H20Z'], ['l', 'M20 14H42V20H20Z'], ['d', 'M18 52H60V58H18Z']],
    armor: [['m', 'M14 12L24 8Q32 16 40 8L50 12 58 24 48 30V56H16V30L6 24Z'], ['d', 'M30 18H34V56H30Z'], ['l', 'M20 30H28V38H20Z']],
    shield: [['m', 'M10 12Q32 2 54 12V32Q54 50 32 60 10 50 10 32Z'], ['l', 'M32 7Q46 8 50 15V32Q50 46 32 55Z'], ['d', 'M32 20L42 30 32 42 22 30Z']],
    cape: [['m', 'M20 8H44L54 56 44 52 38 58 32 52 26 58 20 52 10 56Z'], ['l', 'M26 22H30L28 46H22Z'], ['d', 'M20 8H44L42 18H22Z']],
    ring: [['w', `${circlePath(32, 40, 20)}${circlePath(32, 40, 12)}`, 'evenodd'], ['m', 'M22 8H42L48 16 32 30 16 16Z'], ['l', 'M24 10H32V16H20Z']],
    gem: [['m', 'M18 10H46L58 24 32 58 6 24Z'], ['l', 'M18 10H32L24 24H6Z'], ['d', 'M58 24L32 58 40 24Z']],
    crystal: [['m', 'M32 4L46 20 40 54 32 60 24 54 18 20Z'], ['l', 'M32 4L18 20 24 54 30 30Z'], ['d', 'M46 20L40 54 36 28Z']],
    orb: [['w', 'M18 50H46L50 60H14Z'], ['m', circlePath(32, 28, 22)], ['l', circlePath(24, 20, 7)]],
    heart: [['m', 'M32 56L8 30Q0 14 16 9 27 7 32 18 37 7 48 9 64 14 56 30Z'], ['l', circlePath(17, 21, 6)]],
    mask: [['m', 'M10 12Q32 2 54 12V34Q52 52 32 60 12 52 10 34Z'], ['d', 'M16 24L28 26 26 34 18 32ZM48 24L36 26 38 34 46 32Z'], ['l', 'M30 10H34V20H30Z']],
    chalice: [['w', 'M14 8H50Q50 34 36 36V48H44V58H20V48H28V36Q14 34 14 8Z'], ['m', 'M18 12H46Q45 22 40 24H24Q19 22 18 12Z']],
    fang: [['m', 'M16 6H48Q52 34 30 60 28 34 16 6Z'], ['l', 'M22 10H30Q32 28 30 44 28 26 22 10Z'], ['d', 'M14 4H50V12H14Z']],
    branch: [['h', 'M8 56L12 60 34 34 54 28 52 22 38 26 46 8 40 6 30 28 26 16 20 18 26 36Z'], ['m', circlePath(46, 10, 7)], ['m', circlePath(18, 13, 6)], ['m', circlePath(56, 26, 6)]],
    belt: [['m', 'M4 22H60V42H4Z'], ['d', 'M4 28H22V31H4Z'], ['w', 'M22 16H42V48H22ZM28 23V41H36V23Z', 'evenodd']],
    book: [['w', 'M50 12H56V58H16V54H50Z'], ['m', 'M12 8H50V54H12Z'], ['d', 'M12 8H20V54H12Z'], ['l', 'M28 20H44V26H28ZM28 31H40V35H28Z']],
    crown: [['m', 'M8 18L20 30 32 12 44 30 56 18 52 48H12Z'], ['d', 'M12 42H52V50H12Z'], ['l', circlePath(32, 32, 4)]],
    amulet: [['w', 'M12 6L32 30 52 6 48 4 32 24 16 4Z'], ['m', 'M32 26L46 40 32 58 18 40Z'], ['l', 'M32 30L26 40H34Z']],
    lantern: [['w', 'M26 2H38V8H26Z'], ['d', 'M22 8H42V16H22Z'], ['m', 'M18 16H46V50H18Z'], ['l', 'M32 22Q42 34 32 44 22 34 32 22Z'], ['d', 'M14 50H50V58H14Z']],
    clock: [['m', circlePath(32, 32, 26)], ['w', circlePath(32, 32, 19)], ['d', 'M30 16H34V31H44V35H30Z']],
    coin: [['m', circlePath(32, 32, 26)], ['l', circlePath(32, 32, 20)], ['m', circlePath(32, 32, 15)], ['d', 'M28 22H36V42H28Z']]
};
const ITEM_ICONS = {
    IMPULSE_CELL: ['crystal', '#ff9a2e'], JET_PACK: ['boot', '#ff9a2e'], STASIS_DOME: ['shield', '#48cae4'], PULSE_WAVE: ['orb', '#f2c230'],
    COIL: ['crystal', '#48cae4'], INHIBITOR: ['orb', '#c77dff'], SHOCK_MACE: ['hammer', '#f2c230'], NET_GUN: ['cape', '#8d99ae'], CLAMP: ['glove', '#ff9a2e'],
    STARTER_CELL: ['crystal', '#f2c230'], EVO_CORE: ['orb', '#ff9a2e'], BOSS_PLATE: ['shield', '#ff9a2e'], EMERGENCY_CELL: ['heart', '#f2c230'],
    BRANCH_STR: ['branch', '#ff6b6b'], BRANCH_AGI: ['branch', '#69db7c'], BRANCH_INT: ['branch', '#74c0fc'],
    BLADE: ['sword', '#adb5bd'], QUICK_GLOVES: ['glove', '#f4a261'], FANG: ['fang', '#f1faee'], CHAINMAIL: ['armor', '#8d99ae'],
    RUNE_CAPE: ['cape', '#7b2cbf'], VITALITY: ['gem', '#e63946'], REGEN_RING: ['ring', '#52b788'], VAMP_MASK: ['mask', '#9d0208'],
    MANA_CRYSTAL: ['crystal', '#4895ef'], TRAVEL_BOOTS: ['boot', '#8d6e63'], SERRATED: ['dagger', '#ced4da'], FROST_ORB: ['orb', '#90e0ef'],
    BELT: ['belt', '#bc6c25'], GLOVES: ['glove', '#ffd166'], TOME: ['book', '#3a0ca3'], DIADEM: ['crown', '#ffd166'],
    TRUESTRIKE: ['sword', '#e0fbfc'], HAMMER: ['hammer', '#6c757d'], SWIFT_BLADE: ['sword', '#ffd166'], CRIMSON: ['chalice', '#d00000'],
    SPEAR: ['spear', '#adb5bd'], SKADI: ['orb', '#caf0f8'], CLOAK: ['cape', '#c77dff'], BOOTS: ['boot', '#495057'],
    THORNS: ['armor', '#2d6a4f'], HEART: ['heart', '#ff006e'], AEGIS: ['shield', '#ffb703'], ARCANE_STAFF: ['staff', '#c77dff'],
    FRAGMENT: ['crystal', '#9d4edd'], GREED: ['coin', '#ffd166'],
    BRUTE_AMULET: ['amulet', '#e63946'], STALKER_DAGGER: ['dagger', '#52b788'], APPRENTICE_STONE: ['gem', '#4895ef'],
    EXPLORER_LANTERN: ['lantern', '#ffd166'], WOLF_FANG: ['fang', '#e9ecef'], OAK_SHIELD: ['shield', '#8d6e63'],
    SHARP_CLAW: ['fang', '#adb5bd'], ARCANE_RING: ['ring', '#9d4edd'], PILGRIM_MANTLE: ['cape', '#606c38'],
    TENACITY_CHARM: ['amulet', '#48cae4'], COLOSSUS_PLATES: ['armor', '#6c757d'], EXECUTIONER_AXE: ['hammer', '#9d0208'],
    STORM_BOOTS: ['boot', '#48cae4'], ARCHMAGE_ORB: ['orb', '#7b2cbf'], BLOOD_CHALICE: ['chalice', '#9d0208'],
    DOOM_SWORD: ['sword', '#ff5400'], CROWN_OF_THREE: ['crown', '#ffd166'], PHOENIX_HEART: ['heart', '#ff7b00'],
    FORBIDDEN_GRIMOIRE: ['book', '#6a040f'], BROKEN_CLOCK: ['clock', '#ffd166'],
    KAYA: ['gem', '#9d4edd'], ECLIPSE_STAFF: ['staff', '#3c096c'],
    TALENT_STR: ['book', '#e03131'], TALENT_AGI: ['book', '#2f9e44'], TALENT_INT: ['book', '#1971c2']
};


const itemIconCache = {};
function itemIconUrl(key) {
    if (itemIconCache[key]) return itemIconCache[key];
    const def = ITEM_ICONS[key];
    if (!def) return null;
    const [shape, main] = def, pal = { m: main, d: shade(main, -0.45), l: shade(main, 0.5), w: '#dee2e6', h: '#9a6a42' };
    const c = document.createElement('canvas'), S = 2;
    c.width = c.height = 64 * S;
    const g = c.getContext('2d');
    g.scale(S, S); g.lineJoin = 'round'; g.lineWidth = 2.6; g.strokeStyle = '#14151a';
    ITEM_ICON_SHAPES[shape].forEach(([tone, d, rule]) => {
        const p = new Path2D(d);
        g.fillStyle = pal[tone]; g.fill(p, rule || 'nonzero'); g.stroke(p);
    });
    return (itemIconCache[key] = c.toDataURL());
}
function itemIconHtml(key, size = 'sm') {
    const url = itemIconUrl(key);
    return url ? `<img src="${url}" class="pixel-img item-icon ${size}" alt="">` : '';
}