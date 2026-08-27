# ⚖️ Reglas CORE del proyecto NEOINVENT V4 (siempre activas)

1. **Definición de terminado**: ningún cambio de UI/CSS/views está terminado hasta pasar validación en Chromium headless REAL (ver skill `browser-validate`). `node --check` y pruebas con jsdom NO son suficientes: no calculan cascada CSS.
2. **CSS vs [hidden]**: jamás ocultar elementos críticos confiando solo en `hidden`; debe existir siempre `[hidden] { display: none !important; }` en styles.css. Las reglas del autor vencen al default del navegador.
3. **Service Worker**: cualquier cambio de assets exige subir la cadena `CACHE` (`neoinvent-v4-vN`) en `sw.js` ANTES del commit, para invalidar caché de clientes.
4. **Datos**: toda mutación pasa por `Store` y termina en `Store.persist()`. Migraciones solo aditivas vía `ensureCollections()`; nunca borrar colecciones existentes de usuarios reales.
5. **Convenciones**: vistas registradas en `VIEWS` dentro de `js/app.js`; componentes visuales solo con helpers de `js/ui.js` (`U.*`); formato moneda/fechas solo con `js/utils.js`. Sin frameworks, sin build-step, JS vanilla ES2020+.
6. **Idioma**: identificadores y comentarios de código en inglés; UI, mensajes y docs para usuario final en español.
7. **Cierre de feature**: actualizar README (features + roadmap si aplica) → commit atómico descriptivo → push a `main` → verificar auto-deploy de Render OK antes de reportar éxito.