import { PersonNode, UnionNode, type ChartNode } from "../../nodes";
import type {
  ConnectorHelpers,
  LayoutBoundsOptions,
  ViewStrategyDescriptor,
} from "../ViewStrategyDescriptor";
import { DEFAULT_MAX_DEPTH } from "../../constants";
import { PedigreeViewStrategy } from "../pedigree/PedigreeViewStrategy";
import { getInitialViewState } from "../../reducer/strategies/pedigree/getInitialViewState";
import { computeFanMaxOuterRadius } from "./geometry";

const FAN_ROOT_RADIUS = 96;
const FAN_GENERATION_THICKNESS = 84;
const FAN_PADDING = 48;

function maxGenerationFromRoot(root: ChartNode): number {
  const visitPerson = (person: PersonNode, generation: number): number => {
    const firstUnion = person.children[0];
    if (!(firstUnion instanceof UnionNode)) return generation;
    const [left, right] = firstUnion.content;
    let maxGen = generation;
    if (left) maxGen = Math.max(maxGen, visitPerson(left, generation + 1));
    if (right) maxGen = Math.max(maxGen, visitPerson(right, generation + 1));
    return maxGen;
  };
  if (!(root instanceof PersonNode)) return 0;
  return visitPerson(root, 0);
}

function noOpLayout(_root: ChartNode, _options?: LayoutBoundsOptions): void {
  // Fan chart layout is polar and handled during render/binding.
}

const noOpConnectors: ConnectorHelpers = {
  hasIncomingConnector: () => false,
  incomingX: () => 0,
  incomingY: () => 0,
  outgoingX: () => 0,
  outgoingY: () => 0,
};

/** Defaults for fan geometry, progressive ring thickness, and label readability (also used by bounds / app). */
export const FAN_CHART_DEFAULTS = {
  rootRadius: FAN_ROOT_RADIUS,
  generationThickness: FAN_GENERATION_THICKNESS,
  thicknessIncreaseStartGeneration: 4,
  /** Extra radial depth per generation from this band index (outer rings need room for ray name+date). */
  thicknessIncreaseStep: 14,
  diagonalLabelStartGeneration: 4,
  minArcLengthForName: 40,
  minArcLengthForDates: 55,
  /** Minimum annulus depth (px) before attempting dates in ray mode (paired with radial run budget). */
  minRadialForDates: 20,
} as const;

export const fanChartDescriptor: ViewStrategyDescriptor = {
  createBuildStrategy(opts) {
    return new PedigreeViewStrategy(opts.viewState ?? {}, opts.maxDepth ?? DEFAULT_MAX_DEPTH);
  },
  layout: noOpLayout,
  connectors: noOpConnectors,
  getBounds(root) {
    const generationCount = maxGenerationFromRoot(root);
    const radius = computeFanMaxOuterRadius({
      generationCount,
      rootRadius: FAN_CHART_DEFAULTS.rootRadius,
      generationThickness: FAN_CHART_DEFAULTS.generationThickness,
      thicknessIncreaseStartGeneration: FAN_CHART_DEFAULTS.thicknessIncreaseStartGeneration,
      thicknessIncreaseStep: FAN_CHART_DEFAULTS.thicknessIncreaseStep,
    });
    return {
      minX: 0,
      maxX: radius,
      maxY: radius * 2,
    };
  },
  constants: {
    PADDING: FAN_PADDING,
  },
  getInitialViewState,
};
