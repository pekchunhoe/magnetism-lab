# Single-particle Velocity Selector

Validated on 20 October 2026 (Asia/Kuala_Lumpur). This report supersedes the repeating-emission behavior described in `VELOCITY_SELECTOR_FIX.md`.

## Production verification before changes

The local working tree was clean. Both local `master` and the live GitHub `master` reference were `a45f3dddec46590e5c07650be01c9979f9455892` (`Fix velocity selector particle trajectories and synchronization`). The production site, https://magnetism-lab.vercel.app/, returned HTTP 200 and loaded the previous correction. It was not an outdated-deployment problem.

The public Vercel assets were downloaded before modifying application code and matched the existing local production build byte for byte:

| Production asset | SHA-256, identical locally and on production |
| --- | --- |
| `/assets/index-CzYXXp96.js` | `6C873914A245ADB971C8A6FEA39E75BF4F53A616D55F6E011710CFAF52C4951E` |
| `/assets/ThreeScene-BHDD-NiV.js` | `EA2579E7C967334CFC1223D1DA8F8BBE01CB6E20CD6F46F9E2FCA84086419B1D` |

This verifies the served code directly. No authenticated Vercel dashboard/deployment record was accessed. The downloaded original bundles are retained under `artifacts/selector-single-flight/production-*`.

## Reproduced cause

The previous sampler computed `((clock * 0.3) % 1 + 1) % 1`. Thus a particle reaching the end of its 3.333-second playback interval automatically reappeared at the source. The clock itself was increasing; the sampled physical time wrapped. The previous browser regression explicitly expected this wrap, so passing that test did not establish single-particle behavior.

Live production was recorded in genuine WebGL 3D and SVG 2D with field illustrations disabled and the particle trail enabled. Each recording captured 133 consecutive animation frames and one restart:

| WebGL production frame | Physical time (microseconds) | x (metres) | Trail vertices |
| --- | ---: | ---: | ---: |
| Immediately before wrap | 5.19469704 | 0.239469704 | 682 |
| Next recorded frame | 0.02059304 | -0.277940696 | 6 |

That approximately 0.5174 m backward jump is an artificial restart. It is not a physical turn in the orbit. The 2D recording shows the same reset.

Repeated arches have a separate explanation in the reproduced unbalanced case: at v=300 km/s, E=8 kV/m and B=80 mT, the electric drift is 100 km/s while the oscillating velocity component has amplitude 200 km/s. Its x velocity can reverse, producing valid cycloidal loops within the selector. Those mint curves remain when field illustrations are turned off and are actual particle motion. The field illustrations are blue magnetic arrows/symbols and gold electric arrows. They are not repeated arch-shaped field lines. The correction preserves these physical loops.

No per-frame React reset or component-remount loop was found. Parameter reset dependencies are stable values; normal animation and display updates do not change them.

## Corrected behavior

- Entering the selector opens one particle at the source, paused, including when the browser allows animation by default.
- Play follows one continuous exact SI Lorentz trajectory. Sampled physical time is clamped at the journey endpoint, never wrapped.
- The bounded selector clock stops scheduling animation frames after completion and reports completion once. The other tabs retain their unbounded clocks and existing motion.
- The final position is the exact terminal sample, including a snapped plate, entrance, slit or analyser-return coordinate. The completed trail remains visible and ends at that position.
- Detection, plate collision, slit collision, entrance return or stationary results are displayed at completion. The reported terminal velocity is the incident velocity at that endpoint.
- Replay starts a fresh particle with the current parameters. Reset restores selector defaults and returns to the source, paused.
- Speed, E, B, particle type, mass, charge or analyser changes reset the flight once. Playback continues if already running; paused/completed experiments remain paused until Play. Republishing an unchanged value does not reset the flight.
- Pause/resume, Step and 0.2x playback preserve the current flight. Step after completion cannot launch another particle.
- Field illustrations use blue symbols/arrows for B and gold arrows for E; the particle trail is solid mint. Both views explain this distinction.
- Continuous-beam mode was not added. There is one particle and one trajectory history.

The Lorentz equations, field geometry, boundary calculations, graphs, experiments and all 24 challenge definitions are unchanged.

## Frame and screenshot evidence

All files below are under `artifacts/selector-single-flight/`:

- `before-production-frames.json`: consecutive live-production frames, with one wrap in each renderer.
- `after-local-frames.json`: the same near-end experiment after correction; zero wraps in 130 WebGL frames and 133 SVG frames.
- `before-after-frames.csv`: 529 recorded frames with version, view, wall time, physical time, elapsed playback time, coordinates, trail size and completion state.
- `before-production-{2D,3D}-{before-end,after-end}.png` and `after-local-{2D,3D}-{before-end,after-end}.png`: before/after trajectories with field illustrations off.
- `before-production-valid-loops-fields-{off,on}.png`: the same paused physical loops with/without field illustrations.
- `after-{2D,3D}-{proton,electron}-frames.json`: full-flight recordings generated by the regression tests, with continuity checks on every recorded frame.
- `after-{2D,3D}-{proton,electron}-completed.png`: completed particles and retained trails.
- `after-{2D,3D}-valid-loops-fields-off.png`: valid turnarounds preserved without decorative field graphics.

The corrected near-end WebGL recording first reaches x=0.24000000000000005 m at wall time 509.5 ms, physical time 5.200000000000001 microseconds, and holds exactly that position/time through wall time 2201.1 ms. Its complete 682-vertex trail remains unchanged. The SVG recording independently holds the same physical endpoint, with one duplicate endpoint vertex in its SVG path.

The browser continuity check compares consecutive elapsed/physical times, displacement against the exact crossed-field speed bound `|E/B| + |v0-E/B|` and time interval, trail growth and exact trail-head agreement. Endpoint speeds alone cannot bound electron motion that completes many gyromotions between rendered frames. The check does not impose monotonic x motion. Completed frames must remain identical. Separate recordings cover explicit Replay and intentional parameter resets.

## Exact files changed

- `src/lib/physics/magnetism/visualization.ts`: bounded single-flight sampling, exact terminal state and result descriptions.
- `src/hooks/useSimulationClock.ts`: optional clock bound, one completion callback and frame scheduling stop.
- `src/components/magnetism/MagnetismLab.tsx`: default paused selector, Replay, completion and reset lifecycle.
- `src/components/magnetism/AnimatedScene.tsx`: selector clock limit, completion callback and SVG result explanation.
- `src/components/magnetism/Scene.tsx`: single-flight metadata, result and field/trail distinction.
- `src/components/magnetism/three/ParticleMotion.tsx`: actual elapsed/complete frame metadata.
- `src/components/magnetism/three/ThreeScene.tsx`: final frame invalidation, completion result and single-particle explanation.
- `src/styles.css`: theme-aware color for the new SVG explanation/result text, including light-theme accessibility.
- `src/hooks/useSimulationClock.test.tsx`: monotonic time, repeated rerenders, single completion, replay/reset, pause/resume/step/slow and other-tab clocks.
- `src/components/magnetism/MagnetismLab.test.tsx`: completed endpoint retention and Replay without parameter loss.
- `src/lib/validation/selector-motion.test.ts`: exact terminal-state retention past any former wrap boundary.
- `e2e/selector-motion.spec.ts`: replaces the old expected re-emission with completion and retained-trail assertions.
- `e2e/selector-single-flight.spec.ts`: full proton/electron journeys, consecutive frames, Replay, edits, physical collisions/returns and valid loops.
- `e2e/lab.spec.ts`: checks transmission eligibility from physical metadata rather than displaying a detection result before the particle has flown.
- `scripts/selector-flight-evidence.mjs`: reproducible public-production/local screenshots and frame recordings.
- `SELECTOR_SINGLE_PARTICLE_FIX.md`: this report.

## Validation

The original physics suite passed before new regressions were added; the Lorentz and apparatus calculations were preserved.

| Check | Result |
| --- | --- |
| `npm test` | All 90 tests passed across six files. |
| `npx playwright test e2e/selector-single-flight.spec.ts` | All three full-flight/termination tests passed; frame-by-frame evidence saved. |
| Responsive selector regressions | Desktop, tablet and mobile slider sweeps passed, with completed trajectories retained. |
| `npm run test:browser` | All 94 cases executed: 93 passed in the full run (11.6 minutes); the sole failure was the new SVG note's light-theme contrast, recorded before its correction. |
| `npx playwright test --last-failed` | The corrected accessibility/theme/help-focus/keyboard test passed (15.5 seconds including setup). All 94 browser cases are verified across the full run and this focused retest; no tests were skipped. |
| `npm run build` | TypeScript and production build passed. Vite reports a large Three.js chunk warning. |
| `git diff --check` | Passed. |

The complete initial browser report is `artifacts/selector-single-flight/full-suite.json`. The successful retest is `artifacts/selector-single-flight/accessibility-retest.json`. The later responsive accessibility check in the full run also passed with the corrected style. The new 45-step component regression has a 15-second execution limit to allow the complete UI flight under concurrent build/browser load; its assertions remain intact.

## Remaining limits and delivery scope

The model remains a classical ideal uniform-field model with sharp boundaries and no fringe fields, radiation or space-charge effects. The exact particle motion is drawn with the existing finite-resolution polyline. Playback stretches physical flight time to a visible 3.333-second journey (16.667 seconds at 0.2x). There is no physical continuous-emission model.

After-correction browser tests target the local application in Chromium, including emulated desktop/tablet/phone viewports and touch input. They do not substitute for testing physical mobile devices. The publicly deployed original was inspected and recorded before changes. The new code has not been deployed, so production still repeats flights until a separately authorized release. No commit, push or deployment was performed.
