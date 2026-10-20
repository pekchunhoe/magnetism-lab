# Velocity Selector — 0.10 mm physical exit aperture

Local implementation and analysis: 20 October 2026 (Asia/Kuala_Lumpur). No commit, push or deployment.

## Result

The **physical exit opening is now 0.10 mm high**, centered at y=0. The entrance opening, 30 cm selector field length, 23 cm plate spacing, wall thickness, depth and point-particle model are preserved. There is one existing realistic simulation, with unchanged Lorentz equations and no velocity gate.

At E=8 kV/m and B=80 mT, the 100 km/s proton passes. The 150, 200 and 240 km/s protons follow their original trochoid/cycloid/looped trajectories and hit the **lower solid exit-wall front face**.

For the specified 0–1000 km/s sweep at 1 km/s spacing, excluding exactly 100 km/s:

- **995/1000 off-speed particles hit actual material: 99.5% physical-collision rejection**, exceeding the 90% target.
- No sampled off-speed value transmits through the aperture: **100% aperture exclusion on this coarse grid**.
- Five values, 336–340 km/s, bypass the finite wall above it. They are **not collisions**, are not counted in the 99.5%, and now continue along their actual downstream trajectory.
- Fine analysis finds a genuine passband of approximately **99.31089891 < v0 < 100.72185909 km/s**. Off-selected velocities within it are allowed. The apparatus is not an ideal speed filter.

## Starting state and scope

Started on `master`, HEAD `8f7b609dcd8e8503ad4030f8f55c112cb10744c1`, with the prior exit-slit audit and its implementation already uncommitted. Those changes were inspected and retained. Read `VELOCITY_SELECTOR_EXIT_SLIT_PHYSICS_AUDIT.md` and traced its authoritative geometry through the event solver, shared particle sampler, SVG polygons and WebGL boxes.

The previous report describes the **28 mm wide-opening baseline**; it remains a historical report, not a description of the newly narrowed apparatus. Fresh before captures for this task are in `artifacts/selector-ultra-narrow/`. The earlier 104-test browser result was preserved as `prior-wide-browser-tests.json` in that folder.

## Physical geometry

All dimensions below are SI metres unless stated otherwise. `src/lib/physics/magnetism/selector-geometry.ts` remains the authoritative definition.

| Feature | Before | After |
| --- | --- | --- |
| Exit opening full vertical height | 0.028 m = 28 mm | **0.00010 m = 0.10 mm** |
| Exit opening half-height | 0.014 m | **0.00005 m = 0.05 mm** |
| Exit opening centre | y=0, z=0 | Preserved |
| Entrance opening full height | 0.028 m | Preserved |
| Exit-wall front / centre / rear x | 0.0355 / 0.0400 / 0.0445 | Preserved |
| Wall thickness | 0.009 | Preserved |
| Aperture wall depth | -0.075 ≤ z ≤ +0.075 | Preserved |
| Field entrance / exit x | -0.280 / +0.020 | Preserved |
| Field length | 0.300 | Preserved |
| Plate inner surfaces / spacing | y=±0.115 / 0.230 | Preserved |
| Plate thickness / depth | 0.014 / 0.130 | Preserved |
| Field-free observation plane | x=0.240 | Preserved |
| Analyser entry / return detector plane | x=0.0445 | Preserved |
| Physical collision radius | 0 (point particle) | Preserved |

The exit upper block now spans +0.00005 ≤ y ≤ +0.115; the lower block spans -0.115 ≤ y ≤ -0.00005. Each remains 9 mm thick and 150 mm deep. The opening is nonzero and **280 times smaller in full height** than before. No selector-length or plate-spacing adjustment was needed.

Previously the entrance and exit shared `slitHalfHeight`. Added `entranceSlitHalfHeight=0.014`; the existing exit `slitHalfHeight` becomes `0.00005`. Entrance-tunnel collision calculations explicitly use the entrance value, preventing an unintended narrowing of the source aperture. Solid definitions choose the corresponding value for each wall.

### Rendering and clearance

Both SVG and WebGL already consume the same solid definitions. Their upper/lower exit blocks now physically leave the 0.10 mm gap; no separate cosmetic opening or enlarged collision channel exists. SI-to-world transformation and camera projection are unchanged. At normal camera distance the gap is smaller than a pixel and may visually merge because of rasterization. It has not been enlarged for visibility; the educational note gives its physical dimension.

SVG previously rounded projected path coordinates to two decimals. At the standard scale that rounded a 0.05-view-unit gap into 0.06 units, a 20% size error for this extremely small opening. Apparatus polygons now retain full projected-coordinate precision, while existing trail/field-line sampling is unchanged. A browser assertion checks the actual SVG exit-gap/plate-length ratio against 0.0001/0.3, and the preserved entrance-gap ratio against 0.028/0.3.

The enlarged particle sphere, halo, endpoint glyph and trail thickness are illustrations. Their sizes are not added to the physical collision radius. No magnifier, additional mode or control was introduced.

Transmission requires positive clearance in **both y and z at both faces** of the complete 9 mm channel. For the straight field-free gap ray:

```text
y(x) = ye + (x - xe) vy/vx
cy = 0.00005 - max(|yfront|, |yrear|)
cz = 0.075 - max(|zfront|, |zrear|)
transmitted only if cy > 0, cz > 0, and no solid contact
```

Continuous ray/closed-box intersection locates front-face, edge or inner-channel contact. Exact contact with a solid edge is a collision; touching the clearance limit is not successful passage. This calculation is independent of frame rate, playback increments and trail sampling.

## Unchanged physics

The existing `core.ts` analytical motion was not edited. Coordinates are +x right, +y up and +z out of the page. E=(0,-E,0), B=(0,0,-B), with positive entry velocity along +x:

```text
m dv/dt = q(E + v × B)
Fx = -q B vy; Fy = q(B vx - E)
vs = E/B; omega = qB/m; A = (v0-vs)/omega
x(t) = -0.280 + vs t + A sin(omega t)
y(t) = A [1 - cos(omega t)]
vx(t) = vs + (v0-vs) cos(omega t)
vy(t) = (v0-vs) sin(omega t)
z(t) = vz(t) = 0
```

The stable equivalent implementation near B=0 is preserved. For these protons, vs=100000 m/s, T=0.819930935857 µs and drift per period=8.19930935857 cm. Motion after x=0.020 is field-free when the analyser is off, and follows the exit tangent at constant velocity. With the analyser on, the separate existing B=-z region begins behind the slab at x=0.0445.

## Four reference velocities

Settings: proton (+), E=8 kV/m, B=80 mT, analyser OFF, trail ON. Every particle begins at (-0.280,0,0) m. Narrowing only the downstream exit wall leaves all field-region coordinates, velocities, cusps and loops unchanged.

Direct before/after comparison found **zero change** in the four production field-exit position/velocity states and in the 68 paired field-region trajectory samples.

| v0 (km/s) | Trajectory | Field-exit t (µs) | Field-exit y (mm) | vx (km/s) | vy (km/s) |
| ---: | --- | ---: | ---: | ---: | ---: |
| 100 | Straight | 3.000000000 | 0 | 100.000000 | 0 |
| 150 | Smooth trochoid | 3.065068893 | +7.007966 | 96.297489 | -49.862726 |
| 200 | Cycloid with true cusps | 3.122023470 | +8.424139 | 135.445264 | -93.507397 |
| 240 | Looped trochoid | 3.151775614 | +8.100162 | 177.927917 | -116.306663 |

### Actual first contact and final displayed endpoint

| v0 | y at wall front (mm) | Front clearance (mm) | First collision / time (µs) | Actual final point (x,y,z), mm | Result |
| ---: | ---: | ---: | --- | --- | --- |
| 100 | 0 | +0.050000 | None | (240, 0, 0) | Transmitted; selected velocity matched |
| 150 | -1.017915 | -0.967915 | Lower exit wall, 3.226028439 | (35.5, -1.017915, 0) | Rejected: exit slit collision |
| 200 | -2.276602 | -2.226602 | Lower exit wall, 3.236460841 | (35.5, -2.276602, 0) | Rejected: exit slit collision |
| 240 | -2.031768 | -1.981768 | Lower exit wall, 3.238889544 | (35.5, -2.031768, 0) | Rejected: exit slit collision |

For 100 km/s the particle exits the rear face at (44.5,0,0) mm at t=3.245 µs, with 0.05 mm vertical and 75 mm depth clearance throughout. It retains (100000,0,0) m/s, reaches x=240 mm at t=5.2 µs and remains held there until Replay.

The other three are outside the new opening on arrival at its **front face**. No earlier plate or entrance collision occurs. They retain their incident velocity at contact; the trail stops at that contact and no downstream segment is emitted. Their uniform-field maximum y values, 13.0496, 26.0992 and 36.5389 mm, remain below the upper plate at 115 mm.

For comparison only, the unobstructed tangent would give the following coordinates. These are **projections, not visited points after a collision**:

| v0 | y at wall centre (mm) | y at rear (mm) | Whole-channel projected minimum clearance (mm) |
| ---: | ---: | ---: | ---: |
| 100 | 0 | 0 | +0.050000 |
| 150 | -3.348010 | -5.678105 | -5.628105 |
| 200 | -5.383269 | -8.489935 | -8.439935 |
| 240 | -4.973296 | -7.914824 | -7.864824 |

The wide baseline transmitted all four. The new rejections follow solely from intersecting the enlarged upper/lower **solid wall portions** surrounding the smaller opening.

## Velocity sweeps and rejection definition

The production sweep builds each complete physical trajectory, finds its first event and retains field-end state, aperture-face projections/clearance where reachable, actual collision state, endpoint and sample count. Compact analytical segments and their exact endpoints determine the full continuous trajectory; redundant full trail arrays are not duplicated in the CSV. A blocked trajectory is not extrapolated as actual motion.

An independent reference in `scripts/selector-narrow-reference.mjs` uses the textbook formulas and partitions time at analytical derivative-zero points. It enumerates rectangular surface contacts, chooses the earliest, and separately solves field-free wall/channel intersections. It is audit code and is never imported by the application.

| Outcome in 1001-speed sweep | 28 mm baseline | 0.10 mm opening |
| --- | ---: | ---: |
| Passes through aperture, including selected speed | 310 | 1 |
| Solid exit-wall collision | 210 | 519 |
| Plate collision | 460 | 460 |
| Entrance-wall collision | 16 | 16 |
| Bypasses finite wall, misses aperture, no collision | 5 | 5 |
| Off-speed physical-collision rejection | **686/1000 = 68.6%** | **995/1000 = 99.5%** |
| Off-speed aperture exclusion, including bypasses | 691/1000 = 69.1% | 1000/1000 = 100% |

The conservative rejection figure counts **actual collisions only**. The five noncolliding bypasses are not silently treated as wall impacts. On the 1 km/s grid, the only aperture transmission is 100 km/s; before narrowing, integer speeds 26–335 km/s transmitted.

Production and independent reference agree on every one of the 1001 narrow-aperture outcomes. Maximum endpoint-coordinate difference is **6.644e-13 m**, and maximum terminal-time difference is **3.097e-18 s**. The largest coordinate difference occurs in a highly inclined bypass ray, not in an aperture-clearance ambiguity. This agreement is evidence for the tested settings, not a universal physical guarantee.

### Fine passband and remaining off-speed transmission

A 98–102 km/s scan at **0.001 km/s (1 m/s)** spacing finds passing samples from **99.311 to 100.721 km/s**, inclusive. Bisection of the clearance transitions gives the open interval:

```text
99.3108989095 < v0 < 100.7218590870 km/s
full bandwidth ≈ 1.4109601774 km/s
detuning from selected speed ≈ -0.68910109% to +0.72185909%
```

Boundary figures are numerical estimates; exact contact is excluded. Of the 4001 fine samples, 1411 transmit, including 100 km/s. This local distribution therefore has a much lower rejection fraction (2590/4000 = 64.75% for off-selected samples) than the specified broad sweep. That is expected and demonstrates why the 99.5% broad-sweep result must not be generalized to every input distribution.

| Off-selected example | y front (µm) | y rear (µm) | Minimum vertical clearance (µm) | Actual downstream y at x=240 mm |
| ---: | ---: | ---: | ---: | ---: |
| 99.5 km/s | -36.059109 | +1.554512 | +13.940891 | +0.818606 mm |
| 100.5 km/s | +34.892334 | -3.131178 | +15.107666 | -0.829086 mm |

These particles really fit the opening and retain their small transverse exit velocities. Their off-selected status does not cause rejection.

A further independent scan over **0–1000 km/s at 0.01 km/s** spacing found **no separate secondary aperture-transmission band**. This is a measured search resolution, not a proof excluding arbitrarily narrow sub-grid bands or other particle/field settings.

On that denser global grid, 99,322/100,000 off-selected samples hit material (**99.322% physical-collision rejection**); 140 transmit through the narrow aperture and 538 bypass the finite wall. Thus the design exceeds the target on this additional broad grid as well, while still allowing the real near-selected passband. Sampled bypass speeds span 335.30–340.67 km/s at this 0.01 km/s resolution.

### Return to axis and finite-wall bypasses

At integer gyroperiods the uniform-field trajectory returns to y=0 with vy=0, while vx returns to its original launch speed. That is not the same as matching E/B. The fixed 30 cm field length is 3.65884475 drift distances rather than an integer; the remaining gap is field-free. The analysis uses the first field exit and its tangent instead of continuing crossed-field oscillation through the wall. No selector-length adjustment was made to remove returns.

The 336–340 km/s coarse-grid particles leave the field on an upward, shallow-forward tangent. By the exit slab, they are above its finite y=115 mm outer extent. They miss the aperture but hit no material. With the analyser off they now continue straight to x=240 mm, at y≈2.9521, 1.9330, 1.5541, 1.3411 and 1.2000 m, respectively. The status says **“Missed aperture: bypassed exit wall”**, collision metadata is null, and no invisible upper wall is introduced. This is a distinct escape path, not a secondary aperture passband.

Previously such a ray ended at the rear slit plane despite having no physical collision. The sweep exposed that artificial stopping point. Downstream continuation now depends on **absence of collision**, while `passes` continues to mean actual passage through the aperture. If the analyser is enabled, a noncolliding ray entering its existing ideal field region follows its analytical magnetic motion; its field illustrations follow the actual analyser samples.

## Screenshots and numerical artifacts

Fresh same-viewport 3D Perspective and 2D before/after captures are under `artifacts/selector-ultra-narrow/`:

| Speed | Before 3D | After 3D | Before 2D | After 2D |
| ---: | --- | --- | --- | --- |
| 100 | [before](artifacts/selector-ultra-narrow/before-100-3D.png) | [after](artifacts/selector-ultra-narrow/after-100-3D.png) | [before](artifacts/selector-ultra-narrow/before-100-2D.png) | [after](artifacts/selector-ultra-narrow/after-100-2D.png) |
| 150 | [before](artifacts/selector-ultra-narrow/before-150-3D.png) | [after](artifacts/selector-ultra-narrow/after-150-3D.png) | [before](artifacts/selector-ultra-narrow/before-150-2D.png) | [after](artifacts/selector-ultra-narrow/after-150-2D.png) |
| 200 | [before](artifacts/selector-ultra-narrow/before-200-3D.png) | [after](artifacts/selector-ultra-narrow/after-200-3D.png) | [before](artifacts/selector-ultra-narrow/before-200-2D.png) | [after](artifacts/selector-ultra-narrow/after-200-2D.png) |
| 240 | [before](artifacts/selector-ultra-narrow/before-240-3D.png) | [after](artifacts/selector-ultra-narrow/after-240-3D.png) | [before](artifacts/selector-ultra-narrow/before-240-2D.png) | [after](artifacts/selector-ultra-narrow/after-240-2D.png) |

Raw references and browser endpoints: [`before.json`](artifacts/selector-ultra-narrow/before.json), [`after.json`](artifacts/selector-ultra-narrow/after.json). Per-speed event/clearance records: [`before-sweep.json`](artifacts/selector-ultra-narrow/before-sweep.json), [`after-sweep.json`](artifacts/selector-ultra-narrow/after-sweep.json), and matching `*-sweep.csv`. Near-selected and global fine samples: `before-fine.json` and `after-fine.json` in the same folder. Projection values in the reference capture are hypothetical beyond a recorded wall collision; its `beam.end` and frame states are the actual terminal coordinates.

The browser matrix adds `matrix-{desktop,mobile}-{dark,light}-{speed}-{2D,3D}.png` and corresponding JSON. Additional captures cover 99.5/100.5 km/s genuine off-speed transmission, a 337 km/s wall bypass, a 1000 km/s exit-wall impact, and entrance/grazing contacts. Perspective occludes portions of the true trail behind the equipment; the accompanying 2D views provide the unobstructed comparison.

The legacy audit's original committed baseline was recaptured separately from an isolated `8f7b609` snapshot after the legacy recorder initially refreshed its default before folder. This task's fresh before screenshots and sweep were captured from the live uncommitted wide-aperture application **before** narrowing; they are not reconstructed from the commit.

## Regression checks

| Check | Result |
| --- | --- |
| `npm test` | **121/121 passed**, 9 files |
| Exact Lorentz motion | Existing signs, straight paths, trochoids, cycloidal cusps, loops, period and drift tests retained |
| Geometry and contact | 0.10 mm opening, unchanged 28 mm entrance, full-thickness clearance, both signs, exact edge, depth, grazing inner-surface and first-contact tests pass |
| High-speed / timestep | 10^9 m/s ray-helper contacts and physical 1000 km/s electric-only wall impact; large playback jumps retain exact terminal point |
| True off-speed transmission | Near-selected passband and constant-velocity downstream tangents pass; no speed gate |
| Bypass behavior | Five finite-wall misses continue downstream without an invented collision; analyser continuation also tested |
| `npm run build` | TypeScript and production build pass; existing Three.js chunk-size warning remains |
| Focused browser aperture suite | **5/5 passed**, including actual SVG size ratios, four-speed desktop/mobile dark/light matrix, genuine off-speed transmission, wall bypass and high-speed impact |
| Full browser suite | 105 scenarios executed: **103 passed; 2 existing timing assertions failed**. Both corrected scenarios then passed **3 consecutive reruns each (6/6)**; see below. |
| 3D Replay assertion verification | **3/3 consecutive repeats passed** with the same source/time-zero/trail reset observation |
| `git diff --check` | Passed; normal Windows LF/CRLF notices only |

Old tests that assumed 99/101 km/s or 150/200/240 km/s transmission through the wide slit were updated to the physical narrow-opening result. The analyser transverse-entry regression now uses genuinely admitted 99.9/100.1 km/s beams. The grazing electric-only case uses E=0.1 V/m rather than 28 V/m, preserving an impact **inside** the smaller channel rather than turning that test into a front-face hit. Loop playback tests locate a real vx<0 frame rather than assuming the same playback fraction after the flight has become shorter.

An initial unit run exposed these obsolete wide-opening expectations, plus a component-test timeout while the expensive fine audit competed for CPU. After the expectations were updated, all 121 tests passed without increasing timeouts. The first browser run was interrupted when preparing the isolated evidence snapshot triggered a Windows Vite watcher `EBUSY` error, followed by connection refusals. The server was restarted and the entire browser suite rerun with the application code unchanged. These interrupted attempts are not represented as successful validation.

A subsequent in-progress run was intentionally stopped after the small SVG coordinate-rounding discrepancy was identified. After correcting polygon precision, the five focused browser scenarios passed, unit/component tests and the production build were rerun, and a fresh final full-suite run was started. Only the final completed run is counted as full-suite validation.

That complete run took 15.3 minutes and passed 103 scenarios. Two test synchronization assumptions failed: the mobile camera test read a newly mounted WebGL summary before the first frame had populated `data-position`; the 2D Replay test required its later read to occur within 200 ms, but playback had legitimately advanced to 266.636 ms. The former now waits for the same exact expected coordinate. The latter observes the actual reset to elapsed time zero, source position and a cleared trail, rather than assuming a host-response deadline. These are stronger observable-state checks, not relaxed physical tolerances; no application code was changed to address the timing failures. Both corrected cases passed three consecutive repeats each (**6/6**, 2.8 minutes), recorded in `artifacts/selector-ultra-narrow/timing-reruns.json`. The same new Replay assertion also passed **3/3 3D repeats** (1.3 minutes), recorded in `3d-replay-reruns.json` in that folder. Full results are preserved in `artifacts/selector-ultra-narrow/full-browser-tests.json`, with the initial error contexts alongside. Thus all 105 distinct scenarios have passed against the final application across the full run and targeted reruns; this is **not** represented as a single uninterrupted 105/105 green run.

## Files changed for this request

- `src/lib/physics/magnetism/selector-geometry.ts`: separate entrance/exit half-heights and physically narrow exit blocks.
- `src/lib/physics/magnetism/trajectories.ts`: retain entrance width and continue noncolliding finite-wall bypasses downstream.
- `src/lib/physics/magnetism/visualization.ts`: truthful noncollision bypass status.
- `src/components/magnetism/content.ts`: actual exit height and centred alignment in the existing educational note.
- `src/components/magnetism/Scene.tsx`: preserve full projected precision for physical solid polygons instead of rounding away part of the ultra-narrow gap.
- `src/components/magnetism/three/Models.tsx`: correct endpoint label for bypass observation/analyser motion.
- `src/components/magnetism/three/ParticleMotion.tsx`: analyser field illustration follows actual analyser motion, including a noncolliding bypass.
- `src/lib/validation/{selector-motion.test.ts,browser-regressions.test.ts,selector-exit-audit.test.ts}`: update physical admission and entrance/exit distinctions.
- `src/lib/validation/selector-ultra-narrow.test.ts`: new full sweep, geometry, finite passband, bypass and high-speed regressions.
- `e2e/{selector-exit-audit.spec.ts,selector-root-cause.spec.ts,selector-single-flight.spec.ts,selector-motion.spec.ts}`: narrow-opening outcomes, pass/bypass/impact matrix, realistic grazing and loop timing, preserved playback checks and state-based synchronization for camera/Replay assertions.
- `scripts/selector-exit-audit.mjs`: optional evidence-folder and local-URL arguments to separate before/after evidence.
- `scripts/selector-narrow-reference.mjs`, `scripts/selector-ultra-narrow-audit.mjs`: independent exact event reference, production sweep and fine-band evidence.
- `VELOCITY_SELECTOR_ULTRA_NARROW_EXIT_APERTURE_REPORT.md`: this report.

The pre-existing `Scene.tsx` changes are retained with the precision correction added. `ThreeScene.tsx` and the earlier audit report remain uncommitted and preserved. No unrelated experiment or mechanical/field model was refactored. Generated evidence and the isolated historical source are under the existing ignored `artifacts/` directory.

## Limits and remaining verification

The figures apply to protons, the stated E/B settings, fixed apparatus and specific velocity grids. No universal rejection guarantee is made for other masses, charge signs, field strengths, velocity distributions or sub-grid bands. The model retains ideal uniform sharp-edged fields, no fringe fields, point particles and nonrelativistic dynamics. It does not model finite beam emittance, scattering, space charge, radiation or realistic electrode fabrication.

Motion is planar; depth clearance is enforced, but arbitrary 3D launches are not added. The particle starts at the entrance slab centre rather than being transported through the decorative source. The x=0.240 field-free plane is an observation endpoint, not a finite sensitive detector. Pixel-scale rendering cannot resolve a 0.10 mm gap at every camera distance; analytical coordinates and shared physical solids establish clearance, not the enlarged glyph or anti-aliasing. Browser checks use local Chromium viewport/touch emulation, not physical devices, other browser engines or a deployed site.

## Git state

Work remains on `master` with the initial uncommitted audit changes plus the files listed above. No initial changes were discarded. No commit, push or deployment was performed.

Final `git status --short`: **12 modified tracked files and 9 untracked files**, all unstaged. HEAD remains `8f7b609dcd8e8503ad4030f8f55c112cb10744c1`. The untracked files are the previous and new audit reports; `e2e/selector-exit-audit.spec.ts`; the three `scripts/selector-{exit-audit,narrow-reference,ultra-narrow-audit}.mjs` files; `src/lib/physics/magnetism/selector-geometry.ts`; and `src/lib/validation/selector-{exit-audit,ultra-narrow}.test.ts`. Tracked changes are the component/physics/test files enumerated above, plus the preserved earlier `ThreeScene.tsx` diagnostics change. Generated artifacts remain ignored.

## Explicit answers

- **Does 0.10 mm reject most off-speed particles?** Yes for the required sweep: 99.5% hit material.
- **Measured rejection?** 995/1000 off-speed physical collisions. Aperture exclusion is 1000/1000 on the 1 km/s grid; these are different metrics.
- **Four reference velocities correct?** 100 passes; 150/200/240 hit the real lower exit-wall face after unchanged field trajectories.
- **Selected velocity still passes?** Yes, y=z=0 with +50 µm vertical and +75 mm depth clearance through the complete channel.
- **Physically justified outcomes?** The independent exact surface-event reference agrees with all 1001 production outcomes, including contact times and endpoints, within the stated floating-point differences.
- **Remaining off-speed escape?** Yes: genuine near-selected aperture passage in the measured 99.310899–100.721859 km/s band, and noncolliding finite-wall bypasses such as 336–340 km/s. Neither is artificially rejected.
