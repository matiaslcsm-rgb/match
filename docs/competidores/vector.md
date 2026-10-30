# Ficha: Vector, el esgrimista de la hoja de luz

> **Estado: (decisión) borrador para aprobar** (2026-10-30). Nada de esto está programado. Los números son propuestas sin medir.
> **Reemplaza al Asesino**, un héroe copiado de Dota que hoy gana 17% con duelos flojos (42%).

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

## (decisión) Qué falta decidir
1. **A quién reemplaza:** a) al Asesino (recomendada: mismo lugar en el plantel); b) al Danzante, que también es duelista.
2. **La Guardia contra habilidades de área:** a) solo frena golpes directos (recomendada: deja una respuesta clara); b) frena todo.
