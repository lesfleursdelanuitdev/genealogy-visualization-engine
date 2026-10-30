/**
 * Audit bugs in the card-action helper. IDs follow docs/v0.1.0-progress.md ("Bug list").
 */
import { describe, expect, vi, afterEach } from "vitest";
import { knownBug } from "../helpers/bugs";
import { handlePersonCardAction, type HandlePersonCardActionContext } from "../../src";

function context(): HandlePersonCardActionContext {
  return {
    dispatch: () => {},
    setDrawerPersonId: () => {},
    setPan: () => {},
    setToast: () => {},
    setShowLegendModal: () => {},
    setShowLegendPanel: () => {},
    setRootDisplayNames: () => {},
    triggerBlinkBack: () => {},
    settings: { autoLegendModal: false },
    currentDepth: 2,
    maxDepth: 6,
    atMaxDepth: false,
    rootId: "R",
  };
}

afterEach(() => vi.restoreAllMocks());

describe("B15: no console.log in production", () => {
  knownBug("B15", "the Show children card action logs nothing", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    handlePersonCardAction("expandDown", "C1", context());
    expect(log).not.toHaveBeenCalled();
  });
});
