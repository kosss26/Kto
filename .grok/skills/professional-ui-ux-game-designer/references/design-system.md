# Design system

Load when choosing or auditing palette, type, spacing, components, or style.

Sources actually used: ui-ux-pro-max design-system skill (token architecture,
semantic tokens, states, component specs — partial), style catalog names and
fit notes, product-reasoning rows listed in `sources.md`, Anthropic frontend-design
anti-patterns. The searchable CSV engine from that repo is **not** installed
here — do not pretend a query returned a palette.

## Three layers

```
primitive   raw values     --color-blue-600, --space-4
semantic    purpose        --color-primary, --color-danger
component   local alias    --button-bg, --card-padding
```

Components reference semantic tokens only. Themes override the semantic layer,
not every component. Name `--{category}-{item}-{state}`.

Ship roles, not a rainbow:

| Role | Job |
|---|---|
| background / foreground | page |
| surface / surface-foreground | cards, sheets |
| primary / on-primary | the one main action |
| accent | rare emphasis, not a second primary |
| muted / muted-foreground | secondary text, well above 4.5:1 for body |
| danger, success, warning | status, always with icon or text |

Dark mode is a second semantic map, tested on its own. Borders and dividers
must survive both themes. Scrims are judged on the real background, not a
guessed opacity. Set `color-scheme` so native controls match.

## Space, type, radius

- Space: 4px base. Typical tiers 8 / 16 / 24 / 32 / 48. Density high (tools)
  compresses toward 8–32; density low (marketing) opens toward 24–96.
- Type scale is modular and deliberate. Body 16px minimum on mobile. Headings
  must not look like body. Line length < 80 characters; long-form 65–75ch.
- Radius is a hierarchy decision. One radius on every element is a tell.
  Concentric: inner radius = outer − padding.
- Icon sizes are tokens. One stroke width per layer. Filled and outline are
  not mixed at the same hierarchy. Meaningful icons ≥3:1 against adjacent color.
- Shadows: layered (ambient + direct), tinted toward the background hue.
  Semi-transparent borders keep edges crisp. Skip shadow theater on flat systems.

## States

Priority: disabled > loading > active > focus > hover > default.

| State | Expect |
|---|---|
| hover | cursor + color/elevation shift; never the only way to discover an action |
| focus-visible | 2px ring, 2px offset, ≥3:1 against adjacent colors |
| active | pressed, no layout shift |
| disabled | ~50% emphasis, `disabled` semantics, not-allowed, still ≥3:1 if text remains |
| loading | spinner or skeleton, original label kept, `aria-busy`, no double submit |
| error | inline, icon + text, `aria-invalid` + describedby; focus first error on submit |

Button scale (web, touch-safe): sm 32px height only with expanded hit area;
default 40px; lg 48px. Mobile visual targets should meet 44px even if the spec
table lists a shorter desktop sm.

## Style fit

Pick a style because the product's world asks for it. Record Best-for / Avoid.

High accessibility risk — do not use for public, medical, financial, or
reading-heavy products without a fallback: kinetic typography, parallax
storytelling, HUD / sci-fi FUI, gen-z maximalism, dimensional layering,
interactive cursor. They need reduced-motion, contrast, and a no-hover path.

Conditional risk (extra contrast and type work): neumorphism, glassmorphism,
Y2K, memphis, pixel art, spatial/VisionOS, bauhaus, tactile/deformable.

Safer defaults when the job is reading, trust, or repeated daily use:
minimal / Swiss, flat, inclusive, e-ink/paper, soft UI, accessible & ethical,
data-dense dashboard (tools only).

Do not mix flat and skeuomorphic at random. Do not ship emoji as structure.

### Starting points actually read (samples, not a generator)

These are hints from specific catalog rows. Reject them when they fight the brief.

| Product | Lean toward | Avoid |
|---|---|---|
| General SaaS | Clear hierarchy, trust color, hero + features + one CTA | Motion everywhere, dark-by-default |
| Finance / fintech dashboard | Dense, high contrast, real-time numbers, security-first | Playful chrome, unclear status, purple gradients |
| Healthcare | Calm, large type, WCAG-minded, soft press | Neon, motion-heavy |
| Education / casual puzzle | Friendly, high energy, progress you can feel | Jargon, muted low-energy UI |
| Productivity | Fast 150ms actions, keyboard, flat + micro-interactions | Long onboarding, sluggish lists |
| Portfolio | One expressive idea; story or Swiss, not both at full volume | Corporate template |
| Competitive / spectacle games | Bold type, immersive color, live stats | Static lifeless HUD — but clarity still wins over VFX |
| Word / board | Minimal, fast 150ms, no decorative shadows | 3D chrome on a reading puzzle |
| Arcade / retro | Pixel or neon **as the subject**, consistent palette | Inconsistent sprites, poor contrast |
| Idle / clicker | Readable currencies, upgrade hierarchy, reward color with a label | Color-only economy |

Landing structure follows the job: one CTA (hero + proof), a demo if the
product is the hero, a comparison if the choice is the hero, a story only if
there is a real sequence. Do not stack every section.

## Uniqueness test

Write the system. Then ask: would this palette, type, and layout appear if the
product were a different industry? If yes, change the free axis using the
subject's materials (paper, metal, felt, terminal, ticket, night market) —
not another default from the tell list in SKILL.md.
