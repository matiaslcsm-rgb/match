// Show skills, batch 1 (approved by the user 2026-11-02): 20 skills built from parts (data/skillParts.js) around the four
// show statuses (statuses.js). Each status has skills that apply it and at least one that exploits it.
registerShowSkills([
    // --- Overcharge ---
    { id: 'SHOW_SPARK', name: 'Chispazo', shape: { type: 'bolt', range: 6, radius: 0.7 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 80, ratio: 0.4 }, { type: 'overcharge', charges: 1, power: 30 }] },
    { id: 'SHOW_LIVE_WIRE', name: 'Cable Pelado', shape: { type: 'everyHit', every: 3 },
        hits: [{ type: 'overcharge', charges: 1, power: 25 }] },
    { id: 'SHOW_BLACKOUT', name: 'Apagón', shape: { type: 'nova', radius: 3 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'magical', base: 50, ratio: 0.3 }, { type: 'overcharge', charges: 2, power: 25 }, { type: 'silence', duration: 1 }] },
    { id: 'SHOW_LIGHTNING_ROD', name: 'Pararrayos', shape: { type: 'zone', range: 6, radius: 1.5, duration: 3 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 30, ratio: 0.15 }, { type: 'overcharge', charges: 1, power: 20 }] },
    { id: 'SHOW_GROUNDING', name: 'Toma a Tierra', shape: { type: 'strike', range: 1.5 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'physical', base: 80, ratio: 0.6 }, { type: 'discharge', mult: 2.5 }, { type: 'slow', pct: 0.3, duration: 2 }] },
    // --- Dent ---
    { id: 'SHOW_HAMMER', name: 'Martillazo', shape: { type: 'strike', range: 1.5 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 70, ratio: 0.6 }, { type: 'dent', stacks: 2 }] },
    { id: 'SHOW_RAM', name: 'Embestida', shape: { type: 'dash', cells: 4, radius: 1.5 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 60, ratio: 0.4 }, { type: 'push', cells: 2 }] },
    { id: 'SHOW_RIVETER', name: 'Remachadora', shape: { type: 'everyHit', every: 4 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 30, ratio: 0.3 }, { type: 'dent', stacks: 1 }] },
    { id: 'SHOW_SCRAPPER', name: 'Chatarrero', shape: { type: 'bolt', range: 6, radius: 0.6 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 50, ratio: 0.3 }, { type: 'pull', cells: 3 }, { type: 'dent', stacks: 1 }] },
    { id: 'SHOW_HYDRAULIC_PRESS', name: 'Prensa Hidráulica', shape: { type: 'blast', range: 4, radius: 1.8 }, cost: 0.8,
        hits: [{ type: 'damage', dmgType: 'physical', base: 140, ratio: 0.7 }],
        twist: [{ type: 'windup', time: 0.6 }, { type: 'crusher', perDent: 0.15 }] },
    // --- Overheat ---
    { id: 'SHOW_BLOWTORCH', name: 'Soplete', shape: { type: 'strike', range: 2 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 40, ratio: 0.3 }, { type: 'overheat', dps: 40, duration: 4 }] },
    { id: 'SHOW_FUEL_LEAK', name: 'Escape de Nafta', shape: { type: 'zone', range: 5, radius: 1.8, duration: 3 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 15, ratio: 0.1 }, { type: 'overheat', dps: 15, duration: 2 }, { type: 'slow', pct: 0.25, duration: 1 }] },
    { id: 'SHOW_RED_TURBO', name: 'Turbo al Rojo', shape: { type: 'dash', cells: 4, radius: 1.5 },
        hits: [{ type: 'overheat', dps: 30, duration: 3 }, { type: 'shield', amount: 80, duration: 4 }] },
    { id: 'SHOW_THERMO_BOMB', name: 'Termo-Bomba', shape: { type: 'blast', range: 5, radius: 1.5 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 80, ratio: 0.4 }, { type: 'overheat', dps: 20, duration: 3 }],
        twist: { type: 'close', bonus: 0.3 } },
    // --- Marked ---
    { id: 'SHOW_SPOTLIGHT', name: 'Reflector', shape: { type: 'bolt', range: 7, radius: 0.8, pierce: true },
        hits: [{ type: 'damage', dmgType: 'magical', base: 30, ratio: 0.2 }, { type: 'mark' }] },
    { id: 'SHOW_INSTANT_REPLAY', name: 'Repetición Instantánea', shape: { type: 'everyHit', every: 3 },
        hits: [{ type: 'mark' }] },
    { id: 'SHOW_CAMERA_ZOOM', name: 'Zoom de Cámara', shape: { type: 'bolt', range: 8, radius: 0.6 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 70, ratio: 0.5 }, { type: 'mark' }],
        twist: { type: 'far', bonus: 0.3 } },
    { id: 'SHOW_CLOSE_UP', name: 'Primer Plano', shape: { type: 'strike', range: 1.5 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 90, ratio: 0.7 }],
        twist: { type: 'execute', below: 0.35, bonus: 0.6 } },
    // --- Control ---
    { id: 'SHOW_COMMERCIAL_BREAK', name: 'Corte Comercial', shape: { type: 'nova', radius: 2.5 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 40, ratio: 0.3 }, { type: 'stun', duration: 0.5 }, { type: 'shield', amount: 60, duration: 4 }] },
    { id: 'SHOW_CROWD_ROAR', name: 'Grito del Público', shape: { type: 'nova', radius: 3 }, cost: 0.85,
        hits: [{ type: 'silence', duration: 1.5 }, { type: 'heal', amount: 100 }] }
]);

// Show skills, batch 2 (asked by the user 2026-11-02, measured together with batch 1): 14 more skills, passives that
// answer when you get hit, self buffs and the first 6 ultimates built from parts.
registerShowSkills([
    // --- Overcharge ---
    { id: 'SHOW_VOLTAIC_ARC', name: 'Arco Voltaico', shape: { type: 'bolt', range: 6, radius: 0.7, pierce: true },
        hits: [{ type: 'damage', dmgType: 'magical', base: 55, ratio: 0.3 }, { type: 'overcharge', charges: 1, power: 25 }] },
    { id: 'SHOW_EXTERNAL_BATTERY', name: 'Batería Externa', shape: { type: 'whenHit', every: 6 },
        hits: [{ type: 'overcharge', charges: 1, power: 30 }, { type: 'shield', amount: 25, duration: 2 }] },
    { id: 'SHOW_ELECTROMAGNET', name: 'Electroimán', shape: { type: 'blast', range: 5, radius: 1.8 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'magical', base: 50, ratio: 0.3 }, { type: 'pull', cells: 2 }, { type: 'overcharge', charges: 1, power: 30 }] },
    // --- Dent ---
    { id: 'SHOW_SEISMIC_DENTER', name: 'Abollador Sísmico', shape: { type: 'nova', radius: 2.5 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'physical', base: 70, ratio: 0.5 }, { type: 'dent', stacks: 1 }, { type: 'slow', pct: 0.3, duration: 1.5 }] },
    { id: 'SHOW_ARMOR_PLATE', name: 'Placa Blindada', shape: { type: 'whenHit', every: 6 },
        hits: [{ type: 'dent', stacks: 1 }, { type: 'shield', amount: 15, duration: 2 }] },
    { id: 'SHOW_WRECKING_BALL', name: 'Bola de Demolición', shape: { type: 'bolt', range: 5, radius: 0.8 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'physical', base: 80, ratio: 0.6 }, { type: 'push', cells: 3 }] },
    { id: 'SHOW_LOOSE_SCREW', name: 'Tornillo Flojo', shape: { type: 'strike', range: 1.5 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'physical', base: 70, ratio: 0.6 }, { type: 'root', duration: 1 }, { type: 'dent', stacks: 1 }] },
    // --- Overheat ---
    { id: 'SHOW_BROKEN_RADIATOR', name: 'Radiador Roto', shape: { type: 'whenHit', every: 3 },
        hits: [{ type: 'overheat', dps: 25, duration: 3 }] },
    { id: 'SHOW_FLAMETHROWER', name: 'Lanzallamas', shape: { type: 'bolt', range: 4, radius: 0.9, pierce: true },
        hits: [{ type: 'damage', dmgType: 'magical', base: 45, ratio: 0.3 }, { type: 'overheat', dps: 25, duration: 3 }] },
    { id: 'SHOW_BLOWN_ENGINE', name: 'Motor Fundido', shape: { type: 'nova', radius: 2.5 },
        hits: [{ type: 'overheat', dps: 30, duration: 3 }, { type: 'haste', atkSpeed: 0.3, move: 0.2, duration: 3 }] },
    // --- Marked ---
    { id: 'SHOW_CUT_TO_BLACK', name: 'Corte a Negro', shape: { type: 'strike', range: 1.5 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'physical', base: 60, ratio: 0.4 }, { type: 'silence', duration: 1.5 }, { type: 'mark' }] },
    { id: 'SHOW_SLOW_MOTION', name: 'Cámara Lenta', shape: { type: 'blast', range: 6, radius: 1.8 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'magical', base: 40, ratio: 0.3 }, { type: 'slow', pct: 0.5, duration: 2 }, { type: 'mark' }] },
    // --- Combos and buffs ---
    { id: 'SHOW_SCREWDRIVER', name: 'Desarmador', shape: { type: 'strike', range: 1.5 }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'physical', base: 80, ratio: 0.6 }, { type: 'discharge', mult: 1.5 }],
        twist: { type: 'crusher', perDent: 0.15 } },
    { id: 'SHOW_OVATION', name: 'Ovación', shape: { type: 'self' },
        hits: [{ type: 'haste', atkSpeed: 0.4, move: 0.15, duration: 4 }, { type: 'heal', amount: 60 }] },
    // --- Ultimates ---
    { id: 'SHOW_RECORD_RATING', name: 'Rating Récord', ultimate: true, shape: { type: 'everywhere' }, cost: 0.85,
        hits: [{ type: 'damage', dmgType: 'magical', base: 140, ratio: 0.5 }, { type: 'mark' }] },
    { id: 'SHOW_SCRAP_CRUSHER', name: 'Desguace', ultimate: true, shape: { type: 'blast', range: 4, radius: 2.8 }, cost: 0.8,
        hits: [{ type: 'damage', dmgType: 'physical', base: 230, ratio: 1 }, { type: 'dent', stacks: 3 }],
        twist: [{ type: 'windup', time: 0.8 }, { type: 'crusher', perDent: 0.15 }] },
    { id: 'SHOW_FOUNDRY', name: 'Fundición', ultimate: true, shape: { type: 'zone', range: 6, radius: 2.5, duration: 5 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 50, ratio: 0.2 }, { type: 'overheat', dps: 30, duration: 2 }, { type: 'slow', pct: 0.3, duration: 1 }] },
    { id: 'SHOW_STUDIO_STORM', name: 'Tormenta de Estudio', ultimate: true, shape: { type: 'nova', radius: 4 },
        hits: [{ type: 'overcharge', charges: 2, power: 50 }, { type: 'discharge', mult: 2 }, { type: 'stun', duration: 0.6 }] },
    { id: 'SHOW_COUP_DE_GRACE', name: 'Golpe de Gracia', ultimate: true, shape: { type: 'strike', range: 1.8 },
        hits: [{ type: 'damage', dmgType: 'pure', base: 200 }],
        twist: { type: 'execute', below: 0.4, bonus: 1 } },
    { id: 'SHOW_AERIAL_SHOT', name: 'Toma Aérea', ultimate: true, shape: { type: 'dash', cells: 6, radius: 1.8 }, cost: 0.8,
        hits: [{ type: 'damage', dmgType: 'physical', base: 150, ratio: 0.7 }, { type: 'stun', duration: 1 }, { type: 'mark' }] }
]);
