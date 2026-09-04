---
name: backend-verify
description: Gate G2 del ULTRA_TEAM. Activar al escribir o modificar lógica de backend, scripts o pipelines: el código debe ejecutarse contra datos reales, no "compilar y esperar".
---

# Backend-Verify (rol: Dev Backend — G2, compilar = funciona es una mentira)

## Protocolo
1. **Ejecutar de verdad**: correr el script/módulo/endpoint tocado con datos
   reales del proyecto (no mocks trivialmente vacíos). Salida completa al reporte.
2. **Casos mínimo**: 1 caso normal, 1 caso borde (lista vacía, 0, null, fecha límite),
   1 caso inválido (debe fallar con error claro, no corrupto).
3. **Validación de datos**: si produce/consume datos estructurados, aplicar
   data-audit (gate G4) sobre la salida.
4. **Idempotencia**: correr 2 veces; la segunda no debe duplicar/registrar doble
   (lección S-21: dedup inteligente, gana la copia más rica).
5. **Config sobre hardcode**: rutas, umbrales y constantes del negocio en
   config/env, jamás en el código. Si viste un literal sospechoso, parametrizar.
6. **Errores explícitos**: cada fallo previsible con mensaje accionable
   (qué archivo, qué campo, qué se esperaba).
7. Verificación final sintáctica: `node --check` / `py_compile` (G1) DESPUÉS
   de cada edición por trozos (el editor puede truncar archivos largos).

## Prohibido
- "Debería funcionar" sin ejecución real.
- Probar solo el happy path.
- Credenciales o rutas absolutas de esta máquina hardcodeadas.
