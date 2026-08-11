# Proyecto: Motor Agéntico Universal

Este archivo es la fuente de verdad para el desarrollo en cualquier proyecto que utilice este espacio de trabajo. Establece las reglas globales, los principios de desarrollo y el protocolo agéntico para **Claude Code**, **Gemini** y otros asistentes de IA.

---

## 🎯 Principios de Desarrollo (Context Engineering)

### Filosofía de Diseño
- **KISS (Keep It Simple, Stupid)**: Prefiere soluciones simples y directas. Evita sobre-ingeniería.
- **YAGNI (You Aren't Gonna Need It)**: Implementa solo la funcionalidad necesaria en el momento.
- **DRY (Don't Repeat Yourself)**: Minimiza la duplicación. Extrae lógica repetida a utilidades comunes.
- **SOLID**: Diseña con responsabilidades únicas y dependencias modulares.

### Límites de Archivo y Funciones
- **Archivos**: Máximo 500 líneas por archivo para garantizar mantenibilidad.
- **Funciones**: Máximo 50 líneas para asegurar que sean testeables y enfocadas.
- **Componentes**: Una única responsabilidad funcional clara.

---

## 📝 Convenciones de Nomenclatura Estándar

- **Variables y Funciones**: `camelCase` (ej: `calculateTotal`, `fetchUserData`)
- **Clases y Componentes**: `PascalCase` (ej: `UserSession`, `AuthButton`)
- **Constantes**: `UPPER_SNAKE_CASE` (ej: `MAX_REQUEST_TIMEOUT`, `DEFAULT_PORT`)
- **Archivos y Carpetas**: `kebab-case` (ej: `api-client.ts`, `services/user-service/`)

---

## 🔄 Protocolo de Desarrollo Agéntico (Bucle Agéntico)

Para tareas complejas, se debe seguir estrictamente este flujo:

1. **Delimitar el Problema**: Definir con precisión el alcance, subproblemas y criterios de éxito (qué es 100% completo).
2. **Ingeniería Inversa (Contexto)**: Analizar patrones existentes, dependencias lógicas, librerías oficiales y casos de borde.
3. **Planificación Jerárquica (PRP)**: Crear una Propuesta de Requerimientos de Producto (PRP) usando la plantilla en `.claude/PRPs/templates/prp_base.md`.
4. **Ejecución Iterativa (0% -> 100%)**: Trabajar tarea por tarea de forma secuencial, testeando e implementando paso a paso.
5. **Validación Continua**: Ejecutar lints, formateadores, y tests automáticos después de cada cambio significativo.
6. **Reporte Final**: Reportar de forma clara las tareas completadas, resultados de tests, fallos corregidos y siguientes pasos.

---

## 🛠️ Comandos del Motor Agéntico (Claude Code Commands)

Este kit contiene comandos agénticos listos para ser invocados en la línea de comandos de Claude Code o interpretados por otros agentes:

### 1. Inicialización de Contexto
- `/primer` - Ejecuta `.claude/commands/primer.md`. Permite al asistente de IA leer los archivos clave y presentarte un resumen ejecutivo del stack tecnológico, estructura y objetivos de tu proyecto de forma inmediata.

### 2. Generación y Ejecución de PRPs
- `/generar-prp [archivo-requerimientos | "descripción"]` - Ejecuta `.claude/commands/generar-prp.md`. Realiza una investigación exhaustiva en el codebase y genera un plan estructurado (PRP) en la carpeta `PRPs/`.
- `/ejecutar-prp PRPs/[nombre-prp].md` - Ejecuta `.claude/commands/ejecutar-prp.md`. Lee el plan e implementa las tareas secuencialmente autoverificando los resultados.

### 3. Exploración de Proyectos
- `/explorador` - Ejecuta `.claude/commands/explorador.md`. Realiza una revisión del layout del proyecto, lee la documentación disponible e identifica las dependencias clave.

### 4. Desarrollo en Paralelo (Opcional)
- `/preparar-paralelo [nombre] [numero]` - Crea directorios git worktree para pruebas paralelas.
- `/ejecutar-paralelo` - Gestiona subagentes concurrentes que implementan versiones alternativas de una misma característica.

---

## ❌ Prácticas Prohibidas (Critical Anti-Patterns)

- ❌ **No ignorar fallos de tipos o de compilación**: No dejes warnings o errores de linting sin corregir.
- ❌ **No alucinar dependencias**: Valida siempre que las librerías o modelos que sugieres existan y estén en sus versiones correctas.
- ❌ **No saltarse la fase de testing**: Implementa y ejecuta pruebas unitarias o de integración simples para validar tu código.
- ❌ **No hardcodear credenciales**: Usa variables de entorno o archivos de configuración para almacenar credenciales o configuraciones variables.
