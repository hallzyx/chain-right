# Design System: ChainRight — Black & Amber Edition

**Project ID:** `projects/564113183122285626`
**Stitch Project:** `chainright-black-amber`
**Última actualización:** May 2, 2026 (sync con output real de Stitch)

> Este documento refleja el diseño que Stitch PRODUCE (no lo que se le pide). Actualizado contra el HTML real generado.

---

## 1. Visual Theme & Atmosphere

ChainRight Black & Amber Edition es un sistema **Minimalista-Editorial** oscuro que evoca la estética de un estudio de grabado o una galería de arte premium. La identidad visual combina:

- **Serif editorial** (Newsreader) para headlines — le da autoridad y sofisticación
- **Sans-serif funcional** (Inter) para body — legibilidad técnica
- **Fondo near-black** (`#0a0a0a`) como lienzo oscuro
- **Amber quirúrgico** (`#f59e0b`) como único acento — como foil dorado sobre papel negro

La atmósfera es **forense, premium y contenida**. No es minimalismo frío; Stitch añade detalles sutiles como hover transitions, thin borders, y efectos de imagen que le dan vida sin romper la elegancia.

---

## 2. Color Palette (Extracted from Tailwind Config)

> Estos son los tokens REALES que Stitch genera en el `<script id="tailwind-config">`. Usar exactamente estos nombres.

### Superficies (Tailwind `bg-*`)

| Custom Tailwind Token | Hex | Rol |
|---|---|---|
| `surface` | `#0a0a0a` | Fondo de página (equivale a `background`). Negro puro, sin tintes. |
| `surface-dim` | `#0a0a0a` | Igual que surface |
| `surface-container-lowest` | `#0a0a0a` | Superficie más baja |
| `surface-container-low` | `#171717` | Contenedores secundarios |
| `surface-container` | `#1a1a1a` | Contenedores estándar (cards, dropzones) |
| `surface-container-high` | `#31281f` | Hover states, superficies elevadas |
| `surface-container-highest` | `#3c3329` | Dropdowns, modales |
| `surface-bright` | `#41382e` | Brillo máximo |
| `surface-variant` | `#3c3329` | Superficie variante |
| `surface-tint` | `#ffb95f` | Tinte de superficie (amber diluido) |
| `background` | `#0a0a0a` | Sinónimo de surface |

### Acentos Amber

| Custom Tailwind Token | Hex | Rol |
|---|---|---|
| `primary` | `#ffc174` | Amber suave (pan de oro). Usado para hover de íconos y texto de links. |
| `primary-container` | `#f59e0b` | **Amber sólido.** El "gold foil" principal. Usado para fondos de botones primarios. |
| `on-primary` | `#472a00` | Texto oscuro sobre fondos amber (carbón). |
| `on-primary-container` | `#613b00` | Texto sobre `primary-container`. |
| `primary-fixed` | `#ffddb8` | Amber muy claro. |
| `primary-fixed-dim` | `#ffb95f` | Amber claro dim. |

### Texto

| Custom Tailwind Token | Hex | Rol |
|---|---|---|
| `on-surface` | `#f0e0d1` | **Texto primario.** Marfil cálido. El blanco del sistema. |
| `on-surface-variant` | `#d8c3ad` | **Texto secundario.** Gris ante para labels y descripciones. |
| `on-background` | `#f0e0d1` | Sinónimo de on-surface. |
| `outline` | `#a08e7a` | **Texto terciario.** Gris sombra para metadata, hints, placeholders. |
| `outline-variant` | `#534434` | Gris para líneas/bordes (más oscuro). |

### Estados

| Custom Tailwind Token | Hex | Rol |
|---|---|---|
| `secondary` | `#c9c6c5` | Gris neutro para elementos secundarios. |
| `secondary-container` | `#4a4949` | Fondo de elementos secundarios. |
| `tertiary` | `#8fd5ff` | Azul cielo — usado para acentos de "verificación" y tecnología. |
| `tertiary-container` | `#1abdff` | Azul más intenso. |
| `error` | `#ffb4ab` | Rosa cálido para errores. |
| `error-container` | `#93000a` | Fondo de errores. |

### Uso de `text-neutral-400`

Stitch también usa clases utilitarias como `text-neutral-400` para nav links y elementos que necesitan gris medio. Esto es outside del sistema de tokens pero es parte del output real. Mapea aproximadamente a `#a3a3a3` (gris neutro Tailwind).

---

## 3. Borders & Separadores

**Stitch SÍ USA bordes.** Son finos y de baja opacidad, no invasivos.

| Clase Tailwind | Uso |
|---|---|
| `border-b border-white/5` | Línea inferior del header y footer |
| `border-t border-white/5` | Línea superior de secciones (forensic details, footer) |
| `border border-white/5` | Borde de dropzones y cards de preview |
| `ring-1 ring-white/10` | Marco sutil alrededor de imágenes |
| `border border-transparent group-hover:border-primary/20` | Borde interactivo que aparece en hover |

**Regla:** Los bordes son SIEMPRE `white/5` (5% opacidad) o `white/10` (10% opacidad). No son negros, no son gruesos. Son "sugerencias" de límites, no líneas duras.

---

## 4. Typography (Igual al output real)

### Font Families

- **Headlines**: Newsreader (serif) — tags `font-h1`, `font-h2`, `font-h3`
- **Body**: Inter (sans-serif) — tags `font-body-lg`, `font-body-md`, `font-label-md`, `font-label-caps`
- **Logo/Serif text**: `font-serif` con `italic` para el logo "ChainRight"
- **Bold**: `font-bold` se usa en botones y el logo (sí, bold en serif ES válido en el sistema real)

### Font Sizes & Weights

| Token | Family | Size | Weight | Line Height | Letter-Spacing |
|---|---|---|---|---|---|
| `h1` | Newsreader | 48px | 400 | 1.1 | -0.02em |
| `h2` | Newsreader | 32px | 400 | 1.2 | -0.01em |
| `h3` | Newsreader | 24px | 400 | 1.3 | normal |
| `body-lg` | Inter | 18px | 400 | 1.6 | -0.01em |
| `body-md` | Inter | 16px | 400 | 1.6 | normal |
| `label-md` | Inter | 14px | 500 | 1.4 | normal |
| `label-caps` | Inter | 12px | 600 | 1.0 | 0.1em |

---

## 5. Component Patterns (del output real)

### Navbar (TopAppBar)

```html
<header class="bg-[#0a0a0a]/80 backdrop-blur-md fixed top-0 w-full z-50 border-b border-white/5">
```
- **Glassmorphism:** `backdrop-blur-md` + `bg-[#0a0a0a]/80`
- **Border-bottom:** `border-b border-white/5`
- **Height:** `h-20` (80px)
- **Logo:** `text-2xl font-serif italic text-primary tracking-tight`
- **Nav links:** `text-neutral-400 font-serif hover:text-primary`
- **CTA button:** `bg-primary-container text-on-primary-container px-6 py-2 font-serif font-bold text-sm hover:opacity-80 active:scale-95`

### Primary Button (Amber)

```html
<button class="bg-primary-container text-on-primary-container px-10 py-4 font-label-caps text-label-caps tracking-widest uppercase hover:opacity-90 active:scale-95 transition-all">
```
- **Background:** `bg-primary-container` (#f59e0b)
- **Text:** `text-on-primary-container` (#613b00) con `font-label-caps`, `tracking-widest`, `uppercase`
- **Padding:** `px-10 py-4` (40px horizontal, 16px vertical)
- **Hover:** `hover:opacity-90` (sutil fade, no cambio de color)
- **Active:** `active:scale-95` (pequeño shrink al click)
- **Transition:** `transition-all`
- **Sharp corners:** 0px (del config)

### Secondary/Ghost Button

```html
<button class="font-body-md text-on-surface-variant hover:text-on-surface transition-colors">
```
- Sin background, solo texto
- Color: `text-on-surface-variant` (#d8c3ad)
- Hover: `hover:text-on-surface` (#f0e0d1)
- Sin border, sin padding extra

### Dropzone / Card

```html
<div class="bg-surface-container/50 border border-white/5 transition-all duration-300 hover:bg-surface-container-high cursor-pointer">
```
- **Background:** `bg-surface-container/50` (#1a1a1a al 50%)
- **Border:** `border border-white/5` (SIEMPRE presente en Stitch)
- **Hover:** `hover:bg-surface-container-high` (#31281f)
- **Interactive border:** `border border-transparent group-hover:border-primary/20`

### Imágenes

```html
<img class="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-500"/>
```
- **Container:** `ring-1 ring-white/10` alrededor
- **Default:** `grayscale contrast-125` (escala de grises con contraste)
- **Hover:** `hover:grayscale-0` (color completo)
- **Transition:** `duration-500`

### Secciones de contenido

```html
<section class="mt-section-gap grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/5 pt-16">
```
- **Separador superior:** `border-t border-white/5 pt-16`
- **Grid:** 3 columnas en desktop (`md:grid-cols-3`)
- **Gap:** `gap-12`
- **Spacing:** `mt-section-gap` (128px desde la sección anterior)

### Footer

```html
<footer class="w-full max-w-[1200px] mx-auto px-8 py-12 flex flex-col items-center border-t border-white/5">
```
- Texto centrado: `text-center`
- Links: `hover:text-primary`

---

## 6. Iconography

Stitch usa **Google Material Symbols Outlined** (`material-symbols-outlined`):

```html
<span class="material-symbols-outlined">image</span>
<span class="material-symbols-outlined">fingerprint</span>
<span class="material-symbols-outlined">history_edu</span>
<span class="material-symbols-outlined">shield</span>
<span class="material-symbols-outlined">notifications</span>
<span class="material-symbols-outlined">account_circle</span>
```

- Color: heredado del texto (`text-outline`, `text-primary`, `text-on-surface-variant`)
- Hover: `hover:text-primary` (cambio a amber)
- Tamaño: definido por `text-6xl` o la clase de texto

---

## 7. Layout & Spacing (del output real)

### Container
- **Max-width:** `max-w-[1200px]`
- **Horizontal padding:** `px-8` (32px)
- **Centrado:** `mx-auto`

### Spacing Scale

| Token | Valor Tailwind | Uso |
|---|---|---|
| `space-x-6` | 24px | Entre íconos en el navbar |
| `space-x-8` | 32px | Entre elementos de preview |
| `space-x-12` | 48px | Entre items de navegación |
| `space-y-6` | 24px | Vertical en dropzones |
| `gap-12` | 48px | Grid de features |
| `mb-4`, `mt-4` | 16px | Entre elementos pequeños |
| `mb-16` | 64px | Debajo de headers |
| `pt-32 pb-20` | 128px/80px | Padding del main |
| `mt-section-gap` | 128px | Entre secciones principales |
| `py-12` | 48px | Padding del footer |

### White Space
- Stitch respeta el espacio en blanco, pero es más compacto que "editorial ultra-abierto"
- Las secciones están claramente separadas por `border-t border-white/5`
- El contenido está alineado a 1200px max-width

---

## 8. Transitions & Animations

Stitch aplica transiciones por defecto:

| Clase | Efecto |
|---|---|
| `transition-all duration-300` | Transiciones suaves en cards/dropzones |
| `transition-colors` | Solo color en links y botones ghost |
| `duration-500` | Transiciones más lentas en imágenes |
| `hover:opacity-90` | Fade en botones primarios |
| `hover:opacity-80` | Fade en botones secundarios |
| `active:scale-95` | Shrink al clickear |
| `hover:grayscale-0` | Imagen a color en hover |

---

## 9. Shape System

Del tailwind config analizado:
```javascript
borderRadius: {
    "DEFAULT": "0px",
    "lg": "0px",
    "xl": "0px",
    "full": "0px"  // NOTA: incluso "full" es 0px = no hay pills
}
```

**Todo tiene bordes rectos (0px).** Incluso los elementos que normalmente serían redondeados. Esto es consistente con el sistema. Las imágenes tienen `ring-1 ring-white/10` (borde cuadrado sutil) en lugar de border-radius.

---

## 10. Glassmorphism (Header)

El header SÍ usa glassmorphism en Stitch:

```html
bg-[#0a0a0a]/80 backdrop-blur-md
```

Esto NO es un error — es lo que Stitch produce por defecto para navbars sticky. 80% opacidad + blur para que el contenido detrás sea visible pero difuminado.

---

## 11. Reglas para Prompts Futuros

Al pedirle a Stitch que genere nuevas pantallas, usar ESTE bloque (basado en el output real):

```markdown
**DESIGN SYSTEM: Black & Amber Edition (from Tailwind Config)**
- Platform: Web, Desktop-first, Dark mode
- Background: #0a0a0a (pure near-black, no tints)
- Surfaces: #1a1a1a (cards), #171717 (secondary), #31281f (hover states)
- Primary Accent: amber #f59e0b — use for CTAs and verification badges only
- Borders: thin white/5 (5% opacity), used on headers, cards, and section dividers
- Border radius: 0px everywhere (sharp corners, no pills, no rounded images)
- Headlines: Newsreader serif (48px/32px/24px), regular weight
- Body: Inter sans-serif (16px/14px/12px), with label-caps uppercase
- Navbar: glassmorphism (backdrop-blur + 80% opacity)
- Buttons: Amber solid (#f59e0b) with dark text, no border, sharp corners, hover:opacity-90
- Hover: opacity fade or color transition, subtle
- Images: grayscale contrast-125 by default, hover:grayscale-0 (color on hover)
- Icons: Material Symbols Outlined, inherit text color
- Layout: max-w-[1200px], mx-auto, px-8
- Section dividers: border-t border-white/5 with generous padding
- Atmosphere: Forensic laboratory, premium, dark, cool-toned
```

---

## 12. Screens Included in This System

| # | Screen Name | Screen ID |
|---|---|---|
| 1 | ChainRight Landing Page (Homepage) | `cbc51cca5de34ab7a6edb7efba736531` |
| 2 | Create Artwork — Step 1: Prompt Input | `ddab915ea9b7405cb9f4d24455b0921a` |
| 3 | Create Artwork — Step 2: Image Preview & Storage | `34fef7e7729d4a2e88602af049eb067f` |
| 4 | Create Artwork — Step 3: Merkle Root & Mint NFT | `ec9adda3a96f41d9988a750dead41e1f` |
| 5 | Create Artwork — Step 4: Certificate of Authorship | `0ffc33032e2b4df0b007adb1a1deaa68` |
| 6 | Verify Authenticity — Upload | `a8b1a8ad17f540c596df80ff8cd576d6` |
| 7 | Verify Authenticity — Analysis Progress | `b5992933af5b46acb1dbe7dc5d09c98e` |

---

## 13. Key Corrections Respecto al DESIGN.md Original

| Concepto | DESIGN.md (viejo/ideal) | Output Real de Stitch |
|---|---|---|
| Background | `#19120a` (warm ink) | `#0a0a0a` (pure near-black) |
| Borders | **Prohibidos** (No-Line Rule) | **SÍ se usan** — `white/5` y `white/10` en headers, cards, footers |
| Glassmorphism | No | **Sí** en el header (`backdrop-blur-md`) |
| Gradientes | Prohibidos | No se usan (esto sí se mantiene) |
| Sombras | Prohibidas | No se usan (esto sí se mantiene) |
| Esquinas | Sharp 0px | Sharp 0px (hasta `full: 0px`) |
| Bold en serif | Prohibido | **Sí se usa** — `font-bold` en logo y botones |
| Iconos | Emojis planos | **Material Symbols Outlined** |
| Imágenes | Sin efectos | `grayscale contrast-125` → `hover:grayscale-0` |
| Hover botones | Color change | `hover:opacity-90` + `active:scale-95` |
| Texto neutral | Solo tokens del sistema | También usa `text-neutral-400` de Tailwind |
| Palette acents | Solo amber | También tiene `tertiary` (azul #8fd5ff) para badges tech |
