/**
 * CrystalLatticeKeyboardHelpSections.ts
 *
 * Keyboard-help sections for the sim's own controls: orbiting a 3D view, the
 * Miller-index handles, and placing tiles on the Aperiodic Order board. Rows
 * built from HotkeyData share their keys with the listeners.
 */

import { KeyboardHelpIconFactory, KeyboardHelpSection, KeyboardHelpSectionRow } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import CrystalLatticeHotkeyData from "../CrystalLatticeHotkeyData.js";

const keyboardHelp = () => StringManager.getInstance().getCommonStrings().keyboardHelp;

/** "3D View": arrow keys orbit a focused crystal view. */
export const createView3DKeyboardHelpSection = (): KeyboardHelpSection =>
  new KeyboardHelpSection(keyboardHelp().view3DHeadingStringProperty, [
    KeyboardHelpSectionRow.fromHotkeyData(CrystalLatticeHotkeyData.ROTATE_VIEW, {
      icon: KeyboardHelpIconFactory.arrowKeysRowIcon(),
    }),
  ]);

/** "Plane Intercepts": stepping the intercept handles and the direction tip. */
export const createMillerKeyboardHelpSection = (): KeyboardHelpSection =>
  new KeyboardHelpSection(keyboardHelp().interceptHeadingStringProperty, [
    KeyboardHelpSectionRow.fromHotkeyData(CrystalLatticeHotkeyData.STEP_INTERCEPT, {
      icon: KeyboardHelpIconFactory.arrowKeysRowIcon(),
    }),
    KeyboardHelpSectionRow.fromHotkeyData(CrystalLatticeHotkeyData.INTERCEPT_ENDS),
    KeyboardHelpSectionRow.fromHotkeyData(CrystalLatticeHotkeyData.MOVE_DIRECTION_TIP, {
      icon: KeyboardHelpIconFactory.arrowKeysRowIcon(),
    }),
  ]);

/** "Place Tiles": choose a palette shape, then press a slot. */
export const createPlaceTilesKeyboardHelpSection = (): KeyboardHelpSection =>
  new KeyboardHelpSection(keyboardHelp().placeTilesHeadingStringProperty, [
    KeyboardHelpSectionRow.labelWithIcon(
      keyboardHelp().chooseTileStringProperty,
      KeyboardHelpIconFactory.spaceOrEnter(),
    ),
    KeyboardHelpSectionRow.labelWithIcon(
      keyboardHelp().placeTileStringProperty,
      KeyboardHelpIconFactory.spaceOrEnter(),
    ),
  ]);
