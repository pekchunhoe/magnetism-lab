# Velocity Selector: exit slit, collisions and particle acceptance audit

Local audit, 20 October 2026 (Asia/Kuala_Lumpur). No commit, push or deployment.

## Findings

**All four reference particles physically transmit through the existing aperture.** Their trajectories must be retained. The old “Detected after selector” wording conflated transmission with detection, and did not distinguish the selected velocity from other velocities. There is no specified finite downstream detector sensitive area in the application. The old endpoint marker was placed at each calculated endpoint and labelled “Detector / impact”; it was not a fixed detector target.

The exact Lorentz motion and first-event calculation already give correct reference trajectories. Confirmed geometry discrepancies were rounded WebGL solid edges versus rectangular collision surfaces, SVG plate strokes with screen-dependent thickness, and omitted depth in the previously planar exit-wall intersection helper. These are corrected without changing apparatus dimensions or imposing velocity-based rejection. Depth cannot change the four reference outcomes because their motion stays at z=0.

## Starting state and review

- Branch `master`, HEAD `8f7b609` (`Fix velocity selector physics, collisions and animation`). Starting status and diff were clean.
- Reviewed `VELOCITY_SELECTOR_FIX.md`, `SELECTOR_SINGLE_PARTICLE_FIX.md`, `VELOCITY_SELECTOR_FINAL_ROOT_CAUSE_FIX.md`, the current analytical equations, first-boundary calculations, both renderers, clock, existing unit/component and browser tests, and evidence scripts.
- The baseline full unit/component suite passed all **100 tests** before implementation.
- Captured the unchanged local application for 100/150/200/240 km/s in 3D Perspective and 2D before modifying application code. Existing historical evidence directories were retained.

## Authoritative geometry

`src/lib/physics/magnetism/selector-geometry.ts` now owns the SI dimensions and six rectangular solids used by SVG, WebGL and exit-wall ray intersection. Dimensions were extracted from existing physics and WebGL equipment, not tuned to reject any reference case.

| Feature | Physical definition (metres) |
| --- | --- |
| Initial particle / entrance centre | (-0.280, 0, 0) |
| Entrance wall faces | x = -0.2845 and -0.2755 |
| Crossed-field interval | -0.280 ≤ x ≤ +0.020; followed only until the first event |
| Effective field length | 0.300 |
| Plate inner surfaces / spacing | y = ±0.115; spacing 0.230 |
| Plate thickness / outer surfaces | 0.014; y = ±0.129 |
| Plate longitudinal span | x = -0.280 to +0.020 |
| Plate depth | z = -0.065 to +0.065 |
| Both aperture openings | -0.014 < y < +0.014; open span in wall depth -0.075 < z < +0.075 |
| Aperture blocks | Upper: 0.014 ≤ y ≤ 0.115; lower: -0.115 ≤ y ≤ -0.014; depth 0.150 |
| Exit wall centre / thickness | x = +0.040; thickness 0.009 |
| Exit wall front / rear | x = +0.0355 / +0.0445 |
| Entrance-to-exit-centre distance | 0.320, including field-free space |
| Field-free space with analyser off | All motion after x = +0.020 |
| Analyser entry / return detector plane | x = +0.0445; E=0, B along -z when enabled |
| Field-free observation endpoint plane | x = +0.240; y follows the actual tangent |
| Physical particle collision radius | 0 (point particle) |

No side rails close the apparatus at z=±0.075. These are the finite ends of the wall blocks, not invented material. A ray outside their depth bypasses the wall and is not counted as passing through its opening. Positive y and z clearance at both wall faces is required for transmission. Exact opening-edge contact does not count as positive clearance. For z=0, contact at y=±0.014 is a solid collision.

The initial particle is at the centre of the entrance slab, as before; the animation does not model flight from the decorative source through the upstream half of the entrance tunnel. The entrance events check the downstream tunnel and later returns. Source housing, translucent field illustration and analyser backing are illustrative, not additional collision bodies. In particular, the backing is behind the z=0 motion plane.

**Detector ambiguity resolved explicitly:** x=0.240 was already the end of the field-free flight; no sensitive height, depth or efficiency was defined. It is now called an **observation plane**, and completion says **Transmitted through aperture**, not detected. No finite detector dimensions were invented. An actual finite downstream detector would require a separate specified geometry and intersection event. The existing analyser return detector remains a defined ideal plane.

### Rendering and scale

All positions, velocities, ray intersections and clearances are SI. WebGL equipment and moving objects share the group transform `world = factor * (physical - centre)`, with `factor = 2.8 / extent`. Camera projection occurs afterward. SVG projects the same SI geometry to its view box. Previously its plate stroke width was pixels; plate polygons now represent the physical thickness. No screen dimensions enter acceptance.

WebGL particle core radius is `extent*0.017`, its translucent halo radius is `extent*0.031`, and the endpoint glyph radius is `extent*0.025`; SVG uses a 5-unit particle dot. These are deliberately enlarged visual glyphs, not a physical proton radius or a finite beam envelope. The interface now states this explicitly. A glyph overlapping an edge is not evidence that the point centre has entered a solid.

## Fields and exact analytical motion

Coordinates: +x right, +y up, +z out of the page. E=(0,-8000,0) V/m and B=(0,0,-0.080) T. For a proton q=1.602176634×10^-19 C, m=1.67262192369×10^-27 kg:

```text
m dv/dt = q(E + v × B)
Fx = -q B vy; Fy = q(B vx - E)
vs = E/B = 100000 m/s
omega = qB/m = 7.6630665248e6 rad/s
T = 2 pi/omega = 0.819930935857 microseconds
vs T = 0.081993093586 m = 8.19930935857 cm

x(t) = -0.280 + vs t + A sin(omega t)
y(t) = A [1 - cos(omega t)]
z(t) = 0
vx(t) = vs + (v0-vs) cos(omega t)
vy(t) = (v0-vs) sin(omega t)
vz(t) = 0
A = (v0-vs)/omega
```

| v0 (km/s) | A (m) | Full uniform-field trajectory | Entry Fy (N); Fx=Fz=0 | Maximum y (mm) |
| ---: | ---: | --- | ---: | ---: |
| 100 | 0 | Straight | 0 | 0 |
| 150 | 0.00652480307178 | Smooth trochoid, vx≥50000 m/s | +6.408706536e-16 | 13.049606 |
| 200 | 0.01304960614357 | Cycloid, vx=vy=0 at odd half-periods | +1.2817413072e-15 | 26.099212 |
| 240 | 0.01826944860099 | Looped trochoid, minimum vx=-40000 m/s | +1.79443783008e-15 | 36.538897 |

The application retains its stable equivalent solution using small-argument series near B=0. Core equations were not modified. The formulas above apply until the first material contact or field exit; continuing them through the field-free gap would be incorrect.

At t=nT, y=0, vy=0, vx=v0. This return does **not** mean the particle now matches E/B. The 30 cm field length is **3.65884474997 drift periods**, not an integer. Four drift distances equal 32.7972374343 cm. The exit slit centre is 32 cm from the entrance, but the last 2 cm are field-free, so applying the crossed-field solution all the way to that plane is incorrect. Oscillatory return toward the beam axis and subsequent downward tangent in the gap explain the measured clearance; exact integer-period alignment is not required.

## Four reference results

Common settings: proton, E=8 kV/m, B=80 mT, analyser OFF, 3D Perspective, trail ON. Entrance position is (-280,0,0) mm for every case. Field-exit x=20 mm; slit front/centre/rear x=35.5/40/44.5 mm. All z and vz values are zero.

### Field exit and retained velocity

| v0 (km/s) | Field exit t (µs) | Field exit y (mm) | Exit vx (km/s) | Exit vy (km/s) | Direction from +x |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 3.000000000 | 0 | 100.000000 | 0 | 0° |
| 150 | 3.065068893 | +7.007966 | 96.297489 | -49.862726 | -27.375068° |
| 200 | 3.122023470 | +8.424139 | 135.445264 | -93.507397 | -34.620049° |
| 240 | 3.151775614 | +8.100162 | 177.927917 | -116.306663 | -33.171559° |

The slit-exit velocity equals the field-exit velocity: there are no fields between these planes. The off-speed particles do not emerge horizontally or acquire the selected velocity.

### Full wall passage and observation endpoint

For a field exit `(xe,ye)` with velocity `(vx,vy)`, calculate `y(x)=ye+(x-xe)vy/vx`. Minimum y clearance over the entire straight tunnel is `0.014-max(abs(yfront),abs(yrear))`. The minimum is at one of its faces, not necessarily its centre.

| v0 (km/s) | y front (mm) | y centre (mm) | y rear (mm) | Minimum y clearance (mm) | Rear exit t (µs) | y at x=240 mm (mm) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 0 | 0 | 0 | 14.000000 | 3.245000000 | 0 |
| 150 | -1.017915 | -3.348010 | -5.678105 | 8.321895 | 3.319488820 | -106.907773 |
| 200 | -2.276602 | -5.383269 | -8.489935 | 5.510065 | 3.302908347 | -143.457342 |
| 240 | -2.031768 | -4.973296 | -7.914824 | 6.085176 | 3.289471825 | -135.707882 |

The z clearance is 75 mm throughout in all cases. Every trajectory remains below the upper plate at y=115 mm, clears the entrance tunnel, and clears both faces and the interior of the exit opening. **First collision: none, in all four cases. Actual slit passage: yes, in all four cases.**

| v0 | Before completion status | After completion status | Downstream detection conclusion |
| ---: | --- | --- | --- |
| 100 | Detected after selector | Transmitted through aperture · selected velocity matched | Reaches observation plane; no finite detector specified |
| 150 | Detected after selector | Transmitted through aperture · off-selected velocity | Same, at its downward tangent endpoint |
| 200 | Detected after selector | Transmitted through aperture · off-selected velocity | Same, at its downward tangent endpoint |
| 240 | Detected after selector | Transmitted through aperture · off-selected velocity | Same, at its downward tangent endpoint |

The endpoint is not forced toward (0.240,0,0). The large negative y endpoints in the table prove the downstream direction is retained. Positions and velocities are continuous at the field exit and aperture exit; electric and magnetic forces are zero downstream with the analyser off.

## Numerical evidence and event detection

- [`before.json`](artifacts/selector-exit-audit/before.json) and [`after.json`](artifacts/selector-exit-audit/after.json) contain complete parameters, analytical first-forward field exits, slit-plane coordinates, actual simulation exits, completion status, renderer state, and **17 analytical/numerical trajectory samples per speed**. Analytical values use a separately written textbook formula and phase-grid bracketing followed by 60 bisections, not the production boundary solver.
- Over these 68 paired samples, maximum coordinate error is **1.683e-16 m**, maximum velocity-component error **5.821e-11 m/s**, and maximum field-exit position error **4.337e-17 m**. These are floating-point comparisons at the tested settings, not guarantees for every possible input.
- Before/after endpoint differences are at most **2.776e-17 m**. Correct trajectories and transmission outcomes were preserved.
- Existing first-event physics uses exact analytical height crossings and bracketed x crossings for plates, entrance tunnel and entrance returns. It compares their times against the first field exit. Looped trajectories use their forward extrema to bracket the first exit; a backward crossing is not mistaken for transmission.
- The gap now uses a shared **3D continuous ray/closed-box intersection** for both exit blocks, including their inner surfaces. The earliest contact truncates the trajectory at the incident position and velocity. No time sample has to land inside a wall.
- Aperture clearance is checked at **both faces in y and z**. A ray bypassing a finite wall is distinguished from transmission and from a collision. No velocity window participates in acceptance.
- `velocityMatched` reports the exact field-balance equality only. It is metadata, never an acceptance condition. Collision metadata includes kind, upper/lower side, position and physical time.

## Corrections and justification

1. **Central physical geometry:** added `selector-geometry.ts`, preserving every existing physical dimension, and naming the existing x=0.240 endpoint as `observationX`. Both renderers now use its solid definitions. Plates and aperture blocks are rectangular boxes, matching the existing event model; no curved-surface collision model was implied by decorative rounded corners.
2. **Exit-wall intersection:** extracted the existing continuous slab test into a shared 3D box calculation. Added positive clearance at both faces and along depth. The z tests defend the geometry contract; the current launch has no out-of-plane degree of freedom.
3. **Honest result semantics:** transmission and selected-speed match are separate. The downstream field-free endpoint is an observation marker; analyser return-plane detection is retained. Rejected paths still terminate at their physical collision or return event.
4. **Educational note:** finite selectors can transmit off-selected velocities; particles are points and visible spheres are enlarged markers. No new controls or clutter were added.
5. **Diagnostics and tests:** expose selected-speed match, first collision and field exit consistently in both renderer summaries. Added independent numerical reference cases and focused acceptance/geometry tests. Updated the old browser assertion to expect the corrected transmission wording.

No automatic particle loop, artificial smoothing, arbitrary velocity tolerance, resized slit, forced rejection or detector attraction was added. Play/pause, stepping, Replay, parameter resets, compatible SVG and 3D camera controls retain the existing lifecycle.

## Before / after screenshots

Matching local 3D Perspective captures, with the same viewport and parameters:

| Speed | Before | After | Before 2D | After 2D |
| ---: | --- | --- | --- | --- |
| 100 km/s | [3D](artifacts/selector-exit-audit/before-100-3D.png) | [3D](artifacts/selector-exit-audit/after-100-3D.png) | [2D](artifacts/selector-exit-audit/before-100-2D.png) | [2D](artifacts/selector-exit-audit/after-100-2D.png) |
| 150 km/s | [3D](artifacts/selector-exit-audit/before-150-3D.png) | [3D](artifacts/selector-exit-audit/after-150-3D.png) | [2D](artifacts/selector-exit-audit/before-150-2D.png) | [2D](artifacts/selector-exit-audit/after-150-2D.png) |
| 200 km/s | [3D](artifacts/selector-exit-audit/before-200-3D.png) | [3D](artifacts/selector-exit-audit/after-200-3D.png) | [2D](artifacts/selector-exit-audit/before-200-2D.png) | [2D](artifacts/selector-exit-audit/after-200-2D.png) |
| 240 km/s | [3D](artifacts/selector-exit-audit/before-240-3D.png) | [3D](artifacts/selector-exit-audit/after-240-3D.png) | [2D](artifacts/selector-exit-audit/before-240-2D.png) | [2D](artifacts/selector-exit-audit/after-240-2D.png) |

The preserved Perspective preset partly occludes trajectories behind the equipment, so 2D is also captured for an unobstructed geometry check. The four trajectories are inspected together with numerical clearance; screenshots alone cannot establish subpixel physical accuracy.

Existing collision regressions also regenerate [the entrance-tunnel impact in 2D](artifacts/selector-root-cause/after-2D-entrance-impact.png) and [the grazing inner exit-wall impact in 3D](artifacts/selector-root-cause/after-3D-grazing-impact.png). Visual inspection confirms held impact endpoints; the numerical events identify the actual point contact beneath the enlarged glyphs.

## Verification

| Check | Result |
| --- | --- |
| Baseline `npm test` | 100/100 tests passed |
| Final `npm test` | 116/116 tests passed across 8 files |
| Independent reference tests | Four exact exits and velocities, period/drift, straight/trochoid/cusp/loop, periodic return to axis |
| Geometry tests | Aperture centre, inside/outside, exact edge, upper/lower plate, exit face, grazing inside slab, first contact, depth/bypass, 10^9 m/s ray without tunnelling |
| Acceptance / downstream tests | Off-speed genuine transmission and physical rejection; no selected-speed gating; constant downstream velocity, zero force and correct tangent |
| Timesteps / lifecycle | 0.003, 0.08 and 10 s playback increments; existing pause, Replay, no-respawn and held-endpoint tests |
| Before/after Chromium script | All four real 3D flights completed, both renderers captured; no page errors |
| `npm run build` | TypeScript and production build passed; existing large Three.js chunk warning remains |
| Full `npm run test:browser` | **104/104 passed**, 14.2 minutes, no failures or retries |
| `git diff --check` | Passed (Git reports normal Windows LF/CRLF conversion notices) |

The new browser matrix repeats all four flights at desktop 1536×1100 and mobile 390×844, dark/light, then switches between actual WebGL 3D and SVG 2D. It compares independently calculated field exits, velocities and tangent endpoints, checks exact renderer parity, field visibility independence, trail retention, single-flight hold and Replay availability. Matrix evidence is written to `artifacts/selector-exit-audit/matrix-{device}-{theme}.json` with corresponding screenshots. Existing full-suite coverage includes all tabs, challenges, accessibility, camera interaction, analyser transitions and graphics-context fallback.

The complete machine-readable Playwright report is `artifacts/browser-audit/tests.json`. All four new audit matrix scenarios passed, together with the existing full-flight, entrance-wall/grazing-slit, pause/Replay, live-edit and camera regressions. Mobile dark and desktop light screenshots were visually inspected as well as the matching before/after reference captures and impact captures. The application code was unchanged during the full browser run; only this Markdown report was finalized afterward.

## Limitations and remaining scope

- Ideal uniform, nonrelativistic fields with sharp boundaries; no fringe fields, scattering, radiation, space charge or finite beam emittance.
- Point particle model, enlarged display markers and a trail polyline with 10 µm chord-error target. Exact motion and event times are independent of that visual sampling.
- Planar launch only. Full y/z exit-wall ray tests do not turn this into a general 3D arbitrary-launch field/plate solver.
- No finite downstream detector acceptance has been specified or verified. Adding one requires real sensitive dimensions; current field-free completion establishes aperture transmission and the observation-plane intersection only.
- The physical entrance flight begins at the slab centre, not inside the decorative source tube. The omitted upstream source transport is outside the current model.
- Browser checks use local Chromium viewport emulation, not physical mobile devices, other browser engines or a deployed site.
- Passing tests and numerical agreement at these cases do not establish 100% physical accuracy.

## Git delivery state

Work remains uncommitted on `master`. Modified: `e2e/selector-single-flight.spec.ts`; `src/components/magnetism/{Scene.tsx,content.ts}`; `src/components/magnetism/three/{Models.tsx,ParticleMotion.tsx,ThreeScene.tsx}`; `src/lib/physics/magnetism/{trajectories.ts,visualization.ts}`. Added: this report; `e2e/selector-exit-audit.spec.ts`; `scripts/selector-exit-audit.mjs`; `src/lib/physics/magnetism/selector-geometry.ts`; `src/lib/validation/selector-exit-audit.test.ts`. Generated screenshots and JSON remain locally under the existing ignored `artifacts/` directory. No commit, push or deployment was performed.
