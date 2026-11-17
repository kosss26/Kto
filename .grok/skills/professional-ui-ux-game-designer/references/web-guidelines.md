# Web and app interface rules

Load for pages, dashboards, forms, and mobile web. Decision language:
**MUST** = ship blocker, **SHOULD** = do unless the brief gives a reason,
**NEVER** = known failure.

Synthesized from the Vercel web interface guidelines (`AGENTS.md`, read in
full) and the 120 UX guidelines in ui-ux-pro-max (every category row was
read). Stack-specific CSVs (React, shadcn, Next, Three, native) were **not**
read — apply these rules, then the project's own components.

## Keyboard and semantics

- MUST: full keyboard support following the WAI-ARIA APG pattern for the widget
- MUST: visible unobscured `:focus-visible`; sticky/fixed UI uses `scroll-padding` / `scroll-margin` so focus is at least partly visible (WCAG 2.2 AA)
- MUST: trap, move, and return focus in dialogs
- NEVER: `outline: none` without a replacement ring
- MUST: navigation is `<a>` / router link (cmd-click, middle-click). NEVER a clickable `<div>` for a URL
- MUST: native `button`, `a`, `label`, `table` before ARIA
- MUST: icon-only controls have an accessible name; decorative icons are `aria-hidden`
- MUST: skip link and a single logical heading order
- MUST: title matches the current view

## Targets and touch

- MUST: pointer target ≥24px, or a documented WCAG exception; mobile ≥44px (iOS 44pt, Android 48dp)
- MUST: ≥8px between adjacent targets
- MUST: mobile input font-size ≥16px so iOS does not zoom; NEVER disable page zoom
- MUST: `touch-action: manipulation` on controls
- MUST: if it looks clickable, it is clickable
- NEVER: hover-only disclosure of a primary action
- MUST: drag, swipe, and path gestures have a tap and keyboard alternative
- MUST: during drag, disable text selection and set `inert` on the dragged item
- SHOULD: autofocus only a single desktop primary field; rarely on mobile

## Forms

- MUST: visible label (not placeholder-only), `autocomplete`, meaningful `name`, correct `type` and `inputmode`
- MUST: errors inline under the field, `aria-describedby` / `aria-invalid`; on submit, focus the first error. Multi-error forms also focus a linked summary
- MUST: allow submit of an incomplete form so validation can show; don't block typing
- MUST: Enter submits the focused field; textarea uses ⌘/Ctrl+Enter. IME composition Enter must not send (guard `isComposing` / keyCode 229)
- MUST: keep submit enabled until the request starts, then disable and show a spinner while **keeping the label**
- MUST: allow paste, including passwords and one-time codes; password managers work. Auth must not be a cognitive test with no alternative (WCAG 2.2)
- MUST: warn before losing unsaved changes
- MUST: trim accidental edge spaces; don't require the same data twice in one flow
- SHOULD: validate on blur, not on every keystroke; spellcheck off for emails, codes, usernames
- SHOULD: placeholder ends with `…` and shows a pattern, never replaces the label
- MUST: password visibility toggle

## Feedback, navigation, content

- MUST: loading, empty, error, and success states. Empty states offer a next step. Errors say what broke and how to recover — no apology, no dead end
- MUST: confirm destructive actions, or offer Undo. SHOULD: optimistic UI with rollback
- MUST: polite `aria-live` for toasts; toasts dismiss on their own (~3–5s) and are not the only error channel
- MUST: URL reflects filters, tabs, pagination, expanded panels. Back restores scroll
- MUST: skeletons match final layout (no CLS). Images have dimensions. Below-fold media lazy-loads; hero media preloads
- MUST: resilient to short and very long user content. `truncate` / `line-clamp` only where the full value is still reachable. Essential headings, names, prices, and errors wrap or expand — never clamp the meaning away
- MUST: chips that act are buttons with pressed state; badges that inform are not clickable and not color-only. Live counts announce a phrase ("3 in cart"), not a bare number, and do not steal focus
- MUST: locale-aware dates and numbers; non-breaking spaces in `10 MB`, `⌘ K`
- SHOULD: curly quotes; `text-wrap: balance` on short headings; `translate="no"` on brand names and code
- MUST: tabular numbers where values are compared

## Layout

- MUST: mobile-first. Check ~320, 375, 768, 1024, 1440, and an ultra-wide (or 50% zoom on a wide canvas)
- MUST: no horizontal page scroll. Tables scroll inside themselves or become cards
- MUST: safe areas (`env(safe-area-inset-*)`) on fixed headers, tab bars, and bottom CTAs. Scroll content is padded out from under them
- MUST: z-index is a small scale (10 / 20 / 30 / 50), not 9999. Know which properties create a stacking context
- SHOULD: `dvh` instead of `100vh` for mobile full-height
- SHOULD: optical alignment; flex/grid over measuring in JS
- MUST: long tokens use `overflow-wrap: anywhere` and shrinkable flex/grid children (`min-w-0`). Do not `break-all` body prose

## Motion

- MUST: `prefers-reduced-motion` — show the final state, no parallax, no scroll-jacking
- MUST: animate only `transform` and `opacity`. NEVER `top` / `left` / `width` / `height`. NEVER `transition: all`
- MUST: motion is interruptible. Rapid toggles commit the final state; do not wait on `transitionend` for correctness
- SHOULD: one duration system tied to distance, not one number for everything. Enter can be slightly longer than exit. Ease-out on arrival, ease-in on leave, linear only for steady progress
- SHOULD: 1–2 animated elements per view. Infinite loops only for loading, and they pause off-screen
- MUST: auto-advancing carousels have previous / next / pause, and stop on hover, focus, and reduced motion
- MUST: autoplay motion longer than 5s beside other content has pause, stop, or hide
- MUST: SVG motion is on a `<g>` with `transform-box: fill-box` and a correct origin

## Performance (perceived)

- MUST: reserve image space; WebP/AVIF at the displayed size; `font-display: swap` with a fallback so text doesn't jump
- MUST: virtualize lists past ~50 rows
- MUST: batch layout reads and writes; mutations should feel under ~500ms or explain the wait
- SHOULD: uncontrolled inputs when controlled ones would rerender per keystroke
- SHOULD: defer non-critical scripts; don't autoplay heavy video — click-to-play, captions, pause
- MUST: offscreen and reduced-motion users don't pay for decorative loops

## Theming

- MUST: contrast re-checked in every theme. Muted body text still ≥4.5:1
- MUST: hover, active, and focus increase contrast rather than wash it out
- SHOULD: `<meta name="theme-color">` matches the page background
- MUST: native `<select>` gets explicit background and color (Windows)

## Charts

Legends and tooltips. A second encoding besides color (pattern, label, position).
Not a rainbow. Large lists of series get a highlight, not 12 peers at equal volume.
