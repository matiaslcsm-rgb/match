// Vector (Reflejos/Agilidad) — el esgrimista de la hoja de luz. Duelista de contraataque: gana leyendo al rival, no pegando más
// fuerte. Ficha aprobada por el usuario el 2026-10-30: docs/competidores/vector.md. Reemplaza al Asesino.
//   · La Guardia frena solo golpes directos (combat.js, isDirectHit): las áreas la atraviesan, y esa es una respuesta del rival.
registerHero({
    key: 'VECTOR', name: 'Vector', symbol: 'E', primaryAttr: 'AGI', role: 'Duelista de contraataque',
    attributes: { str: [18, 2.0], agi: [23, 3.2], int: [15, 1.5] },
    baseHp: 165, baseAtk: 12, baseAtkSpeed: 1.05, baseAttackRange: 1.5,
    baseArmor: 3, baseMagicResist: 15, baseHpRegen: 1.5,
    baseMaxMana: 110, baseManaRegen: 1.4, baseMoveSpeed: 3.4, baseProjectileSpeed: 0,
    baseCritChance: 10, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 8,
    description: 'Reflejos: el esgrimista favorito de la tribuna. Espera tu golpe con la Guardia y te lo devuelve. Se le gana sin pegarle en guardia: amagar y castigarlo cuando queda expuesto, o usar área.',
    scaling: { stat: 'atk', perKills: 8, perKillsAmount: 1.5, perHeroKill: 4 },
    innate: {
        id: 'VECTOR_FIRST', name: 'Primera Sangre', rest: 4, bonus: 0.5,
        tags: ['FÍSICO', 'AL_GOLPEAR'],
        description: 'Innato: el primer ataque básico después de 4 s sin pegar sale con +50% de daño y no se puede esquivar.',
        hooks: {
            onTick(owner, payload, innate) {
                if (gameClock - (owner.lastStrikeAt ?? -Infinity) >= innate.rest && !getEffect(owner, 'VECTOR_FIRST'))
                    addEffect(owner, { id: 'VECTOR_FIRST', name: 'Primera Sangre', duration: Infinity, flags: ['trueStrike'], tags: ['MEJORA'] });
            },
            beforeAttack(owner, ctx, innate) { if (getEffect(owner, 'VECTOR_FIRST')) ctx.dmg *= 1 + innate.bonus; },
            onHit(owner) { owner.lastStrikeAt = gameClock; removeEffect(owner, 'VECTOR_FIRST'); }
        }
    }
}, {
    VECTOR_GUARD: {
        id: 'VECTOR_GUARD', name: 'Guardia', kind: 'active',
        aiMaxDist: 2.5, // la levanta con el rival encima
        tags: ['MEJORA', 'CONTROL'],
        values: { cooldown: [9, 8.5, 8, 7.5], manaCost: 30, duration: 0.8, counterMult: [1.6, 2, 2.4, 2.8], stun: 0.6, exposed: 0.5 },
        description: 'Te ponés en guardia {duration}s. Si te pegan un golpe directo (un ataque o una habilidad que no sea de área), lo anulás y respondés con {counterMult%} de tu daño físico, que aturde {stun}s. Si nadie te pega, quedás expuesto {exposed}s.',
        cast(caster) {
            const skill = this;
            addEffect(caster, {
                id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: ['MEJORA'], flags: ['guard'],
                hooks: {
                    onExpire(owner) { owner.exposedUntil = gameClock + val(skill, owner, 'exposed'); },
                    onGuard(owner, { source }) {
                        removeEffect(owner, skill.id);
                        const marked = getEffect(source, 'VECTOR_MARK'), ult = marked && owner.skills.find(s => s.id === 'VECTOR_MATCHPOINT');
                        dealDamage(owner, source, Math.round(owner.atk * val(skill, owner, 'counterMult') * (ult ? val(ult, owner, 'counterBonus') : 1)), 'physical');
                        if (source.isAlive()) addEffect(source, { id: 'STUN', name: 'Aturdido', duration: val(skill, owner, 'stun'), flags: ['stun'] });
                        else if (ult) owner.cooldowns[skill.id] = 0; // lo mató marcado: se reinicia la Guardia
                        fxText(owner, '¡CONTRA!', '#ff9a2e', 12, 0.8);
                    }
                }
            });
            log('🤺 ¡En guardia!');
            return true;
        }
    },
    VECTOR_LUNGE: {
        id: 'VECTOR_LUNGE', name: 'Estocada', kind: 'active',
        tags: ['FÍSICO', 'MOVILIDAD'],
        values: { cooldown: [8, 7.5, 7, 6.5], manaCost: 30, range: 4, cells: 3, dmgMult: [1, 1.25, 1.5, 1.75] },
        description: 'Avanzás hasta {cells} casillas en línea recta hacia el enemigo más cercano (hasta {range}) y le hacés {dmgMult%} de tu daño físico a todo lo que cruzás.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range') + 0.5);
            if (!target) { log('Estocada: sin objetivo en rango.'); return false; }
            const x0 = caster.x, y0 = caster.y, d = distance(caster, target) || 1;
            const { moved } = dragUnit(caster, (target.x - x0) / d, (target.y - y0) / d, val(this, caster, 'cells'));
            if (moved) emit(caster, 'onMove', { steps: moved });
            const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult')), fx = caster.x - x0, fy = caster.y - y0, len = fx * fx + fy * fy || 1;
            enemiesOf(caster).filter(c => c.isAlive()).forEach(c => {
                const k = Math.max(0, Math.min(1, ((c.x - x0) * fx + (c.y - y0) * fy) / len)); // el punto del camino más cercano
                if (Math.hypot(c.x - (x0 + fx * k), c.y - (y0 + fy * k)) <= 1.5) dealDamage(caster, c, dmg, 'physical');
            });
            return true;
        }
    },
    VECTOR_FEINT: {
        id: 'VECTOR_FEINT', name: 'Amago', kind: 'active',
        aiHeroOnly: true, // contra creeps no sirve: no tiran habilidades
        tags: ['CONTROL'],
        values: { cooldown: [14, 13, 12, 11], manaCost: 30, range: 5, duration: 2, delay: [0.4, 0.45, 0.5, 0.55] },
        description: 'Amagás al rival más cercano (rango {range}): su próxima habilidad en los siguientes {duration}s tarda {delay}s más en salir y se puede cortar aturdiéndolo.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target || !target.isHero) { log('Amago: no hay un rival en rango.'); return false; }
            addEffect(target, { id: 'VECTOR_FEINT', name: 'Amagado', duration: val(this, caster, 'duration'), tags: ['PERJUICIO'], data: { delay: val(this, caster, 'delay') } });
            fxText(target, '¡AMAGO!', '#f2c230', 12, 0.8);
            return true;
        }
    },
    VECTOR_RHYTHM: {
        id: 'VECTOR_RHYTHM', name: 'Ritmo de Pista', kind: 'passive',
        tags: ['MEJORA'],
        values: { cooldownCut: [0.2, 0.3, 0.4, 0.5] },
        description: 'Pasiva: cada contraataque exitoso baja {cooldownCut%} el enfriamiento que les queda a tus otras habilidades.',
        hooks: {
            onGuard(owner) {
                const cut = 1 - val(this, owner, 'cooldownCut');
                owner.skills.forEach(s => { if (s.id !== 'VECTOR_GUARD' && owner.cooldowns[s.id] > 0) owner.cooldowns[s.id] *= cut; });
            }
        }
    },
    VECTOR_MATCHPOINT: {
        id: 'VECTOR_MATCHPOINT', name: 'Punto de Partido', kind: 'active', isUltimate: true,
        tags: ['CONTROL', 'MEJORA'],
        values: { cooldown: [60, 50, 40], manaCost: [90, 110, 130], range: 5, duration: 6, counterBonus: 2, taken: [0.15, 0.2, 0.25] },
        description: 'DEFINITIVA. Marcás al enemigo más cercano (rango {range}) por {duration}s: recibe {taken%} más de daño y tus contraataques le pegan el doble. Si lo matás con uno, se reinicia la Guardia.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Punto de Partido: sin objetivo.'); return false; }
            addEffect(target, { id: 'VECTOR_MARK', name: 'Punto de Partido', duration: val(this, caster, 'duration'), tags: ['PERJUICIO'], mods: { dmgTakenPct: val(this, caster, 'taken') } });
            fxText(target, '¡MATCH POINT!', '#ff9a2e', 13, 1);
            log(`🎯 ¡Punto de Partido sobre ${target.label}!`);
            return true;
        }
    }
});
