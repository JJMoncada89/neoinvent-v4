---
name: data-audit
description: Gate G4 del ULTRA_TEAM. Activar ante cualquier salida con datos (Excel, reportes, DB, JSON consolidado, backups). Cruce numérico fuente↔salida y validación en el motor que usa el usuario final.
---

# Data-Audit (rol: QA — G4, los datos mentirosos son peores que los crashes)

## Protocolo
1. Identifica la FUENTE de verdad (JSONL, SQL, localStorage, PDFs) y la SALIDA
   (Excel, reporte, API response). Nunca validar la salida contra sí misma.
2. Cruce numérico automático: one-liner que compare
   `sum/filtrado de la fuente` vs `celda/registro de la salida` para ≥3 cortes
   (un total general, un subconjunto, un caso límite). Ejemplo S-21:
   `sum(horas del JSONL en julio)` vs celda TOTAL de julio.
3. Si difieren: sospechar PRIMERO del extractor/pipeline, no del dato
   (lección julio: el dato SÍ estaba en el PDF).
4. Render en el motor del USUARIO: si el usuario usa Excel, validar como Excel
   (LibreOffice mintió con gráficos: `x_axis.delete=False` / valores estáticos
   en KPIs para visores sin recálculo).
5. Valores en celdas: verificar que son valores, no fórmulas rotas en visores
   sin motor de recálculo.
6. Reporte: tabla fuente vs salida por corte + veredicto `[ok]/[FAIL]`.

## Prohibido
- "Se ve bien" sin cruce numérico.
- Validar solo en el motor donde se generó (no en el que se consume).
- Detectar lock `.~lock.*#` de LibreOffice antes de `wb.save()`.
