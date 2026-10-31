import { Vector3 } from "scenerystack/dot";
import { expect, it } from "vitest";
import { MAX_MILLER_INDEX } from "../src/CrystalLatticeConstants.js";
import { formatDirection, parseIndexTriple } from "../src/common/model/MillerIndices.js";
import { MillerIndicesModel } from "../src/miller-indices/model/MillerIndicesModel.js";

for (const [vector, expected] of [
  [
    [1.25, 1, 1],
    [4, 3, 3],
  ],
  [
    [2, -3, 1],
    [2, -3, 1],
  ],
  [
    [0, -10, 0],
    [0, -1, 0],
  ],
  [
    [0.2, 0.3, 0.4],
    [2, 3, 4],
  ],
]) {
  it(`chooses a bounded direction near ${vector}`, () => {
    const model = new MillerIndicesModel();
    model.setDirectionFromVector(new Vector3(vector![0]!, vector![1]!, vector![2]!));
    expect(model.directionIndicesProperty.value).toEqual(expected);
    expect(model.directionIndicesProperty.value.every((i) => Math.abs(i) <= MAX_MILLER_INDEX)).toBe(true);
    model.setDirectionFromVector(Vector3.ZERO);
    expect(model.directionIndicesProperty.value).toEqual(expected);
    model.reset();
    expect(model.directionIndicesProperty.value).toEqual([1, 1, 1]);
  });
}

it("keeps multi-digit direction notation unambiguous", () => {
  const indices = [8, 15, -4] as const;
  expect(parseIndexTriple(formatDirection(indices))).toEqual(indices);
});
