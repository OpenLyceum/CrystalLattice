# CrystalLattice functional review — 2026-10-31

**Resolution:** all six findings were subsequently fixed at the user's request. Original
reproductions and baseline checks are retained below; implementation and fix validation follow.

Reviewed `main` at `82e07420d41b99a49a99959c58b4ae553aadcc8e`. The checkout was clean and
`git pull --ff-only` reported **Already up to date**. CrystalLattice has not previously been
reviewed in this conversation; its older fleet review and existing regression tests were read
as background, rather than reported again as new findings.

Applied Baton's `scenerystack-code-review`, its functional-review reference, and testing guidance.
Scope: all five screens, Bravais classification and snapping, hard-sphere packing and density,
Miller presets and handle input, hand placement, diffraction sampling, reset, localization startup,
and baseline automated checks. This is a targeted functional review, not release sign-off.

Runtime: WSL distro `Ubuntu-24.04` (Ubuntu 26.04.1), Node **v26.13.0**, Chromium through Playwright.

## Original findings (all resolved)

### 1. [P2] A square lattice is classified as oblique when its primitive basis is skewed

Location: `src/common/model/Lattice2D.ts:240–266`, especially the non-centred branch at 248.

The non-centred classifier tests the supplied vector lengths and included angle directly. Only
the centred branch first reduces the basis, although either description can use non-reduced
primitive vectors. The result describes the chosen parallelogram rather than the lattice type.

Reproduced by dragging the actual two vector handles to approximately:

- a1 = 0.200000 nm;
- a2 = 0.282843 nm;
- gamma = 45.000007 degrees;
- second atom at cell centre off.

The displayed lattice type is **Oblique**. In the exact case, the primitive vectors are
u = (0.2, 0), v = (0.2, 0.2). Replacing v by v − u = (0, 0.2) is an integer basis change
with determinant 1, so the points are exactly the square lattice with 0.2 nm spacing. The
existing coordination and packing routines already reduce this basis and give **4** and
**pi/4 = 0.785398**, respectively, contradicting the type label.

This is a lattice-type issue, independently of the simulation's deliberate tolerance bands:
the pointer-created values are far inside those bands around the exact square case. A Bravais
type is independent of the chosen unit-cell description; see the
[IUCr nomenclature report](https://www.iucr.org/who-we-are/commissions/commission-on-crystallographic-nomenclature/published-reports/bravais)
and [IUCr discussion of primitive bases](https://www.iucr.org/what-we-do/education/pamphlets/matrices-mappings-and-crystallographic-symmetry).

Classify the actual reduced lattice in both branches. Add equivalent-basis cases, including this
square example, to the pure-model regressions without changing the intended tolerances.

Evidence: `crystal-square-misclassified.png`; actual pointer and model probes in the session workspace.

### 2. [P2] “Snap to” does nothing for the initial Square choice and cannot reapply a choice

Location: `src/lattices-2d/view/Lattices2DScreenView.ts:124–125`; its view `reset()` is empty.

The combo Property starts at Square even though the model starts at an oblique lattice. Snapping
is performed only by `lazyLink`, which does not run when the same item is selected again. Reset
restores the model while leaving this separate view Property at its previous choice.

Actual-control reproductions:

1. On a fresh screen, open Snap to and activate **Square**. The menu closes, but the lattice stays
   at a1 = 0.300, a2 = 0.420 nm, gamma = 75 degrees, **Oblique**.
2. Select Rectangular, which works once. Edit a length, then select Rectangular again: its
   canonical snap is not reapplied.
3. Select Rectangular, press Reset All, then select Rectangular again. The lattice stays at
   the reset oblique state, although the selected choice still reads Rectangular.

Make each snap activation perform the action, including a repeated item, and keep the selector's
initial/reset presentation consistent with what it does. A source-only test of `snapParametersFor`
does not exercise this UI path.

### 3. [P2] Clamping a snap target silently changes its Bravais type at the length limit

Location: `src/lattices-2d/model/Lattices2DModel.ts:134–139` and
`src/common/model/Lattice2D.ts` (`snapParametersFor`).

Canonical Rectangular and Centred rectangular targets set a2 to 1.5 times a1, and Oblique sets
it to 1.4 times a1. `snapTo()` then clamps the two lengths independently to 0.15…0.50 nm,
destroying the ratio that identifies the selected target.

Reproduced with the actual first-length slider at End (**0.500 nm**) and the Snap to choices:

- Rectangular produces a1 = a2 = 0.500 nm, gamma = 90 degrees: **Square**.
- Centred rectangular produces those same cell dimensions with centring: **Square**.
- Oblique produces a1 = a2 = 0.500 nm, gamma = 75 degrees: **Centred rectangular**.

The control accepts the selected answer but constructs a different lattice. Fit the canonical
cell into the allowed range while preserving its ratios, for example by scaling both vectors
together. Test each snap target through the screen model at both length limits and after mixed
edits. This is separate from finding 2: changing the selected combo item still triggers this bug.

Evidence: `crystal-snap-clamp.png` shows Centred rectangular selected alongside the Square readout.

### 4. [P2] Activating a hand-placement slot can place a different shape from the selected palette tile

Location: `src/aperiodic-order/view/PlacementNode.ts:94–120`, especially the slot FireListener
at 120; compare the palette's selected-state binding at 139–145.

Every candidate shape is exposed as a slot at the same time. Its activation always places that
candidate's stored rhombus and never checks `selectedTileProperty`. The palette still sets
aria-pressed and says to select a shape then activate a slot. Every legal slot's accessible name
also promises to place **the selected tile**, without identifying the stored shape.

Actual keyboard reproduction from a fresh hand-placement board:

1. Choose **Place by hand**.
2. Activate **Thin rhombus; drag it onto a slot, or select it and activate a slot**.
3. Activate the third legal-slot button in traversal order.
4. The palette selection remains `thin`, but the patch becomes `[thick, thick]`: the newly
   placed tile is Thick, and the quantities readout reports two thick and zero thin tiles.

The legal candidate types on the seed board start `thin, thin, thick, ...`, so this reproduction
uses a real mismatched slot rather than an injected model candidate. Pointer drag filters
candidates by shape in `dropAt()`, making the keyboard/click-slot path inconsistent with drag.

Ensure slot activation honors the armed shape, or redesign and label the slots so each is an
explicit independent shape choice. Keep legality feedback and a working keyboard path. Test
both palette shapes against opposite-shape candidates as well as matched placements.

Evidence: `crystal-wrong-palette-tile.png` and the control probe's selected/placed shape output.

### 5. [P2] Direction mode displays interplanar spacing from a hidden, previously selected plane

Location: `src/miller-indices/view/MillerIndicesScreenView.ts`, quantities rows around 211–236.

The index and family rows follow the mode, but the interplanar-spacing row remains bound to
`spacingProperty`, which derives only from `planeIndicesProperty`. The advanced planar-density
row has the same dependency and is not gated by plane mode either.

Actual-control reproduction:

1. Activate **(100)** and then **[111]**. The direction is [111], while the visible spacing reads
   **0.4000 nm**.
2. Activate **(200)** and then **[111]**. The identical direction now accompanies **0.2000 nm**.

Neither number describes the displayed direction. It comes from the old hidden plane, with no
label naming that plane or explaining that the number belongs to a retained separate state.
Hide or mark plane-only quantities in direction mode, or explicitly present a defined related
plane and derive its values consistently. Cover switching modes from distinct previous planes.

Evidence: `crystal-stale-direction-spacing.png`; the scene-text probe confirms both visible values.

### 6. [P3] Direction-handle input bypasses the supported index bound and produces ambiguous notation

Location: `src/miller-indices/model/MillerIndicesModel.ts:181–185`, compared with the
`MAX_MILLER_INDEX` guard in `applyIndices()` at 193–194; `formatTriple()` joins indices without separators.

The model accepts directions from the handle after rationalizing each component, without the
index bound enforced by the other input path. Small moves can multiply the rational denominators
into an index triple well outside the documented magnitude limit of 4.

Actual keyboard reproduction at the default camera:

1. Activate **[111]**, focus the direction-tip PDOM target, and press Right once: **[5, 4, 4]**.
2. Press Up four times: **[8, 15, 4]**.
3. The display and equivalent-family label render this as **[8154]** and **<8154>** (with angle
   brackets drawn typographically), which no longer unambiguously denotes three indices.

The camera remains fixed, so this is the direction edit itself, not a rotation gesture. Choose
a bounded low-index approximation for handle input and retain unambiguous formatting if larger
indices are deliberately supported. Add actual handle/key-path coverage; checking only the
stand-alone parser or `applyIndices()` misses this path.

Evidence: `crystal-direction-range.png`.

## Initial review validation and evidence

- `npm run lint`: passed, 94 files checked, no fixes applied.
- `npm run check`: passed app, scripts and test TypeScript checks.
- `npm test`: **217 passed** in 8 files, including **13 memory/lifecycle checks**.
- `npm run build`: passed, production bundle and PWA with 15 precached entries.
- Fleet repository compliance and template drift: passed, including the compliance script's
  remote security-setting probes.
- `FUZZ_PORT=5251 FUZZ_SEED=938231 npm run test:fuzz:quick`: **2 passed**, pointer and keyboard,
  10 seconds per mode with assertions enabled. These passes do not establish the correctness of
  displayed classifications or selected-shape behavior.
- All five screens started in development and production preview with `?ea`; no page errors.
- Deterministic controls: snap selection/reselection/reset; upper-limit snaps; actual vector-handle
  pointer drags; palette/slot keyboard activation; Miller plane/direction presets and direction-tip
  arrow keys. The six findings above were reproduced without page errors.
- Pure 2D geometry sweep: **450** combinations of five lengths on each axis, nine angles and both
  centring states. Wigner–Seitz polygon area agreed with the independent input-cell determinant
  per lattice point to a maximum relative error of **8.89e-16**. Packing fractions stayed at or
  below **0.906900**. This checks geometry, not the faulty classifier.
- Loaded all **10** reference cubic metals. Computed densities agreed with independent
  n*M/(N_A*a^3) arithmetic using the table inputs; touching states did not report overlap.
  This is an equation/unit check, not independent certification of every tabulated datum.
- Close-packing axial-ratio endpoints **1.4** and **2.0** gave packing fractions **0.645258** and
  **0.604600**, matching the hard-sphere equations; both reported coordination 6 as documented.
- All five Miller plane presets gave the expected cubic spacing and family counts; negative-plane
  geometry remained drawable. The retained common-factor preset behavior was distinguished from
  the new mode/input defects above.
- Diffraction was finite for all six Penrose depths, all three hat depths and the periodic mode.
  The displayed Penrose symmetry was 10 at every depth; the periodic comparison was 4. Hat
  symmetry readouts were 1, 12, 1 across depths 0, 1, 2; these finite-patch estimator results were
  recorded, not independently certified as the symmetry of an infinite hat tiling.
- Captured English baseline and French/Spanish startup screenshots for all five screens.
  Inspected the baseline lattice/Miller/aperiodic layouts, focused reproductions, Spanish
  close-packing and French aperiodic examples.

## Scope and artifacts

The initial review changed no application sources, tests, dependencies or generated data and
made no commits, pushes or external issues. Fixes were subsequently authorized and are recorded below.

Session-workspace scripts: `crystal-review-probes.mjs`, `crystal-control-review.mjs`, and
`crystal-numerical-review.mjs`. The matching screenshots are saved beside them. The scripts use
Playwright against the local development/preview servers and inspect the real selected screen.

This review does not establish educator/manual screen-reader sign-off, complete runtime-locale
and extreme-string coverage, a DevTools heap comparison, or proof of the aperiodic generator and
symmetry estimator over all possible patches.

## Implemented fixes

1. Both centred and uncentred lattice descriptions go through basis reduction. Pure-model
   regressions cover sheared primitive bases for square, rectangular, hexagonal and centred
   rectangular lattices. A browser regression drags the real handles into the square example.
2. Five localized snap action buttons replace the stateful dropdown. Every press applies its
   target, including the first Square press, repeated presses after edits and presses after Reset.
   Accessible names name each action and target in English, French and Spanish.
3. Canonical snap lengths are uniformly scaled into the slider range, preserving their ratio.
   All five targets are checked through the screen model at the minimum, middle and maximum
   reference lengths, and through actual buttons at the upper bound.
4. The complete candidate cache remains available, while `selectedCandidatesProperty` filters the
   visible/activatable slots by the armed shape. Counts and summaries follow those visible slots,
   and `placeTile()` rejects a mismatched shape. Feedback distinguishes a shape without a legal
   slot from a true dead end for both shapes. Browser tests select and place both shapes, check
   pressed state and slot counts, and undo the resulting placement.
5. Interplanar spacing, advanced planar density and the (200) note are visible only in plane mode.
   A browser test changes the retained plane, switches to the same direction, and returns to plane
   mode with the correct retained spacing restored.
6. Direction-handle input chooses the closest primitive triple by angle within the ±4 bound.
   Small keyboard moves accumulate an unsnapped target so repeated keys cross snap boundaries;
   mode changes, presets, Reset, camera changes and pointer input restart that target. Generic
   multi-digit index formatting uses separators, preserving parser round trips. Model and actual
   direction-tip keyboard regressions cover the bound, movement and reset.

Developer and educator documentation records these contracts. No dependency files, generated
data or template-owned infrastructure were changed.

## Fix validation

- Added **26 unit regressions**. Before application changes, **11** focused regression cases
  failed against the original implementation; the focused suite and the full suite now pass.
- `npm run lint`: passed, 98 files checked, no fixes needed. App/scripts/test type checks passed.
- `npm test`: **243 passed** in 11 files, including all **13 memory/lifecycle checks**.
- `FUZZ_PORT=5251 npx playwright test tests/browser`: **9 passed**, assertions enabled.
- `FUZZ_PORT=5251 FUZZ_SEED=938231 npm run test:fuzz:quick`: **2 passed**, pointer and keyboard,
  10 seconds per mode, assertions enabled.
- `npm run build`: passed production and PWA generation, 15 precached entries.
- Fleet repository compliance and template drift checks passed.
- Captured and inspected the revised snap panel in English, French and Spanish, a correctly
  placed Thin tile, and direction mode with bounded indices and no plane-only rows. The snap
  panel fits alongside its overlay controls in all three languages. No page errors occurred.
  Artifacts: `crystal-fixed-snap-{en,fr,es}.png`, `crystal-fixed-palette.png` and
  `crystal-fixed-direction.png`; capture helper `crystal-fix-visuals.mjs` in the session workspace.
