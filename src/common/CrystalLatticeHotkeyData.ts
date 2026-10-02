/**
 * CrystalLatticeHotkeyData.ts
 *
 * Key bindings that are not covered by a stock keyboard-help section. Each is
 * HotkeyData, read both by the KeyboardListener that handles it and by the
 * keyboard-help row that documents it, so the two cannot drift apart.
 */

import { HotkeyData } from "scenerystack/scenery";
import { StringManager } from "../i18n/StringManager.js";

const REPO_NAME = "crystal-lattice";
const keyboardHelp = StringManager.getInstance().getCommonStrings().keyboardHelp;

const ARROW_KEYS = ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"] as const;

const CrystalLatticeHotkeyData = {
  /** Orbit a focused 3D view (Projected3DNode). */
  ROTATE_VIEW: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.rotateViewStringProperty,
  }),

  /** Step a focused Miller intercept handle along its track. */
  STEP_INTERCEPT: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.stepInterceptStringProperty,
  }),

  /** Send a focused Miller intercept handle to either end of its track. */
  INTERCEPT_ENDS: new HotkeyData({
    keys: ["home", "end"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.interceptEndsStringProperty,
  }),

  /** Nudge the focused Miller direction-vector tip. */
  MOVE_DIRECTION_TIP: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.moveDirectionTipStringProperty,
  }),
} as const;

export default CrystalLatticeHotkeyData;
