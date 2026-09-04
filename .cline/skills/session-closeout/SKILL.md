---
name: session-closeout
description: Fase CLOSE del ULTRA_TEAM. Activar al terminar una tarea o sesión de trabajo: actualizar memoria persistente, memory bank del proyecto y entregar el reporte final.
---

# Session-Closeout (rol: PM — Fase 6, sin esto la sesión no termina)

## Memoria persistente (MCP memory)
1. `create_entities`/`add_observations` para: decisiones de diseño tomadas,
   lecciones nuevas (qué falló y cómo se detectó), hitos (versiones, deploys),
   credenciales demo/URLs si cambiaron.
2. Relacionar con las entidades existentes del proyecto (no duplicar entidades).
3. Si una observación vieja quedó obsoleta: `delete_observations` (la memoria
   podrida es peor que ninguna).

## Memory Bank del proyecto (si el repo lo tiene, o vale la pena crearlo)
- `activeContext.md`: en qué quedó, siguiente paso concreto.
- `progress.md`: hito cerrado con fecha y evidencia.
- Solo si el cambio fue estructural: `systemPatterns.md`/`techContext.md`.

## Reporte final al usuario (formato fijo)
```
✅ COMPLETADO: <tarea en una línea>
📁 Cambios:  <archivo → qué>
🔍 Verificación: <gates ejecutados + evidencia>
⚠️ Pendiente/riesgos: <si los hay, con próximo paso>
```

## Prohibido
- Cerrar sesión con "debería funcionar" en lugar de evidencia.
- Registrar en memoria algo no verificado en esta sesión.
