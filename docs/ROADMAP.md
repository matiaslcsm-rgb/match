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
- [ ] **Panel del rival en el duelo:** sus habilidades con el enfriamiento (¿tiene el golpe listo?).
- [x] **Arena de duelo con 2 a 4 columnas** que frenan proyectiles, para cubrirse. Hecho 2026-10-28: 4 columnas
  (`DUEL_COLUMNS`, duels.js) que no se pisan y frenan los ataques y las habilidades; a distancia hay que ver al rival
  (`lineOfSight`, bodies.js) y la IA rodea las columnas para buscarlo; pilares en 3D. Banco de 66: duelo mediano 5,8 s
  (dentro del ruido), 4% por tiempo (nadie se traba). Falta que la IA las use para cubrirse.

**Cierra cuando:** los duelos duran 15 a 30 s (hoy 5 s), quien va ganando cambia más de una vez por duelo (hoy 0,7) y
la IA evita entre el 30% y el 70% de los golpes anunciados.

## Fase 3 — Los competidores de MATCH
De a uno: ficha aprobada por el usuario → programado con su robot 3D → medido en duelos. Cada uno reemplaza a un héroe
copiado de Dota.
- [ ] **Rec**, el camarógrafo robot (ficha en `docs/competidores/rec.md`). Reemplaza al Sniper.
- [ ] Los otros siete del show (borrador en `docs/MATCH.md` §4): Grúa, Eco, Flash, Kilo, Parche, Vector, Viral, Glitch.
  Antes de cada uno, su ficha para aprobar.
- [ ] El Danzante, el Arcanista y el Sabio del Vacío pasados al estilo nuevo (su lectura y su respuesta).

**Cierra cuando:** no queda ningún héroe de Dota y ningún cruce de competidores gana más del 65% de las veces.

## Fase 4 — El show "En Vivo"
Que se sienta un programa de TV (concepto en `docs/CONCEPTO-FUTURISTA.md`).
- [ ] Menús con la estética del show (portada, elección de competidor, tienda, apuestas).
- [ ] El presentador y los carteles del programa (presentación de cada duelo, repeticiones, ranking como zócalo de TV).
- [ ] El público reacciona (sonido y gradas).
- [ ] Creeps con su identidad de MATCH (robots del show, no los de Dota).

## Fase 5 — Balance y versión 1.0
- [ ] Balance medido con el banco de partidas y de duelos (`index.html?banco=132` para decidir).
- [ ] Tutorial al día con todo lo nuevo.
- [ ] Rendimiento: el 3D fluido en una compu común.

---

## Cómo se trabaja
- Cada entrega: prueba en `js/tests.js` si es mecánica nueva, `GAME_VERSION` nueva (`js/main.js`), nota en
  `docs/ESTADO.md` y se tilda acá. Se sube a GitHub con cada commit.
- Lo que tiene que decidir el usuario se marca **(decisión)** con 2 o 3 opciones y una recomendada.
- Balance: se mide antes y después, y se anotan los números.
