# Ficha: Vector, el esgrimista de la hoja de luz

> **Estado: aprobada por el usuario el 2026-10-30 y programada** (`js/data/heroes/vector.js`, robot en `js/m3d/heroes3d.js`). Reemplazó al Asesino, que se retiró. Decisiones: reemplaza al Asesino y la Guardia frena solo golpes directos: las áreas y el daño en el tiempo pasan.

## Quién es
El duelista elegante del show: un robot flaco de competición, con una hoja de luz y una máscara de esgrima. Es el favorito de la tribuna y lo sabe.
- **Cuerpo:** bípedo fino, un solo brazo armado, el otro atrás, en guardia; la hoja brilla en naranja.
- **Rol:** duelista de contraataque. Gana leyendo al rival, no pegando más fuerte.

## Atributos y base
Atributo principal: **Reflejos** (Agilidad en el juego de hoy).

| Vida | Daño | Vel. ataque | Rango | Velocidad | Blindaje / Reflejos / Procesador |
|---|---|---|---|---|---|
| 135 | 10 | 1,0 | 1,5 | 3,4 | 16 / 23 / 15 |

## Su sello (innato): **Primera Sangre**
El primer ataque básico después de 4 s sin pegar sale con +50% de daño y no se puede esquivar.

## Módulos
**1. Guardia** (activa): 0,8 s en guardia. Si le pegan en ese momento, anula el golpe y responde con un contraataque de 200% de su daño, que aturde 0,6 s. Si nadie le pega, queda expuesto 0,5 s. Enfriamiento: 9 s.

**2. Estocada** (activa): avanza 3 casillas en línea recta y pega a lo que cruza. Enfriamiento: 8 s.

**3. Amago** (activa): la próxima habilidad del rival en los siguientes 2 s tarda 0,4 s más en salir. Se ve en el panel del rival. Enfriamiento: 14 s.

**4. Ritmo de Pista** (pasiva): cada contraataque exitoso baja 30% el enfriamiento restante de sus otras habilidades.

**Definitiva: Punto de Partido.** Marca al rival 6 s. Cada contraataque a un marcado pega el doble; si lo mata, se reinicia la Guardia. Enfriamiento: 60 / 50 / 40 s.

## Cómo pelea un duelo
- **Lectura:** el rival ve la guardia. ¿Tiro el golpe fuerte ahora, o amago hasta que la gaste?
- **Respuesta del rival:** no pegarle durante la guardia y castigarlo en los 0,5 s en que queda expuesto. El Inhibidor de Señal le corta la Guardia.
- **Por qué sirve al juego:** es el competidor que más directamente busca la meta de que la ventaja cambie más de una vez por duelo (hoy 0,8).

## Lo que hace falta en el motor
| Pieza | ¿Existe? |
|---|---|
| Estado de guardia que anula un golpe | **Nuevo.** |
| Avance en línea que pega | Parecido al Corte Errante y a Travelling. |
| Retrasar la habilidad del rival | Se apoya en los golpes anunciados (`startWindup`). |
| Que la IA amague y no le pegue a la guardia | **Nuevo**; es lo más difícil de la ficha. |
| Robot propio | Nuevo, en `js/m3d/heroes3d.js`. |

## Qué medir cuando esté jugable
Entre 45% y 55% de sus duelos; más de 1 cambio de ventaja en sus duelos; ningún cruce 80 a 20.

## Números jugables (medidos el 2026-10-30)
Los números de arriba eran propuestas sin medir. Programados: vida 165, daño 12, velocidad de ataque 1,05, armadura 3, resistencia mágica 30, regeneración 1,5 y 8% de robo de vida (lo aprendido con Grúa: sin eso, los de cuerpo a cuerpo no pasan los jefes). La IA levanta la Guardia con el rival a 2,5 casillas o menos, usa el Amago solo contra competidores y compra la Batería de Arranque.
**Una diferencia con la ficha:** Punto de Partido además hace recibir 15-25% más de daño al marcado. Sin eso no servía contra creeps ni para quien la consiga en el draft sin tener la Guardia.
El Amago no se ve todavía en el panel del rival: se ve un cartel sobre el competidor.
Banco de 264: gana 46% de sus duelos (meta 45-55% ✔), puesto 5,5, afuera en la ronda 19, 5 victorias en 201 partidas.
**Tiene 4 habilidades normales**, como Grúa.
