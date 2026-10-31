// M.O.R.T.I.S. (Inteligencia), el nigromante robótico (2026-10-31, ficha del usuario: docs/competidores/mortis.md). Reemplaza al
// Nigromante; las claves internas siguen siendo NECROMANCER. Desgasta con un aura, ata y remata con el Sello, y levanta
// Autómatas (minions.js) que repiten su Eco y detona con la definitiva.
registerHero({
    key: 'NECROMANCER', name: 'M.O.R.T.I.S.', symbol: 'N', primaryAttr: 'INT', role: 'Desgaste e invocación a distancia',
    attributes: { str: [19, 2.2], agi: [14, 1.4], int: [24, 3.2] },
    baseHp: 195, baseAtk: 12, baseAtkSpeed: 0.95, baseAttackRange: 3,
    baseArmor: 3, baseMagicResist: 30, baseHpRegen: 0.5,
    baseMaxMana: 130, baseManaRegen: 1.8, baseMoveSpeed: 2.6, baseProjectileSpeed: 8,
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: nigromante robótico flotante. Corroe con su aura, ata con el Sello, levanta Autómatas y los detona.',
    scaling: { stat: 'lifesteal', perKills: 10, perKillsAmount: 1, perHeroKill: 5 },
    innate: {
        id: 'NECROMANCER_INNATE', name: 'Sadista', tags: ['CURACIÓN', 'AL_MATAR'],
        description: 'Innato: cada baja te da una carga de regeneración de vida y maná (+3/s cada una) por 7s, hasta 6 cargas. Si es un competidor, suma 6 cargas de una.',
        regenPerStack: 3, maxStacks: 6, duration: 7, heroKillStacks: 6,
        hooks: {
            onKill(owner, { victim }) {
                const current = getEffect(owner, 'NECROMANCER_SADIST');
                const gained = (victim && victim.isHero) ? this.heroKillStacks : 1;
                const stacks = Math.min(this.maxStacks, (current ? current.data.stacks : 0) + gained);
                addEffect(owner, {
                    id: 'NECROMANCER_SADIST', name: `Sadista x${stacks}`, duration: this.duration, tags: ['MEJORA'],
                    mods: { hpRegen: this.regenPerStack * stacks, manaRegen: this.regenPerStack * stacks }, data: { stacks }
                });
            }
        }
    }
}, {
    NECROMANCER_SEAL: {
        id: 'NECROMANCER_SEAL', name: 'Sello de Putrefacción', kind: 'active',
        tags: ['MÁGICO', 'CONTROL', 'AL_MATAR'],
        values: { cooldown: [12, 11, 10, 8], manaCost: [70, 85, 100, 115], range: 6, duration: [1.2, 1.5, 1.8, 2.1], baseDmg: [60, 110, 160, 210], intRatio: 0.4, missingPct: [0.08, 0.12, 0.16, 0.2], summonWindow: 2 },
        description: 'Ata al enemigo objetivo (rango {range}) por {duration}s: no se mueve, pero puede atacar y lanzar. Le hace {baseDmg} + {intRatio%} de tu Inteligencia + {missingPct%} de la vida que le falta como daño mágico. Si muere con el sello o hasta {summonWindow}s después, aparece un Autómata.',
        cast(caster) {
            const target = nearestEnemy(caster, val(this, caster, 'range'));
            if (!target) { log('Sello de Putrefacción: sin objetivo en rango.'); return false; }
            const duration = val(this, caster, 'duration'), window = duration + val(this, caster, 'summonWindow');
            addEffect(target, { id: 'ROOT', name: 'Sellado', duration, flags: ['root'], tags: ['PERJUICIO'] });
            // Mira si cae el sellado: va en el que lanzó, así vale para cualquiera que saque el Sello en el draft
            addEffect(caster, { id: 'NECROMANCER_SEAL_WATCH', name: 'Sello', duration: window, flags: ['passive'], hooks: { onKill(owner, { victim }) { if (victim === target) summonAutomaton(owner, victim); } } });
            fxRing(target, '#7dff9b', 1.2, duration);
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio') + (target.maxHp - target.hp) * val(this, caster, 'missingPct');
            dealDamage(caster, target, dmg, 'magical');
            log(`🟢 ¡Sello de Putrefacción a ${target.label || target.displayName}!`);
            return true;
        }
    },
    NECROMANCER_AURA: {
        id: 'NECROMANCER_AURA', name: 'Aura de Corrupción', kind: 'passive',
        tags: ['MÁGICO', 'DAÑO_EN_EL_TIEMPO', 'ÁREA'],
        values: { radius: 4, hpDmgPct: [0.008, 0.012, 0.016, 0.02], creepDmgPct: [0.004, 0.006, 0.008, 0.01], antiheal: [0.15, 0.2, 0.25, 0.3] },
        description: 'Pasiva: los competidores en radio {radius} pierden {hpDmgPct%} de su vida máxima por segundo como daño mágico, y los creeps {creepDmgPct%}. Además reciben {antiheal%} menos curación.',
        hooks: {
            onTick(owner, { dt }) {
                if (!owner.isAlive() || !everyInterval(owner, this.id, dt)) return;
                const radius = val(this, owner, 'radius'), antiheal = val(this, owner, 'antiheal');
                enemiesOf(owner).slice().forEach(c => {
                    if (!c.isAlive() || Math.hypot(c.x - owner.x, c.y - owner.y) > radius) return;
                    addEffect(c, { id: 'NECROMANCER_CORRUPTION', name: 'Corrupción', duration: 1.2, tags: ['PERJUICIO'], mods: { healingTakenPct: -antiheal } });
                    dealDamage(owner, c, Math.max(1, c.maxHp * val(this, owner, c.isHero ? 'hpDmgPct' : 'creepDmgPct')), 'magical', { fullDuelDamage: true });
                });
            }
        }
    },
    NECROMANCER_AUTOMATON: {
        id: 'NECROMANCER_AUTOMATON', name: 'Autómata Putrefacto', kind: 'passive',
        tags: ['MEJORA', 'AL_MATAR'],
        values: { cap: [2, 3, 4, 5], hp: [120, 160, 200, 240], atk: [10, 15, 20, 25], intHp: 1, intAtk: 0.12 },
        description: 'Pasiva: podés tener hasta {cap} Autómatas a la vez, con {hp} de vida y {atk} de daño, más lo que sumen por tu Inteligencia. Duran 25s y arrancás cada duelo con dos. Quien destruye uno cobra oro.',
        hooks: {}
    },
    NECROMANCER_ECHO: {
        id: 'NECROMANCER_ECHO', name: 'Eco de los Muertos', kind: 'active',
        tags: ['MÁGICO', 'ÁREA'],
        values: { cooldown: [8, 7, 6, 5], manaCost: [70, 80, 90, 100], baseDmg: [90, 140, 190, 240], intRatio: 0.3, radius: 2.5, falloff: 0.35, maxWaves: 3 },
        description: 'Un chirrido hace {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico en radio {radius}. Cada Autómata lo repite desde donde está, del más cercano al más lejano, {falloff%} más débil que el anterior. Un mismo enemigo recibe {maxWaves} ondas como máximo.',
        aiReady(hero) {
            const radius = val(this, hero, 'radius');
            return [hero, ...minionsOf(hero)].some(u => enemiesOf(hero).some(c => c.isAlive() && Math.hypot(c.x - u.x, c.y - u.y) <= radius));
        },
        cast(caster) {
            const radius = val(this, caster, 'radius'), max = val(this, caster, 'maxWaves'), weak = 1 - val(this, caster, 'falloff'), hits = new Map();
            const dist = u => Math.hypot(u.x - caster.x, u.y - caster.y);
            const sources = [caster, ...minionsOf(caster).sort((a, b) => dist(a) - dist(b))];
            let dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio'), total = 0;
            sources.forEach(src => {
                fxRing(src, '#7dff9b', radius, 0.35);
                enemiesOf(caster).slice().forEach(c => {
                    if (!c.isAlive() || (hits.get(c) || 0) >= max || Math.hypot(c.x - src.x, c.y - src.y) > radius) return;
                    hits.set(c, (hits.get(c) || 0) + 1); total++;
                    dealDamage(caster, c, dmg, 'magical');
                });
                dmg *= weak;
            });
            if (!total) { log('Eco de los Muertos: sin enemigos en el radio.'); return false; }
            log(`📡 ¡Eco de los Muertos! ${total} impacto(s).`);
            return true;
        }
    },
    NECROMANCER_OVERLOAD: {
        id: 'NECROMANCER_OVERLOAD', name: 'Sobrecarga de Servidores', kind: 'active', isUltimate: true, exclusive: true,
        tags: ['MÁGICO', 'ÁREA', 'CONTROL'],
        values: { cooldown: [75, 65, 55], manaCost: [130, 150, 170], baseDmg: [150, 225, 300], intRatio: 0.6, radius: 2, slowPct: 0.4, slowDuration: 2.5, rootDuration: 1.5, rootHits: 2 },
        description: 'DEFINITIVA. Detona a todos tus Autómatas: cada uno hace {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico en radio {radius} y frena {slowPct%} por {slowDuration}s. Si {rootHits} o más explosiones tocan al mismo competidor, queda atado {rootDuration}s.',
        aiReady(hero) {
            const radius = val(this, hero, 'radius');
            return minionsOf(hero).some(m => enemiesOf(hero).some(c => c.isAlive() && Math.hypot(c.x - m.x, c.y - m.y) <= radius));
        },
        cast(caster) {
            const bombs = minionsOf(caster);
            if (!bombs.length) { log('Sobrecarga de Servidores: no tenés Autómatas.'); return false; }
            const radius = val(this, caster, 'radius'), dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            const slow = val(this, caster, 'slowPct'), slowDuration = val(this, caster, 'slowDuration'), hits = new Map();
            bombs.forEach(m => {
                fxRing(m, '#7dff9b', radius, 0.5);
                enemiesOf(caster).slice().forEach(c => {
                    if (!c.isAlive() || Math.hypot(c.x - m.x, c.y - m.y) > radius) return;
                    hits.set(c, (hits.get(c) || 0) + 1);
                    addEffect(c, { id: 'NECROMANCER_OVERLOAD_SLOW', name: 'Sobrecarga', duration: slowDuration, tags: ['PERJUICIO'], mods: { moveSpeedPct: -slow } });
                    dealDamage(caster, c, dmg, 'magical');
                });
                destroyMinion(m);
            });
            hits.forEach((n, c) => { if (n >= val(this, caster, 'rootHits') && c.isHero && c.isAlive()) addEffect(c, { id: 'ROOT', name: 'Atrapado', duration: val(this, caster, 'rootDuration'), flags: ['root'], tags: ['PERJUICIO'] }); });
            log(`💥 ¡Sobrecarga de Servidores! ${bombs.length} Autómata(s) detonados.`);
            return true;
        }
    }
});
