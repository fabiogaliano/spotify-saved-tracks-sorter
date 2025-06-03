# TailwindCSS v4 Migration Notes

## Key Changes from v3 to v4

### 1. Renamed Utilities

#### Shadows
- `shadow-sm` → `shadow-xs`
- `shadow` → `shadow-sm`
- `shadow-md` → `shadow-md` (unchanged)
- `shadow-lg` → `shadow-lg` (unchanged)

#### Border Radius
- `rounded-sm` → `rounded-xs`
- `rounded` → `rounded-sm`
- `rounded-md` → `rounded-md` (unchanged)
- `rounded-lg` → `rounded-lg` (unchanged)

#### Blur
- `blur-sm` → `blur-xs`
- `blur` → `blur-sm`

### 2. Color and Opacity

#### Old Way (v3)
```html
<!-- Don't use these anymore -->
<div class="bg-black bg-opacity-50"></div>
<div class="text-white text-opacity-60"></div>
<div class="border-gray-300 border-opacity-20"></div>
```

#### New Way (v4)
```html
<!-- Use opacity modifiers instead -->
<div class="bg-black/50"></div>
<div class="text-white/60"></div>
<div class="border-gray-300/20"></div>
```

### 3. Spacing Utilities
All spacing utilities remain the same:
- `w-32` = width: 8rem
- `h-24` = height: 6rem
- `p-4` = padding: 1rem
- etc.

### 4. Import Changes
```css
/* Old (v3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* New (v4) */
@import "tailwindcss";
```

### 5. Arbitrary Values
```html
<!-- Old (v3) -->
<div class="bg-[--brand-color]"></div>

<!-- New (v4) -->
<div class="bg-(--brand-color)"></div>
```

### 6. Default Border Color
- Default border color is now `currentColor` instead of gray
- Be explicit with border colors: `border-gray-300` instead of just `border`

### 7. Layout Recommendations
- Prefer `gap-*` with flexbox/grid over `space-x-*` and `space-y-*`
- Example:
  ```html
  <!-- Old -->
  <div class="flex space-x-4">
  
  <!-- Better -->
  <div class="flex gap-4">
  ```

## Common Patterns for Our Project

### Glass/Blur Effects
```html
<!-- Correct v4 usage -->
<div class="bg-black/80 backdrop-blur-sm border border-white/30"></div>
```

### Step Indicators
```html
<!-- Correct v4 usage -->
<div class="size-8 bg-primary-500 rounded-full flex items-center justify-center">
```

### Cards with Hover
```html
<!-- Correct v4 usage -->
<div class="bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg p-4 transition-all hover:-translate-y-1">
```

### Responsive Design
All responsive prefixes work the same:
- `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

## Browser Support
- Safari 16.4+
- Chrome 111+
- Firefox 128+

## Migration Tool
Use the official upgrade tool:
```bash
npx @tailwindcss/upgrade@next
```