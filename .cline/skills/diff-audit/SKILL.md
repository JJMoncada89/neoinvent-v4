---
name: diff-audit
description: Gate G5 del ULTRA_TEAM. Auditoría de seguridad y calidad del diff completo antes de commit/push. Activar siempre antes de commitear y ante cualquier PR.
---

# Diff-Audit (rol: Reviewer/Seguridad — G5, última línea de defensa)

## Protocolo
1. `git diff` (o `git diff --staged`) completo del cambio. Leerlo entero, no
   por muestreo. Si hay archivos ajenos al objetivo en el diff: investigar.
2. Checklist de seguridad (cada ítem con veredicto):
   - [ ] Sin secrets/tokens/passwords (buscar patrones: `key=`, `token`, `Bearer`, base64 largo)
   - [ ] Sin datos personales reales hardcodeados (nombres, cédulas, teléfonos)
   - [ ] Inputs de usuario validados antes de usar (inyección SQL, XSS, path traversal)
   - [ ] `innerHTML`/`eval`/`exec`/`os.system`: solo con contenido controlado
   - [ ] Errores manejados explícitamente (sin catch silencioso que oculte fallos)
3. Checklist de impacto:
   - [ ] Los gates previos aplicables (G1–G4) se ejecutaron CON EVIDENCIA real
   - [ ] El cambio no rompe llamadores existentes (buscar usos con search_codebase)
   - [ ] Commits atómicos: si mezcla 2 temas, dividir
4. Veredicto explícito: `APPROVE` o `REQUEST_CHANGES` + lista concreta.
   Prohibido aprobar sin veredicto escrito.

## Prohibido
- Aprobar por presión de flujo ("ya está casi listo").
- Revisar solo lo nuevo ignorando el impacto en lo existente.
- Commitear `.env`, tokens, o archivos `githubtoken.txt` jamás al repo.
