// Música de MATCH (2026-10-28, sacada de la música por capas de Infinite Tower, towerMusic.js). Pistas libres de
// opengameart.org (docs/CREDITOS.md). El menú y las fases tranquilas con la del taller; oleadas y duelos con la de
// combate; los jefes de ronda con la de jefe. Cambia con fundido; lo que queda en silencio un rato se pausa.
const MUSIC_TRACKS = { town: 'music/town.mp3', combat: 'music/combat.ogg', boss: 'music/boss.ogg' };
const MUSIC_GAIN = { town: 0.5, combat: 0.5, boss: 0.55 }; // las grabaciones vienen a niveles distintos
const MUSIC = { volume: 0.6, fade: 1.6, idlePause: 6 };
let musicOn = true;
try { musicOn = localStorage.getItem('chc-music') !== 'off'; } catch (e) { /* sin almacenamiento: prendida */ }
const musicLayers = {}; // key → { el, vol, target, idle }

function setMusic(on) {
    musicOn = on;
    try { localStorage.setItem('chc-music', on ? 'on' : 'off'); } catch (e) { /* no se guarda */ }
    if (!on) stopMusic();
}
function musicLayer(key) {
    if (musicLayers[key]) return musicLayers[key];
    const el = new Audio(MUSIC_TRACKS[key]);
    el.loop = true; el.preload = 'auto'; el.volume = 0;
    return (musicLayers[key] = { el, vol: 0, target: 0, idle: 0 });
}
function stopMusic() { Object.values(musicLayers).forEach(l => { l.target = 0; l.vol = 0; l.el.volume = 0; l.el.pause(); }); }
// Qué tiene que sonar ahora: { key: volumen objetivo }
function musicTargets() {
    if (gameState === 'BOSS') return { boss: 1 };
    if (inCombat() && player && !player.inRest) return { combat: 0.85 };
    return { town: gameState === 'MENU' || gameState === 'HERO_SELECT' ? 0.7 : 0.6 };
}
// Cada cuadro (render): fundidos hacia el volumen objetivo
function musicTick(dt) {
    if (!musicOn || !soundOn || !audioCtx) { if (Object.keys(musicLayers).length) stopMusic(); return; }
    const targets = musicTargets();
    Object.keys(MUSIC_TRACKS).forEach(k => { if (targets[k] || musicLayers[k]) musicLayer(k).target = targets[k] || 0; });
    const step = dt / MUSIC.fade;
    Object.entries(musicLayers).forEach(([k, l]) => {
        l.vol += Math.max(-step, Math.min(step, l.target - l.vol));
        l.el.volume = Math.max(0, Math.min(1, l.vol * MUSIC_GAIN[k] * MUSIC.volume * VOLUME.master * VOLUME.music * (paused ? 0.4 : 1))); // VOLUME: audio.js
        if (l.target > 0 && l.el.paused) { const p = l.el.play(); if (p && p.catch) p.catch(() => { /* el navegador espera una interacción */ }); }
        l.idle = l.vol <= 0.001 ? l.idle + dt : 0;
        if (l.idle > MUSIC.idlePause && !l.el.paused) l.el.pause();
    });
}
