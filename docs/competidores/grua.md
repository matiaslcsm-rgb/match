# Ficha: Grúa, la operaria del brazo-grúa

> **Estado: (decisión) borrador para aprobar** (2026-10-30). Nada de esto está programado. Los números son propuestas sin medir.
> **Reemplaza a Axe**, que gana 2% de las partidas en el banco y es un héroe copiado de Dota.

## Quién es
La operaria de carga del estadio: maneja la grúa que mueve la escenografía del show y un día se subió a pelear con ella puesta.
- **Cuerpo:** orugas anchas, torso de cabina y un brazo-grúa enorme con gancho; una baliza amarilla de precaución en la cabeza.
- **Rol:** control cuerpo a cuerpo. Te trae hacia ella y te castiga contra las columnas.

## Atributos y base
Atributo principal: **Blindaje** (Fuerza en el juego de hoy).

| Vida | Daño | Vel. ataque | Rango | Velocidad | Blindaje / Reflejos / Procesador |
|---|---|---|---|---|---|
| 150 | 13 | 0,85 | 1,5 | 2,8 | 24 / 12 / 14 |

## Su sello (innato): **Carga Pesada**
Cada vez que mueve a un rival a la fuerza, su próximo ataque básico pega +40%.

## Módulos
**1. Gancho** (activa, golpe anunciado): 0,7 s de aviso con una línea roja de 7 casillas. Al primero que toca lo arrastra hasta ella y le hace daño físico. Si en el arrastre choca una columna, queda aturdido 1 s. Si falla, Grúa queda expuesta 1 s. Enfriamiento: 11 s.

**2. Contrapeso** (activa): se ancla 3 s: no la pueden mover y recibe 25% menos de daño, pero camina 40% más lento. Enfriamiento: 16 s.

**3. Viga** (activa): barrido en semicírculo de 2 casillas que empuja 2 casillas. Enfriamiento: 8 s.

**4. Cabina Reforzada** (pasiva): la primera vez que baja del 40% de vida en cada pelea, gana un escudo igual al 15% de su vida máxima.

**Definitiva: Demolición.** Aviso de 1 s con una zona roja de radio 3: cae una carga desde arriba. Daño físico grande, y aturde 1,5 s al que esté en el centro. Enfriamiento: 60 / 50 / 40 s.

## Cómo pelea un duelo
- **Lectura:** ¿tiro el gancho ya o espero a que se quede quieto? ¿Lo traigo contra una columna?
- **Respuesta del rival:** correrse de la línea, no pelear pegado a las columnas y castigar cuando falla.
- **Se combina con los ítems nuevos:** Lanzarredes deja al rival quieto para el gancho; la Mochila Cohete es la que mejor la esquiva.

## Lo que hace falta en el motor
| Pieza | ¿Existe? |
|---|---|
| Golpe anunciado en línea | Sí (Acople de Rec). |
| Arrastrar a una unidad y detectar el choque con una columna | **Nuevo.** |
| Escudo que absorbe daño | **Nuevo.** |
| Empujar | **Nuevo**; lo pueden usar otros. |
| Robot propio | Nuevo, en `js/m3d/heroes3d.js`. |

## Qué medir cuando esté jugable
Entre 45% y 55% de sus duelos; la IA esquiva entre 30% y 70% de los ganchos; ningún cruce 80 a 20.

## (decisión) Qué falta decidir
1. **A quién reemplaza:** a) Axe (recomendada: es el más flojo y el que más se parece); b) sumarla sin sacar a nadie.
2. **El gancho contra columnas:** a) aturde 1 s (recomendada: premia la posición); b) solo más daño.
