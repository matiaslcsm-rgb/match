# Estado de MATCH

Proyecto nuevo, bifurcado de `custom-hero-chaos` el 2026-10-19 (decisión del usuario: "quiero arrancar MATCH de
cero", como proyecto aparte — no reescribiendo el código de ese repo, para no arriesgar a Infinite Tower, que
sigue en pausa ahí intacto).

## Qué se trajo
El motor compartido y todo lo de Custom Hero (docs/MAPA-CODIGO.md del proyecto original tiene el detalle de qué
archivo es de quién): héroes, ítems, creeps y oleadas, draft, duelos, apuestas, jefes de ronda, IA y piloto
automático. Nada de Infinite Tower (ni sus `tower*.js`, ni `inkart.js`, ni el muñeco en pixel art de
`towerPixelBeasts.js`/`towerHeroArt.js`/`caballero.js`, ni la portada animada de `titleScreen.js`).

## Qué falta (se encontró al separar los dos juegos)
El núcleo compartido (sobre todo `ui.js`, `game.js`, `combat.js`, `creeps.js`, `mouse.js`, `pause.js`,
`fxSkills.js`, `progression.js`) llamaba a bastantes funciones de Infinite Tower sin que `gameMode` las frenara
siempre — algunas sí estaban bien protegidas, pero varias (el golpe de los creeps, el esquive del Mago/Arquero, el
clic-ataque, la parada de espada, la música, el mapa de pisos) se llamaban directo. Se agregaron reemplazos
chicos (`function algo() { return false; }` o similar, cada uno con su comentario "Infinite Tower no existe acá")
en vez de traer esos sistemas enteros. Quedan como *pendiente real*, no como bug:
- **Música y clima:** los botones de la pausa ya guardan la preferencia, pero no hay pistas ni partículas
  todavía (`audio.js`: `musicTick`, `setMusic`, `setWeather` son no-ops por ahora).
- **El muñeco en pixel art:** los héroes siguen con el sprite estático de 12×12 (`sprites.js`), no el muñeco
  animado que tiene Infinite Tower. Si se quiere traer, hay que decidir antes la identidad visual de MATCH
  (docs/CONCEPTO-FUTURISTA.md) — no tendría sentido vestir al muñeco con la pinta vieja de los héroes de Dota.
- **Portada:** la de `index.html` es un placeholder de un párrafo (nombre del juego + botón Jugar), a la espera del
  diseño "En Vivo" (docs/MATCH.md, docs/CONCEPTO-FUTURISTA.md).
- **"No se pega caminando" y "sin esquive con Espacio":** las pide `CLAUDE.md`/el informe del 2026-10-19 original,
  pero no estaban aplicadas todavía en el proyecto de origen al momento de la bifurcación — tampoco están acá.

## Pruebas
`js/tests.js` es nuevo: el mismo arnés (`test`/`check`/`checkEq`) del proyecto original, pero con 7 pruebas de
humo (no las ~290 del original, que eran de Custom Hero Chaos con balance ya medido — no tiene sentido portarlas
todas de una sin revisar primero cuáles siguen siendo ciertas acá). Correrlas:
- Navegador: abrir `tests.html` (o `index.html?test`).
- Sin navegador: `python docs/correr-pruebas.py` (necesita Playwright: `pip install playwright` y
  `python -m playwright install chromium`, una vez).

## Cómo seguir
1. Decidir la identidad visual y de controles de MATCH (docs/MATCH.md, docs/CONCEPTO-FUTURISTA.md,
   docs/MECANICAS.md) antes de invertir en arte o en sistemas nuevos.
2. Ir sumando pruebas a `js/tests.js` a medida que se toca o se confirma cada mecánica heredada.
3. `git init` hecho localmente en esta carpeta (2026-10-19); todavía no tiene remoto en GitHub.
