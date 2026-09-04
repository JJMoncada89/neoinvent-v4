---
name: e2e-playwright
description: Gate G3 alternativo del ULTRA_TEAM. E2E determinista con accessibility snapshots vía MCP playwright, menos frágil que screenshots. Para flujos de negocio, formularios y regresiones repetibles.
---

# E2E-Playwright (rol: QA — G3 determinista)

## Cuándo usar esta en vez de browser-validate
- Flujos de negocio que se repetirán (login→operación→guardar→listar).
- Formularios complejos: validar estados, disabled, validación de inputs.
- Cuando screenshots no bastan para probar semántica (roles ARIA, foco, labels).

## Protocolo
1. `browser_navigate` a la app (servidor efímero 890x o URL de preview).
2. `browser_snapshot` ANTES de actuar: el accessibility snapshot es la aserción
   base. Prohibido click a ciegas sin snapshot previo.
3. Ejecutar el flujo con `browser_click`/`browser_type` re-snapshotteando tras
   cada paso que cambia la vista. Verificar que el snapshot muestra el estado
   esperado (texto, roles, visibilidad) — no solo que "no crasheó".
4. Casos negativos mínimos: 1 input inválido, 1 cancelación a mitad de flujo.
5. Cero errores de consola: revisar `browser_console_messages` al final.
6. Reporte `[ok]/[FAIL]` por paso con el extracto del snapshot como evidencia.

## Prohibido
- Afirmar que un flujo pasó basándose en que el click no lanzó error.
- Depurar visuales finos (px, cascada) con esta skill: usar browser-validate/css-cascade-debugger.
