---
name: ship-deploy
description: Gate G6 del ULTRA_TEAM. Commit/push/PR seguros y deploy (Render static site u otro). Activar al publicar cualquier cambio ya auditado por G5.
---

# Ship-Deploy (rol: DevOps — G6)

## Commit
1. Solo tras APPROVE del diff-audit. Mensaje: `tipo: qué y por qué en ≤72 chars`
   (feat/fix/refactor/docs/chore). Un commit = un tema.
2. `git status` limpio: sin archivos de backup (`.backup_*`), temporales o secrets.
3. Push con github MCP o CLI; si hay PR: cuerpo con QUÉ/DÓNDE/CÓMO SE VERIFICÓ.

## Deploy Render static site (NEOINVENT y similares)
1. Si cambió cualquier asset: bump de la cadena `CACHE` en `sw.js` ANTES del commit
   (sin esto el usuario recibe versión vieja por caché del Service Worker).
2. Verificar `manifest.json` coherente con assets nuevos.
3. Push a `main` → auto-deploy. Esperar y verificar:
   - `fetch` a la URL pública devuelve 200 y la versión nueva.
   - Hard-reload concept: confirmar que el SW instaló la nueva caché (hash o versión).
4. Reporte: commit hash, URL, verificación post-deploy.

## Post-ship
- Monitoreo: si el proyecto tiene Sentry, revisar errores nuevos en 24h.
- Anotar el ship en el cierre de sesión (session-closeout).

## Prohibido
- Push directo a main de cambios sin gates (ni "arreglitos rapiditos").
- Deploy asumiendo que el CI/CD funcionó: verificar la URL siempre.
