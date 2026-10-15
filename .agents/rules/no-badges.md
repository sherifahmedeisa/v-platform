# Rule: Strict Prohibition of Badge Pills and Pill Containers

## Terminology & Covered Elements
This rule strictly forbids all variants of:
- **Badge Pills**
- **Status Pills**
- **Pill Badges**
- **Chip Containers**
- **Tag Chips**
- **Floating Pill Badges**
- **Rounded-Full Pill Badges**

## Forbidden Patterns
1. `rounded-full` combined with padding and backgrounds/borders for text labels (e.g. `rounded-full px-3 py-1 bg-white/[0.05] border border-white/10`).
2. Status indicator capsules with pulsing or static colored dots (e.g., green dot for `Local Ollama Ready`, blue dot for `PostgreSQL Sync`, cloud sync capsules).
3. Decorative category/headline pill badges above hero sections or headings (e.g., `✦ Generative Engine Optimization & Content Intelligence`, `GEO · AIO · Search`).
4. Numbered step or pillar pill badges (e.g., `Pillar 1`, `Target 85` pill capsules).

## Required Design Alternatives
1. **Typography-First**: Display information as plain, stark typography. Use Tailwind font size, font-mono, and subtle text colors (e.g. `text-xs font-mono text-neutral-400 font-medium` or `text-emerald-400 font-semibold`).
2. **Containerless Statuses**: Statuses should be plain textual indicators or icons with plain text, without capsule backgrounds or borders.
3. **Rectangular Minimalist Controls**: For clickable buttons and cards, use standard minimalist geometry (`rounded-xl` or `rounded-lg`) rather than pill shapes (`rounded-full`).
