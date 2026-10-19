# Magnetism Lab browser validation

Audit date: 19 October 2026 (Asia/Kuala_Lumpur).

The application was served directly at **http://127.0.0.1:5173/**. HTTP readiness returned 200. Playwright launched an installed Chromium browser and navigated to that exact URL, avoiding the previous Computer Use URL-detection blocker. No commit, push, or deployment was performed.

## Verification by tab

All rows include both 2D and 3D, desktop/tablet/phone screenshots, each available parameter's numeric entry and slider endpoints, playback/pause/step/slow/reset, visibility controls, live graph inspection/reset, guided measurement recording/clear/export, and all four challenge templates with a successful and an unsuccessful state.

| Tab | Browser and numerical verification | Remaining model limitations |
| --- | --- | --- |
| Magnetic Fields | All five sources; signed current, turns, radius, length, orientation, movable probe/compass; current reversal changes field direction without changing magnitude; zero current removes field lines/arrows; tangent-galvanometer setup, readings, CSV; four challenges. Additional source screenshots cover both views. | Bar magnet is an external dipole with a softened core. Coil and solenoid fields use numerical quadrature; field-line density and representative drawn turns are illustrative. The Earth activity is noiseless and combines perpendicular centre fields separately from the main scene. |
| Resultant Fields | Both signed currents and draggable wire positions; movable P; exact midpoint cancellation for equal currents; reversal makes midpoint contributions add; individual and resultant arrows; field-position graph; cancellation measurements and four challenges. | Ideal long wires with a regularized 2 mm core. Probe and wires move in the x–y plane, including in the spatial view. |
| Moving Charges | All four particle choices including editable generic mass/charge; stationary, circular, parallel, antiparallel and helical cases; charge and field reversal; zero magnetic field; exact endpoint sine behavior; complete orbit remains in frame; animation advance/pause/step/slow; force, radius, period and graph synchronization; four challenges. | Classical motion in a uniform field; no collisions or relativistic corrections. Playback is slowed and loops. 2D is an x–y projection: axial motion is represented by into/out-of-plane velocity symbols; use 3D to see axial travel. |
| Motor Effect | Current, B, active length and angle; independent current/field reversal; force sign and displayed vector agree; exact zero at 0°/180° and zero B/current; force-angle graph; measurements and four challenges; negative decimal typing and bounds. | The force is quantitative. The visible displacement is a repeating, exaggerated direction cue; there is no mass, suspension, damping, or mechanical time integration. |
| Parallel Wires | Both signed currents, separation and length; attraction/repulsion agree with arrows; equal/opposite forces; doubling separation halves F/L; zero current; inverse-distance graph; measurements and four challenges. | Ideal long wires. The slight displacement is illustrative; the control value d, rather than the animated drawn gap, determines the force. |
| Velocity Selector | E, B, speed, particle, mass, charge and analyser; balance at E/B for either charge sign; zero E/B handling; stationary beam; actual exit/slit crossing; analyser retains both exit-velocity components; force arrows update from instantaneous velocity and region; entry-force graph, measurements and four challenges. | Hard field boundaries, fixed aperture, one ideal particle species at a time, no fringe fields/collisions/space charge. The **design** analyser radius readout assumes selected speed E/B. An off-design beam may pass the finite slit without being exactly undeflected. |

## Corrected defects

- Numeric fields now preserve intermediate input while typing, including a minus sign and decimal point. Valid values update the physics immediately; bounds are normalized on leaving the field or pressing Enter.
- Circular paths are centered and framed from their actual 3D bounds; the uniform field and grid follow the same frame.
- Launch and conductor angles are measured relative to the signed field. Reversal preserves the initial velocity/conductor orientation while updating the displayed supplementary angle.
- Exactly parallel and antiparallel cases have exactly zero transverse force/radius. Normal vectors use into/out-of-plane symbols in 2D instead of a zero-length arrow pointing sideways.
- A zero magnetic field now produces finite straight/parabolic trajectories, a stable empty-radius graph, and appropriate missing/undefined readouts. Zero sources do not show fictitious field/force arrows.
- The selector solves the first plate, entrance-return or exit boundary analytically before sampling its path, including fast-electron cases. It tests the actual slit after a field-free gap. Its magnetic force is q(v × B) at the animated particle's current velocity, and electric force disappears outside the selector region. The analyser retains the actual exit velocity.
- Motor poles follow the modeled z field and swap under reversal. Wires' exaggerated displacement no longer crosses to the wrong attraction/repulsion side during its cycle.
- Vector label placement, scientific graph tick margins, and small-screen drag coordinate conversion were corrected.
- Challenge feedback clears when settings change; a stationary particle cannot satisfy the analyser-beam challenge; selector tolerance wording distinguishes the 1% balance check.
- Graph scales include the exact operating point and remain stable for non-finite-radius data. Pointer, touch and keyboard inspection are supported.
- Contrast was corrected in dark and light themes. Interactive scene accessibility roles, mobile icon names, focused-tab navigation, keyboard orbit, help focus trapping/restoration, and touch slider hit areas were improved.
- Animation timing is isolated from the rest of the interface. Field paths and direction vectors are cached so the finite-solenoid animation does not recompute Biot–Savart directions every frame.
- Removed the external font request that caused browser network console errors; the app uses local font fallbacks.

## Spatial rendering and displacement

The 3D mode is **interactive spatial visualization**, not a fixed tilted picture. Pointer orbit and Shift+arrow keys change the camera rotation, which reprojects actual x/y/z coordinates. The suite verifies geometry changes on orbit and returns to its original projection on Reframe. Coil loops lie in the y–z plane, wire segments extend along z, bar magnets have 3D faces, and oblique particles follow spatial helices.

It remains an orthographic SVG renderer. It has limited occlusion/depth cues, no perspective lighting or depth buffer, and no free pan/zoom. Field lines generally represent one planar slice; probe/wire dragging is constrained to x–y. The architecture was preserved.

Motor and wire force formulas are quantitatively evaluated in SI. Their displacements are illustrative animation only. Particle trajectories are analytically calculated physical paths, shown at a normalized, slowed playback rate.

## Test evidence and reproduction

```sh
npm test
npm run test:browser
npm run build
```

`npm run test:browser` reuses a server at port 5173 or starts it with a strict port. Set `LAB_URL` for another externally started local server when running the audit scripts.

- Unit/component suite: 55 checks, including 13 added regression checks.
- Browser suite: 41 unique tests, including 24 independently solved challenge templates, parameter sweeps, signed vectors, real typing, timing, touch, keyboard access, measurement capacity/CSV, orbit/reframe, and responsive geometry.
- A complete 40-test browser sweep passed. The final relative-angle correction was followed by ten focused particle/force/animation checks and three conductor/reversal checks, including the added 41st test; all passed.
- Responsive sweep: 1536, 1024, 820, 620, 390 and 320 CSS pixels, all six tabs, both views. No document-level horizontal overflow or clipped readout/formula/control text in the tested states. The main tab bar intentionally scrolls within its own container.
- Visual evidence: 36 full-page screenshots and 36 scene crops at desktop 1536×1100, tablet 820×1180, and phone 390×844; additional source, helix, parallel-motion and analyser scenes.
- Accessibility: axe WCAG A/AA scans across every tab in both themes, plus a touch-enabled 320 px context. No automated violations remain in the tested states. Focus trapping, focus restoration, tab navigation, keyboard orbit, and keyboard graph inspection also have explicit browser assertions.
- Console: no browser page errors or error-level console messages during the final screenshot matrix and source variants.
- Steady animation measured approximately 60 fps in all six scenes, including the finite solenoid, with no recorded tasks over 50 ms during the measured windows. Caching improved the initial solenoid measurement from about 43 fps. See [performance.json](artifacts/browser-audit/performance.json) and [the earlier measurement](artifacts/browser-audit/performance-before.json). These short desktop headless measurements are not a hardware/mobile performance guarantee.

Screenshots and machine-readable results are in [artifacts/browser-audit](artifacts/browser-audit). To refresh images, start the server then run `npm run audit:browser` and `node scripts/contact-sheets.mjs`. To refresh timing, run `node scripts/performance-audit.mjs` with no other browser audit running.

## Verification boundary

This is Chromium browser validation with emulated viewport/touch/reduced-motion settings. It is not a physical-device, screen-reader, Firefox, or Safari certification. Extremely small labels in dense scenes can still benefit from the 2D view or turning off optional vectors/labels. Measurement tables and challenge progress restart when switching tabs; CSV exports preserve recorded observations. No hosted deployment was tested or created.

## Main files changed or added during the audit

- Shared UI: `Controls.tsx`, `Scene.tsx`, `Graph.tsx`, `ChallengePanel.tsx`, `ExperimentPanel.tsx`, `MagnetismLab.tsx`, `content.ts`, and `styles.css`.
- New animation boundary: `AnimatedScene.tsx`; updated `useSimulationClock.ts`.
- Physics: `core.ts`, `graphs.ts`, `challenges.ts`; new `trajectories.ts`.
- Regression suites: `browser-regressions.test.ts`, updated `MagnetismLab.test.tsx`, new `e2e/lab.spec.ts`.
- Test infrastructure: `playwright.config.ts`, `vite.config.ts`, package manifest/lockfile, `.gitignore`, and scripts under `scripts/`.
- Documentation: this report and `README.md`.
