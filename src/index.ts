/**
 * Descendancy chart model: constants, types, and dumb node classes.
 * Layout algorithm and React rendering live elsewhere.
 */

export { MAX_HISTORY, DEFAULT_MAX_DEPTH, DEFAULT_ROOT_XREF } from "./constants";
export {
  PERSON_WIDTH,
  PERSON_HEIGHT,
  DIAMOND_SIZE,
  CONNECTOR_WIDTH,
  GAP,
  VERTICAL_GAP,
  PADDING,
  SIBLING_COLORS,
} from "./strategies/descendancy/constants";

export type { ViewStrategyDescriptor, ConnectorHelpers, BuildStrategyOptions, Bounds, StrategyConstants } from "./strategies/ViewStrategyDescriptor";
export { FamilyTreeBuilder, buildTree, setCurrentBuilder, clearCurrentBuilder } from "./builder";
export type { FamilyTreeBuildOptions, FamilyTreeBuilderInput, BuildTreeOptions } from "./builder";
export { defaultConnectors } from "./strategies/descendancy";
export {
  hasIncomingConnector,
  incomingX,
  incomingY,
  outgoingX,
  outgoingY,
} from "./strategies/descendancy";

export type { DescendancyPerson } from "./types";

export {
  Node,
  PersonNode,
  UnionNode,
  NormalUnionNode,
  CatchAllNode,
  LinkedParentNode,
  SiblingAdoptiveUnionNode,
  FamilyTreeNodeFactory,
  type ChartNode,
  type NodeType,
  type IUnionNode,
  type FamilyTreeNodeFactoryConfig,
} from "./nodes";

export { visualHalfWidth, getBounds } from "./strategies/descendancy/bounds";
export { collectAll, collectAllPersonNodes, getMaxDepth, findUnionContainingPerson } from "./bounds";

export { layout, markUnions, isContainer } from "./strategies/descendancy";

export {
  buildView,
  countDescendants,
  clearDescendantCountCache,
} from "./strategies/descendancy";
export type { ViewStrategy, BuildContext } from "./strategies/ViewStrategy";
export { DescendancyViewStrategy, PedigreeViewStrategy } from "./strategies";

export {
  buildTestTree,
  clearCurrentTreeData,
  getPeople,
  getSpousesOf,
  setCurrentTreeData,
  PEOPLE_WITH_PARENTS,
  PEOPLE_WITH_SPOUSES,
  UNIONS,
  UNIONS_BY_PERSON,
  UNION_BY_ID,
  PARENT_UNIONS_BY_CHILD,
  BIRTH_UNION_BY_CHILD,
  getUnions,
  getUnionsByPerson,
  getAllChildrenOf,
  getParentUnionsByChild,
  getUnionById,
  getBirthUnionByChild,
  type ViewState,
  type UnionRecord,
  type UnionChild,
  type LinkedUnionEntry,
  type SiblingView,
} from "./testdata";

export {
  treeReducer,
  INITIAL_STATE,
  createInitialState,
  getAllActionTypes,
  isAllSpousesRevealed,
  type TreeState,
  type TreeAction,
  type HistoryEntry,
} from "./reducer";

export {
  handlePersonCardAction,
  buildLegendItems,
  countVisibleNodes,
  serializeNode,
  computeFitToViewport,
  type PersonCardAction,
  type HandlePersonCardActionContext,
  type ViewportBounds,
  type ComputeFitToViewportOptions,
} from "./helpers";

export {
  useChartSearch,
  useDescendancyFetch,
  useDepth,
  usePanelVisibility,
  usePanToPerson,
  usePanZoom,
  useSpouseDrawer,
  useTreeBuild,
  type UseChartSearchOptions,
  type UseTreeIndividualsFn,
  type UseTreeIndividualsOptions,
  type UseTreeIndividualsReturn,
  type IndividualSearchResult,
  type PanelVisibilityState,
  type PanelVisibilityActions,
  type PanZoomBounds,
  type UseDepthOptions,
  type UseDepthResult,
  type UsePanToPersonOptions,
  type UsePanToPersonResult,
  type UsePanZoomOptions,
  type UseSpouseDrawerResult,
  type UseTreeBuildOptions,
  type TreeBuildResult,
} from "./hooks";
