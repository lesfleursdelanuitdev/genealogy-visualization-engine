/**
 * @ligneous/visualization-engine: headless layout for family-tree charts.
 *
 * Input: a GraphSnapshot built once from { people, unions } (createGraphSnapshot).
 * Entry point: createChartSession({ graph, viewState, options }) → buildTree / buildChart.
 * State: treeReducer(state, action, graph) or createTreeReducer(graph).
 * Rendering lives in the app (or @ligneous/visualization-react).
 */

export { MAX_HISTORY, DEFAULT_MAX_DEPTH, DEFAULT_PEDIGREE_DEPTH } from "./constants";
export {
  PERSON_WIDTH,
  PERSON_HEIGHT,
  DIAMOND_SIZE,
  CONNECTOR_WIDTH,
  GAP,
  VERTICAL_GAP,
  PADDING,
  DEFAULT_TREE_CONNECTOR_FALLBACK_HEX,
  SIBLING_COLORS,
} from "./strategies/descendancy/constants";

export type {
  ViewStrategyDescriptor,
  ConnectorHelpers,
  BuildStrategyOptions,
  Bounds,
  StrategyConstants,
  LayoutBoundsOptions,
} from "./strategies/ViewStrategyDescriptor";
export { buildTree } from "./builder";
export type { BuildTreeOptions, BuildTreeResult } from "./builder";
export {
  createChartSession,
  layoutChart,
  isGraphSnapshot,
  type ChartSession,
  type ChartSessionInit,
  type ChartSessionOptions,
  type ChartLayout,
} from "./session";
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
  createGraphSnapshot,
  unionIdOf,
  unknownPartnerId,
  isUnknownPartnerId,
  EMPTY_GRAPH,
  type GraphInput,
  type GraphSnapshot,
  type SnapshotUnion,
  type SpouseLink,
  type PartnerRole,
  countAncestors,
  countDescendantsWithin,
  parentFamilyToClimb,
  ancestorFamilyOf,
  parentFamilySwitch,
  chosenParentFamilyId,
  birthFamilyOf,
  defaultFamc,
  parentFamiliesOf,
  hasMultipleParentFamilies,
  multiFamilyChildIds,
  siblingsOf,
  familiesAsPartnerOf,
  computeSiblingView,
  type AncestorClimbOptions,
  type ParentFamily,
  type ComputedSiblingView,
  type ParentFamilySwitch,
} from "./graph";

export {
  Node,
  PersonNode,
  UnionNode,
  NormalUnionNode,
  CatchAllNode,
  LinkedParentNode,
  SiblingAdoptiveUnionNode,
  type ChartNode,
  type NodeType,
  type IUnionNode,
  type PersonParentFamilies,
} from "./nodes";

export { visualHalfWidth, getBounds } from "./strategies/descendancy/bounds";
export { collectAll, collectAllPersonNodes, getMaxDepth, findUnionContainingPerson } from "./bounds";

export { layout, markUnions, isContainer } from "./strategies/descendancy";
export { DEFAULT_PEDIGREE_PARENT_PAIR_GAP, DEFAULT_PEDIGREE_GENERATION_GAP } from "./strategies/pedigree/pedigreeLayout";

export { countDescendants } from "./strategies/descendancy";
export type { ViewStrategy, BuildContext } from "./strategies/ViewStrategy";
export { DescendancyViewStrategy } from "./strategies";

export type { ViewState, UnionRecord, UnionChild, LinkedUnionEntry, SiblingView } from "./types";

export {
  treeReducer,
  createTreeReducer,
  INITIAL_STATE,
  createInitialState,
  isAllSpousesRevealed,
  type TreeState,
  type TreeAction,
  type HistoryEntry,
} from "./reducer";

export {
  handlePersonCardAction,
  buildLegendItems,
  countVisibleNodes,
  computeFitToViewport,
  type PersonCardAction,
  type HandlePersonCardActionContext,
  type ViewportBounds,
  type ComputeFitToViewportOptions,
} from "./helpers";

export type { ChartViewStrategyName, ChartViewBuildAdapter } from "./chartView";
export { CHART_VIEW_STRATEGIES, isChartViewStrategyName, createChartAdapter } from "./chartView";

export {
  bandThicknessForGeneration,
  buildFanGeometry,
  bindFanGeometry,
  computeFanMaxOuterRadius,
  polarToCartesian,
  radialLabelRotationDeg,
  tangentialLabelRotationDeg,
  buildAnnularSectorPath,
  buildTextArcPath,
  buildGenderBandArcPath,
  buildFanTextArcPathInRadialZone,
  computeFanCellTextBounds,
  computeAvatarPlacement,
  DEFAULT_FAN_CHROME_LAYOUT,
  fanTextZoneArcLength,
  getMoreButtonCenter,
  moreButtonChevronRotationDeg,
  fanChartDescriptor,
  FAN_CHART_DEFAULTS,
  type FanGeometry,
  type FanGeometryOptions,
  type FanChartLabelOptions,
  type FanChartOptions,
  type FanCell,
  type FanPoint,
  type FanAncestorData,
  type FanRenderOptions,
  type RenderableFanCell,
  type FanChromeLayoutOptions,
} from "./strategies/fanChart";

export {
  parseChartApiResponse,
  ChartApiFormatError,
  type ChartGraphRequest,
  type ChartGraphResponse,
  type FetchChartGraph,
  type ApiPerson,
  type ApiUnion,
  type ApiChartResponse,
} from "./fetch";

export { searchPeople, type SearchPeopleOptions, type SearchPeopleResult } from "./search";

export {
  useChartSearch,
  createGraphIndividualsSearch,
  useChartViewFetch,
  type UseChartViewFetchResult,
  type UseChartViewFetchOptions,
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
  type ZoomStepOptions,
  type UseSpouseDrawerResult,
  type UseTreeBuildOptions,
  type TreeBuildResult,
} from "./hooks";
