import { expect, it } from "vitest";
import { Lattice2DType } from "../src/common/model/Lattice2D.js";
import { LATTICE_VECTOR_RANGE, Lattices2DModel } from "../src/lattices-2d/model/Lattices2DModel.js";

for (const length of [LATTICE_VECTOR_RANGE.min, 0.3, LATTICE_VECTOR_RANGE.max]) {
  for (const type of Object.values(Lattice2DType)) {
    it(`snaps to ${type} from a1 = ${length} while preserving its cell shape`, () => {
      const model = new Lattices2DModel();
      model.a1Property.value = length;
      model.a2Property.value = LATTICE_VECTOR_RANGE.min;
      model.gammaDegreesProperty.value = 150;
      model.centeredBasisProperty.value = true;
      model.snapTo(type);
      expect(model.latticeTypeProperty.value).toBe(type);
      for (const value of [model.a1Property.value, model.a2Property.value]) {
        expect(LATTICE_VECTOR_RANGE.contains(value)).toBe(true);
      }
      const ratio = model.a2Property.value / model.a1Property.value;
      expect(ratio).toBeCloseTo(
        type === "oblique" ? 1.4 : type === "rectangular" || type === "centeredRectangular" ? 1.5 : 1,
        10,
      );
      model.reset();
      expect(model.a1Property.value).toBe(0.3);
      expect(model.a2Property.value).toBe(0.42);
      expect(model.gammaDegreesProperty.value).toBe(75);
      expect(model.centeredBasisProperty.value).toBe(false);
    });
  }
}
