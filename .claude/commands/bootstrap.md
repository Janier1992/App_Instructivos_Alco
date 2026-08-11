---
description: "Inicializa un nuevo proyecto tecnológico con una estructura limpia según el stack seleccionado por el usuario. Uso: /bootstrap [nextjs | python | expo]"
argument-hint: "[nextjs | python | expo]"
---

# Comando `/bootstrap` - Inicialización de Proyectos

Este comando automatiza el andamiaje inicial del stack tecnológico seleccionado por el usuario, creando las carpetas y los archivos base listos para programar.

---

## 🛠️ Stacks Soportados

### 1. **Next.js (Web Frontend / Fullstack)**
Crea un proyecto Next.js moderno con TypeScript, Tailwind y Supabase.
**Estructura a Generar**:
```
src/
├── app/                  # Rutas (App Router)
│   ├── layout.tsx
│   └── page.tsx
├── features/             # Módulos encapsulados por feature
├── shared/               # Componentes, hooks y utils globales
│   ├── components/
│   ├── hooks/
│   └── lib/
└── index.css             # Estilos y variables HSL de ui-ux-aesthetics
```

### 2. **Python Backend (FastAPI)**
Crea una API REST robusta con FastAPI, Pydantic y soporte para SQLModel.
**Estructura a Generar**:
```
app/
├── api/                  # Endpoints y routers
│   ├── v1/
│   └── main.py
├── domain/               # Modelos y lógica de negocio
│   └── models.py
├── infrastructure/       # DB connection, repositories
│   └── db.py
└── config/               # Settings y variables de entorno
tests/                    # Tests unitarios con pytest
requirements.txt          # Dependencias (fastapi, uvicorn, pydantic)
```

### 3. **Expo (Mobile Application)**
Crea una aplicación móvil con React Native + Expo y TypeScript.
**Estructura a Generar**:
```
app/                      # Navegación basada en Expo Router
├── (tabs)/
├── _layout.tsx
└── index.tsx
components/               # Componentes UI de la app
hooks/                    # Custom hooks
constants/                # Colores y fuentes de la app
package.json
```

---

## 🔄 Proceso de Ejecución de `/bootstrap`

1. **Detectar Argumento**: Leer el stack seleccionado (`$ARGUMENTS`).
2. **Crear Estructura**: Crear de forma recursiva los directorios de la estructura correspondiente en la raíz del proyecto (sin pisar las carpetas de configuración agéntica `.claude/` y `.agents/`).
3. **Generar Archivos Base**:
   - Crear archivos de punto de entrada (`page.tsx`, `main.py` o `index.tsx` según corresponda).
   - Inyectar las variables CSS HSL de la skill `ui-ux-aesthetics` en los archivos de estilos del proyecto.
4. **Instalar Dependencias Básicas**: Proponer o ejecutar los comandos de instalación correspondientes (ej: `npm install` o creación de entorno virtual de Python).
5. **Configurar Entorno**: Crear archivo `.env.example` con las credenciales de base de datos requeridas (Supabase/InsForge).
6. **Reportar Éxito**: Mostrar el árbol del proyecto inicializado y los comandos para arrancar el servidor de desarrollo.
