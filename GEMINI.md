# Workspace Design Rules & System Guidelines

## Core Directive: Anti-Badge & Anti-Pill UI Architecture

### Absolute Ban on Badge Pills
**NEVER** use **Badge Pills, Status Pills, Pill Badges, Chip Containers, Tag Chips, or Rounded-Full Pill Badges** anywhere in V Platform.

This restriction applies to:
1. **Status Indicators & Chips**: Elements like `• Local Ollama Ready`, `• PostgreSQL Sync`, `Guest / Connected`, or any text wrapped in `rounded-full`, pill backgrounds (`bg-emerald-500/10`, `bg-white/[0.05]`), pill borders (`border-emerald-500/20`, `border-white/10`), or glowing/pulsing status dots.
2. **Category / Marketing Pills**: Elements like `GEO · AIO · Search`, `✦ Generative Engine Optimization & Content Intelligence`, `Pillar 1`, or `Target 85` enclosed in pill containers.
3. **Chip Containers & Floating Pills**: Any element styled with `rounded-full px-3 py-1` or `rounded-full px-2 py-0.5` with background capsule fills or borders.

### Allowed & Required UI Patterns
- **Clean Stark Typography**: Render status information, metadata, weights, and labels as direct plain text with clean typography (e.g. `text-xs font-mono text-neutral-400 font-medium`, `text-emerald-400 font-semibold`).
- **Minimalist Controls**: When an element is an interactive button or card, use modern standard rounded corners (`rounded-xl` or `rounded-lg`), NOT pill capsules (`rounded-full`).
- **Zero Decorative Container Noise**: Avoid wrapping non-interactive labels in pill borders or semi-transparent background pills. Keep the interface stark, elegant, editorial, and typography-first.
