# Reglas del Workspace - proyectIA-vibe-coding

Este archivo establece las directrices de desarrollo, convenciones de codificación y protocolos del motor agéntico que deben seguir todos los asistentes de IA (incluyendo Gemini) al programar en este espacio de trabajo.

---

## 🎯 Principios de Desarrollo

### Filosofía de Diseño
- **KISS (Keep It Simple, Stupid)**: Prefiere soluciones simples, legibles y mantenibles sobre arquitecturas complejas.
- **YAGNI (You Aren't Gonna Need It)**: Implementa únicamente lo necesario para cumplir con los requerimientos actuales.
- **DRY (Don't Repeat Yourself)**: Evita la duplicación de código. Extrae lógica común a funciones o utilidades reutilizables.
- **SOLID**: Diseña con responsabilidades únicas, código abierto a la extensión pero cerrado a la modificación, y dependencias limpias.

### Límites de Archivo y Código
- **Archivos**: Máximo de 500 líneas de código para asegurar modularidad y comprensión rápida.
- **Funciones/Métodos**: Máximo de 50 líneas de código.
- **Componentes**: Deben tener una única responsabilidad clara.

---

## 📝 Convenciones de Nomenclatura

- **Variables y Funciones**: `camelCase` (ej: `getUserData`, `isConnectionActive`)
- **Clases y Componentes**: `PascalCase` (ej: `UserManager`, `DashboardCard`)
- **Constantes**: `UPPER_SNAKE_CASE` (ej: `API_TIMEOUT_LIMIT`, `MAX_RETRIES`)
- **Archivos y Carpetas**: `kebab-case` (ej: `auth-service.ts`, `components/auth-form/`)
- **Tipos y Firmas (TypeScript/Python)**: Utiliza siempre tipado estático explícito. Evita el uso de `any` (usa `unknown` en TS o `Any` de forma controlada en Python).

---

## 🔄 Protocolo de Desarrollo: Bucle Agéntico

Para tareas complejas o nuevas funcionalidades, sigue de forma estricta el **Bucle Agéntico**:

1. **Delimitar el Problema**:
   - Identificar el objetivo principal y subproblemas.
   - Definir los criterios de éxito ("¿cuándo está al 100%?").

2. **Ingeniería Inversa y Análisis de Contexto**:
   - Identificar componentes necesarios y sus dependencias de orden.
   - Investigar librerías externas u oficiales (evitando alucinar APIs inexistentes).
   - Analizar patrones existentes en el codebase antes de proponer código nuevo.

3. **Planificación Jerárquica**:
   - Generar un plan estructurado dividido en tareas y subtareas cronológicas.
   - Usar un checklist progresivo (como `task.md` o herramientas internas).

4. **Ejecución Iterativa y Validación (0% -> 100%)**:
   - Trabajar en una sola tarea a la vez.
   - Validar sintaxis, tipos y lógica de forma inmediata tras implementar un bloque de código.
   - Si ocurre un error, analizar la causa raíz en lugar de aplicar parches rápidos redundantes.

5. **Validación de Calidad Continua**:
   - Ejecutar suites de pruebas correspondientes (unitarias, integración).
   - Comprobar que no se generen errores colaterales en otras partes del sistema.

6. **Reporte Final**:
   - Resumir cambios realizados, pruebas ejecutadas y deudas técnicas o recomendaciones.

---

## 🔌 Protocolo de Error-First (Manejo de Errores Predictivos)

- **Siempre incluir fallbacks**: Las conexiones de red, llamadas de APIs externas e interacciones con bases de datos deben tener bloques `try/catch` o `try/except` con valores de respaldo o control de fallos graceful.
- **Timeouts**: Define timeouts para todas las peticiones a servicios de terceros.
- **Mensajes de error informativos**: Asegúrate de que los errores generen logs claros que incluyan el contexto de la llamada y un identificador visual (como emojis o tags) para facilitar la depuración a través de la terminal o visor de logs.
