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

import { describe, expect, it } from "vitest";
import { AperiodicOrderModel } from "../src/aperiodic-order/model/AperiodicOrderModel.js";
import { PlacementNode } from "../src/aperiodic-order/view/PlacementNode.js";
import { ClosePackingModel } from "../src/close-packing/model/ClosePackingModel.js";
import { AtomNode } from "../src/common/view/AtomNode.js";
import { CubicSystemsModel } from "../src/cubic-systems/model/CubicSystemsModel.js";
import { Lattices2DModel } from "../src/lattices-2d/model/Lattices2DModel.js";
import { MillerIndicesModel } from "../src/miller-indices/model/MillerIndicesModel.js";
import { describeDisposalLeaks, forceGC } from "./helpers/memoryLeak.js";

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

// View nodes that link to longer-lived Properties. The board shares one model,
// so a PlacementNode is only collected if dispose() unlinks it from that model;
// AtomNode links to the shared color profile.
const SHARED_APERIODIC_MODEL = new AperiodicOrderModel();
const PLACEMENT_BOARD_SIZE = 400;
const ATOM_RADIUS = 10;

describeDisposalLeaks([
  { name: "AtomNode", create: () => new AtomNode(ATOM_RADIUS) },
  { name: "PlacementNode", create: () => new PlacementNode(SHARED_APERIODIC_MODEL, PLACEMENT_BOARD_SIZE) },
]);
