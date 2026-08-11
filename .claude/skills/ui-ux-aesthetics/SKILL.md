---
name: ui-ux-aesthetics
description: Rules for building premium, modern UI/UX interfaces (HSL palettes, glassmorphism, micro-animations, typography, dark/light modes). Use when creating or styling frontend components.
license: MIT
---

# UI/UX Premium Aesthetics & Vibe Coding Guidelines

## Purpose
Prevent AI assistants from building generic, boring, or plain HTML interfaces. This skill provides explicit design tokens, guidelines, and code snippets to create premium, visually stunning web and mobile interfaces that "WOW" users at first glance.

## When to Use
- Creating new React, HTML, or Vue components.
- Modifying CSS, Tailwind, or Vanilla CSS stylesheets.
- Designing landing pages, dashboard widgets, buttons, forms, or navigation bars.
- Configuring tailwind configs, theme settings, or dark/light mode toggles.

## Design System Tokens & Guidelines

### 1. Curated Color Palettes (Always use HSL)
Never use flat primary colors (like `#FF0000` or `blue`). Use HSL custom properties so themes can adapt dynamically.

```css
:root {
  /* Sleek Dark Mode Theme (Default Premium) */
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  
  --card: 224 71% 7%;
  --card-border: 220 20% 15%;
  
  --primary: 263 90% 50%;       /* Vibrant Violet */
  --primary-foreground: 210 20% 98%;
  
  --accent: 190 95% 45%;        /* Cyan Accent */
  
  --muted: 215 20% 65%;
}
```

### 2. Glassmorphism & Depth (Sleek UI Cards)
Create high-tech, modern panels using semi-transparent layers and backdrop filters.

```css
.premium-card {
  background: rgba(var(--card), 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--card-border));
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 3. Typography
- Use Google Fonts like **Inter**, **Outfit**, or **Geist Sans** instead of default system serifs.
- Ensure strict typography scale:
  - Títulos principales (`h1`): `font-weight: 800`, `letter-spacing: -0.05em`.
  - Subtítulos (`h2`/`h3`): `font-weight: 600`, `letter-spacing: -0.02em`.

### 4. Interactive Micro-animations
An interface feels premium when it reacts smoothly to inputs.
```css
/* Interactive button transition */
.btn-interactive {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(var(--primary), 0.3);
  filter: brightness(1.1);
}

.btn-interactive:active {
  transform: translateY(0);
}
```

### 5. Gradient Text
Give headers a modern aesthetic by applying a gradient to typography.
```css
.gradient-text {
  background: linear-gradient(to right, #a855f7, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### 6. Cero Placeholders
- Never use a blank box or text saying `[Image here]`.
- Always write pure SVGs, use Lucide icon packages, or use `generate_image` tool to create actual, working illustrative assets for your user interfaces.
- Add loaders/skeletons to indicate data fetching states smoothly.
