# MATCH

Juego web en JavaScript puro con `<script>` clásicos (el orden está en `index.html`), sin build; la arena en 3D es un
módulo con three.js (`js/m3d/`). Se publica en GitHub Pages con cada push a `main`: https://matiaslcsm-rgb.github.io/match/

**MATCH es un juego propio desde el 2026-10-28 (decisión del usuario):** las mecánicas de Custom Hero (rondas, creeps,
draft, tienda, un duelo por ronda, apuestas, jefes) con competidores y creeps como robots en 3D. Se separó del repo
`custon-hero-chaos`, que queda para Infinite Tower. Acá no hay nada de la Torre: si aparece algo suyo, es un resto.

## Antes de tocar nada
- Leé `docs/ESTADO.md` (qué está hecho y qué falta) y el aviso de arriba de `docs/ROADMAP.md`.
- Concepto "En Vivo" (un show del 2099), sin nada de Dota, y competidores pensados para que **pelear entre héroes sea
  divertido y desafiante**. Diseño en `docs/MATCH.md`; reglas de hoy en `docs/MECANICAS.md`.
- **Solo 3D (decisión del usuario 2026-10-28):** la arena de combate (oleada, duelo, jefe) se dibuja en 3D con cámara en
  diagonal como Dota (`js/m3d/match3d.js`). El 2D de la arena queda solo para las pruebas y por si el navegador no tiene
  WebGL. El orden de lo que sigue está en `docs/ROADMAP.md` (el garaje para armar competidores quedó descartado por ahora).

## El equipo
**Sin agentes (pedido del usuario 2026-10-19):** el trabajo lo hacés vos, sin lanzar agentes. Los agentes de
`.claude/agents/` y la skill `equipo` quedan solo para cuando el usuario pida "el equipo" o "los agentes" en el chat
(guía en `docs/GUIA-AGENTES.md`).

## Cómo se prueba
- Pruebas: `python docs/correr-pruebas.py` o abrir `index.html?test` (tiene que decir "✅ N/N pruebas").
- Banco de partidas y de duelos: `index.html?banco=66` (132 para decidir algo de balance).
- La arena en 2D (para comparar): `index.html?view3d=0`.

## Reglas de la casa
- Español rioplatense con voseo en código, comentarios, commits e interfaz. El usuario no es programador.
- Escribí como el código de alrededor; toda mecánica nueva lleva su prueba en `js/tests.js`.
- Medí antes y después, y anotá en `docs/ESTADO.md` y `docs/ROADMAP.md`. Subí `GAME_VERSION` (`js/main.js`) en cada
  entrega.
- Lo que decide el usuario se marca "(decisión)" con 2-3 opciones y una recomendada.
- No toques el guardado del jugador ni nada fuera de la carpeta, no borres archivos del usuario, no fuerces push, no
  cambies el estilo gráfico sin que lo decida el usuario.
