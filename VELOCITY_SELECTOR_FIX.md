# Velocity Selector trajectory correction

## Root cause and reproduction

The original analytic crossed-field force signs were correct: the beam enters along +x, E points +y and B points +z, so the magnetic force on a positive charge initially points -y. There was no Euler integrator to replace.

The primary defect was state synchronization. Selector parameter changes recalculated the path but retained the previous playback phase. A paused speed edit could therefore relocate the particle directly into the middle of an entirely new orbit. The original 3D trail also retained its furthest sample across emissions and ended on a future sampled point, while the particle used exact motion. The 2D renderer selected the next discrete sample instead of using the 3D sampler. These behaviors made otherwise valid cyclotron curvature appear discontinuous.

The original analyser also ran every accepted particle through exactly half a cyclotron period, even when the particle entered with transverse velocity. Such particles reach the analyser's return plane at a different time.

The browser sweep additionally exposed an argument-limit overflow when rendering dense paths. Bounding calculations now reduce the array without spreading its elements into function arguments.

The direct paused-edit reproduction is preserved in `artifacts/selector-fix/before-state.json`. Before the correction, changing 100 to 500 km/s left the particle at time 1.2541185642054593 microseconds, position (-0.16422146793769876, -0.10350022366400688, 0) m. The corrected `after-state.json` records time zero, position (-0.28, 0, 0) m, and a two-vertex trail at the source.

## Physics and rendering changes

- Parameter changes in speed, E, B, particle type, charge, mass or analyser mode restart the selector clock at the source before the next paint. Play/pause and playback speed are preserved. Republishing an unchanged input value does not restart playback.
- The exact SI Lorentz solution now evaluates position and velocity together. Series expressions avoid cancellation near B=0, and balanced fields produce exactly straight motion for either charge sign.
- Both renderers use the same analytic motion and instantaneous force sampler. The trail follows that particle's exact head, clears at each new emission and never connects old and new trajectories. Legitimate loops remain possible.
- Selector line sampling bounds chord error to 10 micrometres. Oscillations smaller than that geometric tolerance remain in the analytic particle motion. Dense paths have no argument-spread bounding calculations.
- The ideal selector occupies -0.28 <= x <= 0.02 m and |y| <= 0.115 m. The field-free gap ends at the slit at x=0.04 m, with |y| < 0.014 m required for transmission. Paths stop at the first plate, entrance or blocked slit.
- The separate analyser region occupies x >= 0.04 m with E=0 and B along +z, using the existing field-strength control. Its path stops at the first return to the x=0.04 m detector plane, retaining transverse entry velocity and conserving speed. Its displayed backing and selector plate surfaces now agree with the physical regions.

## Exact source files changed

- `src/lib/physics/magnetism/core.ts` — stable exact selector position/velocity solution.
- `src/lib/physics/magnetism/trajectories.ts` — shared apparatus dimensions, error-controlled line sampling, stable boundary calculation and analyser return-plane intersection.
- `src/lib/physics/magnetism/visualization.ts` — shared motion sampling, trail indexing and dense-path framing.
- `src/hooks/useSimulationClock.ts` — reset before paint and discard the old frame timestamp.
- `src/components/magnetism/AnimatedScene.tsx` — selector parameter reset identity.
- `src/components/magnetism/Scene.tsx` — exact shared 2D motion, force vectors, trail and dense-path bounds.
- `src/components/magnetism/three/ParticleMotion.tsx` — exact trail head and fresh selector trail per emission.
- `src/components/magnetism/three/Models.tsx` — plate and analyser region geometry.
- `src/components/magnetism/three/ThreeScene.tsx` — explanation of selector restart/trail behavior.
- `src/components/magnetism/MagnetismLab.test.tsx` — parameter-edit reset regressions.
- `src/lib/validation/selector-motion.test.ts` — Lorentz, balance, circular motion, charge sign, field/speed changes, finite-state, aperture, analyser and dense-path regressions.
- `e2e/selector-motion.spec.ts` — desktop/tablet/mobile live slider sweeps, proton/electron, paused changes, phase parity, camera, trail cycles and playback-speed checks.
- `scripts/selector-reproduction.mjs` — reproducible paused-edit state capture and screenshots.
- `VELOCITY_SELECTOR_FIX.md` — this report.

## Validation

The original 73 unit/component tests passed before modification. The added regressions cover the reported defect and physics requirements without changing existing assertions.

| Check | Result |
| --- | --- |
| `npm test` | 85 tests passed across five files. |
| `npm run build` | TypeScript and production bundle passed. Vite reports a large-chunk warning for the Three.js bundle. |
| `npm run test:browser` | All 91 tests passed in 10.8 minutes, including all six tabs, all 24 challenges in SVG and WebGL, responsive layouts, accessibility, touch controls and graphics-context fallback. |
| `node scripts/selector-reproduction.mjs` | Paused edit resets to source; 2D/3D positions and velocities match for valid crossed-field loops, electric-only proton motion and magnetic-only electron motion. |
| `git diff --check` | Passed. |

The new browser scenarios use Chromium at 1536x1100, 820x1180 and 390x844. They sweep speed, B and E through minimum/middle/maximum settings during playback for protons and electrons in both renderers. They verify paused edits, no-op input blur, mass/charge edits, step/reset/pause/resume, slow playback, fresh trails at emission wrap, all four camera presets and exact shared force/coordinate state on renderer switches.

Visual inspection confirmed a continuous trail in both renderers, finite aperture impacts, electric-only deflection, and the physically valid crossed-field loops at 300 km/s, B=80 mT and E=8 kV/m. Representative captures:

- Original defect: `artifacts/selector-fix/before-desktop-3d.png` and `before-desktop-2d.png`.
- Corrected same paused edit: `after-desktop-3d-reproduction.png` and `after-desktop-2d-reproduction.png`.
- Valid loops: `after-3d-valid-loops.png` and `after-2d-valid-loops.png`.
- Electric-only motion: `after-3d-electric-only.png` and `after-2d-electric-only.png`.
- Electron magnetic motion: `after-3d-magnetic-only-electron.png` and `after-2d-magnetic-only-electron.png`.
- Responsive cases: `after-{desktop,tablet,mobile}-{2d,3d}-{proton,electron}.png`.

Screenshots and direct reproduction state are under `artifacts/selector-fix/`. Playwright's JSON report is `artifacts/browser-audit/tests.json`; retained failure traces from intermediate development are diagnostic artifacts, not final results.

## Model limits and delivery scope

The model uses ideal uniform fields with sharp boundaries, a field-free gap and a detector return plane. It excludes fringe fields, radiation and relativistic corrections. The displayed trail is a polyline with finite geometric tolerance; the particle and vectors use exact analytic motion. Automatic playback repeats source emissions; each repetition starts a fresh trail. Browser validation targets the local application in Chromium at desktop, tablet and mobile viewport sizes, rather than physical mobile devices or a Vercel deployment.

No commit, push or deployment was performed. The other five tabs, graphs, experiments and all 24 challenge definitions were preserved.
