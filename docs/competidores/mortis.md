# Ficha: M.O.R.T.I.S., el nigromante robótico

> **Estado: aprobada por el usuario el 2026-10-31 y programada** (`js/data/heroes/necromancer.js`, `js/minions.js`, robots en `js/m3d/`). Reemplaza al Nigromante; las claves internas siguen siendo `NECROMANCER`. Decisiones, todas la opción recomendada: cada duelo arranca con 1 Autómata; el Sello invoca aunque no tengas la pasiva (cupo de 2), el Eco funciona solo y Sobrecarga es exclusiva; un Autómata paga lo mismo que un Dron de Piso.
>
> **Diferencias con lo de abajo:** Sello, Eco y Sobrecarga suman 40/40/60% de la Inteligencia, y la vida y el daño de los Autómatas crecen con ella (x2 y x0,25), porque con números fijos dejaban de servir en las rondas altas. Los jefes de ronda no apuntan a los Autómatas.

## Números jugables (medidos el 2026-10-31, banco de 132)
Los números de más abajo eran propuestas. Programados: vida 195, armadura 3 y resistencia mágica 30 (lo que más pesó: perdía los duelos en 8 s, sin escape). Cada duelo arranca con 2 Autómatas. El Aura y los golpes de los Autómatas no sufren el recorte de duelo (`fullDuelDamage`). El Aura hace 0,4/0,6/0,8/1% a los creeps, y 0,8/1,2/1,6/2% a los competidores. Eco suma 30% de Inteligencia. El robo de vida del escalado es +1 cada 10 bajas. Los Autómatas crecen x1 de vida y x0,12 de daño por Inteligencia.

| Prueba | Partidas ganadas | Duelos ganados |
|---|---|---|
| Primera versión (66) | 27% | 27% |
| Sin recorte de duelo (66) | 33% | 34% |
| Más resistencia (132) | 32% | 40% |
| Más resistencia, menos contra creeps (132) | 39% | 40% |
| **Final: Autómatas crecen menos (132)** | **26%** | **36%** |

**No llega a la meta de 45-55% de duelos**, y quedan cruces muy desparejos: 8 de 83 contra Arcanista y 8 de 56 contra Alquimista, los dos con aturdimientos. Mejor contra Guerrero Vampiro (48 de 80) y Danzante (56 de 102). Le falta una respuesta al aturdimiento, y eso ya pide cambiar el kit, no los números.

## Quién es
Un robot flotante sin piernas, de capucha verde, cráneo, armadura de cobre y garras. Levita con propulsores que dejan una estela verde de nanobots. Junta chatarra de los caídos y la hace caminar.
- **Rol:** desgaste a distancia e invocador.
- **Cuerpo:** sin el logo de Dota que trae la imagen de referencia; dibujo animado con contorno negro, como el resto del juego.

## Atributos y base
Atributo principal: Inteligencia.

| Fuerza | Agilidad | Inteligencia | Rango | Velocidad |
|---|---|---|---|---|
| 19 + 2,2 | 14 + 1,4 | 24 + 3,2 | 3 | 2,6 |

Vida, daño, armadura y maná base quedan como los del Nigromante de hoy (160, 12, 1 y 130).

## Su sello (innato): Sadista
Se queda como está: cada baja da regeneración de vida y maná. La ficha original no trae innato y el juego exige uno.

## Módulos
**1. Sello de Putrefacción** (Q, activa): ata al objetivo. Puede atacar y lanzar habilidades, pero no moverse. Hace 60/110/160/210 de daño mágico más 8/12/16/20% de la vida que le falta. Si muere con el sello o dentro de los 2 s siguientes, aparece un Autómata. Atadura de 1,2/1,5/1,8/2,1 s. Enfriamiento 12/11/10/8 s. Maná 70/85/100/115.

**2. Aura de Corrupción** (pasiva): los enemigos en radio 4 pierden 0,8/1,2/1,6/2% de su vida máxima por segundo como daño mágico, y reciben 15/20/25/30% menos curación.

**3. Autómata Putrefacto** (pasiva): hasta 2/3/4/5 autómatas a la vez. Vida 120/160/200/240, daño 10/15/20/25, ataque lento, duran 25 s. Quien destruye uno cobra oro.

**4. Eco de los Muertos** (activa): 90/140/190/240 de daño mágico en radio 2,5. Cada autómata repite la onda desde donde está, 35% más débil que la anterior. Un mismo enemigo recibe 3 ondas como máximo. Enfriamiento 8/7/6/5 s. Maná 70/80/90/100.

**Definitiva: Sobrecarga de Servidores.** Detona todos tus autómatas. Cada uno hace 150/225/300 de daño mágico en radio 2 y frena 40% por 2,5 s. Si 2 o más explosiones tocan al mismo competidor, queda atado 1,5 s. Enfriamiento 75/65/55 s. Maná 130/150/170.

## Lo que se saca de la ficha original
- **Árbol de talentos y Aghanim:** MATCH no los tiene. Podrían volver como ítems más adelante.
- **Guadaña, Pulso de Muerte y Manto Fantasma:** salen del juego.
- **Robo de vida del escalado:** se conserva para no cambiar su fuerza contra los jefes.

## Problemas para decidir
1. **(decisión) Autómatas en duelos.** Tal como está, en un duelo el Sello no invoca nada: si el rival muere, el duelo terminó. Eco y Sobrecarga quedarían vacíos en lo que es el centro del juego.
   - **a (recomendada):** arranca cada duelo con 1 autómata. Es simple y se lee bien.
   - **b:** el Sello invoca un autómata también cuando termina sobre un competidor vivo. Más fuerte y más agresivo.
   - **c:** dejarlo así: M.O.R.T.I.S. queda débil en duelos.
2. **(decisión) El draft.** Otro competidor puede sacar estas habilidades sin tener el resto del kit: Eco se queda sin réplicas y Sobrecarga no hace nada.
   - **a (recomendada):** Sello invoca siempre, aunque no tengas el Autómata (cupo de 2). Eco funciona solo. Sobrecarga queda solo para M.O.R.T.I.S.
   - **b:** las tres quedan solo para M.O.R.T.I.S.
3. **(decisión) Oro por autómata.** La ficha pide 25-30 de oro, pero en MATCH un creep da mucho menos. Propuesta: lo mismo que un creep común.

## Lo que hace falta en el motor
| Pieza | ¿Existe? |
|---|---|
| Atadura y anticuración | Sí. |
| Unidades aliadas que pelean de tu lado | **Nueva: es lo más grande.** Toca objetivos, IA, arenas y dibujo. |
| Que los enemigos elijan pegarle a un autómata | **Nuevo.** |
| Réplicas de Eco, en orden y con tope por enemigo | **Nuevo.** |
| Que la IA use y cuide los autómatas | **Nuevo.** |
| Robot flotante, autómata esqueleto, estela y sello en el piso | **Nuevos**, en `js/m3d/`. |

## Qué medir cuando esté jugable
Entre 45% y 55% de sus duelos; ningún cruce 80 a 20; que los autómatas no sumen más de 15% de cálculo por cuadro.
