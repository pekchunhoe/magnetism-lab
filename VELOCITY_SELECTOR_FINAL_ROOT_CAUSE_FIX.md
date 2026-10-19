# Velocity Selector: physics, geometry and playback correction

Validated locally on 20 October 2026 (Asia/Kuala_Lumpur). No commit, push or deployment was performed.

## 1. Starting state and investigation

The starting working tree was clean on `master`, at `2b8b3501fc531c164dedd2de2a8614f80879df44` (single-particle playback correction), following `a45f3dd` (trajectory synchronization correction). Reviewed both earlier reports, both commits and their diffs, existing motion/clock/component/browser tests, and prior flight recordings. Previous evidence folders were copied into `artifacts/selector-root-cause/prior-{single-flight,selector-fix}-evidence/` before the full suite regenerated its usual artifacts.

The investigation followed controls → SI parameters → exact motion → apparatus boundary calculation → shared motion sampler → parent animation clock → SVG/WebGL transforms and trails → completion callback and Replay. The baseline passed all **90 existing unit/component tests**. Passing those tests did not establish the requested behavior.

## 2. Root causes and before evidence

1. **The field convention differed from the requested apparatus.** Core motion, entry-force readouts, SVG plate charges/symbols, WebGL arrows and analyser motion consistently assumed E along +y and B along +z. That is a valid alternative Lorentz convention, but it gives the opposite initial deflection from the requested E downward/B into-page apparatus. The existing tests explicitly expected those opposite signs. The new independent normalized regression passed case A and failed B/C/D and the multiperiod comparison before correction: `before-analytical.json` records **1 pass, 4 failures**. Case B returned y ≈ −0.5 rather than +0.5 at π/2.
2. **Rendered solid apertures were not fully represented in collisions.** WebGL showed 9 mm thick entrance/exit walls; physics ignored the entrance tunnel and tested the exit only at its centre plane. A slow electric-only particle travelled through the entrance wall to a later plate. A grazing particle could clear the centre plane and then cross the exit wall's inner surface. The analyser also began inside the exit slab. SVG omitted the entrance aperture and showed a different exit-wall height.
3. **An unchanged mass input could reset the flight.** `NumericInput` displays six decimal places. Blurring the unchanged generic-ion mass republished that rounded value as a new physical mass. Its changed SI value changed the reset identity. The focused pre-fix regression records a paused time of `1.248e-7 s` becoming `0` (`before-mass-blur.json`). This was a real unintended reset trigger beyond the already-corrected modulo bug.
4. **SVG display controls were inconsistent.** The standalone E illustration followed “Vectors” rather than “Field lines,” unlike WebGL. The rejected SVG trail was red despite explanatory text calling the particle trail mint. Physical field strengths were already independent of visibility; no evidence showed hiding illustrations disabling forces.

The baseline at `2b8b350` did **not** reproduce automatic modulo restarting. The earlier report's `% 1` defect had already been removed. Existing single-flight clamping, shared parent clock, completion scheduling stop and Replay were retained and rechecked rather than replaced or falsely presented as new fixes.

Before recordings and screenshots: [`before-frames.json`](artifacts/selector-root-cause/before-frames.json), [`before-2D-above.png`](artifacts/selector-root-cause/before-2D-above.png), [`before-2D-entrance-wall.png`](artifacts/selector-root-cause/before-2D-entrance-wall.png), and matching `before-3D-*.png`. These are the unchanged local starting application, not a stale deployment.

## 3. Final physical equations

All physical values remain SI. Coordinates are +x right, +y up, +z out of the page. Selector E = (0,−E,0), B = (0,0,−B). Thus

```
m dv/dt = q(E + v × B)
Fx = −q B vy
Fy = q(B vx − E)
vs = E/B,  omega = qB/m,  deltaV = v0 − vs
x = x0 + vs t + (deltaV/omega) sin(omega t)
y = y0 + (deltaV/omega) [1 − cos(omega t)]
vx = vs + deltaV cos(omega t)
vy = deltaV sin(omega t)
```

The implementation evaluates an algebraically equivalent form using `sinc`, `(1−cos u)/u²` and `(u−sin u)/u³` with small-argument series, avoiding division by B and cancellation near B=0. With `a=q(v0 B−E)/m` and `u=omega t`, it uses `x=v0 t−a omega t³ sincc(u)`, `y=a t² cosc(u)`, `vx=v0−a omega t² cosc(u)`, `vy=a t sinc(u)` before adding the entrance origin.

At exact balance or q=0, motion is exactly straight. At B=0 the electric-only result is x=v0 t, y=−qEt²/(2m). At E=0 the orbit is circular and speed is conserved. General crossed-field motion remains trochoidal; physical loops, x reversals and vertical returns after a gyroperiod remain present. No deflection direction or forced rejection is assigned independently of the equations.

The separate analyser uses E=0 and the same B along −z, retains transverse entry velocity, and terminates at its first return to the detector plane.

## 4. Geometry and termination

| Apparatus feature | Coordinate / size |
| --- | --- |
| Field entrance / initial particle centre | x = −0.28 m, y = 0 |
| Selector field exit | x = +0.02 m |
| Inner plate surfaces | y = ±0.115 m |
| Entrance and exit opening half-height | 0.014 m |
| Aperture wall thickness | 0.009 m |
| Exit wall centre | x = 0.04 m |
| Exit wall front / rear | x = 0.0355 / 0.0445 m |
| Analyser entry and return plane | x = 0.0445 m, beyond the solid slab |
| Field-free detector endpoint when analyser is off | x = 0.24 m |

Existing WebGL apparatus dimensions were preserved. SVG now represents the same walls and aperture heights. The start remains at the centre of the existing entrance opening.

Plate and entrance-tunnel contacts use exact height crossings and bracketed exact x crossings, including the first backward entrance-face crossing. The field-free gap uses continuous ray/rectangle intersections against both finite exit-wall blocks. This catches front-face and inner-surface contacts even if no rendered frame lands near the collision. A blocked particle stops at the first contact with its incident velocity, retained trail and rejection result. No respawn or teleport follows. A beam missing the finite wall outside the opening is reported as missing the aperture, rather than inventing a collision or transmission.

Transmission requires geometric clearance through the whole slab, including its rear face. It does not require v0 exactly equal to E/B. Tests explicitly transmit 99 and 101 km/s around the 100 km/s selected speed. A valid return through the open entrance is distinguished from hitting the entrance wall.

## 5. Clock, reset and visibility behavior

The existing deterministic lifecycle remains: ready/paused at the source → running → completed/rejected and paused. Physical sample time is the monotonic parent clock fraction multiplied by the calculated flight duration, clamped at the endpoint. There is no selector modulo wrap. SVG and WebGL share this clock and the same exact sampler. Renderer switches, camera changes and visual toggles preserve the current flight.

On completion, the clock stops scheduling frames, publishes the exact terminal state and invokes completion once. The endpoint and trail remain held. Step after completion does not relaunch. Replay explicitly starts a new flight. Real physical parameter edits reset once; unchanged input blur now preserves full stored precision. Tests exercise pause/resume, slow playback, small steps, a five-second delayed animation frame, completion holds, replay, edits during playback and repeated rerenders.

“Field lines” controls illustrations only; “Vectors” controls force/velocity vectors. E and B forces depend solely on physical parameters. There are no separate physical-enable checkboxes in this UI: setting a field strength to zero switches that physical field off. No new physical toggles were introduced. Both views show E downward, B into the page and a mint trajectory whether accepted or rejected.

## 6. Independent numerical comparison

Normalized q=±1 C, m=1 kg, E=1 V/m, B=1 T, x0=y0=0, t=π/2 s:

| Case | q | v0 | x | y | vx | vy | ax | ay |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | +1 | 1.0 | 1.570796326795 | 0 | 1 | 0 | 0 | 0 |
| B | +1 | 1.5 | 2.070796326795 | +0.5 | 1 | +0.5 | −0.5 | 0 |
| C | +1 | 0.5 | 1.070796326795 | −0.5 | 1 | −0.5 | +0.5 | 0 |
| D | −1 | 1.5 | 2.070796326795 | −0.5 | 1 | −0.5 | −0.5 | 0 |

Over 4,004 independently evaluated samples spanning three gyroperiods, maximum component differences were **3.5527136788e−15 m** for position and **4.4408920985e−16 m/s** for velocity. A centred velocity difference with h=1e−5 s differed from q(E+v×B)/m by at most **5.1327053718e−11 m/s²**. See [`after-numerical.json`](artifacts/selector-root-cause/after-numerical.json). These reference comparisons do not derive their expected results by calling the application sampler.

A deterministic additional sweep sampled 500 parameter sets across both charge signs, speeds 0–1000 km/s, E up to 40 kV/m, B up to 200 mT and masses 1e−30–1e−25 kg. At 750,000 analytical points before terminal events, none penetrated a plate or the entrance wall: [`boundary-sweep.json`](artifacts/selector-root-cause/boundary-sweep.json). This supplements the exact grazing-impact regressions; finite sampling alone is not the collision algorithm.

## 7. Actual browser and trajectory evidence

Chromium rendered genuine SVG and WebGL, with successive animation frames captured through completion and a post-completion hold. The new matrix covers desktop 1536×1100 and mobile 390×844; light/dark themes; field illustrations visible/hidden; 50/100/150 km/s positive particles and 150 km/s negative ions. Initial positions and velocities are independently checked against the analytical formula using actual sampled physical time. Every recorded moving frame is checked for monotonic physical/playback time, a physically bounded displacement, growing trail, exact trail-head agreement and unchanged completed position. Renderer switches compare physical state exactly.

Examples under `artifacts/selector-root-cause/`:

- [`after-desktop-dark-2D-above-fields-on-initial.png`](artifacts/selector-root-cause/after-desktop-dark-2D-above-fields-on-initial.png): upward initial deflection, downward E arrow and into-page crosses.
- [`after-desktop-light-3D-above-fields-on-completed.png`](artifacts/selector-root-cause/after-desktop-light-3D-above-fields-on-completed.png): full genuine oscillations, valid aperture passage and held endpoint. A later downward tangent after initial upward curvature is physical.
- `after-{desktop,mobile}-{dark,light}-{2D,3D}-{below,selected,above,negative-above}-fields-{on,off}-{initial,completed}.png`: complete matrix of captures.
- [`after-2D-entrance-impact.png`](artifacts/selector-root-cause/after-2D-entrance-impact.png), `after-3D-entrance-impact.png`: stop at the entrance tunnel's inner surface, rather than crossing the wall to a later plate.
- [`after-2D-grazing-impact.png`](artifacts/selector-root-cause/after-2D-grazing-impact.png), `after-3D-grazing-impact.png`: contact inside the exit slab after clearing its front opening.
- `matrix-{desktop,mobile}-{dark,light}.json`: initial parameters, reference coordinates and consecutive physical frames.
- `after-{2D,3D}-{below,selected,above,negative-above,loops,electric-only,magnetic-only,entrance-wall,zero-force}.png` and `after-frames.json`: same-scenario baseline comparisons and additional full-flight cases.

The baseline 1 km/s proton with E=40 kV/m, B=0 ended at (−0.279754993493, +0.115) m after crossing the entrance wall. The correction stops it at y=−0.014 m within the entrance tunnel. For E=28 V/m, B=0 and v0=100 km/s, the corrected gap calculation catches the grazing exit impact inside 0.0355 < x < 0.0445 m; the old centre-plane test accepted it.

Visual inspection checks the rendered path, field direction, wall contacts, retained trails and endpoint against those recorded coordinates. Screenshots alone are not treated as physics validation.

## 8. Modified files

| File | Reason |
| --- | --- |
| `src/lib/physics/magnetism/core.ts` | Requested exact crossed-field convention and matching entry force |
| `src/lib/physics/magnetism/trajectories.ts` | Matching instantaneous/analyser forces, shared wall dimensions, entrance collisions and continuous finite-slit intersection |
| `src/lib/physics/magnetism/visualization.ts` | Matching sampled net force and explicit collision rejection results |
| `src/components/magnetism/Controls.tsx` | Preserve full physical precision on unchanged input blur |
| `src/components/magnetism/Scene.tsx` | Matching SVG field directions, plate charges, aperture geometry, E visibility and mint trails |
| `src/components/magnetism/three/ParticleMotion.tsx` | Matching WebGL E/B illustrations |
| `src/components/magnetism/three/Models.tsx` | Matching plate charges, shared wall thickness and analyser backing beyond the slab |
| `src/components/magnetism/content.ts` | Correct apparatus convention and collision explanation |
| `src/lib/validation/selector-analytical.test.ts` | Independent normalized A–D and multiperiod reference |
| `src/lib/validation/selector-motion.test.ts` | Updated convention, finite-wall and geometric acceptance regressions, frame-size invariance |
| `src/lib/validation/browser-regressions.test.ts` | Updated force/analyser reference expectations |
| `src/hooks/useSimulationClock.test.tsx` | Delayed-frame completion regression |
| `src/components/magnetism/MagnetismLab.test.tsx` | Unchanged rounded-mass blur regression |
| `e2e/selector-root-cause.spec.ts` | Analytical browser matrix, full-flight continuity, finite-wall and mass-blur regressions |
| `e2e/selector-single-flight.spec.ts` | Updated explicit plate rejection wording |
| `e2e/lab.spec.ts` | Negative particle magnetic-force readout expectation for B into the page |
| `scripts/selector-root-cause-evidence.mjs` | Reproducible before/after full flights, screenshots and numerical reference |
| This report | Findings, evidence, scope and results |

`useSimulationClock.ts`, `AnimatedScene.tsx`, `ThreeScene.tsx` and `MagnetismLab.tsx` were inspected; their already-correct bounded-flight behavior did not require another rewrite. Other tabs' equations and animations were preserved.

## 9. Test results

| Check | Result |
| --- | --- |
| Baseline existing unit/component suite | 90/90 passed |
| New independent analytical regression before correction | 1 passed, 4 failed, confirming convention mismatch |
| New rounded-mass blur regression before correction | Failed: time reset to zero |
| Final unit/component suite | **100/100 passed across seven files**; `artifacts/selector-root-cause/unit-tests.json` |
| Focused initial browser matrix and solid-wall checks | **5/5 passed**, including complete desktop/mobile flights in both themes |
| Final TypeScript and production build | Passed; existing Three.js chunk-size advisory remains |
| Existing `npm run audit:browser` | Passed: 36 responsive tab/view combinations, no overflow or clipped controls, no accessibility violations in any tab, no browser errors. Full results and 90 captures: `artifacts/selector-root-cause/browser-audit/` |
| Complete browser suite | All 100 cases executed, none skipped: **98 passed in 13.7 minutes**, with two test-expectation/readiness failures described below. Full report: `artifacts/selector-root-cause/full-browser-suite.json` |
| `npx playwright test --last-failed` | **2/2 passed in 11.3 seconds** after correcting those tests; `artifacts/selector-root-cause/browser-retests.json`. All 100 browser cases are verified across the full run and focused retests |
| Final before/after evidence script | Completed all 18 scenarios in each version; zero page errors, zero time wraps, all endpoints held. Physical direction and wall-contact changes are preserved in the recordings |
| `git diff --check` | Passed |

The full-run failures were (1) an existing negative-charge force assertion still expecting the previous B-out-of-page sign, and (2) the new mass-blur browser test reading an undefined WebGL diagnostic before its first rendered frame. The latter now waits for the actual stepped clock metadata before comparing states, rather than using a fixed delay. Both passed on focused retest. No application code changed after the final build/full-run start; only these test corrections and the report/evidence script output summary changed. Original failure traces and screenshots are retained in `initial-browser-run-diagnostics/`, rather than discarded or presented as successful runs.

Regenerate the checks and final trajectory evidence locally with:

```powershell
npm test
npm run build
npm run test:browser
$env:AUDIT_OUTPUT='artifacts/selector-root-cause/browser-audit'
npm run audit:browser
node scripts/selector-root-cause-evidence.mjs after
```

## 10. Limits and final working tree

This remains a classical point-particle, ideal uniform-field apparatus with sharp boundaries. It excludes fringe fields, space charge, radiation and relativistic effects. Particle spheres/glows, vector lengths and line widths are enlarged visual markers, not physical particle radii; physical clearance applies to the point-particle centre. The visible trail is sampled to the existing finite geometric tolerance while motion and collisions use continuous analytical state. Physical flight duration is stretched to a 3⅓-second playback journey (longer in slow mode). Browser mobile testing is viewport emulation, not testing on physical phones.

Validation establishes agreement for the specified cases and tested UI ranges; it is not a proof against all future regressions. The deployment remains unchanged. No commit or Git index update was made. Generated screenshots and reports remain under the existing ignored `artifacts/` directory.

Working tree (`master`, same HEAD as at the start; no staged files):

```
 M e2e/lab.spec.ts
 M e2e/selector-single-flight.spec.ts
 M src/components/magnetism/Controls.tsx
 M src/components/magnetism/MagnetismLab.test.tsx
 M src/components/magnetism/Scene.tsx
 M src/components/magnetism/content.ts
 M src/components/magnetism/three/Models.tsx
 M src/components/magnetism/three/ParticleMotion.tsx
 M src/hooks/useSimulationClock.test.tsx
 M src/lib/physics/magnetism/core.ts
 M src/lib/physics/magnetism/trajectories.ts
 M src/lib/physics/magnetism/visualization.ts
 M src/lib/validation/browser-regressions.test.ts
 M src/lib/validation/selector-motion.test.ts
?? VELOCITY_SELECTOR_FINAL_ROOT_CAUSE_FIX.md
?? e2e/selector-root-cause.spec.ts
?? scripts/selector-root-cause-evidence.mjs
?? src/lib/validation/selector-analytical.test.ts
```
