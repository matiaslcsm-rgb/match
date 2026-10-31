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
### 2026-10-30: Grúa reemplaza a Axe (264 partidas)
% de victorias y puesto: Arcanista 32 / 2,4 · Asesino 23 / 4,2 · Zeus 21 / 4,2 · Vampiro 17 / 4,9 · Nigromante 15 / 4,5 · Alquimista 12 / 3,2 · Danzante 10 / 4,9 · Rec 3 / 4,6 · Sabio 3 / 4,7 · Bruja 0 / 5,6 · Grúa 0 / 6,3.
Duelos: mediana 16,6 s, 14% por tiempo, 0,9 cambios de ventaja, la IA esquiva 43% de los golpes anunciados (meta 30-70 ✔; antes 32%). El Arcanista volvió a subir (24 → 32%): sin Axe tiene menos rivales que aguanten. Ahora Grúa y Bruja son los que quedan abajo.

### 2026-10-30: Grúa más los contras con inventario lleno (264 partidas, con todo integrado)
% de victorias y puesto: Arcanista 23 / 3,0 · Zeus 21 / 4,4 · Vampiro 21 / 4,6 · Asesino 18 / 4,3 · Nigromante 15 / 4,7 · Alquimista 14 / 2,8 · Danzante 13 / 4,9 · Sabio 7 / 4,4 · Bruja 4 / 5,2 · Rec 1 / 4,5 · Grúa 0 / 6,6.
Duelos: mediana 14,4 s (meta 15-30, apenas abajo), 13% por tiempo, 0,8 cambios de ventaja, esquive de la IA 40%. Nadie pasa de 23%. Grúa gana 38% de sus duelos y sale en la ronda 16: sigue siendo la última con la IA.

### 2026-10-30: Grúa con build propia (528 partidas, antes → después)
Diagnóstico: Grúa pierde más vidas temprano que el resto de los de cuerpo a cuerpo (rondas 1 a 5: 118 muertes cada 264 partidas; el Vampiro, 7) y no tiene robo de vida propio. Arreglo (`AI_BUILDS.CRANE`, ai.js, sin tocar stats ni habilidades): Sed Carmesí, Corazón, Coraza y Martillo, en vez de Cinturón, Corazón, Coraza y Sed.

| Héroe | % antes | % después | Puesto antes | Puesto después |
|---|---|---|---|---|
| Danzante Cinético | 26 | 25 | 3,5 | 3,8 |
| Zeus | 21 | 23 | 4,5 | 4,4 |
| Arcanista | 21 | 22 | 3,1 | 3,1 |
| Guerrero Vampiro | 21 | 22 | 4,5 | 4,6 |
| Asesino | 22 | 17 | 3,4 | 3,4 |
| Nigromante | 8 | 11 | 5,6 | 5,4 |
| Alquimista | 13 | 10 | 3,3 | 3,4 |
| Sabio del Vacío | 4 | 5 | 4,7 | 4,9 |
| Bruja del Hielo | 3 | 3 | 5,5 | 5,4 |
| Rec | 1 | 1 | 4,8 | 4,8 |
| Grúa | 0 | 0 | 6,6 | 6,3 |

Medido con los cuerpos sólidos ya integrados (`c824ebc`). Grúa: afuera en la ronda 15,4 → 16,8, duelos 39 → 45%, muertes en las rondas 11 a 15 de 218 a 118. Sigue última y no ganó ninguna de sus 397 partidas. Sin los cuerpos sólidos (`ba6643b`) había dado lo mismo: puesto 6,6 → 6,1, duelos 38 → 46%. Duelos: mediana 13,3 → 12,8 s (meta 15-30 ✘: ya venía abajo con los cuerpos sólidos), 11% por tiempo, 0,88 cambios de ventaja, esquive 40%.
Probado y descartado, a 264 partidas sobre `ba6643b`: vender la primera pieza de la build con la build armada, para que entren los contras (a todos: Vampiro 30%, Zeus 14%; solo Cinturón y Guantes: Vampiro 30%; a Grúa casi no la mueve: puesto 6,3-6,4); Grúa sin la Batería de Arranque (puesto 6,5). La Sed comprada temprano, la Máscara Vampírica, la Capa en `late`, la Viga sin empuje, Sed con Hoja Veloz y más stats (22 de daño y 220 de vida) se probaron mientras otra sesión cambiaba la carpeta: esas cifras no valen y quedan sin medir.
En las rondas tardías la oleada pide 3 o 4 contras y la build protege 4 de las 6 casillas: por eso sigue habiendo muertes a Emisores sin la Capa.

### 2026-10-30: cuerpos sólidos y Grúa reforzada (264 partidas)
% de victorias y puesto: Danzante 25 / 3,6 · Asesino 21 / 3,4 · Zeus 21 / 4,5 · Arcanista 20 / 3,4 · Vampiro 19 / 4,8 · Nigromante 13 / 5,4 · Alquimista 12 / 3,3 · Sabio 5 / 4,9 · Bruja 2 / 5,6 · Rec 1 / 5,1 · Grúa 0 / 5,6.
Duelos: mediana 13.1 s (meta 15-30 ✘: bajó de ~15), 12% por tiempo, 0.9 cambios de ventaja, esquive de la IA 42%.
Probado y descartado para Grúa: más crecimiento de Fuerza (3,6): puesto 6,4, casi igual. Lo que funcionó: 12% de robo de vida (duelos 43 → 52%, puesto 6,4 → 5,6) y resistencia mágica 35 contra los Drones Emisores.
A 66 partidas el Nigromante parecía caer mucho con los cuerpos sólidos; a 264 quedó 5,4 (antes 4,7): baja, pero menos.

### 2026-10-30: Bruja y Rec con build propia (528 partidas, antes → después)
Diagnóstico: la Bruja gana 60% de sus duelos pero sale en la ronda 15,6: le falta aguante, no daño. Rec usaba la build de Agilidad (crítico y robo de vida), que solo rinde en su dron aéreo; el daño plano y la velocidad de ataque rinden en los tres. Arreglo (`AI_BUILDS.FROSTWITCH` y `AI_BUILDS.REC`, ai.js, sin tocar stats ni habilidades): Bruja con Báculo, Cetro, Corazón y Égida; Rec con Guantes, Corazón, Martillo y Sed.

| Héroe | % antes | % después | Puesto antes | Puesto después | Afuera antes | Afuera después |
|---|---|---|---|---|---|---|
| Guerrero Vampiro | 23 | 24 | 4,6 | 4,6 | 21,5 | 21,6 |
| Danzante Cinético | 21 | 23 | 3,8 | 3,9 | 22,0 | 22,1 |
| Zeus | 20 | 21 | 4,6 | 4,6 | 21,3 | 21,7 |
| Arcanista | 20 | 20 | 3,3 | 3,2 | 20,9 | 21,3 |
| Asesino | 23 | 19 | 3,4 | 3,5 | 20,8 | 20,6 |
| Alquimista | 13 | 12 | 3,3 | 3,6 | 19,5 | 19,8 |
| Nigromante | 11 | 10 | 5,6 | 5,8 | 19,1 | 19,4 |
| Sabio del Vacío | 5 | 5 | 4,9 | 5,1 | 18,5 | 18,8 |
| Bruja del Hielo | 2 | 3 | 5,6 | 5,1 | 15,6 | 16,3 |
| Rec | 1 | 2 | 5,0 | 4,6 | 18,3 | 18,6 |
| Grúa | 0 | 1 | 5,6 | 5,6 | 18,8 | 18,6 |

Victorias: Bruja 6 → 11 de 383, Rec 4 → 9 de 385, Grúa 0 → 3 de 397 (Grúa no cambió: es ruido). Mejoran en puesto, pero siguen lejos del 12,5% parejo. Duelos: mediana 13,2 → 14,3 s (meta 15-30 ✘), 13% por tiempo, 0,87 cambios de ventaja, esquive 41%.
Probado y descartado, a 528 partidas, para Rec sin el Corazón: Guantes, Martillo, Hoja Certera y Sed (puesto 5,2); Sed, Martillo, Hoja Certera y Guantes (5,0); Martillo, Tenaza, Sed y Guantes (5,2). Para la Bruja, Corazón antes que los báculos: puesto 4,8 junto con otra build de Rec, sin ventaja. El banco de esta tanda corre partes de semillas en paralelo sobre copias exportadas, así que los números pueden no coincidir exactos con `?banco=528`.


### 2026-10-30: Sabio con build propia (528 partidas, antes → después)
Diagnóstico: el Sabio salía en la ronda 18,8 con la build de Inteligencia, que no le da aguante, y su kit lo lleva al medio de los enemigos (Distorsión Espacial y áreas de radio corto). Arreglo (`AI_BUILDS.VOIDSAGE`, ai.js, sin tocar stats ni habilidades): Báculo, Corazón, Cetro y Botas Firmes, en vez de Báculo, Cetro, Túnica y Égida.

| Héroe | % antes | % después | Puesto antes | Puesto después | Afuera antes | Afuera después |
|---|---|---|---|---|---|---|
| Zeus | 21 | 24 | 4,6 | 4,7 | 21,7 | 21,0 |
| Danzante Cinético | 23 | 22 | 3,9 | 4,1 | 22,1 | 21,8 |
| Guerrero Vampiro | 24 | 22 | 4,6 | 4,5 | 21,6 | 21,9 |
| Arcanista | 20 | 20 | 3,2 | 3,4 | 21,3 | 21,5 |
| Asesino | 19 | 18 | 3,5 | 3,6 | 20,6 | 20,8 |
| Sabio del Vacío | 5 | 11 | 5,1 | 4,0 | 18,8 | 20,7 |
| Alquimista | 12 | 9 | 3,6 | 3,9 | 19,8 | 19,4 |
| Nigromante | 10 | 7 | 5,8 | 5,9 | 19,4 | 19,6 |
| Bruja del Hielo | 3 | 4 | 5,1 | 5,0 | 16,3 | 16,4 |
| Rec | 2 | 1 | 4,6 | 4,7 | 18,6 | 18,6 |
| Grúa | 1 | 0 | 5,6 | 5,8 | 18,6 | 18,9 |

Victorias del Sabio: 19 → 43 de 406. Sale del grupo de abajo, pero parte de lo que gana sale de los de abajo y del medio: Alquimista 48 → 37, Nigromante 35 → 24, Rec 9 → 4 (con estos totales, cambios así pueden ser en parte ruido). Duelos: mediana 14,3 → 14,2 s (meta 15-30 ✘), 13% por tiempo, 0,85 cambios de ventaja, esquive 43%.
Probado y descartado, a 528 partidas: Báculo, Cetro, Corazón y Égida, la de la Bruja (8%, puesto 4,5, afuera 19,7). Se mide igual que la tanda anterior: 4 partes de semillas en paralelo sobre copias exportadas.
**Corrección:** la tabla de arriba se midió sobre `4a22343`, con el Asesino y antes de Vector. Repetido a 528 partidas sobre `21f36b4` (con Vector en ajuste), sin → con la build: Sabio 5,7 → 9,4% de victorias, puesto 5,07 → 4,05, afuera 18,5 → 20,2. El resultado se sostiene. Con esta medición, las bajas de la tabla de arriba no se repiten igual: Nigromante 12,8 → 10,6 y Alquimista 11,0 → 14,6 (el Alquimista sube), o sea que eran en buena parte ruido. Vector: 2-3% de victorias, puesto 5,3-5,6.

### 2026-10-30: Vector reemplaza al Asesino (264 partidas)
% de victorias y puesto: Zeus 26 / 4,2 · Danzante 25 / 3,9 · Vampiro 25 / 4,3 · Alquimista 16 / 3,4 · Arcanista 16 / 3,5 · Nigromante 10 / 5,8 · Sabio 7 / 4,2 · Bruja 7 / 4,7 · Rec 2 / 4,4 · Vector 2 / 5,5 · Grúa 1 / 5,6.
Duelos: mediana 17,7 s (meta 15-30 ✔, antes 13,1), 15% por tiempo (meta <10 ✘), 0,9 cambios de ventaja (meta >1 ✘). Vector 46% y Grúa 52% de sus duelos, los dos en la meta. Alquimista (80%) y Nigromante (22%) son los extremos en duelos. Los Drones Emisores siguen siendo lo que más vidas saca a los de cuerpo a cuerpo desde la ronda 15.

