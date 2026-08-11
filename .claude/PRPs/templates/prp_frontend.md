# PRP: [Nombre del Componente o Feature Frontend]

## Goal
[Descripción detallada de la interfaz o comportamiento visual del usuario que se va a construir]

## Success Criteria
- [ ] Responsive design verificado en viewport mobile (375px), tablet (768px) y desktop (1440px).
- [ ] Paleta de colores Premium HSL consistente con el sistema de diseño.
- [ ] Animaciones y transiciones suaves (hover, loading states, transiciones de página).
- [ ] Accesibilidad básica (etiquetas ARIA correctas, contraste de color, navegación por teclado).
- [ ] Cero placeholders (todas las imágenes usan generate_image o SVGs limpios).

## Design Specification & Visual Hierarchy
- **Typography**: [Fuentes sugeridas, ej: Inter/Outfit para títulos y cuerpo]
- **Colors (HSL)**:
  - Primary: `hsl(var(--primary))`
  - Background: `hsl(var(--background))`
  - Accents: [ej. gradients, glassmorphism config]
- **Micro-animations**: [ej. hover en botones: transition-all duration-300 transform hover:-translate-y-0.5]

## Technical Stack & State Management
- **Framework/Language**: [ej: Next.js 16 + React 19 + TypeScript]
- **Styling**: [ej: Vanilla CSS con custom properties / Tailwind CSS]
- **State Store**: [ej: Zustand para estado global de UI / React.useState para estados locales]

## Implementation Blueprint

### List of Tasks
```yaml
Task 1: Setup UI Tokens & CSS variables
  MODIFY: src/index.css
  INJECT: Primary colors, variables y keyframes de animación.

Task 2: Implement core visual components
  CREATE: src/components/[component-name]/
  MIRROR: Patrones de botones y tarjetas del codebase.
  VALIDATE: El componente renderiza sin warnings.

Task 3: Responsive layouts and viewports
  MODIFY: src/components/[component-name]/styles.css
  INJECT: Media queries para dispositivos móviles.

Task 4: Interactive states and animations
  MODIFY: src/components/[component-name]/index.tsx
  INJECT: Estados de hover, active y loading.
```

### Visual Validation Loop
```bash
# 1. Ejecutar servidor de desarrollo local
npm run dev

# 2. Capturar screenshot con Playwright MCP o inspeccionar con Chrome DevTools MCP
# Validar el renderizado visual contra las especificaciones de diseño.
# Comprobar espaciados, contrastes y alineación.
```
