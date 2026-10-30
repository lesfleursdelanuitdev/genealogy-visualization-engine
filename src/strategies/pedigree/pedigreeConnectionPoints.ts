/**
 * Connector helpers for pedigree (LTR). Reuses descendancy geometry where node x/y match person cards.
 */

import type { ConnectorHelpers } from "../ViewStrategyDescriptor";
import type { LayoutBoundsOptions } from "../ViewStrategyDescriptor";
import {
  getConnectors as dGetConnectors,
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

/** Pedigree connectors for a given card height and width (B06: these were ignored). */
export function getPedigreeConnectors(personHeight: number, personWidth?: number): ConnectorHelpers {
  const d = dGetConnectors(personHeight, personWidth);
  return { ...d, isContainer: (node: ChartNode) => dIsContainer(node) || isPedigreeContainer(node) };
}
