# Magnetism Lab — WebGL upgrade and verification

Implemented locally on 19 October 2026. Actual development URL: **http://127.0.0.1:5173/**, opened directly with Playwright Chromium. No commit, push, or deployment was performed. The earlier SVG audit remains in [BROWSER_VALIDATION.md](BROWSER_VALIDATION.md).

## Scope and retained functionality

**All six 3D tabs now use Three.js, React Three Fiber, and Drei.** These are perspective WebGL scenes with actual meshes, lighting, depth testing, materials, orbit, zoom, pan, and camera presets. They are not SVG perspective drawings. The existing SVG 2D scenes and compatible orthographic 3D renderer remain intact. Compatible view is selectable in the scene or with `?renderer=svg`; unavailable or lost WebGL automatically falls back.

The six tabs retain their controls, SI readouts, equations, graphs, guided experiments, CSV measurements, and all 24 challenge templates. No curriculum identifiers were added. There is one parameter state per tab, shared by both renderers and the educational panels. Camera and quality settings affect presentation only.

## Per-tab browser results

| Tab | Upgraded 3D content and verified behavior | Preserved 2D and remaining physical limitations |
| --- | --- | --- |
| **Magnetic Fields** | Real bar magnet, copper wire, circular coil, helical solenoid and Earth model. Spatial field paths, animated directional dots/arrows, a gimballed compass, and a probe draggable in XY/XZ/YZ planes. All five sources, signed/zero current, turns/radius/length/rotation, probe depth, compass movement, graph/readout synchronization, and four challenges exercised. | SVG retained. Field paths are finite samples of the same idealized field used by the probe. Bar field is an external softened dipole; coil/finite-solenoid fields use the existing quadrature. Symmetry reuses integrated meridians. Paths can end at the drawing boundary and are not an engineering solver. Winding count and field-line density are schematic; moving dots indicate direction, not propagation. |
| **Resultant Fields** | Copper conductors with current arrows and spatial circular fields; independently draggable wires and P; B₁/B₂/net vectors use a common scale. Midpoint cancellation, current reversal, signed superposition, graph/measurement behavior and four challenges checked. | SVG retained. Ideal infinite wires with the existing regularized 2 mm core. Wire/P dragging uses the XY plane; depth translation along an ideal infinite wire does not change its calculated field. |
| **Moving Charges** | Exact straight, circular and helical trajectories; proton/electron/configurable ions; live velocity/force vectors and uniform B direction; observer/follow camera; persistent trail within the mounted 3D view; play, pause, step and slow motion. Charge sign, field reversal, parallel/antiparallel launch, zero B, zero speed, all numerical ranges, graph and four challenges checked. | SVG retained. Classical analytic uniform-field motion with intentionally slowed/looping playback and enlarged particles. Vectors have independently scaled lengths. No collisions, radiation or relativistic effects. |
| **Motor Effect** | Real poles, conductor and signed current/field/force arrows. Translucent poles expose the conductor. Reversing I/B, active length, angle, exact zero-force states, graph, measurements and four challenges checked. | SVG retained. Force is quantitative. **WebGL conductor is fixed:** there is no simulated mechanical displacement. The earlier SVG animation remains an illustrative direction cue, without mass, damping or a suspension model. |
| **Parallel Wires** | Real copper wires, current circulation and equal/opposite force arrows; visible wire length follows its control. Attraction/repulsion, separation scaling, signed/zero currents, length, graph, measurements and four challenges checked. Maximum wire length receives an expanded frame. | SVG retained. Forces use ideal long-wire equations. **WebGL wire centres stay fixed.** SVG displacement remains illustrative; the specified separation determines the force. |
| **Velocity Selector** | Source, charged plates, entrance/exit apertures, crossed-field region, optional magnetic analyser, detector/impact marker, analytic beam motion and instantaneous electric/magnetic/net force vectors. Balanced beams for either sign, rejection, zero fields, mass/charge/speed ranges, analyser force boundaries, graph and four challenges checked. | SVG retained. Motion stays in the physically appropriate plane inside the 3D apparatus. Exact hard-boundary field model; no fringe fields, collisions or space charge. Analyser motion preserves both exit-velocity components. The radius readout remains the **design** radius at E/B, not an off-design beam's actual radius. |

## Physics and regression evidence

- **73 unit/component tests pass**, including all original 55 and 18 new rendering/physics regressions. New checks compare spatial streamline tangents against the actual B field, verify reversal/zero-current behavior, preserve magnetic-only speed, match every selector stage against the validated beam samples, enforce exact balanced net-force arrows, and retain probe depth in graph calculations.
- **87 browser tests pass:** the existing **41 regressions** are retained against the compatible SVG renderer, with **46 WebGL/state tests** added. These include the same 24 challenge cases shared through one test helper, true camera interaction, all parameter ranges, touch gestures, both themes, responsive layouts, fallback, intentional context loss, renderer-state continuity and zero-vector DOM-label visibility. The full run records 87 expected results, zero failures, zero skipped tests and zero flaky tests in [the machine-readable results](artifacts/browser-audit/tests.json). Camera/responsive checks were also rerun after annotation refinements.
- TypeScript checking (`tsc -b`) and the Vite production build pass. The main application bundle is approximately **300 kB / 95 kB gzip**; the lazy WebGL chunk is approximately **937 kB / 255 kB gzip**. Vite reports its normal large-chunk advisory for the graphics engine.
- Changes to the physics engine were avoided. Rendering helpers use the existing SI fields, analytic particle functions and validated selector equations. Selector net force factors out q before subtraction to avoid a spurious residual arrow at E = vB. Spatial graph sampling now preserves probe z.

## Browser and interaction coverage

Desktop 1536 px, tablet 820 px and phones 390/320 px were exercised, alongside the preserved SVG suite's additional widths. Screenshots cover every tab in Perspective, Top, Side, Front and 2D; all five field sources; helical motion; the analyser; and responsive scene/full-page views. See the [visual gallery](artifacts/webgl/gallery.html) and [screenshot directory](artifacts/webgl/).

Tests verify real camera-position/target changes under mouse orbit, wheel zoom, right-drag pan, keyboard orbit/pan/zoom/reframe, and phone touch orbit/pinch/pan. Probe dragging and depth movement use the same state as the readouts and graph. Layout checks look for page overflow and clipped equations/readouts/control rows. Axe checks cover WCAG 2 A/AA and 2.1 AA in both themes; these supplement the explicit keyboard/touch tests and do not constitute a full accessibility certification.

No application console errors or unexpected WebGL failures were observed in completed sweeps. Unsupported-WebGL and deliberately lost-context cases retain a usable SVG scene. Chromium's software GPU can emit a readback-stall warning when screenshots are taken; this is distinct from an application exception.

## Performance comparison

Measured sequentially with Chromium headless, 1536 × 1100, DPR 1, local development server, 120 animation-frame intervals after warmup. The GPU identifies as **ANGLE / Vulkan SwiftShader**, a software renderer. These numbers are not a hardware-GPU or physical-phone guarantee. Scenes use the solenoid, a 45° helix, and a 20 u analyser ion for the relevant tabs.

| Tab | Retained SVG 3D FPS | WebGL High FPS | WebGL Economy FPS |
| --- | ---: | ---: | ---: |
| Magnetic Fields (solenoid) | 60.0 | 36.4 | 59.5 |
| Resultant Fields | 60.0 | 56.3 | 60.0 |
| Moving Charges | 60.0 | 60.0 | 60.0 |
| Motor Effect | 60.0 | 60.0 | 60.0 |
| Parallel Wires | 60.0 | 60.0 | 60.0 |
| Velocity Selector | 60.0 | 55.8 | 60.0 |

Field tubes are merged, arrows/directional markers are instanced, pixel ratio is capped, and Economy reduces path tessellation/density and disables shadows. Auto starts in Economy on narrow screens and can reduce quality below 45 FPS; it never changes scientific calculations. Paused scenes render on demand. Animation updates Three objects without forcing React state updates every frame. No remote model/font/texture assets are required.

Across four complete tab-switch cycles in each WebGL quality setting, the returned solenoid scene stayed at **19 geometries, 1 texture, 1 canvas and 5 DOM overlays**, with no monotonic growth. This bounds the tested resource lifecycle; it is not proof against every possible long-running leak. Declarative Three resources are disposed on removal; custom merged/trail geometry and materials have explicit cleanup. Raw timings, draw calls, triangle counts and stability samples: [performance.json](artifacts/webgl/performance.json). Reproduce with `node scripts/webgl-performance.mjs` while the dev server is running.

## Remaining limits

- Only installed Chromium was tested. Tablet/phone checks are emulated; Safari, Firefox, physical touch devices and hardware-GPU performance remain unverified.
- High quality is measurably slower than SVG on this software GPU, especially the solenoid. Economy reaches approximately 60 FPS without changing physics. First use must load/compile the graphics engine and shaders; the lazy chunk remains substantial.
- Camera/quality settings and accumulated visual trail history restart when the WebGL renderer is remounted after a dimension/fallback switch. Parameters and the simulation clock remain shared. Trails persist across playback cycles while that view stays mounted.
- Field-line density, vector lengths, particle/conductor sizes, displayed windings and playback speed are presentation scales, not additional quantitative measurements. Probe values, equations, graphs and challenge checking supply the physical quantities.
- Axes and grid are orientation guides, not calibrated metre rulers.
- SVG 2D is an XY projection. A nonzero spatial-probe depth is explicitly noted, with a depth-reset control.
- End-on views naturally flatten some trajectories or superimpose spatial annotations; orbit or another preset separates them. The compact field-scene handle C is the compass, with its full accessible name and tooltip retained.

## Final execution record

Final combined browser sweep: **87 passed**. Unit/component tests: **73 passed**. TypeScript and production build: **passed**. Final camera/responsive reruns: **passed**. The built production bundle passed all six tabs in both WebGL and SVG 2D without console errors at **http://127.0.0.1:5174/**; see [production-smoke.json](artifacts/webgl/production-smoke.json). No publishing actions authorized or performed.

Both owned preview servers were stopped after verification. Reopen the laboratory with `npm run dev` and use Vite's printed Local URL.
