/**
 * Connector helpers for pedigree (LTR). Reuses descendancy geometry where node x/y match person cards.
 */

import type { ConnectorHelpers } from "../ViewStrategyDescriptor";
import type { LayoutBoundsOptions } from "../ViewStrategyDescriptor";
import {
  hasIncomingConnector as dHasIncoming,
  incomingX as dIncomingX,
  incomingY as dIncomingY,
  outgoingX as dOutgoingX,
  outgoingY as dOutgoingY,
} from "../descendancy/connectionPoints";
import { isContainer as dIsContainer } from "../descendancy/layout";
import type { ChartNode } from "../../nodes";
import { isPedigreePersonWithParentUnion } from "./pedigreeLayout";

function isPedigreeContainer(node: ChartNode): boolean {
  return isPedigreePersonWithParentUnion(node);
}

export const pedigreeConnectors: ConnectorHelpers = {
  hasIncomingConnector: (node: ChartNode) => dHasIncoming(node),
  incomingX: (node: ChartNode) => dIncomingX(node),
  incomingY: (node: ChartNode) => dIncomingY(node),
  outgoingX: (node: ChartNode) => dOutgoingX(node),
  outgoingY: (node: ChartNode) => dOutgoingY(node),
  isContainer: (node: ChartNode) => dIsContainer(node) || isPedigreeContainer(node),
};

export function getPedigreeConnectors(_personHeight: number): ConnectorHelpers {
  return pedigreeConnectors;
}

export function getPedigreeConnectorsWithHeight(personHeight: number): ConnectorHelpers {
  void personHeight;
  return pedigreeConnectors;
}
