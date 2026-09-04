---
name: plan-decompose
description: Fase PLAN del ULTRA_TEAM. Activar al iniciar cualquier tarea de desarrollo para descomponerla en subtareas con roles, quality gates y criterios de éxito antes de escribir código.
---

# Plan-Decompose (rol: PM/Orquestador — Fase 1, gate previo a todo)

## Protocolo
1. Reformula la petición en una frase: QUÉ se pide y QUÉ NO se pide (scope).
2. Con sequential-thinking, descompón en subtareas atómicas (≤1 archivo lógico o
   ≤1 flujo verificable por subtarea). Máx. 7 subtareas; si no cabe, dividir la tarea.
3. Asigna a cada subtarea: rol del roster (PM/Arquitecto/Backend/Frontend/QA/DevOps/Reviewer)
   + quality gates aplicables (G1 sintaxis, G2 ejecución, G3 navegador, G4 datos,
   G5 diff-audit, G6 deploy).
4. Escribe la Definition of Done: qué evidencia exacta probará que terminó.
5. Identifica el RIESGO #1 (lo más probable que falle) y qué subtarea lo detecta antes.
6. Si falta información crítica para el diseño: UNA pregunta al usuario con opciones.
7. Muestra el plan en ≤15 líneas y arranca FASE 2 sin pedir permiso.

## Prohibido
- Empezar a codear sin plan escrito (ni siquiera en tareas "pequeñas").
- Asumir requisitos no dichos; si hay 2 interpretaciones razonables, preguntar.
- Plan de más de una pantalla: es señal de sobre-ingeniería.
