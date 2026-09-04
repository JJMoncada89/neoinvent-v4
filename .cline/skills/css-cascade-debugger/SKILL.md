---
name: css-cascade-debugger
description: Protocolo de depuración para bugs visuales de CSS. Activar cuando un elemento se ve o comporta mal en el navegador (overlays fantasma, z-index, estilos que "no aplican").
---

# CSS-Cascade-Debugger (rol: Frontend — debug visual con método)

## Protocolo de diagnóstico (en orden, sin saltarse pasos)
1. **Computed style primero**: en Chromium real (devtools MCP o puppeteer),
   `getComputedStyle(el)` de las propiedades en disputa (display, position,
   z-index, visibility, opacity). El computed es la verdad; la regla escrita NO.
2. **¿Qué regla gana?**: inspeccionar el autor de la regla ganadora en el panel
   Styles. Clásico: una regla del autor anula un atributo/estado (bug histórico:
   `display:flex` del autor anuló el atributo `hidden` → fix `[hidden]{display:none!important}`).
3. **Especificidad**: contando selectores, ¿quién debería ganar según la cascada?
   (inline > id > clase > elemento; orden de carga de módulos importa).
4. **Orden de carga**: verificar el orden de `<link>`/imports; un CSS cargado
   después gana a igual especificidad.
5. Solo si el diagnóstico lo justifica: `!important` LEGÍTIMO para estados
   semánticos (`[hidden]`, `.is-open`), nunca para pelear con tu propio layout.

## Evidencia mínima antes de "arreglado"
- Computed style antes/después del fix (pegado en el reporte).
- Reproducción visual en Chromium real del caso que fallaba + screenshot.

## Prohibido
- Añadir `!important` o `z-index: 9999` a ciegas hasta que "se vea bien".
- Diagnosticar con jsdom o `node --check` (no calculan cascada).
