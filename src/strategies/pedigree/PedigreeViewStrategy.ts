/**
 * Pedigree view strategy (placeholder).
 * A pedigree chart shows ancestors (parents above/left of the root), not descendants.
 * Full implementation will require a different build flow (traverse parents, not children)
 * and a different layout (e.g. bottom-up or left-to-right). This strategy implements
 * ViewStrategy so it can be registered; buildUnionNodes returns [] so the generic
 * build tree treats the root as a leaf until pedigree-specific build/layout exist.
 */

import type { ViewState } from "../../types";
import type { UnionNode } from "../../nodes";
import type { BuildContext, ViewStrategy } from "../ViewStrategy";

/** Placeholder {@link ViewStrategy} for descriptor registration; real build uses {@link PedigreeChartBuilder}. */
export class PedigreeViewStrategy implements ViewStrategy {
  constructor(
    _viewState: ViewState = {},
    _maxDepth: number
  ) {}

  buildUnionNodes(_personId: string, _depth: number, _ctx: BuildContext): UnionNode[] {
    return [];
  }
}
