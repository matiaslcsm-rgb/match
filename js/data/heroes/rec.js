// Rec (Reflejos/Agilidad) — el camarógrafo robot del show y su Equipo de Grabación. Tirador de control a distancia.
// Diseño del usuario, ficha aprobada el 2026-10-26: docs/competidores/rec.md. Reemplaza al Sniper (hasta que se retire,
// conviven).
//   · No pega él: pegan sus 3 drones en orden (aéreo físico, sonido mágico, luz puro que quema), cada uno con su
//     velocidad. Aturdido, no vuela ninguno; callado, solo el aéreo.
//   · shortcut: los drones son proyectiles, no unidades: todavía no se los puede frenar de a uno con habilidades
//     apuntadas (ficha). Pasarlos a unidades cuando haga falta (o cuando otro competidor tenga drones/torretas).
// Rec atrás, los drones pegan: AL_GOLPEAR le pasa al aéreo (es el ataque básico); el de sonido y el de luz son aparte.

const REC_DRONES = [
    { key: 'aereo', name: 'Aéreo', type: 'physical', share: 0.6, speed: 9, color: '#a2a8ad' },
    { key: 'sonido', name: 'Sonido', type: 'magical', share: 0.45, speed: 7, color: '#ff3ea5' },
    { key: 'luz', name: 'Luz', type: 'pure', share: 0.25, speed: 5.5, color: '#ffd23f', burn: true }
];
const REC_BURN = { dps: 2, duration: 2 };

// Un dron que sale de Rec hacia el objetivo (proyectil que persigue, como un ataque a distancia; combat.js)
function recDrone(owner, target, d, dmg, opts = {}) {
    const p = { attacker: owner, x: owner.x, y: owner.y, target, dmg: Math.max(1, Math.round(dmg)), isCrit: !!opts.isCrit, speed: d.speed * (opts.fast || 1), drone: d.key, vfx: { color: d.color } };
    if (d.type !== 'physical' || opts.fixed) p.dmgType = d.type; // el aéreo del ataque básico es un golpe básico (crítico, robo de vida, ítems)
    if (d.burn) p.onHit = t => {
        if (!t.isAlive()) return;
        addEffect(t, { id: 'REC_BURN', name: 'Quemado', duration: REC_BURN.duration, tags: ['PURO'], hooks: {
            onTick(o, { dt }) { if (everyInterval(o, 'REC_BURN_T', dt, 1)) dealDamage(owner, o, REC_BURN.dps, 'pure'); }
        } });
    };
    owner.arena.projectiles.push(p);
}
// Los drones van más rápido con el trípode clavado (pasiva Trípode)
function recFast(owner) {
    const t = owner.skills.find(s => s.id === 'REC_TRIPODE');
    return t && skillLevel(owner, t) > 0 && gameClock - (owner.movingUntil || 0) >= 1 ? 1 + val(t, owner, 'droneSpeedPct') : 1;
}

registerHero({
    key: 'REC', name: 'Rec', symbol: 'R', primaryAttr: 'AGI', role: 'Tirador de control a distancia',
    attributes: { str: [18, 2.0], agi: [22, 3.0], int: [16, 1.6] },
    baseHp: 95, baseAtk: 8, baseAtkSpeed: 0.95, baseAttackRange: 5,
    baseArmor: 1, baseMagicResist: 10, baseHpRegen: 0.5,
    baseMaxMana: 160, baseManaRegen: 1.5, baseMoveSpeed: 2.3, baseProjectileSpeed: 9,
    baseCritChance: 8, baseEvasion: 0, baseSpellAmp: 8, baseLifesteal: 0,
    description: 'Reflejos: el camarógrafo robot del show. Pegan sus 3 drones (físico, mágico y puro): ninguna defensa sola alcanza. Se planta, encuadra y castiga; se le gana aturdiéndolo o haciéndolo moverse.',
    scaling: { stat: 'atk', perKills: 8, perKillsAmount: 1.5, perHeroKill: 4 },
    innate: {
        id: 'REC_EQUIPO', name: 'Equipo de Grabación',
        tags: ['FÍSICO', 'MÁGICO', 'PURO', 'AL_GOLPEAR'],
        description: 'Innato: no pega él, pegan sus 3 drones, en orden: el aéreo (60% de tu daño, físico), el de sonido (45%, mágico) y el de luz (25%, puro, y quema 2 por segundo 2 s). Cada uno vuela con su velocidad: si el rival corre, los lentos llegan tarde. Aturdido no vuela ninguno; callado, solo el aéreo.',
        // Lo llama el ataque básico (game.js, updateHero) en vez de disparar un proyectil común
        fireBasic(owner, target, dmg, isCrit) {
            const fast = recFast(owner), silenced = hasFlag(owner, 'silence'), base = effAttack(owner);
            REC_DRONES.forEach(d => {
                if (d.type !== 'physical' && silenced) return;
                recDrone(owner, target, d, d.type === 'physical' ? dmg * d.share : base * d.share, { isCrit: d.type === 'physical' && isCrit, fast });
            });
            if (fxArena(owner)) sfx('shoot');
        }
    }
}, {
    REC_ACOPLE: {
        id: 'REC_ACOPLE', name: 'Acople', kind: 'active', pointTarget: true, windup: 0.6, // golpe anunciado (game.js)
        aiMinDist: 2.5, // con el rival encima, prepararlo es regalarle un segundo
        tags: ['MÁGICO', 'CONTROL'],
        values: { cooldown: [11, 10, 9, 8], manaCost: 45, baseDmg: [40, 65, 90, 115], intRatio: 0.3, silence: [1.2, 1.4, 1.6, 1.8], range: 6, speed: 14, radius: 0.6 },
        description: 'El dron de sonido larga un chillido de acople hacia donde apuntes (rango {range}): {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico y CALLA {silence}s al primero que toca (no puede tirar habilidades). Se anuncia: una línea en el piso.',
        vfx: { color: '#ff3ea5' },
        cast(caster) {
            const aim = caster.aimPoint || (nearestEnemy(caster, val(this, caster, 'range')) || null);
            if (!aim) { log('Acople: sin objetivo.'); return false; }
            const silence = val(this, caster, 'silence');
            fireSkillProjectile(caster, {
                tx: aim.x, ty: aim.y, speed: val(this, caster, 'speed'), radius: val(this, caster, 'radius'), stopOnHit: true,
                dmg: val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio'), dmgType: 'magical', vfx: this.vfx, skillName: this.name,
                onHit: c => { if (c.isAlive()) addEffect(c, { id: 'SILENCE', name: 'Callado', duration: silence, flags: ['silence'], tags: ['CONTROL'] }); }
            });
            log('🔊 ¡Acople!');
            return true;
        }
    },
    REC_TRAVELLING: {
        id: 'REC_TRAVELLING', name: 'Travelling', kind: 'active',
        tags: ['MOVILIDAD', 'ESCAPE'],
        values: { cooldown: [12, 11, 10, 9], manaCost: 30, cells: 3, rangePct: [0.3, 0.4, 0.5, 0.6], duration: 3 },
        description: 'Pliega el trípode y rueda {cells} casillas alejándose del enemigo más cercano; por {duration}s, +{rangePct%} de rango de ataque.',
        cast(caster) {
            const e = nearestEnemy(caster);
            const dx = e ? Math.sign(caster.x - e.x) : -(caster.facing || 1), dy = e ? Math.sign(caster.y - e.y) : 0;
            let moved = 0;
            for (let i = 0; i < val(this, caster, 'cells'); i++) {
                const nx = caster.x + dx, ny = caster.y + dy;
                if ((!dx && !dy) || !walkable(caster.arena, nx, ny)) break;
                caster.x = nx; caster.y = ny; moved++;
            }
            if (moved) emit(caster, 'onMove', { steps: moved });
            addEffect(caster, { id: 'REC_TRAVELLING', name: 'Travelling', duration: val(this, caster, 'duration'), mods: { rangePct: val(this, caster, 'rangePct') } });
            fxBurst(caster, '#ffd23f', 8, 3);
            log(`🎥 Travelling: rodó ${moved} casillas.`);
            return true;
        }
    },
    REC_TRIPODE: {
        id: 'REC_TRIPODE', name: 'Trípode', kind: 'passive',
        tags: ['MEJORA'],
        values: { atkSpeedPct: [0.1, 0.15, 0.2, 0.25], droneSpeedPct: 0.3 },
        description: 'Pasiva: quieto 1 s, clava el trípode: +{atkSpeedPct%} de velocidad de ataque mientras no te muevas (y los drones de Rec vuelan +{droneSpeedPct%} más rápido).',
        hooks: {
            onTick(owner) {
                const still = gameClock - (owner.movingUntil || 0) >= 1;
                keepPassiveEffect(owner, this, still ? { atkSpeedPct: val(this, owner, 'atkSpeedPct') } : {});
            }
        }
    },
    REC_CAMARA_FIJA: {
        id: 'REC_CAMARA_FIJA', name: 'Cámara Fija', kind: 'active', isUltimate: true, pointTarget: true, windup: 0.5,
        aiMinDist: 3, // la IA la tira con el rival a distancia: canalizar con uno pegado es perder
        tags: ['FÍSICO', 'MÁGICO', 'PURO', 'CONTROL'],
        values: { cooldown: [60, 50, 40], manaCost: [100, 120, 140], perHit: [10, 15, 20], atkRatio: 0.5, slow: 0.4, duration: 3, range: 5, maxRange: 7, radius: 1.2, speed: 99 },
        description: 'DEFINITIVA. Clava el trípode y encuadra (se anuncia con una marca): al que quede en el cuadro lo ralentiza {slow%} y los 3 drones le pegan una vez por segundo durante {duration}s, en orden: {perHit} + {atkRatio%} de tu daño físico, lo mismo mágico y 60% de eso puro. Canalizada: Rec queda quieto; se corta si lo aturden o si el objetivo se aleja a más de {maxRange} casillas.',
        cast(caster) {
            const aim = caster.aimPoint || caster;
            const target = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - aim.x, c.y - aim.y) <= val(this, caster, 'radius') + 1)
                .sort((a, b) => Math.hypot(a.x - aim.x, a.y - aim.y) - Math.hypot(b.x - aim.x, b.y - aim.y))[0];
            if (!target) { log('Cámara Fija: no quedó nadie en el cuadro.'); return false; }
            const fixed = val(this, caster, 'perHit'), ratio = val(this, caster, 'atkRatio'), maxRange = val(this, caster, 'maxRange'), dur = val(this, caster, 'duration');
            addEffect(target, { id: 'REC_FIJADO', name: 'En cámara', duration: dur, mods: { moveSpeedPct: -val(this, caster, 'slow') } });
            startChannel(caster, {
                name: this.name, duration: dur, next: gameClock,
                tick(h) {
                    if (!target.isAlive() || Math.hypot(target.x - h.x, target.y - h.y) > maxRange) return false;
                    if (gameClock < this.next) return true;
                    this.next += 1;
                    const silenced = hasFlag(h, 'silence'), per = fixed + ratio * effAttack(h); // crece con su daño
                    REC_DRONES.forEach(d => { if (d.type === 'physical' || !silenced) recDrone(h, target, d, d.burn ? per * 0.6 : per, { fixed: true }); });
                    return true;
                },
                end() { removeEffect(target, 'REC_FIJADO'); }
            });
            log(`📹 ¡Cámara Fija sobre ${target.displayName || target.label}!`);
            return true;
        }
    }
});
