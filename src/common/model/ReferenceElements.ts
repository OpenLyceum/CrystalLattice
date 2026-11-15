/**
 * ReferenceElements.ts
 *
 * Typed accessor for the small static table of real cubic metals used by the
 * Cubic Systems screen's "identify the element" mode. The data itself lives in
 * `elements.json` so it can be extended without touching model code.
 */

import { CubicStructure } from "./CubicCell.js";
import elementsData from "./elements.json";

/** One tabulated cubic metal. */
export type ReferenceElement = {
  /** Chemical symbol, e.g. "Fe". */
  readonly symbol: string;
  /** English element name; the view shows the localized `cubicSystems.elementNames` entry instead. */
  readonly name: string;
  /** Which cubic structure it crystallizes in at room temperature. */
  readonly structure: CubicStructure;
  /** Lattice constant a, in nanometres. */
  readonly latticeConstantNm: number;
  /** Molar mass M, in g/mol. */
  readonly molarMass: number;
  /** Measured density in g/cm³, for comparison with the computed value. */
  readonly measuredDensity: number;
};

const STRUCTURE_BY_KEY: Record<string, CubicStructure> = {
  simpleCubic: CubicStructure.SIMPLE_CUBIC,
  bodyCentered: CubicStructure.BODY_CENTERED,
  faceCentered: CubicStructure.FACE_CENTERED,
};

/** Every tabulated element, in the order given in `elements.json`. */
export const REFERENCE_ELEMENTS: readonly ReferenceElement[] = elementsData.elements.map((entry) => ({
  symbol: entry.symbol,
  name: entry.name,
  // biome-ignore lint/style/noNonNullAssertion: elements.json is validated by this map at load
  structure: STRUCTURE_BY_KEY[entry.structure]!,
  latticeConstantNm: entry.latticeConstantNm,
  molarMass: entry.molarMass,
  measuredDensity: entry.measuredDensity,
}));

/** Only the elements crystallizing in the given structure. */
function elementsWithStructure(structure: CubicStructure): ReferenceElement[] {
  return REFERENCE_ELEMENTS.filter((element) => element.structure === structure);
}

/**
 * Finds the tabulated element whose lattice constant best matches `edgeLengthNm`
 * among those sharing `structure`, provided the match is within `tolerance`
 * (a relative fraction). Backs the screen's "which element is this?" readout.
 */
export function identifyElement(
  structure: CubicStructure,
  edgeLengthNm: number,
  tolerance = 0.03,
): ReferenceElement | undefined {
  let best: ReferenceElement | undefined;
  let bestError = Number.POSITIVE_INFINITY;

  for (const element of elementsWithStructure(structure)) {
    const error = Math.abs(element.latticeConstantNm - edgeLengthNm) / element.latticeConstantNm;
    if (error < bestError) {
      bestError = error;
      best = element;
    }
  }
  return bestError <= tolerance ? best : undefined;
}
