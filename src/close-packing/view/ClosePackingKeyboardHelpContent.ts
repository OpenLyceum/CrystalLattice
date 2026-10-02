/**
 * ClosePackingKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 * The stack orbits with arrow keys; sliders and check boxes cover the rest.
 */

import {
  BasicActionsKeyboardHelpSection,
  MoveDraggableItemsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import { createView3DKeyboardHelpSection } from "../../common/view/CrystalLatticeKeyboardHelpSections.js";

export class ClosePackingKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [
        createView3DKeyboardHelpSection(),
        new MoveDraggableItemsKeyboardHelpSection(),
        new SliderControlsKeyboardHelpSection(),
      ],
      [new BasicActionsKeyboardHelpSection({ withCheckboxContent: true })],
    );
  }
}
