// Grúa (Blindaje/Fuerza) — la operaria del brazo-grúa del estadio. Control cuerpo a cuerpo: te trae hacia ella y te castiga
// contra las columnas. Ficha aprobada por el usuario el 2026-10-30: docs/competidores/grua.md. Reemplaza a Axe.
registerHero({
    key: 'CRANE', name: 'Grúa', symbol: 'G', primaryAttr: 'STR', role: 'Control cuerpo a cuerpo',
    attributes: { str: [24, 2.8], agi: [12, 1.4], int: [14, 1.6] },
    baseHp: 190, baseAtk: 16, baseAtkSpeed: 0.95, baseAttackRange: 1.5,
    baseArmor: 5, baseMagicResist: 25, baseHpRegen: 3,
    baseMaxMana: 110, baseManaRegen: 1.3, baseMoveSpeed: 3.2, baseProjectileSpeed: 0,
    baseCritChance: 5, baseEvasion: 0, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Blindaje: la operaria de la grúa del estadio. Engancha, arrastra y castiga contra las columnas. Se le gana corriéndose de la línea del gancho y sin pelear pegado a una columna.',
    scaling: { stat: 'atk', perKills: 8, perKillsAmount: 2, perHeroKill: 5 },
    innate: {
        id: 'CRANE_LOAD', name: 'Carga Pesada', bonus: 0.4, duration: 5,
        tags: ['FÍSICO', 'AL_GOLPEAR'],
        description: 'Innato: cada vez que enganchás o empujás a un rival, tu próximo ataque básico pega +40%.',
        hooks: {
            onForcedMove(owner, payload, innate) { addEffect(owner, { id: 'CRANE_LOAD', name: 'Carga Pesada', duration: innate.duration, tags: ['MEJORA'] }); },
            beforeAttack(owner, ctx, innate) {
                if (!getEffect(owner, 'CRANE_LOAD')) return;
                removeEffect(owner, 'CRANE_LOAD');
                ctx.dmg *= 1 + innate.bonus;
            }
        }
    }
}, {
    CRANE_HOOK: {
        id: 'CRANE_HOOK', name: 'Gancho', kind: 'active', pointTarget: true, windup: 0.7, // golpe anunciado (game.js)
        aiMinDist: 2, // pegado al rival no hay nada que arrastrar
        tags: ['FÍSICO', 'CONTROL'],
        values: { cooldown: [11, 10, 9, 8], manaCost: 40, baseDmg: [40, 70, 100, 130], atkRatio: 0.6, range: 7, radius: 0.6, speed: 16, wallStun: 1, missExposed: 1 },
        description: 'Tirás el gancho hacia donde apuntes (rango {range}): {baseDmg} + {atkRatio%} de tu daño físico al primero que toca, y lo arrastrás hasta vos. Si choca una columna en el camino, queda aturdido {wallStun}s. Se anuncia: una línea en el piso. Si fallás, quedás expuesta {missExposed}s.',
        vfx: { color: '#f2c230' },
        cast(caster) {
            const aim = caster.aimPoint || nearestEnemy(caster, val(this, caster, 'range'));
            if (!aim) { log('Gancho: sin objetivo.'); return false; }
            const stun = val(this, caster, 'wallStun'), exposed = val(this, caster, 'missExposed');
            fireSkillProjectile(caster, {
                tx: aim.x, ty: aim.y, speed: val(this, caster, 'speed'), radius: val(this, caster, 'radius'), stopOnHit: true,
                dmg: val(this, caster, 'baseDmg') + caster.atk * val(this, caster, 'atkRatio'), dmgType: 'physical', vfx: this.vfx, skillName: this.name,
                onHit: c => {
                    if (!c.isAlive() || !caster.isAlive()) return;
                    const d = distance(caster, c), { wall } = dragUnit(c, (caster.x - c.x) / d, (caster.y - c.y) / d, Math.round(d) - 1);
                    if (wall) addEffect(c, { id: 'STUN', name: 'Aturdido', duration: stun, flags: ['stun'] });
                    emit(caster, 'onForcedMove', { target: c }); // también al que no se mueve: el golpe de carga vale contra un jefe
                },
                onArrive: () => { caster.exposedUntil = gameClock + exposed; }
            });
            log('🪝 ¡Gancho!');
            return true;
        }
    },
    CRANE_BEAM: {
        id: 'CRANE_BEAM', name: 'Viga', kind: 'active',
        tags: ['FÍSICO', 'ÁREA'],
        values: { cooldown: [8, 7.5, 7, 6.5], manaCost: 35, dmgMult: [0.9, 1.1, 1.3, 1.5], radius: 2, push: 2 },
        description: 'Barrés con la viga en semicírculo, hacia el enemigo más cercano: {dmgMult%} de tu daño físico a los que estén a {radius} casillas o menos, y los empujás {push} casillas.',
        cast(caster) {
            const radius = val(this, caster, 'radius'), first = nearestEnemy(caster, radius + 0.5);
            if (!first) { log('Viga: sin objetivo en rango.'); return false; }
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult')), fx = first.x - caster.x, fy = first.y - caster.y;
            enemiesOf(caster).filter(c => c.isAlive() && distance(caster, c) <= radius + 0.5 && (c.x - caster.x) * fx + (c.y - caster.y) * fy >= 0).forEach(c => {
                dealDamage(caster, c, dmg, 'physical');
                if (!c.isAlive()) return;
                const d = distance(caster, c) || 1;
                dragUnit(c, (c.x - caster.x) / d, (c.y - caster.y) / d, val(this, caster, 'push'));
                emit(caster, 'onForcedMove', { target: c });
            });
            log('🏗️ ¡Viga!');
            return true;
        }
    },
    CRANE_ANCHOR: {
        id: 'CRANE_ANCHOR', name: 'Contrapeso', kind: 'active',
        aiMaxDist: 2, // anclarse lejos es no llegar nunca a los que tiran de lejos
        tags: ['MEJORA'],
        values: { cooldown: [16, 15, 14, 13], manaCost: 40, duration: 3, dmgReduction: [0.2, 0.25, 0.3, 0.35], slow: 0.4 },
        description: 'Te anclás {duration}s: no te pueden mover y recibís {dmgReduction%} menos de daño, pero caminás {slow%} más lento.',
        cast(caster) {
            addEffect(caster, { id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: ['MEJORA'], flags: ['anchored'],
                mods: { dmgReduction: val(this, caster, 'dmgReduction'), moveSpeedPct: -val(this, caster, 'slow') } });
            log('⚓ ¡Contrapeso!');
            return true;
        }
    },
    CRANE_CABIN: {
        id: 'CRANE_CABIN', name: 'Cabina Reforzada', kind: 'passive',
        tags: ['MEJORA', 'AL_RECIBIR_DAÑO'],
        values: { threshold: 0.4, shieldPct: [0.12, 0.15, 0.18, 0.21], duration: 8 },
        description: 'Pasiva: la primera vez que bajás del {threshold%} de vida en cada pelea, ganás por {duration}s un escudo igual al {shieldPct%} de tu vida máxima.',
        hooks: {
            onDamaged(owner) {
                if (!owner.isAlive() || owner.hp / owner.maxHp >= val(this, owner, 'threshold') || owner.cabinArena === owner.arena) return;
                owner.cabinArena = owner.arena;
                addShield(owner, owner.maxHp * val(this, owner, 'shieldPct'), val(this, owner, 'duration'), this.name);
            }
        }
    },
    CRANE_DEMOLITION: {
        id: 'CRANE_DEMOLITION', name: 'Demolición', kind: 'active', isUltimate: true, pointTarget: true, windup: 1,
        tags: ['FÍSICO', 'ÁREA', 'CONTROL'],
        values: { cooldown: [60, 50, 40], manaCost: [100, 120, 140], baseDmg: [120, 200, 280], atkRatio: 1.5, range: 6, radius: 3, center: 1.3, stun: 1.5 },
        description: 'DEFINITIVA. Marcás una zona de radio {radius} (rango {range}) y cae una carga desde arriba: {baseDmg} + {atkRatio%} de tu daño físico. Al que esté en el centro lo aturde {stun}s. Se anuncia 1 s antes.',
        vfx: { color: '#ff9a2e' },
        cast(caster) {
            const range = val(this, caster, 'range');
            const aim = caster.aimPoint || nearestEnemy(caster, range);
            if (!aim) { log('Demolición: sin objetivo.'); return false; }
            const center = val(this, caster, 'center'), stun = val(this, caster, 'stun'), at = { x: aim.x, y: aim.y };
            fireSkillProjectile(caster, { // cae en el lugar: el proyectil nace y termina en la marca
                x: at.x, y: at.y, tx: at.x + 0.01, ty: at.y, speed: 99, radius: val(this, caster, 'radius'),
                dmg: val(this, caster, 'baseDmg') + caster.atk * val(this, caster, 'atkRatio'), dmgType: 'physical', vfx: this.vfx, skillName: this.name,
                onHit: c => { if (c.isAlive() && Math.hypot(c.x - at.x, c.y - at.y) <= center) addEffect(c, { id: 'STUN', name: 'Aturdido', duration: stun, flags: ['stun'] }); }
            });
            if (fxArena(caster)) fxRing(at, '#ff9a2e', val(this, caster, 'radius'), 0.5);
            log('💥 ¡DEMOLICIÓN!');
            return true;
        }
    }
});
