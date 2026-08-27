---
name: browser-validate
description: Gate E2E en Chromium real antes de considerar terminada cualquier tarea de frontend de este proyecto. Usar ante cambios de UI, CSS, views, modales o Service Worker.
---

# Validación en navegador real (gate obligatorio)

## Setup
1. Servidor estático efímero desde la raíz del proyecto: `python3 -m http.server 8901` (o siguiente puerto libre 890x).
2. Headless con `puppeteer-core` instalado en `/tmp/vtest` y binario real:
   `CHROME=$(ls -d ~/.cache/puppeteer/chrome/*/chrome-linux64/chrome | tail -1)`
   Si no existe, instalarlo con: `npx --yes puppeteer browsers install chrome`.
   (El MCP puppeteer nativo puede apuntar a otra versión de binario; usar `executablePath` explícito.)

## Checks obligatorios (fallar alguno = tarea NO terminada)
1. `#modal-overlay` con `display:none` computado en reposo (regresión histórica del bug del popup fantasma).
2. `#login-screen` visible al inicio → oculto tras autenticar `admin/admin123`; `#app` visible después.
3. Abrir y cerrar un modal cualquiera: overlay alterna flex↔none correctamente.
4. Ejercitar el flujo de negocio tocado (POS: añadir ítem + cobrar y verificar registro en Ventas; Inventory: abrir CRUD/proveedores; Settings: backup descarga).
5. Cero `pageerror` ni errores de consola (ignorar favicon/net::ERR esperados offline).
6. Screenshot por vista a `/tmp/vtest/` y resumen `[ok]/[FAIL]` línea a línea para el usuario.

## Post-validación
- Si se tocó `sw.js`: confirmar bump de `CACHE` antes de commit.
- Solo entonces hacer commit/push; reportar siempre qué fue validado y con qué navegador.