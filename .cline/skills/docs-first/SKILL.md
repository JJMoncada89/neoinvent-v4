---
name: docs-first
description: Fase DOCS del ULTRA_TEAM. Activar antes de usar cualquier API, método o librería que no esté ya verificada en el codebase. Consulta context7, jamás memoria de entrenamiento.
---

# Docs-First (rol: Arquitecto — Fase 2, gate anti-alucinación)

## Protocolo
1. Lista las APIs/librerías que la subtarea tocará. Clasifica cada una:
   - ✅ YA EN EL PROYECTO (ver su uso real con search_codebase antes de imitar patrones externos)
   - ❓ CONOCIDA PERO SIN VERIFICAR → context7 obligatorio
   - 🆕 NUEVA → context7 + decidir si vale la dependencia (regla del repo: preferir
     cero dependencias si vanilla resuelve)
2. Para cada ❓/🆕: `context7.resolve-library-id` → `context7.get-library-docs`
   con el tema concreto (no la doc completa). Cita la versión de la API consultada.
3. Si context7 no tiene la librería: fetch a la doc oficial y verificar firma de
   la función en el código fuente o tests del paquete.
4. Solo entonces escribir código. Si la doc contradice tu memoria: GANA LA DOC,
   y anota el hallazgo en el cierre de sesión (memory).

## Prohibido
- Usar APIs de memoria "porque funcionan así desde siempre".
- Instalar dependencias sin justificarlas frente a la solución vanilla.
- Imitar patrones de otros proyectos sin verificar las convenciones de este repo.
