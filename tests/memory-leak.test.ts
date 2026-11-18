/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate pattern).
 *
 * Creates a disposable model object inside a function boundary, disposes it, forces
 * garbage collection via global.gc (--expose-gc in vitest.config.ts), then asserts via
 * WeakRef that the object was collected. V8 requires a function boundary (not merely
 * a block scope) so local strong references die when the helper returns.
 *
 * Every screen model here builds a web of DerivedProperties over its own
 * Properties, which is exactly the shape that leaks if a link is left dangling —
 * so each of the five gets a cycle.
 */

import { KeyboardDragDirectionToKeyStringPropertiesMap } from "scenerystack/scenery";
import { describe, expect, it } from "vitest";
import { AperiodicOrderModel } from "../src/aperiodic-order/model/AperiodicOrderModel.js";
import { DiffractionNode } from "../src/aperiodic-order/view/DiffractionNode.js";
import { PlacementNode } from "../src/aperiodic-order/view/PlacementNode.js";
import { TilingNode } from "../src/aperiodic-order/view/TilingNode.js";
import CrystalLatticeColors from "../src/CrystalLatticeColors.js";
import { ClosePackingModel } from "../src/close-packing/model/ClosePackingModel.js";
import { LayerStackNode } from "../src/close-packing/view/LayerStackNode.js";
import CrystalLatticeHotkeyData from "../src/common/CrystalLatticeHotkeyData.js";
import { CubicStructure } from "../src/common/model/CubicCell.js";
import { AtomNode } from "../src/common/view/AtomNode.js";
import { CubicSystemsModel } from "../src/cubic-systems/model/CubicSystemsModel.js";
import { CubicCellNode } from "../src/cubic-systems/view/CubicCellNode.js";
import { StringManager } from "../src/i18n/StringManager.js";
import { Lattices2DModel } from "../src/lattices-2d/model/Lattices2DModel.js";
import { Lattice2DNode } from "../src/lattices-2d/view/Lattice2DNode.js";
import { MillerIndicesModel, MillerMode } from "../src/miller-indices/model/MillerIndicesModel.js";
import { MillerCellNode } from "../src/miller-indices/view/MillerCellNode.js";
import { describeDisposalLeaks, expectNoListenerGrowth, forceGC } from "./helpers/memoryLeak.js";

/** The five screen models, each with a factory that exercises it before release. */
const MODEL_FACTORIES: ReadonlyArray<{ name: string; create: () => { reset: () => void } }> = [
  { name: "Lattices2DModel", create: () => new Lattices2DModel() },
  { name: "CubicSystemsModel", create: () => new CubicSystemsModel() },
  { name: "ClosePackingModel", create: () => new ClosePackingModel() },
  { name: "MillerIndicesModel", create: () => new MillerIndicesModel() },
  { name: "AperiodicOrderModel", create: () => new AperiodicOrderModel() },
];

/**
 * Builds a model, drives it once through reset(), and returns a WeakRef to it.
 * The model itself never escapes this function, so nothing but a leak can keep
 * it alive past the return.
 */
function createAndReleaseModel(create: () => { reset: () => void }): WeakRef<object> {
  const model = create();
  model.reset();
  return new WeakRef<object>(model);
}

describe("Memory leak regression", () => {
  for (const { name, create } of MODEL_FACTORIES) {
    it(`${name} is collected after release`, async () => {
      const ref = createAndReleaseModel(create);
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });
  }

  it("repeated create/release cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 5; i++) {
      for (const { create } of MODEL_FACTORIES) {
        refs.push(createAndReleaseModel(create));
      }
    }
    await forceGC(refs);
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });

  it("double reset() does not throw", () => {
    for (const { create } of MODEL_FACTORIES) {
      const model = create();
      model.reset();
      expect(() => model.reset()).not.toThrow();
    }
  });
});

// View nodes that link to longer-lived Properties. Shared screen models outlive
// every case so dispose() must unlink; AtomNode links to the shared color profile.
const SHARED_APERIODIC_MODEL = new AperiodicOrderModel();
const SHARED_MILLER_MODEL = new MillerIndicesModel();
const MILLER_A11Y = StringManager.getInstance().getMillerIndicesA11yStrings().controls;
const MILLER_STRINGS = StringManager.getInstance().getMillerIndicesStrings();

/** Sim-lifetime Properties a MillerCellNode links to: accessible names, track label, model state. */
const MILLER_LINKED_PROPERTIES = [
  MILLER_A11Y.interceptAStringProperty,
  MILLER_A11Y.interceptBStringProperty,
  MILLER_A11Y.interceptCStringProperty,
  MILLER_A11Y.directionHandleStringProperty,
  MILLER_A11Y.cellRotationStringProperty,
  MILLER_STRINGS.parallelSymbolStringProperty,
  SHARED_MILLER_MODEL.modeProperty,
  SHARED_MILLER_MODEL.planeIndicesProperty,
  SHARED_MILLER_MODEL.directionIndicesProperty,
  SHARED_MILLER_MODEL.showNormalProperty,
  SHARED_MILLER_MODEL.showFamilyProperty,
  // The orbit and handle KeyboardListeners' hotkeys derive from these.
  ...CrystalLatticeHotkeyData.ROTATE_VIEW.keyStringProperties,
  ...CrystalLatticeHotkeyData.STEP_INTERCEPT.keyStringProperties,
  ...CrystalLatticeHotkeyData.INTERCEPT_ENDS.keyStringProperties,
  ...CrystalLatticeHotkeyData.MOVE_DIRECTION_TIP.keyStringProperties,
];

/** Built the way MillerIndicesScreenView builds it, then driven through both modes. */
function createMillerCellNode(): MillerCellNode {
  const node = new MillerCellNode(SHARED_MILLER_MODEL, VIEW_SIZE, {
    accessibleName: MILLER_A11Y.cellRotationStringProperty,
    tagName: "div",
    focusable: true,
  });
  SHARED_MILLER_MODEL.modeProperty.value = MillerMode.DIRECTION;
  SHARED_MILLER_MODEL.modeProperty.value = MillerMode.PLANE;
  return node;
}
const PLACEMENT_BOARD_SIZE = 400;
const VIEW_SIZE = 400;
const ATOM_RADIUS = 10;

describeDisposalLeaks([
  { name: "AtomNode", create: () => new AtomNode(ATOM_RADIUS) },
  { name: "PlacementNode", create: () => new PlacementNode(SHARED_APERIODIC_MODEL, PLACEMENT_BOARD_SIZE) },
  {
    name: "DiffractionNode",
    create: () => new DiffractionNode(SHARED_APERIODIC_MODEL.diffractionProperty, VIEW_SIZE),
    keepAlive: () => [SHARED_APERIODIC_MODEL],
  },
  {
    name: "TilingNode",
    create: () => new TilingNode(SHARED_APERIODIC_MODEL, VIEW_SIZE),
    keepAlive: () => [SHARED_APERIODIC_MODEL],
  },
  {
    name: "MillerCellNode",
    create: createMillerCellNode,
    keepAlive: () => [SHARED_MILLER_MODEL, ...MILLER_LINKED_PROPERTIES],
  },
]);

describe("MillerCellNode", () => {
  it("leaves no listeners on string, accessible-name or model Properties", async () => {
    await expectNoListenerGrowth(MILLER_LINKED_PROPERTIES, () => {
      createMillerCellNode().dispose();
    });
  });
});

// ── Projected3DNode subclasses and the 2D lattice view ───────────────────────
// Each is built the way its ScreenView builds it (the 3D views with the
// rotation accessible name and focusable wrapper), then driven through a few
// rebuilds. The listener lists are the sim-lifetime Properties each node links to.

const SHARED_CUBIC_MODEL = new CubicSystemsModel();
const SHARED_CLOSE_PACKING_MODEL = new ClosePackingModel();
const SHARED_LATTICES_2D_MODEL = new Lattices2DModel();
const CUBIC_A11Y = StringManager.getInstance().getCubicSystemsA11yStrings().controls;
const CLOSE_PACKING_A11Y = StringManager.getInstance().getClosePackingA11yStrings().controls;
const LATTICES_2D_A11Y = StringManager.getInstance().getLattices2DA11yStrings().controls;

const CUBIC_LINKED_PROPERTIES = [
  CUBIC_A11Y.cellRotationStringProperty,
  SHARED_CUBIC_MODEL.structureProperty,
  SHARED_CUBIC_MODEL.edgeLengthProperty,
  SHARED_CUBIC_MODEL.atomRadiusProperty,
  SHARED_CUBIC_MODEL.clipFrontProperty,
  SHARED_CUBIC_MODEL.showSharingProperty,
  // AtomNode links its base color itself (a manual link, counted without a Display).
  CrystalLatticeColors.atomColorProperty,
  CrystalLatticeColors.centeringAtomColorProperty,
  ...CrystalLatticeHotkeyData.ROTATE_VIEW.keyStringProperties,
];

/** Built as CubicSystemsScreenView builds it; the sharing labels add rebuilt Text. */
function createCubicCellNode(): CubicCellNode {
  const node = new CubicCellNode(SHARED_CUBIC_MODEL, VIEW_SIZE, {
    accessibleName: CUBIC_A11Y.cellRotationStringProperty,
    tagName: "div",
    focusable: true,
  });
  SHARED_CUBIC_MODEL.showSharingProperty.value = true;
  SHARED_CUBIC_MODEL.structureProperty.value = CubicStructure.BODY_CENTERED;
  SHARED_CUBIC_MODEL.reset();
  return node;
}

const LAYER_STACK_LINKED_PROPERTIES = [
  CLOSE_PACKING_A11Y.stackRotationStringProperty,
  SHARED_CLOSE_PACKING_MODEL.stackProperty,
  SHARED_CLOSE_PACKING_MODEL.sphereRadiusProperty,
  SHARED_CLOSE_PACKING_MODEL.showLabelsProperty,
  CrystalLatticeColors.layerAColorProperty,
  CrystalLatticeColors.layerBColorProperty,
  CrystalLatticeColors.layerCColorProperty,
  ...CrystalLatticeHotkeyData.ROTATE_VIEW.keyStringProperties,
];

/** Built as ClosePackingScreenView builds it; layer labels on and the stack regrown. */
function createLayerStackNode(): LayerStackNode {
  const node = new LayerStackNode(SHARED_CLOSE_PACKING_MODEL, VIEW_SIZE, {
    accessibleName: CLOSE_PACKING_A11Y.stackRotationStringProperty,
    tagName: "div",
    focusable: true,
  });
  SHARED_CLOSE_PACKING_MODEL.showLabelsProperty.value = !SHARED_CLOSE_PACKING_MODEL.showLabelsProperty.value;
  SHARED_CLOSE_PACKING_MODEL.layerCountProperty.value = SHARED_CLOSE_PACKING_MODEL.layerCountProperty.range.max;
  SHARED_CLOSE_PACKING_MODEL.reset();
  return node;
}

const LATTICE_2D_LINKED_PROPERTIES = [
  LATTICES_2D_A11Y.handleA1StringProperty,
  LATTICES_2D_A11Y.handleA2StringProperty,
  SHARED_LATTICES_2D_MODEL.parametersProperty,
  SHARED_LATTICES_2D_MODEL.showPrimitiveCellProperty,
  SHARED_LATTICES_2D_MODEL.showWignerSeitzProperty,
  SHARED_LATTICES_2D_MODEL.showBisectorsProperty,
  SHARED_LATTICES_2D_MODEL.showCoordinationProperty,
  CrystalLatticeColors.originAtomColorProperty,
  CrystalLatticeColors.atomColorProperty,
  CrystalLatticeColors.centeringAtomColorProperty,
  // The handles' KeyboardDragListener hotkeys derive from these module-level key strings.
  ...(KeyboardDragDirectionToKeyStringPropertiesMap.get("both") ?? []),
];

/** Built as Lattices2DScreenView builds it, with every overlay toggled on and off. */
function createLattice2DNode(): Lattice2DNode {
  const node = new Lattice2DNode(
    SHARED_LATTICES_2D_MODEL,
    VIEW_SIZE,
    LATTICES_2D_A11Y.handleA1StringProperty,
    LATTICES_2D_A11Y.handleA2StringProperty,
  );
  SHARED_LATTICES_2D_MODEL.showPrimitiveCellProperty.value = true;
  SHARED_LATTICES_2D_MODEL.showWignerSeitzProperty.value = true;
  SHARED_LATTICES_2D_MODEL.showBisectorsProperty.value = true;
  SHARED_LATTICES_2D_MODEL.showCoordinationProperty.value = true;
  SHARED_LATTICES_2D_MODEL.centeredBasisProperty.value = true;
  SHARED_LATTICES_2D_MODEL.reset();
  return node;
}

describeDisposalLeaks([
  {
    name: "CubicCellNode",
    create: createCubicCellNode,
    keepAlive: () => [SHARED_CUBIC_MODEL, ...CUBIC_LINKED_PROPERTIES],
  },
  {
    name: "LayerStackNode",
    create: createLayerStackNode,
    keepAlive: () => [SHARED_CLOSE_PACKING_MODEL, ...LAYER_STACK_LINKED_PROPERTIES],
  },
  {
    name: "Lattice2DNode",
    create: createLattice2DNode,
    keepAlive: () => [SHARED_LATTICES_2D_MODEL, ...LATTICE_2D_LINKED_PROPERTIES],
  },
]);

describe("Projected3DNode subclasses and Lattice2DNode", () => {
  it("CubicCellNode leaves no listeners on string, accessible-name or model Properties", async () => {
    await expectNoListenerGrowth(CUBIC_LINKED_PROPERTIES, () => {
      createCubicCellNode().dispose();
    });
  });

  it("LayerStackNode leaves no listeners on string, accessible-name or model Properties", async () => {
    await expectNoListenerGrowth(LAYER_STACK_LINKED_PROPERTIES, () => {
      createLayerStackNode().dispose();
    });
  });

  it("Lattice2DNode leaves no listeners on string, accessible-name or model Properties", async () => {
    await expectNoListenerGrowth(LATTICE_2D_LINKED_PROPERTIES, () => {
      createLattice2DNode().dispose();
    });
  });
});
