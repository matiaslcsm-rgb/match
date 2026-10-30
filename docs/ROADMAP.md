# Roadmap de MATCH

Ordenado con el usuario el 2026-10-28, cuando MATCH quedó como juego propio y solo en 3D. **El orden de la lista es la
prioridad:** se hace de arriba hacia abajo y cada fase cierra con algo que se puede jugar y medir. El roadmap viejo (los
dos juegos juntos, con la Torre) quedó como historia en `docs/historia/ROADMAP-hasta-2026-10-28.md`.

**Qué es MATCH:** las mecánicas de Custom Hero (rondas, creeps, draft mezclado, tienda, un duelo por ronda desde la 5,
apuestas, jefes) en un show de competencia del 2099 transmitido en vivo, con los competidores y los creeps como robots
en una arena 3D. **El centro del diseño son los duelos:** que pelear entre competidores sea divertido y desafiante
(los pilares están en `docs/MATCH.md` §2).

**Descartado por ahora (decisión del usuario 2026-10-28):** el garaje / creador de competidor para el jugador ("no es
algo que sume por ahora"). Se juega con los competidores del show.

---

## Fase 1 — Terminar el 3D
Que todo lo que se juega se vea en 3D y que no quede nada de la Torre.
- [x] **La zona de descanso en 3D:** los boxes del show, donde tu robot espera entre oleadas mientras comprás.
  Hecho 2026-10-28: portones de garaje, estación de reparación con grúa (donde estaba la fuente), dos estaciones de
  carga (las fogatas), los 8 boxes numerados y la calle de boxes en el piso; se camina igual (clic derecho o W A S D).
- [x] **Jefes robot propios:** cada jefe de ronda (rondas 5, 10, 15 y 20) con su propio robot, más grande y con piezas
  únicas, en vez del robot genérico agrandado. Hecho 2026-10-28 (`js/m3d/bosses3d.js`): los 8 con armado, pintura, ojos
  que brillan y piezas que dicen qué hacen (la Prensa con puños, la Reina con panales, el Dragón con alas y cola, el Abismo
  con cuernos y reactor, la Hidra con tres cabezas, el Liche con corona y capa, el Titán con hojas y tanques, el Espectro
  con jirones).
- [x] **Limpieza:** sacar de `style.css` lo de la Torre (tema de pergamino, inventario, forja, herrero, bitácora) y los
  comentarios que todavía hablan de la Torre. Hecho 2026-10-28: `style.css` de 1054 a 620 líneas (369 reglas sin uso),
  y del código, los `towerValues` de los héroes, el tope por run, el estado 'TOWER', el agua profunda, el multiplicador
  de peligro y los comentarios que nombraban archivos de la Torre. Las paredes quedan (las van a usar las columnas).

**Cierra cuando:** una partida entera se ve en 3D (menú y tienda aparte) y las pruebas pasan.

## Fase 2 — Duelos que se leen
La base para que los competidores nuevos funcionen. Es el plan de `docs/MATCH.md` §5, medido con el banco de duelos
(`index.html?banco=66`).
- [x] **Golpes fuertes anunciados:** el golpe tarda al menos 0,7 s en salir, con la marca roja en el piso, se puede
  cortar aturdiendo y el que lo tiró queda expuesto un instante. Se prueba primero con 1 o 2 habilidades de hoy.
  Hecho 2026-10-28 con el Rayo Relámpago (Zeus) y la Explosión Helada (Bruja del Hielo): `windup` en la habilidad
  (game.js: startWindup/tickWindup; la marca, fx.js drawWindupMark; azul en el modo daltónico). Banco de 66 partidas,
  antes → después: duelo mediano 5,2 → 6,0 s, cambios de quién gana 0,7 → 0,8, evitable 13 → 11%; Zeus gana 27 → 8%
  (el rayo ahora puede fallar: revisar en el balance cuando la IA esquive).
- [x] **La IA lee los avisos:** camina fuera de las zonas y de la línea de los proyectiles y corta preparaciones, con
  tiempos de reacción de una persona. Hecho 2026-10-28 (ai.js: aiNoticed, aiThreat, dodgeStep): tarda 0,2-0,45 s en
  darse cuenta y no lo ve el 20% de las veces; sale del camino del golpe (no solo del punto); con un control listo, se
  lo tira primero al que prepara. Banco de 66: esquiva el 30% de los golpes anunciados (meta 30-70%), duelo mediano
  6,0 → 6,7 s. El banco ahora cuenta los golpes anunciados y cuántos se esquivan.
- [x] **Panel del rival en el duelo:** sus habilidades con el enfriamiento (¿tiene el golpe listo?). Hecho 2026-10-28
  (ui.js, drawRivalPanel): arriba a la derecha, su vida y maná y cada habilidad activa con LISTO, los segundos que le
  faltan o "sin maná"; la que está preparando titila en rojo (¡PREPARA!). En 3D y en 2D.
- [x] **Arena de duelo con 2 a 4 columnas** que frenan proyectiles, para cubrirse. Hecho 2026-10-28: 4 columnas
  (`DUEL_COLUMNS`, duels.js) que no se pisan y frenan los ataques y las habilidades; a distancia hay que ver al rival
  (`lineOfSight`, bodies.js) y la IA rodea las columnas para buscarlo; pilares en 3D. Banco de 66: duelo mediano 5,8 s
  (dentro del ruido), 4% por tiempo (nadie se traba). Probado y descartado (2026-10-28): que la IA se cubra con
  una columna cuando va perdiendo contra uno de distancia; no alargó los duelos (7,9 s), subió los que terminan por
  tiempo (5 → 7%) y bajaron los cambios de quién gana (0,8 → 0,7).

**Cierra cuando:** los duelos duran 15 a 30 s (hoy 5 s), quien va ganando cambia más de una vez por duelo (hoy 0,7) y
la IA evita entre el 30% y el 70% de los golpes anunciados.

**(decisión) Cómo llegar a duelos de 15-30 s** (medido el 2026-10-28, banco de 66 sin el Sniper; hoy, con los 4 puntos
hechos: 7,9 s de mediana, 5% por tiempo, 0,8 cambios de quién gana, la IA esquiva ~32%). Cuánto menos daño se hacen los
competidores entre sí en duelo (`DUEL_DAMAGE_REDUCTION`): 60% (hoy) → 7,9 s y 5% por tiempo; 70% → 8,6 s y 8%;
80% → 15,9 s y **20% por tiempo** (la meta es menos del 10%).
- **a) 80% menos de daño y el duelo de 45 a 70 s (recomendada):** llega a la duración y el tiempo extra baja los que se
  cortan por tiempo. Hay que medirlo.
- b) 75% menos de daño y dejar el tiempo: algo intermedio (~11-12 s, a medir).
- c) No tocar el daño y alargar los duelos con más golpes anunciados (más habilidades con `windup`) y competidores nuevos.
**Aplicada la (a) el 2026-10-30** (`DUEL_DAMAGE_REDUCTION` 0,8 y `DUEL_TIME` 60 s). Banco de 66, antes → después: duelo mediano 7,9 → **15,9 s** (meta 15-30 ✔), por tiempo 5 → 12% (meta <10% ✘), cambios de quién gana 0,8 → 0,8 (meta >1 ✘), esquive de la IA 34 → 29% (meta 30-70%, casi). Con 75 s: 16,4 s y 11% por tiempo, casi igual, así que se dejó en 60. Lo que falta de la meta (cambios de ventaja y los empates por tiempo) no es cuestión de números: pide mecánicas, ver Fase 3.

## Fase 3 — Los competidores de MATCH
De a uno: ficha aprobada por el usuario → programado con su robot 3D → medido en duelos. Cada uno reemplaza a un héroe
copiado de Dota.
- [ ] **Rec**, el camarógrafo robot (ficha en `docs/competidores/rec.md`). Reemplaza al Sniper.
  - [x] Jugable (2026-10-28, `js/data/heroes/rec.js`): drones en orden (físico, mágico, puro que quema) con su velocidad,
    Acople (silencio, golpe anunciado), Travelling (escape), Trípode (pasiva) y Cámara Fija (canalizada, anunciada).
    Piezas nuevas del motor: silencio, canalización (`startChannel`), disparo propio del innato (`fireBasic`), proyectiles
    con otro tipo de daño, `aiMinDist` y la etiqueta ESCAPE. Los drones son proyectiles (todavía no se frenan de a uno).
    Medido (nivel máximo, 20 duelos por cruce): gana 44% en promedio; 100% contra Arcanista y Bruja, 90-95% contra Zeus y
    Vampiro, 50% contra Asesino, 0% contra Axe, Nigromante y Alquimista. Banco de 66: puesto 6, 36% de duelos.
  - [x] Retirar al Sniper (2026-10-28): sus pruebas pasaron a Rec, Zeus y el Vampiro; las de su innato y su definitiva
    se fueron con él. Banco de 66 sin el Sniper: el que más gana, 25% (antes el Sniper, 75%); duelo mediano 6,4 → 7,7 s.
  - [x] Ajustar a Rec (2026-10-28): los drones suman 130% del daño (60/45/25%). Banco de 66: puesto 4,7 (el grupo va
    de 4,0 a 5,6), 55% de sus duelos. Medido junto con los ajustes de la ficha: Reflejos 22 (+3), daño 8, rango 5,
    velocidad 2,3 y la IA no tira el Acople ni la Cámara Fija con el rival encima.
- [ ] Los otros siete del show (borrador en `docs/MATCH.md` §4): Grúa, Eco, Flash, Kilo, Parche, Vector, Viral, Glitch.
  Antes de cada uno, su ficha para aprobar.
  **(decisión)** Fichas listas para aprobar (2026-10-30): `docs/competidores/grua.md` (reemplaza a Axe) y
  `docs/competidores/vector.md` (reemplaza al Asesino).
- [ ] El Danzante, el Arcanista y el Sabio del Vacío pasados al estilo nuevo (su lectura y su respuesta).

**Cierra cuando:** no queda ningún héroe de Dota y ningún cruce de competidores gana más del 65% de las veces.

## Fase 4 — El show "En Vivo"
Que se sienta un programa de TV (concepto en `docs/CONCEPTO-FUTURISTA.md`).
- [x] Menús con la estética del show (portada, elección de competidor, tienda, apuestas). Hecho 2026-10-30, con el
  resumen de fin de partida y los glosarios: paleta industrial y colores de atributo dentro de la paleta.
- [x] El presentador y los carteles del programa (presentación de cada duelo, repeticiones, ranking como zócalo de TV).
  - [x] Presentación de cada duelo (2026-10-30): cartel EN VIVO con los dos competidores, puesto y duelos, y una frase del
    presentador según cómo llegan (`showDuelCard`, ui.js). Dura 3,4 s y no frena el duelo, así que no cambia el balance;
    mientras está, tapa el panel del rival.
  - [x] Ranking como zócalo de TV (2026-10-30): tira abajo de la barra del héroe durante el combate, en el lugar de la ayuda
    de controles (`renderTvRank`, ui.js). Clic = mirar esa arena. El ranking de la izquierda sigue, con vidas y estado.
  - [x] Cartel del resultado (2026-10-30): al terminar el duelo, quién ganó, cuánto duró, los cambios de ventaja, el mejor
    golpe y una frase del presentador según cómo terminó (`showDuelResult`, ui.js). Solo interfaz: no cambia el balance.
  - [x] Repetición (2026-10-30): el cartel del resultado muestra la jugada desde arriba en cámara lenta (`duelReplayClip`,
    ui.js; la cinta, `tapeDuelFrame`, duels.js): los últimos 3 s, o el mejor golpe si terminó por tiempo. Es un tablero con los
    dos competidores, las columnas, sus vidas y cada golpe, no la arena 3D. Solo mira: no cambia el balance.
- [x] El público reacciona (sonido y gradas). Hecho 2026-10-28: tribunas de hormigón atrás y a los costados de la
  arena 3D con espectadores de colores que se mueven solos y saltan cuando cae alguien (más si es un competidor o el
  jefe), con el grito de la tribuna (sonido sintetizado, `crowd` en audio.js).
- [x] Competidores con robot propio y retratos 3D en toda la interfaz (2026-10-30, `js/m3d/heroes3d.js`).
- [x] Creeps con su identidad de MATCH (2026-10-30): los 18 tipos son drones del show, con nombre y robot propio
  (`js/m3d/creeps3d.js`). Los flacos se parecen entre sí: se distinguen más por color que por silueta.

## Fase 5 — Balance y versión 1.0
- [ ] Balance medido con el banco de partidas y de duelos (`index.html?banco=132` para decidir).
  - [x] Primera tanda de ítems (2026-10-30, pedido del usuario: balancear con ítems y no con stats): Batería de Arranque, Núcleo
    Evolutivo, Placa de Producción y Carga de Emergencia. Números en `docs/BALANCE-CH.md`. Bruja, Sabio, Rec y Axe siguen abajo.
  - [x] Rama de control e ítems activos (2026-10-30, pedido del usuario: ítems que se arman según la situación, activos como en
    Dota o LoL): Bobina de Choque → Inhibidor, Maza, Lanzarredes o Tenaza. Se usan con las teclas 1 a 6.
  - [x] La IA compra sus contras con el inventario lleno (2026-10-30): se moría a los Emisores sin la Capa. No resuelve a los de abajo y el Nigromante cae a 8%; números en `docs/BALANCE-CH.md`.
  - [ ] Bruja, Axe, Rec y Sabio siguen casi en 0% de victorias.
- [x] Tutorial al día con todo lo nuevo (2026-10-30).
- [ ] Rendimiento: el 3D fluido en una compu común. Medido el 2026-10-28 (con tribunas, columnas y drones): 7,7 ms por
  cuadro en una oleada de 10 creeps y 6,6 ms en un duelo, lógica y dibujo, con una GTX 1650 (~130 cuadros por segundo).
  Falta probarlo en una compu con video integrado.

---

## Cómo se trabaja
- Cada entrega: prueba en `js/tests.js` si es mecánica nueva, `GAME_VERSION` nueva (`js/main.js`), nota en
  `docs/ESTADO.md` y se tilda acá. Se sube a GitHub con cada commit.
- Lo que tiene que decidir el usuario se marca **(decisión)** con 2 o 3 opciones y una recomendada.
- Balance: se mide antes y después, y se anotan los números.
