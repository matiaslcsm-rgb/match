# Balance de Custom Hero: banco de partidas

## Cómo se mide
Abrí `index.html?banco=66` (o el número de partidas que quieras) y esperá a que el título diga "📊 banco 66/66 listo":
la tabla aparece en pantalla y en la consola (`benchResult`). Con 66 partidas tarda unos 3 minutos.

- Cada partida es completa: 8 héroes jugados por la IA (también el tuyo, con el piloto), hasta que queda uno (tope 60 rondas).
- **Semilla fija:** la partida N usa la semilla N, así que el mismo código da siempre la misma tabla. Si cambia la
  tabla, cambió el juego. El héroe del jugador rota (partida N → héroe N mod 11) y los rivales salen como en el juego.
- Los sonidos se apagan mientras corre: usan el mismo azar y, como se saltean según el tiempo real, rompían la semilla.
- Columnas: **ganadas** (de las partidas en que estuvo), **puesto** promedio (1 a 8) y **ronda** promedio en que quedó afuera.
- Referencia: si todos fueran parejos, cada héroe ganaría ~12,5% (1 de cada 8) y tendría puesto promedio 4,5.
- Código: `benchGame`, `benchTable` y `runBench` en `js/tests.js` (arriba de las pruebas de "Partida completa").

## Base: 2026-10-16 (66 partidas, semillas 1-66)
Ronda final promedio 24 (entre 20 y 30; ninguna llegó al tope de 60).

| Héroe | Ganadas | % | Puesto | Afuera en la ronda |
|---|---|---|---|---|
| Sniper | 26/44 | **59%** | 1,9 | 23 |
| Zeus | 15/51 | 29% | 3,6 | 21 |
| Asesino | 8/51 | 16% | 4,5 | 19 |
| Guerrero Vampiro | 7/51 | 14% | 4,2 | 22 |
| Nigromante | 4/48 | 8% | 5,2 | 18 |
| Danzante Cinético | 2/41 | 5% | 5,6 | 21 |
| Arcanista | 2/49 | 4% | 4,3 | 16 |
| Axe | 1/53 | 2% | 4,4 | 18 |
| Bruja del Hielo | 1/44 | 2% | 5,0 | 16 |
| Sabio del Vacío | 0/47 | 0% | 5,2 | 18 |
| Alquimista | 0/49 | 0% | 5,7 | 15 |

**Lectura:**
- El Sniper sigue arriba, y más que antes: gana 6 de cada 10 partidas en las que está (ESTADO.md decía 8 de 14 con
  otro método). Es lo primero a revisar.
- Zeus también está alto (29%, más del doble de lo parejo).
- Abajo, los magos (Sabio del Vacío, Alquimista, Bruja del Hielo, Arcanista) y Axe: casi nunca ganan y los magos
  quedan afuera antes (ronda 15-18). El Vampiro (14%) ya no está entre los peores; el Nigromante (8%) sí, un poco abajo.
- Ojo: el piloto juega igual a todos, así que esto mide héroes **jugados por la IA**. Un héroe difícil de usar puede
  rendir distinto en manos de una persona.

## Historial
(Cada ajuste de balance agrega una fila con el antes y el después, medido con el mismo banco.)

### 2026-10-30: primera tanda de ítems para balancear (264 partidas, antes → después)
Diagnóstico: Alquimista, Bruja y Arcanista no pierden por los duelos (83%, 65% y 74% ganados) sino contra creeps: en las rondas 1 a 4 perdían 32, 20 y 19 vidas cada 44 partidas (Axe 1, Vampiro 0), sobre todo por Arqueros. De la ronda 15 en adelante, las vidas las sacan los jefes.
Se probó tocar stats (más ataque básico): mejoraba, pero el usuario prefirió ítems ("balanceamos con ítems en vez de tocar stats y skills"), así que se descartó.
Ítems: Batería de Arranque, Núcleo Evolutivo, Placa de Producción y Carga de Emergencia. La IA compra una build por atributo; ahora suma lo propio de cada competidor (`AI_HERO_ITEMS`). Forzar Núcleo y Placa antes de la build hundió a Axe y Rec (0% y puesto 5,8): van después.

| Héroe | % antes | % después | Puesto antes | Puesto después | Afuera antes | Afuera después |
|---|---|---|---|---|---|---|
| Zeus | 29 | 27 | 3,8 | 4,0 | 21 | 21 |
| Arcanista | 10 | 21 | 4,1 | 3,0 | 17 | 21 |
| Guerrero Vampiro | 26 | 21 | 4,5 | 4,8 | 21 | 21 |
| Danzante Cinético | 16 | 20 | 4,7 | 4,5 | 20 | 20 |
| Asesino | 19 | 19 | 4,3 | 4,2 | 18 | 19 |
| Nigromante | 14 | 13 | 4,8 | 4,7 | 20 | 19 |
| Alquimista | 6 | 6 | 4,5 | 3,8 | 15 | 18 |
| Bruja del Hielo | 2 | 4 | 5,6 | 5,6 | 14 | 15 |
| Sabio del Vacío | 9 | 3 | 4,4 | 4,9 | 18 | 17 |
| Rec | 3 | 2 | 4,5 | 4,8 | 18 | 18 |
| Axe | 4 | 2 | 4,3 | 5,2 | 18 | 17 |

Lectura: el Arcanista subió de más y el Alquimista llega más lejos, pero sigue sin ganar partidas. Bruja, Sabio, Rec y Axe siguen casi en 0 (Sabio y Axe bajaron): esta tanda no los resuelve. Ojo con el ruido: a 132 partidas, un ajuste mínimo movió al Arcanista de 18 a 31% y al Alquimista de 25 a 5%. Para decidir, mirar puesto y 264 partidas.

### 2026-10-30: rama de control (264 partidas, tanda anterior → con control)
Bobina de Choque y cuatro compuestos: Inhibidor de Señal (silencia), Maza de Choque (aturde), Lanzarredes (atrapa) y Tenaza Magnética (atrapa cada 5 golpes). La IA los usa solo contra competidores y jefes, o para cortar un golpe anunciado: 1579 usos en 33 partidas. El Núcleo Evolutivo no lo compró nunca (0 en 33): no le llega el turno en la build.

| Héroe | % antes | % después | Puesto antes | Puesto después |
|---|---|---|---|---|
| Zeus | 27 | 28 | 4,0 | 4,1 |
| Arcanista | 21 | 19 | 3,0 | 2,9 |
| Nigromante | 13 | 19 | 4,7 | 4,4 |
| Asesino | 19 | 19 | 4,2 | 4,5 |
| Guerrero Vampiro | 21 | 18 | 4,8 | 5,3 |
| Danzante Cinético | 20 | 14 | 4,5 | 5,0 |
| Alquimista | 6 | 11 | 3,8 | 3,7 |
| Sabio del Vacío | 3 | 4 | 4,9 | 4,8 |
| Rec | 2 | 3 | 4,8 | 4,7 |
| Axe | 2 | 1 | 5,2 | 4,8 |
| Bruja del Hielo | 4 | 1 | 5,6 | 5,5 |

Duelos: mediana 15,5 s, 12% por tiempo, 0,8 cambios de ventaja, esquive de la IA 32%. Bruja, Axe, Rec y Sabio siguen casi en 0% de victorias: falta resolverlos. La Bruja sigue saliendo en la ronda 15.

### 2026-10-30: rama de supervivencia (264 partidas)
Célula de Impulso y tres compuestos: Mochila Cohete (salta), Domo de Contención (2 s sin daño, sin pegar ni lanzar) y Onda de Choque (área que frena).
Probado y descartado: que la IA compre esto antes de la build. Rec, Bruja y Axe salieron antes (rondas 15, 14 y 16) y el Arcanista subió a 32%. Es la segunda vez que pasa: a la IA floja le falta oro, y un ítem antes de la build la hunde.
Con los ítems después de la build, % de victorias y puesto: Arcanista 24 / 2,7 · Nigromante 23 / 4,2 · Zeus 22 / 4,1 · Vampiro 20 / 5,0 · Danzante 19 / 4,8 · Asesino 15 / 4,7 · Alquimista 7 / 3,6 · Sabio 3 / 4,7 · Rec 3 / 5,2 · Axe 2 / 5,0 · Bruja 1 / 5,5.
Comparado con el inicio de hoy, nadie pasa de 24% (antes 29%). Bruja, Axe, Rec y Sabio siguen en 1-3%. Duelos: mediana 16 s, 13% por tiempo.

### 2026-10-30: probado y descartado, IA que compra la guía de su héroe
En vez de la build por atributo (`AI_BUILDS`), los primeros 4 ítems de núcleo y final de `BUILD_GUIDES`. A 264 partidas empeoró: Arcanista 38%, Rec 0%, Danzante puesto 6,5 y ronda final 21. Las guías orientan a una persona; no sirven tal cual como build de la IA.
Pendiente: Bruja, Axe, Rec y Sabio siguen en 1-3% de victorias con la IA. Los héroes jugados por una persona pueden rendir distinto: el banco mide a la IA.

### 2026-10-30: la IA ahora compra sus contras con el inventario lleno (264 partidas, antes → después)
Diagnóstico: todas las muertes contra Drones Emisores de la ronda 15 en adelante fueron sin la Capa Antimagia, aunque la IA la tenía de objetivo y le sobraba oro (cuesta 165). Con las 6 casillas llenas solo podía vender un contra que no necesitara, y 3 de los 4 temas tardíos piden Capa y Botas a la vez. Axe moría así 103 veces cada 264 partidas.
Arreglo (`aiWorkToward`/`aiShop`, ai.js, sin tocar stats ni ítems): el contra desplaza a lo propio de `late`; lo de `late` ya no desplaza contras, solo entra si hay lugar; y no vende nada si igual no le alcanza. Probado y descartado: que lo de `late` también vendiera contras (se recompra cada ronda; Arcanista 31%, Nigromante puesto 5,1).

| Héroe | % antes | % después | Puesto antes | Puesto después | Afuera antes | Afuera después |
|---|---|---|---|---|---|---|
| Zeus | 22 | 23 | 4,1 | 4,3 | 20 | 22 |
| Danzante Cinético | 19 | 22 | 4,8 | 4,7 | 19 | 21 |
| Arcanista | 24 | 21 | 2,7 | 3,0 | 20 | 21 |
| Guerrero Vampiro | 20 | 19 | 5,0 | 4,9 | 21 | 22 |
| Asesino | 15 | 18 | 4,7 | 4,4 | 18 | 19 |
| Alquimista | 7 | 15 | 3,6 | 3,2 | 18 | 20 |
| Nigromante | 23 | 8 | 4,2 | 5,3 | 19 | 19 |
| Sabio del Vacío | 3 | 6 | 4,8 | 4,8 | 17 | 19 |
| Bruja del Hielo | 1 | 2 | 5,5 | 5,5 | 15 | 16 |
| Rec | 3 | 2 | 5,2 | 5,0 | 18 | 19 |
| Axe | 2 | 1 | 5,0 | 4,6 | 17 | 18 |

Lectura: arregla una falla de la IA, no el balance. El Alquimista sube y **el Nigromante cae de 23 a 8%** (sin explicar; la hipótesis es que ganaba más cuando los otros morían a los Emisores). Bruja, Rec y Axe siguen en 1-2%: llegan más lejos (Axe de puesto 5,0 a 4,6), pero no ganan.
Duelos: mediana 16 → 13,4 s, debajo de la meta de 15-30 s, pero **no es que peleen distinto:** ronda final 22,6 → 24,2, así que hay más duelos en las rondas 20+ (769 → 1017, con muerte súbita duran menos de 15 s). Dentro de las rondas 10 a 19 no cambió. Por tiempo 12%, 0,83 cambios de ventaja.
