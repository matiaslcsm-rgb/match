// Show skills, batch 1 (approved by the user 2026-11-02): 20 skills built from parts (data/skillParts.js) around the four
// show statuses (statuses.js). Each status has skills that apply it and at least one that exploits it.
registerShowSkills([
    // --- Overcharge ---
    { id: 'SHOW_SPARK', name: 'Chispazo', shape: { type: 'bolt', range: 6, radius: 0.7 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 80, ratio: 0.4 }, { type: 'overcharge', charges: 1, power: 30 }] },
    { id: 'SHOW_LIVE_WIRE', name: 'Cable Pelado', shape: { type: 'everyHit', every: 3 },
        hits: [{ type: 'overcharge', charges: 1, power: 25 }] },
    { id: 'SHOW_BLACKOUT', name: 'Apagón', shape: { type: 'nova', radius: 3 },
        hits: [{ type: 'overcharge', charges: 2, power: 25 }, { type: 'silence', duration: 1 }] },
    { id: 'SHOW_LIGHTNING_ROD', name: 'Pararrayos', shape: { type: 'zone', range: 6, radius: 1.5, duration: 3 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 30, ratio: 0.15 }, { type: 'overcharge', charges: 1, power: 20 }] },
    { id: 'SHOW_GROUNDING', name: 'Toma a Tierra', shape: { type: 'strike', range: 1.5 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 60, ratio: 0.5 }, { type: 'discharge', mult: 2 }, { type: 'slow', pct: 0.3, duration: 2 }] },
    // --- Dent ---
    { id: 'SHOW_HAMMER', name: 'Martillazo', shape: { type: 'strike', range: 1.5 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 70, ratio: 0.6 }, { type: 'dent', stacks: 2 }] },
    { id: 'SHOW_RAM', name: 'Embestida', shape: { type: 'dash', cells: 4, radius: 1.5 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 60, ratio: 0.4 }, { type: 'push', cells: 2 }] },
    { id: 'SHOW_RIVETER', name: 'Remachadora', shape: { type: 'everyHit', every: 4 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 30, ratio: 0.3 }, { type: 'dent', stacks: 1 }] },
    { id: 'SHOW_SCRAPPER', name: 'Chatarrero', shape: { type: 'bolt', range: 6, radius: 0.6 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 50, ratio: 0.3 }, { type: 'pull', cells: 3 }, { type: 'dent', stacks: 1 }] },
    { id: 'SHOW_HYDRAULIC_PRESS', name: 'Prensa Hidráulica', shape: { type: 'blast', range: 4, radius: 1.5 },
        hits: [{ type: 'damage', dmgType: 'physical', base: 110, ratio: 0.6 }],
        twist: [{ type: 'windup', time: 0.6 }, { type: 'crusher', perDent: 0.15 }] },
    // --- Overheat ---
    { id: 'SHOW_BLOWTORCH', name: 'Soplete', shape: { type: 'strike', range: 2 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 40, ratio: 0.3 }, { type: 'overheat', dps: 30, duration: 4 }] },
    { id: 'SHOW_FUEL_LEAK', name: 'Escape de Nafta', shape: { type: 'zone', range: 5, radius: 1.8, duration: 3 },
        hits: [{ type: 'damage', dmgType: 'magical', base: 20, ratio: 0.1 }, { type: 'overheat', dps: 20, duration: 2 }, { type: 'slow', pct: 0.25, duration: 1 }] },
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
    { id: 'SHOW_CROWD_ROAR', name: 'Grito del Público', shape: { type: 'nova', radius: 3 },
        hits: [{ type: 'silence', duration: 1.5 }, { type: 'heal', amount: 70 }] }
]);
