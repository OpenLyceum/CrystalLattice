import { expect, it } from "vitest";
import { AperiodicOrderModel } from "../src/aperiodic-order/model/AperiodicOrderModel.js";
import { RhombusType } from "../src/common/model/PenroseTiling.js";

for (const type of Object.values(RhombusType)) {
  it(`only places the armed ${type} shape and counts its legal slots`, () => {
    const model = new AperiodicOrderModel();
    model.selectedTileProperty.value = type;
    const matching = model.candidatesProperty.value.filter((c) => c.legal && c.rhombus.type === type);
    const other = model.candidatesProperty.value.find((c) => c.legal && c.rhombus.type !== type)!;
    expect(model.legalSlotCountProperty.value).toBe(matching.length);
    expect(model.placeTile(other)).toBe(false);
    expect(model.placedRhombiProperty.value).toHaveLength(1);
    expect(model.placementRefusedProperty.value).toBe(true);
    expect(model.placeTile(matching[0]!)).toBe(true);
    expect(model.placedRhombiProperty.value.at(-1)!.type).toBe(type);
    expect(model.placementRefusedProperty.value).toBe(false);
    model.reset();
    expect(model.placedRhombiProperty.value).toHaveLength(1);
    expect(model.selectedTileProperty.value).toBe(RhombusType.THICK);
    expect(model.placementRefusedProperty.value).toBe(false);
  });
}
