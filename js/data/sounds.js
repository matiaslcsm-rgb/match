// Sonidos propios: archivos de audio (mp3, ogg o wav) que reemplazan a los sintetizados de audio.js.
// Poné el archivo en la carpeta sounds/ y agregá una línea acá con el nombre del sonido y su ruta.
// Si un sonido no está en la lista (o el archivo no carga), suena el sintetizado.
//
// Nombres disponibles (cuándo suenan):
//   wave      empieza una ronda de creeps          duel     empieza una ronda con duelo
//   boss      aparece el jefe de ronda             win      ganaste tu duelo      lose     perdiste tu duelo
//   betWin    alguien ganó una apuesta             tick     cuenta regresiva (últimos 5 s)   tickLast   último segundo
//   levelup   subiste de nivel                     coin     cobrás oro            click    botones
//   hit / heroHit / crit / swing / shoot   golpes y disparos     cast / ult   habilidades y definitivas
//   heal      curación    death    muerte    boom    explosión    pop    creep eliminado
//
// Ejemplo:
//   const SOUND_FILES = { betWin: 'sounds/apuesta-ganada.mp3', duel: 'sounds/duelo.ogg' };

// Show sounds (user request 2026-11-02; sources in docs/CREDITOS.md)
const SOUND_FILES = {
    wave: 'sounds/announcer-fight.ogg',     // "Fight!" when a creep round starts
    duel: 'sounds/duel-bell.wav',           // ring bell when a round with a duel starts
    win: 'sounds/duel-win-fanfare.mp3',     // you won your duel
    lose: 'sounds/announcer-you-lose.ogg',  // you lost your duel
    betWin: 'sounds/bet-win-fanfare.mp3',   // someone won a bet
    suddenDeath: 'sounds/announcer-sudden-death.ogg' // "Sudden death!" when the duel damage starts to rise
};

// Volumen de cada archivo (1 = normal), por si alguno suena muy fuerte o muy bajo. Ej: { betWin: 0.6 }
// The show files came out 70% too loud next to the synthesized sounds (user, 2026-11-02)
const SOUND_VOLUME = {
    wave: 0.3, duel: 0.3, win: 0.3, lose: 0.3, betWin: 0.3, suddenDeath: 0.3
};
