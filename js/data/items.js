// Ítems de la tienda, con recetas estilo Dota 2. Reglas: DISEÑO.md §7.
//
// Tres clases:
//   BÁSICOS    (tier 'basic')     mejoran un solo stat (o empeoran uno del enemigo). Se pueden tener repetidos.
//                                  cost: precio.
//   COMPUESTOS (tier 'composite') se arman con básicos + el precio de la receta (recipe) y suman sus efectos.
//                                  components: claves de los básicos (se pueden repetir). Uno de cada uno como máximo.
//                                  Al comprarlo se usan los componentes que ya tenés y se paga solo lo que falta.
//   INMEDIATOS (kind 'instant')   se usan al comprarlos y no ocupan espacio: cost (número o función), desc, apply,
//                                  available (opcional).
//
// Los equipables (básicos y compuestos) ocupan un espacio del inventario (6) y dan, mientras los llevás:
//   mods     modificadores de stats (ver effects.js; str/agi/int, maxHp, hpRegen, maxMana, manaRegen también valen)
//   flags    estados (ej: 'trueStrike')
//   active   ítem activo: { cooldown, range, cast(owner, target) }. Se usa con la tecla de su casilla, 1 a 6 (ver useItem).
//            self: no necesita un enemigo en rango; aiLow: la IA lo guarda para cuando le queda poca vida.
//   hooks(item)  reacciones a eventos (opcional): función que devuelve el objeto de hooks
//   special  texto de lo que hacen los hooks/flags (el resto de la descripción se arma solo con los mods)
//   counters texto de qué contrarresta
//   group    grupo en la tienda y en el códice

// Libros de talento (ver talentBook abajo): +5 a un atributo; 500g el primero y +250g por cada uno comprado.
const TALENT_BOOK = { amount: 5, baseCost: 500, costStep: 250 };

const ITEMS = {
    // ============================================================ BÁSICOS
    BRANCH_STR: { key: 'BRANCH_STR', name: 'Rama de Fuerza', tier: 'basic', cost: 50, mods: { str: 4 } },
    BRANCH_AGI: { key: 'BRANCH_AGI', name: 'Rama de Agilidad', tier: 'basic', cost: 50, mods: { agi: 4 } },
    BRANCH_INT: { key: 'BRANCH_INT', name: 'Rama de Inteligencia', tier: 'basic', cost: 50, mods: { int: 4 } },
    BLADE: { key: 'BLADE', name: 'Espada Corta', tier: 'basic', cost: 100, mods: { flatAtk: 10 } },
    QUICK_GLOVES: { key: 'QUICK_GLOVES', name: 'Guantes de Rapidez', tier: 'basic', cost: 90, mods: { atkSpeedPct: 0.12 } },
    FANG: { key: 'FANG', name: 'Colmillo', tier: 'basic', cost: 90, mods: { critChance: 8 } },
    CHAINMAIL: { key: 'CHAINMAIL', name: 'Cota de Malla', tier: 'basic', cost: 80, mods: { armor: 3 } },
    RUNE_CAPE: { key: 'RUNE_CAPE', name: 'Capa Rúnica', tier: 'basic', cost: 75, mods: { magicResist: 15 } },
    VITALITY: { key: 'VITALITY', name: 'Piedra de Vitalidad', tier: 'basic', cost: 90, mods: { maxHp: 80 } },
    REGEN_RING: { key: 'REGEN_RING', name: 'Anillo de Regeneración', tier: 'basic', cost: 70, mods: { hpRegen: 3 } },
    VAMP_MASK: { key: 'VAMP_MASK', name: 'Máscara Vampírica', tier: 'basic', cost: 90, mods: { lifesteal: 10 } },
    MANA_CRYSTAL: { key: 'MANA_CRYSTAL', name: 'Cristal de Maná', tier: 'basic', cost: 70, mods: { maxMana: 75, manaRegen: 1 } },
    // Amplificación de hechizo temprana (idea de la otra PC: la amplificación de los magos viene de ítems)
    KAYA: { key: 'KAYA', name: 'Kaya', tier: 'basic', cost: 100, mods: { spellAmp: 10, manaRegen: 0.8 } },
    TRAVEL_BOOTS: { key: 'TRAVEL_BOOTS', name: 'Botas de Viaje', tier: 'basic', cost: 60, mods: { moveSpeedPct: 0.1 } },
    SERRATED: {
        key: 'SERRATED', name: 'Daga Serrada', tier: 'basic', cost: 80, antiHeal: 0.3,
        special: 'Tu daño reduce 30% la curación del objetivo por 3s.',
        hooks: item => ({ onDealDamage(owner, { target }) { applyAntiHeal(target, item.antiHeal); } })
    },
    FROST_ORB: {
        key: 'FROST_ORB', name: 'Orbe Helado', tier: 'basic', cost: 90,
        special: 'Tus ataques básicos ralentizan 15% por 1,5s.',
        hooks: () => ({ onHit(owner, { target }) { applyAttackSlow(target, 0.15, 1.5); } })
    },

    // Para los que arrancan flojos: solo pega más a los creeps, así no cambia los duelos.
    STARTER_CELL: {
        key: 'STARTER_CELL', name: 'Batería de Arranque', tier: 'basic', cost: 80, creepDmg: 12,
        special: 'Tus ataques básicos hacen +12 de daño a los creeps (a los competidores, no).', counters: 'Las primeras rondas',
        hooks: item => ({ beforeAttack(owner, ctx) { if (!ctx.target.isHero) ctx.dmg += item.creepDmg; } })
    },

    // La rama de supervivencia: de la misma Célula salen salir, aguantar o frenarlos a todos.
    IMPULSE_CELL: { key: 'IMPULSE_CELL', name: 'Célula de Impulso', tier: 'basic', cost: 85, mods: { maxHp: 40, moveSpeedPct: 0.04 } },
    // La rama de control: de la misma Bobina salen cuatro ítems, según lo que pida la partida.
    COIL: { key: 'COIL', name: 'Bobina de Choque', tier: 'basic', cost: 95, mods: { flatAtk: 5, int: 3 } },

    // ============================================================ COMPUESTOS
    // --- Atributos ---
    BELT: { key: 'BELT', name: 'Cinturón de Fuerza', tier: 'composite', group: 'Atributos', components: ['BRANCH_STR', 'BRANCH_STR'], recipe: 40, mods: { str: 14 } },
    GLOVES: { key: 'GLOVES', name: 'Guantes de Celeridad', tier: 'composite', group: 'Atributos', components: ['BRANCH_AGI', 'BRANCH_AGI'], recipe: 40, mods: { agi: 14 } },
    TOME: { key: 'TOME', name: 'Túnica del Mago', tier: 'composite', group: 'Atributos', components: ['BRANCH_INT', 'BRANCH_INT'], recipe: 40, mods: { int: 14 } },
    DIADEM: { key: 'DIADEM', name: 'Diadema del Equilibrio', tier: 'composite', group: 'Atributos', components: ['BRANCH_STR', 'BRANCH_AGI', 'BRANCH_INT'], recipe: 60, mods: { str: 8, agi: 8, int: 8 } },
    // Escala con la partida: da poco al comprarlo y mucho si lo comprás temprano.
    EVO_CORE: {
        key: 'EVO_CORE', name: 'Núcleo Evolutivo', tier: 'composite', group: 'Atributos', components: ['BRANCH_STR', 'BRANCH_AGI', 'BRANCH_INT'], recipe: 180,
        killsPerPoint: 10, mods: { str: 2, agi: 2, int: 2 }, special: 'Cada 10 creeps que matás: +1 permanente a tu atributo principal.',
        hooks: item => ({ onKill(owner, { victim }) {
            if (victim.isHero) return;
            owner.evoKills = (owner.evoKills || 0) + 1;
            if (owner.evoKills % item.killsPerPoint === 0) grantPermanent(owner, owner.primaryAttr.toLowerCase(), 1, item.name);
        } })
    },

    // --- Ataque ---
    TRUESTRIKE: {
        key: 'TRUESTRIKE', name: 'Hoja Certera', tier: 'composite', group: 'Ataque', components: ['BLADE', 'QUICK_GLOVES'], recipe: 30,
        mods: { flatAtk: 15, atkSpeedPct: 0.12 }, flags: ['trueStrike'], special: 'Tus ataques básicos no se pueden esquivar.', counters: 'Drones Fantasma y evasión'
    },
    HAMMER: {
        key: 'HAMMER', name: 'Martillo Rompecorazas', tier: 'composite', group: 'Ataque', components: ['BLADE', 'BLADE'], recipe: 20,
        armorPerHit: 2, maxStacks: 4, mods: { flatAtk: 22 },
        special: 'Cada ataque básico quita 2 de armadura al objetivo por 4s (acumula hasta 4 veces).', counters: 'Drones Blindados y armadura alta',
        hooks: item => ({ onHit(owner, { target }) { applyArmorBreak(target, item.armorPerHit, item.maxStacks, 4); } })
    },
    SWIFT_BLADE: { key: 'SWIFT_BLADE', name: 'Hoja Veloz', tier: 'composite', group: 'Ataque', components: ['FANG', 'QUICK_GLOVES'], recipe: 60, mods: { critChance: 15, atkSpeedPct: 0.22 } },

    // --- Robo de vida y anticuración ---
    CRIMSON: {
        key: 'CRIMSON', name: 'Sed Carmesí', tier: 'composite', group: 'Robo de vida y anticuración', components: ['VAMP_MASK', 'BLADE'], recipe: 50,
        mods: { flatAtk: 12, lifesteal: 18 }, special: 'Por debajo del 30% de vida, tu robo de vida se duplica.',
        hooks: () => ({ beforeLifesteal(owner, ctx) { if (owner.hp / owner.maxHp < 0.3) ctx.mult *= 2; } })
    },
    SPEAR: {
        key: 'SPEAR', name: 'Lanza Cortacuras', tier: 'composite', group: 'Robo de vida y anticuración', components: ['SERRATED', 'BLADE'], recipe: 30,
        antiHeal: 0.6, mods: { flatAtk: 12 }, special: 'Tu daño reduce 60% la curación del objetivo por 3s.', counters: 'Sanadores y robo de vida',
        hooks: item => ({ onDealDamage(owner, { target }) { applyAntiHeal(target, item.antiHeal); } })
    },
    SKADI: {
        key: 'SKADI', name: 'Ojo de Invierno', tier: 'composite', group: 'Robo de vida y anticuración', components: ['FROST_ORB', 'BRANCH_STR', 'BRANCH_AGI', 'BRANCH_INT'], recipe: 80,
        mods: { str: 7, agi: 7, int: 7 }, special: 'Tus ataques básicos ralentizan 30% por 2s y reducen 40% la curación del objetivo.',
        hooks: () => ({ onHit(owner, { target }) { applyAttackSlow(target, 0.3, 2); applyAntiHeal(target, 0.4, 2); } })
    },

    // --- Defensa y tanque ---
    CLOAK: {
        key: 'CLOAK', name: 'Capa Antimagia', tier: 'composite', group: 'Defensa y tanque', components: ['RUNE_CAPE', 'REGEN_RING'], recipe: 20,
        mods: { magicResist: 25, hpRegen: 3 }, counters: 'Drones Emisores, Hackers y daño mágico'
    },
    BOOTS: {
        key: 'BOOTS', name: 'Botas Firmes', tier: 'composite', group: 'Defensa y tanque', components: ['TRAVEL_BOOTS', 'CHAINMAIL'], recipe: 30,
        mods: { moveSpeedPct: 0.1, armor: 3, statusResist: 0.4 }, counters: 'Drones Picana, Criogénicos y control'
    },
    THORNS: {
        key: 'THORNS', name: 'Coraza de Espinas', tier: 'composite', group: 'Defensa y tanque', components: ['CHAINMAIL', 'VITALITY'], recipe: 50,
        reflect: 0.3, mods: { armor: 5, maxHp: 100 }, special: 'Devuelve como daño puro el 30% del daño físico que te hacen cuerpo a cuerpo.', counters: 'Muchos enemigos cuerpo a cuerpo',
        hooks: item => ({ onDamaged(owner, { source, dealt, type }) {
            if (source && source.isAlive() && type === 'physical' && (source.isHero ? source.attackRange : source.range) <= 2 && dealt > 0) dealDamage(owner, source, dealt * item.reflect, 'pure');
        } })
    },
    HEART: {
        key: 'HEART', name: 'Corazón del Titán', tier: 'composite', group: 'Defensa y tanque', components: ['VITALITY', 'VITALITY', 'REGEN_RING'], recipe: 120,
        regenPct: 0.015, mods: { maxHp: 250 }, special: 'Regenerás 1,5% de tu vida máxima por segundo.', counters: 'Drones Francotiradores y desgaste',
        hooks: item => ({ onTick(owner, { dt }) { if (owner.isAlive() && everyInterval(owner, 'HEART', dt)) healUnit(owner, owner.maxHp * item.regenPct); } })
    },
    AEGIS: {
        key: 'AEGIS', name: 'Égida Inquebrantable', tier: 'composite', group: 'Defensa y tanque', components: ['RUNE_CAPE', 'VITALITY', 'BRANCH_STR'], recipe: 90,
        threshold: 0.4, immuneFor: 4, cooldown: 35, mods: { magicResist: 15, maxHp: 80, str: 4 },
        special: 'Si quedás por debajo del 40% de vida: INMUNIDAD MÁGICA 4s (no recibís daño mágico ni aturdimientos ni ralentizaciones). Una vez cada 35s.',
        counters: 'Drones Hackers, magia y control',
        hooks: item => ({ onDamaged(owner) {
            if (!owner.isAlive() || owner.hp / owner.maxHp >= item.threshold || getEffect(owner, 'AEGIS_CD')) return;
            addEffect(owner, { id: 'AEGIS_IMMUNE', name: 'Inmunidad mágica', duration: item.immuneFor, tags: ['MEJORA'], flags: ['magicImmune'] });
            addEffect(owner, { id: 'AEGIS_CD', name: 'Égida (recargando)', duration: item.cooldown });
            log('🛡️ ¡Égida Inquebrantable! Inmunidad mágica por 4s.');
        } })
    },

    BOSS_PLATE: {
        key: 'BOSS_PLATE', name: 'Placa de Producción', tier: 'composite', group: 'Defensa y tanque', components: ['VITALITY', 'RUNE_CAPE'], recipe: 110,
        mods: { maxHp: 120, bossDmgTakenPct: -0.3 }, counters: 'Los jefes de ronda'
    },
    EMERGENCY_CELL: {
        key: 'EMERGENCY_CELL', name: 'Carga de Emergencia', tier: 'composite', group: 'Defensa y tanque', components: ['REGEN_RING', 'MANA_CRYSTAL'], recipe: 90,
        threshold: 0.35, refill: 0.3, cooldown: 45, mods: { hpRegen: 3, manaRegen: 1 },
        special: 'Si quedás por debajo del 35% de vida: recuperás 30% de tu vida y tu maná máximos. Una vez cada 45s.', counters: 'Peleas largas y ráfagas',
        hooks: item => ({ onDamaged(owner) {
            if (!owner.isAlive() || owner.hp / owner.maxHp >= item.threshold || getEffect(owner, 'EMERGENCY_CD')) return;
            addEffect(owner, { id: 'EMERGENCY_CD', name: 'Carga (recargando)', duration: item.cooldown, flags: ['persistent'] });
            healUnit(owner, owner.maxHp * item.refill);
            owner.mana = Math.min(owner.maxMana, owner.mana + owner.maxMana * item.refill);
        } })
    },

    // --- Control ---
    INHIBITOR: {
        key: 'INHIBITOR', name: 'Inhibidor de Señal', tier: 'composite', group: 'Control', components: ['COIL', 'MANA_CRYSTAL'], recipe: 110,
        mods: { int: 8, manaRegen: 1.5 }, silence: 2.5, counters: 'Magos y definitivas',
        special: 'ACTIVO (tecla de su casilla, 1 a 6): silencia 2,5 s al enemigo más cercano a 5 casillas o menos. Enfriamiento: 24 s.',
        active: { cooldown: 24, range: 5, cast(owner, target) { addEffect(target, { id: 'SILENCE', name: 'Callado', duration: ITEMS.INHIBITOR.silence, flags: ['silence'], tags: ['CONTROL'] }); fxText(target, 'CALLADO', '#c77dff', 12, 0.8); } }
    },
    SHOCK_MACE: {
        key: 'SHOCK_MACE', name: 'Maza de Choque', tier: 'composite', group: 'Control', components: ['COIL', 'BLADE'], recipe: 130,
        mods: { flatAtk: 16 }, stun: 1.2, counters: 'Golpes anunciados y canalizaciones',
        special: 'ACTIVO (tecla de su casilla, 1 a 6): aturde 1,2 s al enemigo más cercano a 3 casillas o menos. Enfriamiento: 26 s.',
        active: { cooldown: 26, range: 3, cast(owner, target) { addEffect(target, { id: 'STUN', name: 'Aturdido', duration: ITEMS.SHOCK_MACE.stun, flags: ['stun'] }); fxText(target, '¡CHOQUE!', '#f2c230', 12, 0.8); } }
    },
    NET_GUN: {
        key: 'NET_GUN', name: 'Lanzarredes', tier: 'composite', group: 'Control', components: ['COIL', 'VITALITY'], recipe: 100,
        mods: { maxHp: 120 }, root: 2.5, counters: 'Los que escapan y los cuerpo a cuerpo',
        special: 'ACTIVO (tecla de su casilla, 1 a 6): atrapa 2,5 s al enemigo más cercano a 6 casillas o menos: no camina, pero puede pegar. Enfriamiento: 20 s.',
        active: { cooldown: 20, range: 6, cast(owner, target) { applyRoot(target, ITEMS.NET_GUN.root); } }
    },
    CLAMP: {
        key: 'CLAMP', name: 'Tenaza Magnética', tier: 'composite', group: 'Control', components: ['COIL', 'QUICK_GLOVES'], recipe: 90,
        mods: { flatAtk: 8, atkSpeedPct: 0.15 }, every: 5, root: 1.2, counters: 'Los que no se quedan quietos',
        special: 'Cada 5 ataques básicos, atrapás 1,2 s a tu objetivo: no camina, pero puede pegar.',
        hooks: item => ({ onHit(owner, { target }) {
            owner.clampHits = (owner.clampHits || 0) + 1;
            if (owner.clampHits % item.every === 0) applyRoot(target, item.root);
        } })
    },

    // --- Supervivencia ---
    JET_PACK: {
        key: 'JET_PACK', name: 'Mochila Cohete', tier: 'composite', group: 'Supervivencia', components: ['IMPULSE_CELL', 'TRAVEL_BOOTS'], recipe: 120,
        mods: { moveSpeedPct: 0.12 }, jump: 5, counters: 'Golpes anunciados y los que te encierran',
        special: 'ACTIVO (tecla de su casilla, 1 a 6): saltás hasta 5 casillas hacia el cursor. Enfriamiento: 18 s.',
        active: { cooldown: 18, self: true, aiLow: true, range: 4, cast(owner, target) { jumpWith(owner, target, ITEMS.JET_PACK.jump); } }
    },
    STASIS_DOME: {
        key: 'STASIS_DOME', name: 'Domo de Contención', tier: 'composite', group: 'Supervivencia', components: ['IMPULSE_CELL', 'CHAINMAIL'], recipe: 130,
        mods: { armor: 4, maxHp: 80 }, stasis: 2, counters: 'Jefes y golpes que te rematan',
        special: 'ACTIVO (tecla de su casilla, 1 a 6): 2 s sin recibir daño, pero tampoco podés pegar ni tirar habilidades. Enfriamiento: 40 s.',
        active: { cooldown: 40, self: true, aiLow: true, range: 4, cast(owner) {
            addEffect(owner, { id: 'STASIS', name: 'Domo', duration: ITEMS.STASIS_DOME.stasis, tags: ['MEJORA'], flags: ['invulnerable', 'disarm', 'silence'] });
            fxText(owner, '¡DOMO!', '#ff9a2e', 12, 0.8);
        } }
    },
    PULSE_WAVE: {
        key: 'PULSE_WAVE', name: 'Onda de Choque', tier: 'composite', group: 'Supervivencia', components: ['IMPULSE_CELL', 'FROST_ORB'], recipe: 110,
        mods: { hpRegen: 3, maxHp: 60 }, radius: 3, slow: 0.4, slowFor: 3, dmg: 80, counters: 'Enjambres y los que te persiguen',
        special: 'ACTIVO (tecla de su casilla, 1 a 6): 80 de daño mágico a los enemigos a 3 casillas o menos, y los frena 40% por 3 s. Enfriamiento: 22 s.',
        active: { cooldown: 22, range: 3, cast(owner) {
            const item = ITEMS.PULSE_WAVE;
            enemiesOf(owner).filter(c => c.isAlive() && distance(owner, c) <= item.radius).forEach(c => {
                dealDamage(owner, c, item.dmg, 'magical');
                addEffect(c, { id: 'PULSE_SLOW', name: 'Frenado', duration: item.slowFor, tags: ['PERJUICIO'], mods: { moveSpeedPct: -item.slow } });
            });
            if (fxArena(owner)) fxRing(owner, '#ff9a2e', item.radius, 0.35);
        } }
    },

    // --- Magia ---
    ARCANE_STAFF: {
        key: 'ARCANE_STAFF', name: 'Báculo Arcano', tier: 'composite', group: 'Magia', components: ['BRANCH_INT', 'MANA_CRYSTAL'], recipe: 60,
        mods: { int: 6, maxMana: 150, manaRegen: 2, spellAmp: 15 }
    },
    // Hace que los hechizos escalen en late game: el daño extra depende de la vida máxima del objetivo (los jefes y los
    // creeps crecen +10% por ronda; la amplificación sola no los alcanza).
    ECLIPSE_STAFF: {
        key: 'ECLIPSE_STAFF', name: 'Cetro del Eclipse', tier: 'composite', group: 'Magia', components: ['KAYA', 'KAYA'], recipe: 150,
        mods: { spellAmp: 25, manaRegen: 1.6 }, maxHpPct: 0.025, perTargetEvery: 1,
        special: 'Tu daño mágico suma además 2,5% de la vida máxima del objetivo como daño puro (una vez por segundo por enemigo).',
        counters: 'Jefes y enemigos con mucha vida',
        hooks: item => ({
            onDealDamage(owner, { target, type }) {
                if (type !== 'magical' || !target.isAlive()) return;
                const key = '__eclipse_' + (owner.key || '');
                if (gameClock < (target[key] || 0)) return;
                target[key] = gameClock + item.perTargetEvery;
                dealDamage(owner, target, Math.round(target.maxHp * item.maxHpPct), 'pure');
            }
        })
    },

    // ============================================================ INMEDIATOS (no ocupan espacio)
    // Precio provisorio (pregunta abierta en DISEÑO.md §11). Va al inventario del destino para usar o vender.
    FRAGMENT: { key: 'FRAGMENT', name: 'Fragmento del Destino', kind: 'instant', cost: 150, desc: 'Quita una de tus habilidades al azar (devuelve sus puntos) y te ofrece 4 nuevas para elegir. Se puede vender por 75g.', apply: h => { h.destiny.fragments++; } },
    // Solo aparece estando Condenado (ver death.js).
    GREED: {
        key: 'GREED', name: 'Injusticia de los Codiciosos', kind: 'instant', cost: h => greedCost(h), available: h => isCondemned(h),
        desc: 'Comprás 1 vida y dejás de estar Condenado. Si volvés a quedar sin vidas, tu castigo de daño recibido se duplica. Cada compra cuesta el doble.',
        apply: h => buyGreedLife(h)
    },
    // Libros de talento: +5 permanentes a un atributo, sin ocupar espacio. Opción de late game para el oro que sobra
    // con el inventario lleno. El precio sube con cada libro que compraste (de cualquier atributo).
    TALENT_STR: talentBook('TALENT_STR', 'Libro de Talento: Fuerza', 'str', 'Fuerza'),
    TALENT_AGI: talentBook('TALENT_AGI', 'Libro de Talento: Agilidad', 'agi', 'Agilidad'),
    TALENT_INT: talentBook('TALENT_INT', 'Libro de Talento: Inteligencia', 'int', 'Inteligencia')
};

// --- Libros de talento ---
function talentBookCost(h) { return TALENT_BOOK.baseCost + TALENT_BOOK.costStep * (h.talentBooks || 0); }
function talentBook(key, name, stat, label) {
    return {
        key, name, kind: 'instant', talent: stat, cost: h => talentBookCost(h),
        desc: `+${TALENT_BOOK.amount} ${label} permanente. No ocupa espacio. Cada libro de talento que comprás (de cualquier atributo) hace que el próximo cueste +${TALENT_BOOK.costStep}g.`,
        apply: h => { grantPermanent(h, stat, TALENT_BOOK.amount, name); h.talentBooks = (h.talentBooks || 0) + 1; }
    };
}

// Grupos de compuestos, en el orden en que se muestran.
const ITEM_GROUPS = ['Atributos', 'Ataque', 'Robo de vida y anticuración', 'Defensa y tanque', 'Supervivencia', 'Control', 'Magia'];

// --- Efectos reutilizables de los ítems ---
// Salta hasta `dist` casillas: el jugador, hacia el cursor; la IA, lejos de lo que tiene más cerca. Si el destino está
// ocupado, cae antes (no atraviesa paredes ni termina arriba de otro).
function jumpWith(owner, threat, dist) {
    const c = owner === player && !autopilot && cursorWorld();
    const dx = c ? c.x - owner.x : threat ? owner.x - threat.x : 0, dy = c ? c.y - owner.y : threat ? owner.y - threat.y : 0, len = Math.hypot(dx, dy) || 1;
    for (let d = c ? Math.min(dist, len) : dist; d >= 1; d--) {
        const x = Math.round(owner.x + dx / len * d), y = Math.round(owner.y + dy / len * d);
        if (!walkable(owner.arena, x, y) || bodiesAt(owner.arena, x, y, owner).length) continue;
        owner.x = x; owner.y = y; owner.moveTarget = null;
        emit(owner, 'onMove', { steps: Math.round(d) });
        return true;
    }
    return false;
}
function applyRoot(target, duration) {
    if (!target.isAlive()) return;
    if (addEffect(target, { id: 'ROOT', name: 'Atrapado', duration, flags: ['root'], tags: ['PERJUICIO'] })) fxText(target, '¡ATRAPADO!', '#ff9a2e', 12, 0.8);
}
function applyAntiHeal(target, pct, duration = 3) {
    if (!target.isAlive()) return;
    const current = getEffect(target, 'ANTIHEAL');
    if (current && -current.mods.healingTakenPct > pct) return; // no pisa una anticuración más fuerte
    addEffect(target, { id: 'ANTIHEAL', name: 'Anticuración', duration, tags: ['PERJUICIO'], mods: { healingTakenPct: -pct } });
}
function applyAttackSlow(target, pct, duration) {
    if (target.isAlive()) addEffect(target, { id: 'ITEM_SLOW', name: 'Helado', duration, tags: ['PERJUICIO'], mods: { moveSpeedPct: -pct, atkSpeedPct: -pct } });
}
function applyArmorBreak(target, perHit, maxStacks, duration) {
    if (!target.isAlive()) return;
    const current = getEffect(target, 'ARMOR_BREAK');
    const stacks = Math.min(maxStacks, (current ? current.data.stacks : 0) + 1);
    addEffect(target, { id: 'ARMOR_BREAK', name: 'Coraza rota', duration, tags: ['PERJUICIO'], mods: { armor: -perHit * stacks }, data: { stacks } });
}
