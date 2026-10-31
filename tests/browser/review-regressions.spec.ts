import { expect, type Page, test } from "@playwright/test";
import type { AperiodicOrderModel } from "../../src/aperiodic-order/model/AperiodicOrderModel.js";
import type { Lattices2DModel } from "../../src/lattices-2d/model/Lattices2DModel.js";
import type { MillerIndicesModel } from "../../src/miller-indices/model/MillerIndicesModel.js";

type SimulationWindow = {
  phet: {
    joist: {
      sim: {
        selectedScreenProperty: {
          value: {
            model: Lattices2DModel | AperiodicOrderModel | MillerIndicesModel;
            view: import("scenerystack/sim").ScreenView;
          };
        };
      };
    };
  };
};

async function ready(page: Page, screen: number, parameters = "") {
  await page.goto(`/?screens=${screen}&ea${parameters}`);
  await page.getByRole("button", { name: "Reset All", exact: true }).waitFor();
}

function texts(page: Page) {
  return page.evaluate(() => {
    const result: string[] = [];
    const visit = (node: import("scenerystack/scenery").Node) => {
      if (!node.visible) {
        return;
      }
      if (node.constructor.name === "Text") {
        result.push((node as import("scenerystack/scenery").Text).string);
      }
      node.children.forEach(visit);
    };
    visit((window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.view);
    return result;
  });
}

const latticeState = (page: Page) =>
  page.evaluate(() => {
    const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
      .model as Lattices2DModel;
    return {
      type: model.latticeTypeProperty.value,
      a1: model.a1Property.value,
      a2: model.a2Property.value,
      gamma: model.gammaDegreesProperty.value,
    };
  });

test("snap actions work initially, repeatedly after edits, and after Reset All", async ({ page }) => {
  await ready(page, 1);
  const snap = page.getByRole("button", { name: "Snap the lattice to Square", exact: true });
  await snap.press("Enter");
  expect(await latticeState(page)).toEqual({ type: "square", a1: 0.3, a2: 0.3, gamma: 90 });
  await page.getByRole("slider").nth(1).press("Home");
  expect((await latticeState(page)).a2).toBe(0.15);
  await snap.press("Enter");
  expect((await latticeState(page)).a2).toBe(0.3);
  await page.getByRole("button", { name: "Reset All", exact: true }).press("Enter");
  expect((await latticeState(page)).type).toBe("oblique");
  await snap.press("Enter");
  expect((await latticeState(page)).type).toBe("square");
});

test("every snap action preserves its lattice type at the upper length limit", async ({ page }) => {
  await ready(page, 1);
  for (const [label, type] of [
    ["Square", "square"],
    ["Rectangular", "rectangular"],
    ["Centred rectangular", "centeredRectangular"],
    ["Hexagonal", "hexagonal"],
    ["Oblique", "oblique"],
  ]) {
    await page.getByRole("slider").first().press("End");
    await page.getByRole("button", { name: `Snap the lattice to ${label}`, exact: true }).press("Enter");
    const state = await latticeState(page);
    expect(state.type).toBe(type);
    expect(state.a1).toBeGreaterThanOrEqual(0.15);
    expect(state.a2).toBeLessThanOrEqual(0.5);
  }
});

test("pointer-created skewed primitive vectors still identify the square lattice", async ({ page }) => {
  await ready(page, 1);
  for (const [index, point] of [
    [0, { x: 0.2, y: 0 }],
    [1, { x: 0.2, y: 0.2 }],
  ] as const) {
    const positions = await page.evaluate(
      ({ index: handleIndex, point: modelPoint }) => {
        let lattice: import("../../src/lattices-2d/view/Lattice2DNode.js").Lattice2DNode | undefined;
        const visit = (node: import("scenerystack/scenery").Node) => {
          if (node.constructor.name === "Lattice2DNode") {
            lattice = node as typeof lattice;
          }
          node.children.forEach(visit);
        };
        visit((window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.view);
        const handle = lattice!.getHandles()[handleIndex]!;
        const transform = (
          lattice as unknown as { modelViewTransform: import("scenerystack/phetcommon").ModelViewTransform2 }
        ).modelViewTransform;
        const from = handle.localToGlobalPoint(handle.localBounds.center);
        const to = lattice!.localToGlobalPoint(
          transform.modelToViewPosition(modelPoint as import("scenerystack/dot").Vector2),
        );
        return { from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } };
      },
      { index, point },
    );
    await page.mouse.move(positions.from.x, positions.from.y);
    await page.mouse.down();
    await page.mouse.move(positions.to.x, positions.to.y, { steps: 5 });
    await page.mouse.up();
  }
  const state = await latticeState(page);
  expect(state.a1).toBeCloseTo(0.2, 5);
  expect(state.a2).toBeCloseTo(0.2 * Math.SQRT2, 5);
  expect(state.gamma).toBeCloseTo(45, 4);
  expect(state.type).toBe("square");
  expect(await texts(page)).toContain("Square");
});

for (const type of ["thin", "thick"]) {
  test(`palette and slot activation place the selected ${type} shape`, async ({ page }) => {
    await ready(page, 5);
    await page.getByRole("radio", { name: "Place by hand", exact: true }).press("Space");
    const palette = page.getByRole("button", {
      name: `${type === "thin" ? "Thin" : "Thick"} rhombus; drag it onto a slot, or select it and activate a slot`,
      exact: true,
    });
    await palette.press("Enter");
    await expect(palette).toHaveAttribute("aria-pressed", "true");
    const candidates = await page.evaluate(() => {
      const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
        .model as AperiodicOrderModel;
      return {
        types: model.selectedCandidatesProperty.value.map((c) => c.rhombus.type),
        legal: model.legalSlotCountProperty.value,
      };
    });
    expect(candidates.types.length).toBeGreaterThan(0);
    expect(candidates.types.every((value) => value === type)).toBe(true);
    await expect(
      page.getByRole("button", { name: "Legal slot; activate to place the selected tile here", exact: true }),
    ).toHaveCount(candidates.legal);
    await page
      .getByRole("button", { name: "Legal slot; activate to place the selected tile here", exact: true })
      .first()
      .press("Enter");
    expect(
      await page.evaluate(() => {
        const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
          .model as AperiodicOrderModel;
        return model.placedRhombiProperty.value.at(-1)!.type;
      }),
    ).toBe(type);
    await page.getByRole("button", { name: "Take back the tile placed most recently", exact: true }).press("Enter");
    expect(
      await page.evaluate(
        () =>
          (
            (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
              .model as AperiodicOrderModel
          ).placedRhombiProperty.value.length,
      ),
    ).toBe(1);
  });
}

test("direction mode hides plane-only quantities and restores them when returning", async ({ page }) => {
  await ready(page, 4, "&showAdvancedReadouts=true");
  for (const [plane, spacing] of [
    ["(100)", "0.4000 nm"],
    ["(200)", "0.2000 nm"],
  ]) {
    await page.getByRole("button", { name: plane!, exact: true }).press("Enter");
    expect(await texts(page)).toContain("Interplanar spacing d");
    expect(await texts(page)).toContain("Planar density");
    expect(await texts(page)).toContain(spacing);
    await page.getByRole("button", { name: "[111]", exact: true }).press("Enter");
    expect(await texts(page)).not.toContain("Interplanar spacing d");
    expect(await texts(page)).not.toContain("Planar density");
    expect(await texts(page)).not.toContain(spacing);
  }
  await page.getByRole("radio", { name: "Plane (hkl)", exact: true }).press("Space");
  expect(await texts(page)).toContain("Interplanar spacing d");
  expect(await texts(page)).toContain("0.2000 nm");
});

test("direction-tip arrow keys remain within the supported low-index domain", async ({ page }) => {
  await ready(page, 4);
  await page.getByRole("button", { name: "[111]", exact: true }).press("Enter");
  const tip = page.getByText("Tip of the direction vector; drag to change it", { exact: true });
  for (const [step, key] of [
    "ArrowRight",
    "ArrowRight",
    "ArrowRight",
    "ArrowUp",
    "ArrowUp",
    "ArrowUp",
    "ArrowUp",
    "ArrowLeft",
    "ArrowDown",
  ].entries()) {
    await tip.press(key);
    const indices = await page.evaluate(
      () =>
        (
          (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
            .model as MillerIndicesModel
        ).directionIndicesProperty.value,
    );
    expect(indices.some((value) => value !== 0)).toBe(true);
    expect(indices.every((value) => Number.isInteger(value) && Math.abs(value) <= 4)).toBe(true);
    if (step === 2) {
      expect(indices).not.toEqual([1, 1, 1]);
    }
  }
  expect(
    await page.evaluate(
      () =>
        (
          (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
            .model as MillerIndicesModel
        ).directionIndicesProperty.value,
    ),
  ).not.toEqual([1, 1, 1]);
  await page.getByRole("button", { name: "Reset All", exact: true }).press("Enter");
  expect(
    await page.evaluate(
      () =>
        (
          (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
            .model as MillerIndicesModel
        ).directionIndicesProperty.value,
    ),
  ).toEqual([1, 1, 1]);
});

for (const [locale, square, centered, prefix] of [
  ["es", "Cuadrada", "Rectangular centrada", "Ajustar la red a"],
  ["fr", "Carré", "Rectangulaire centré", "Aligner le réseau sur"],
]) {
  test(`${locale} snap actions are translated and operable`, async ({ page }) => {
    await ready(page, 1, `&locale=${locale}`);
    const squareButton = page.getByRole("button", { name: `${prefix} ${square}`, exact: true });
    const centeredButton = page.getByRole("button", { name: `${prefix} ${centered}`, exact: true });
    // Check accessible names from the actual translated Properties, not English fallbacks.
    await squareButton.press("Enter");
    expect((await latticeState(page)).type).toBe("square");
    await centeredButton.press("Enter");
    expect((await latticeState(page)).type).toBe("centeredRectangular");
  });
}
