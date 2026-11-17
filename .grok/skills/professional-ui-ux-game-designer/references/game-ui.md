# Game interface

Load for any game HUD, menu, pause, inventory, prompts, or game accessibility.
Canvas gameplay belongs to `building-games`. This file is the interface around it.

Sources read: Unity, "Video game UX and interface basics" (2026-10-23, full
article) and Game Accessibility Guidelines index pages for Basic, Intermediate,
and Advanced (titles and level definitions). Individual guideline essays were
**not** opened — do not invent their extra detail.

## UI vs UX

UI is menus, HUD, icons, prompts, maps, feedback. UX is whether the whole game
feels clear. The test: good UI lets players play; bad UI blocks, confuses, or
frustrates.

## Building blocks

- **HUD** — health, score, timer, objective, ammo. Edges only. Center stays free for play.
- **Menus** — start, settings, inventory, between rounds. Same confirm and cancel everywhere.
- **Prompts** — the button that works *on this device*, shown when the player needs it, not memorized.
- **Feedback** — something visible and audible within a fraction of a second. Haptics only as a third channel, with a toggle.

## Where interface lives

Most games mix these. Full diegesis is hard; plan it from the start or don't promise it.

| Type | Lives | Example |
|---|---|---|
| Non-diegetic | On the screen, not in the world | Corner health bar |
| Diegetic | In the world, characters could sense it | Suit gauge, held map |
| Spatial | In 3D space, not a physical object | Nameplate, objective marker |
| Meta | The screen itself as a signal | Damage vignette, desaturation |

## Design loop

1. List inputs (move, act, pause, inventory) and outputs (health, goal, danger, resources). Name the devices.
2. Prioritize. Constant and critical → edge HUD. Rare → menu. Conditional → appear only when relevant (low ammo, interact prompt).
3. Affordances. Familiar shapes. A heart is health because players already know that — don't restyle the meaning.
4. Instant feedback on every accepted input. Pause opens immediately and stops the action.
5. Reduce. A bar beats a lonely number when the value is a ratio. Cut anything that isn't needed this second.
6. Prototype the layout before polishing art.
7. Playtest: where do people hesitate? Can a new player start without a manual?

Genre still chooses the skin (felt and wood for cards, pixel neon for arcade,
calm tiles for a word game) but never an excuse to hide the core state.

## Good vs bad (from the Unity piece)

- Low health flashes **and** sounds — not a tiny number in a corner
- Inventory grouped, named, iconed — not a tiny unsorted list
- Pause is instant and freezes play
- Prompts match the controller actually connected
- Text size and controls can change — they are not baked in

Checklist before calling a game UI done:

- Can the player always see what matters most right now?
- Does every action answer instantly?
- Is anything on screen that doesn't need to be?
- Is important information more than color, and more than sound?
- Can someone new figure out the controls?
- Did you watch a run, not just a still frame?

Layout: center clear; type sized for the real viewing distance (a TV needs
larger type than a phone); touch targets large and spaced; every menu works
with the gameplay device.

## Accessibility — Basic (apply to almost every game)

The site defines Basic as easy, wide-reaching, and relevant to almost all
mechanics. Treat this list as the default bar.

**Motor**

- Option to adjust game speed
- Toggle or slider for haptics
- Interactive elements and virtual controls large and well spaced, especially on touch screens
- Option to adjust control sensitivity
- All UI reachable with the same input method as gameplay
- Controls as simple as possible, or a simpler alternative
- Controls can be remapped

**Cognitive**

- No flickering images or repetitive patterns
- Text prompts advance at the player's pace
- Interactive tutorial
- Simple clear language
- Game can start without many menu layers
- Simple clear text formatting
- Easily readable default font size

**Vision**

- High contrast between text/UI and background
- Simple clear text formatting and a readable default size
- Avoid VR simulation-sickness triggers
- Appropriate default field of view for the viewing environment (3D)
- No essential information by a fixed color alone
- Large, well-spaced touch controls

**Hearing**

- Subtitles/captions, if used, are clear
- No essential information by sound alone
- Separate volume controls for effects, speech, and music
- Subtitles for all important speech

**Speech**

- Speech input is optional, never required

**General**

- Ask for accessibility feedback
- Settings are saved
- Accessibility features are described in the game (and on a store page when one exists)
- A real choice of difficulty

Use shape, color, **and** sound together so one missed channel doesn't hide state.

## Intermediate (plan for them; don't silently drop the relevant ones)

Harder, still ordinary good design. Apply when the mechanic exists.

**Motor** — no body-specific motion tracking as the only path; macros; resizable
and rearrangeable UI; alternatives to hold-to-repeat and button-mashing;
windowed PC mode; digital controls sufficient without analog/gesture/speech;
no required multi-point gestures; precise targets stay still; more than one
input device.

**Cognitive** — highlight important words; contrast/text-color choice; save
thumbnails; text chat plus voice; don't convey instructions by text alone;
narrative summaries; practice without failure; remind controls and objectives;
contextual tips; interactive things look interactive; distinct sounds per key
event; option to hide background motion; separate volumes; speed and haptics
(also listed at Basic).

**Vision** — don't park essential temporary info outside the eye line; screen-reader
friendly manuals; cursor/crosshair choices; contrast slider; screen-reader
support on mobile; hide background motion; adjustable FOV; option to disable
controller/camera mismatch; resizable UI.

**Hearing** — mono toggle; audio-only tactical info also shown visually; caption
style options; speaker labels; captions for significant background sounds;
captions available before first sound; subtitles for supplementary speech;
low noise under speech; text chat in multiplayer; a way to prefer no-voice lobbies.

**Speech** — small-vocabulary words, not long phrases, when speech exists.

**General** — expose tuning variables; autosave and manual save; assist modes
(auto-aim, assisted steering) where the genre allows; skip non-core gating;
difficulty changeable during play; include impaired players in playtests.

## Advanced (only when the design claims that level of support)

Switch / eye-tracking compatible schemes; ~0.5s input cooldown option; precise
timing not mandatory; landscape and portrait. Hide all non-interactive chrome;
replay narrative; no sudden shocks without an option; gore toggle; full
voiceover including menus; symbol chat. Audio description, screen reader across
menus, voiced GPS / sonar map, adjustable font, signing, age-appropriate
caption speed, volume-threshold speech, settings profiles, representative
playtest panels.

Do not advertise Advanced features you did not build.

## With this workspace

- DOM HUD and menus follow SKILL.md + `design-ui` tokens. Don't cover the canvas hit area.
- Keyboard games: UI and play must not steal keys from each other. Pause and menus use the same device as play.
- A still screenshot is not a test. Confirm feedback, pause, and (if the game moves) the control directions from the `controls` skill.
