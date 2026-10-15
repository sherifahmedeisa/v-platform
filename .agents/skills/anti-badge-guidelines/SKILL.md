---
name: anti-badge-guidelines
description: Enforces the strict ban on badge pills, pill badges, status chips, floating pills, and chip containers across all V Platform UI components.
---

# Anti-Badge Guidelines Skill

## Overview
This skill guides the design and implementation of user interfaces in V Platform, strictly enforcing the complete elimination and permanent prohibition of **Badge Pills** and related pill container components.

## Named Elements to NEVER Use
- **Badge Pills**
- **Pill Badges**
- **Status Chips / Status Pills**
- **Chip Containers**
- **Tag Chips**
- **Floating Pill Badges**
- **Rounded-Full Text Badges**

## Examples of Prohibited Elements
1. **Engine & Database Status Badges**:
   ```tsx
   // FORBIDDEN:
   <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
     <span>Local Ollama Ready</span>
   </div>
   ```

2. **Header Sub-Tag / Category Badges**:
   ```tsx
   // FORBIDDEN:
   <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-neutral-400">
     GEO · AIO · Search
   </span>
   ```

3. **Hero Pre-Title Badges**:
   ```tsx
   // FORBIDDEN:
   <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs text-neutral-300">
     <Sparkles className="w-3.5 h-3.5 text-sky-400" />
     <span>Generative Engine Optimization & Content Intelligence</span>
   </div>
   ```

4. **Section / Pillar Tags**:
   ```tsx
   // FORBIDDEN:
   <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-neutral-300">
     Pillar 1
   </span>
   ```

## Compliant Replacement Patterns

### 1. Stark Typography
Render data directly using plain typographic styling:
```tsx
// COMPLIANT:
<span className="text-[11px] font-mono font-medium text-neutral-500 uppercase tracking-wider">
  Pillar 1
</span>
```

### 2. Clean Status Indicators
Display status as text or paired with an icon without enclosing pill containers:
```tsx
// COMPLIANT:
<div className="flex items-center space-x-1.5 text-xs font-mono text-neutral-400">
  <span>Cloud Synced</span>
</div>
```

### 3. Standard Minimalist Geometry
When interactive controls are necessary, use standard subtle rounded rectangles (`rounded-xl` or `rounded-lg`):
```tsx
// COMPLIANT:
<button className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-neutral-300">
  Action
</button>
```

## Inspection Checklist Before Submitting Code
- [ ] No `rounded-full` used for text badges, labels, chips, or status indicators.
- [ ] No `px-2 py-0.5` or `px-3 py-1` wrapper capsules around titles, categories, or status text.
- [ ] No status dot pulses wrapped in mini pill capsules.
- [ ] Interface remains stark, clean, and typographic.
