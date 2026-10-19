# Magnetism Lab

A local React + TypeScript laboratory with six integrated experiments: Magnetic Fields, Resultant Fields, Moving Charges, Motor Effect, Parallel Wires, and Velocity Selector.

## Run

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173/).

```sh
npm test
npm run build
```

The production output is in `dist/` and can be served by any static web server. No account, backend, or API key is required. Fonts use local system fallbacks; there are no external runtime font requests.

## Features

- Six functional tabs with shared playback, step, slow-motion, reset, reframe, and visibility controls.
- Perspective Three.js / React Three Fiber 3D in all six tabs, with Drei orbit controls, zoom/pan, camera presets, optional axes/grid, adaptive quality, and SVG 2D/compatible fallback.
- Five field sources, a draggable probe and compass, independently draggable wires, and vector superposition.
- Exact uniform-field particle trajectories, including stationary, parallel, circular, and helical motion.
- Signed motor and parallel-wire forces, with independent reversal controls.
- Analytic crossed-field motion, an aperture, and a magnetic analyser that retains the particle's exit velocity.
- Labeled live graphs with operating points and pointer inspection.
- Four challenge templates per tab, randomized numerical targets, tolerance checks, hints, and solutions.
- Guided measurements, up to twelve recorded trials, and CSV export including the captured settings.
- Tangent-galvanometer activity using a simulated 25 µT horizontal Earth field.
- Responsive desktop/tablet/phone layouts, keyboard tab navigation, keyboard movable probes, reduced-motion startup, and dark/light themes.

## Files

| Path | Purpose |
| --- | --- |
| `src/components/magnetism/MagnetismLab.tsx` | Integrated layout, state, playback, tab navigation, help |
| `src/components/magnetism/Scene.tsx` | Preserved SVG 2D and compatible orthographic 3D scenes |
| `src/components/magnetism/three/` | Lazy WebGL renderer, reusable equipment/vectors, spatial drag and camera controls |
| `src/lib/physics/magnetism/visualization.ts` | Spatial streamlines and analytic rendering samples derived from the validated engine |
| `src/components/magnetism/Controls.tsx` | Sliders, numeric inputs, source and particle selection |
| `src/components/magnetism/Graph.tsx` | Responsive labeled graph and inspection |
| `src/components/magnetism/ChallengePanel.tsx` | Challenge interaction and feedback |
| `src/components/magnetism/ExperimentPanel.tsx` | Guided measurements and CSV export |
| `src/components/magnetism/content.ts` | Educational labels, formulas, assumptions |
| `src/lib/physics/magnetism/core.ts` | Constants, vectors, fields, forces, trajectories, SI formatting |
| `src/lib/physics/magnetism/trajectories.ts` | Analytic velocity and first-boundary selector/analyser paths |
| `src/lib/physics/magnetism/graphs.ts` | Graph samples and quantitative readouts |
| `src/lib/physics/magnetism/challenges.ts` | Reusable challenge generation and checking |
| `src/lib/validation/physics.test.ts` | Numerical validation of physics, graphs, and challenges |
| `src/components/magnetism/MagnetismLab.test.tsx` | Tab rendering, state retention/reset, controls, measurement, keyboard checks |
| `src/hooks/useSimulationClock.ts`, `src/components/magnetism/AnimatedScene.tsx` | Isolated animation timing |
| `src/types/magnetism.ts` | Shared typed models |
| `src/styles.css` | Responsive theme and layout |
| `src/main.tsx`, `src/test-setup.ts` | Application and test entry points |
| `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore` | Build/dependency configuration |

## Physics and validation

All calculations use SI units. Wire fields are vector quantities and are regularized inside a 2 mm core. Coil fields use 48-segment midpoint Biot–Savart quadrature. The finite solenoid uses its analytic on-axis field and adaptive loop quadrature off-axis. Ideal centre/end formulas are labeled separately from the finite model. Bar-magnet fields use an external dipole approximation with a softened core.

Particle paths use exact solutions in constant fields. In crossed fields, the analytic solution includes the E×B drift and cyclotron motion. A transmitted particle enters the analyser with its actual exit velocity. The analyser readout gives the design radius at selected velocity E/B.

**Verified:** 73 unit/component tests and 87 browser tests pass, preserving all original 55 tests and 41 SVG browser regressions. TypeScript and production build pass, and the built bundle passes a six-tab WebGL/2D smoke test. See [the WebGL upgrade report](WEBGL_UPGRADE.md) for per-tab results, performance, screenshots and remaining limits. Tests cover current/radius/turn scaling, solenoid centre/end behavior, field superposition, right-hand-rule signs, parallel and stationary motion, charge reversal, circular return, conductor forces, selector balance for either charge sign, mass-radius scaling, challenge tolerances, all graph generators, tab switching, reset, and keyboard interactions. Local HTTP readiness returned status 200.

## Simplifications and verification limits

- WebGL 3D uses real meshes, perspective cameras, lights, depth and free orbit/zoom/pan. The original orthographic SVG is retained as a compatible fallback.
- Field-line density and vector arrow lengths are illustrative; numerical probe readings carry the physical magnitudes. Conductors and particles use enlarged visual sizes.
- WebGL conductors remain fixed; arrows show quantitative forces. SVG displacement remains an explicitly illustrative cue, with no mechanical integration. Separation controls set the force calculation.
- The dipole approximation is intended outside the magnet; near-core diagrams are illustrative. Quadrature is educational, not an engineering field solver.
- The tangent-galvanometer experiment is idealized and noiseless. The main scene shows the selected source; the activity combines Earth and coil centre fields separately.
- Particle animation is slowed and normalized for visibility. The selector ignores fringe fields, collisions, space charge, and relativistic corrections.
- Parameters persist across tab changes for the current page session. Recorded measurements and challenge progress restart when changing tabs; CSV export preserves measurements externally.
- Browser validation now uses Playwright Chromium, including desktop/tablet/mobile screenshots, touch and keyboard controls, all challenge templates, and axe checks in both themes. See `WEBGL_UPGRADE.md` for current per-tab results and evidence; `BROWSER_VALIDATION.md` records the earlier SVG audit. Physical-device and cross-browser validation remain outside this audit.
- This is a local implementation; it has not been deployed to a hosted service.

## Browser audit
Run `npm run test:browser` for browser regression tests. The test runner starts or reuses the local server. With a server running, `npm run audit:browser` captures the visual matrix; `node scripts/performance-audit.mjs` measures animation timing. See [the browser validation report](BROWSER_VALIDATION.md) for the complete results and limitations.

WebGL controls: drag to orbit, wheel/pinch to zoom, right-drag/two-finger drag to pan. Focus the viewport for arrow-key orbit, Shift + arrows to pan, +/− to zoom, and Home to reframe. Probe/compass arrow keys move in the chosen plane; Page Up/Down moves in depth. Use Compatible view or `?renderer=svg` for the original renderer. Unsupported or lost WebGL automatically falls back. `node scripts/webgl-performance.mjs` compares both renderers sequentially and checks resource stability.
