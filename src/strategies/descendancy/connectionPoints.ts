/**
 * Connection point and visibility helpers for drawing connector lines (descendancy view).
 * INCOMING = where a line from a parent arrives.
 * OUTGOING = where lines to children depart.
 */

import {
  PERSON_HEIGHT,
  PERSON_WIDTH,
  CONNECTOR_WIDTH,
  DIAMOND_SIZE,
} from "./constants";
import type { ConnectorHelpers } from "../ViewStrategyDescriptor";
import { isContainer } from "./layout";
import type { ChartNode } from "../../nodes";
import {
  UnionNode,
  NormalUnionNode,
  CatchAllNode,
  LinkedParentNode,
  SiblingAdoptiveUnionNode,
} from "../../nodes";

/** True if we draw an incoming connector to this node (primary union, linked parent, sibling adoptive, or person card; not secondary or catch-all). */
export function hasIncomingConnector(node: ChartNode): boolean {
  if (node instanceof CatchAllNode) return false;
  if (
    node instanceof LinkedParentNode ||
    node instanceof SiblingAdoptiveUnionNode ||
    (node instanceof NormalUnionNode && node._isPrimary)
  )
    return true;
  if (node instanceof NormalUnionNode) return false;
  if (node instanceof UnionNode) return false;
  return true;
}

/** X of the incoming point (parent line hits here). Container PersonNode → first child union's left card. */
export function incomingX(node: ChartNode): number {
  if (node instanceof UnionNode) {
    return node.x - CONNECTOR_WIDTH / 2 - PERSON_WIDTH / 2;
  }
  if (isContainer(node) && node.children.length > 0) {
    return incomingX(node.children[0]);
  }
  return node.x;
}

/** Y of the incoming point. */
export function incomingY(node: ChartNode): number {
  return node.y - PERSON_HEIGHT / 2;
}

/** X of the outgoing point (lines to children leave here). */
export function outgoingX(node: ChartNode): number {
  return node.x;
}

/** Y of the outgoing point (diamond bottom tip for union, card bottom for person). */
export function outgoingY(node: ChartNode): number {
  if (node instanceof UnionNode) {
    return node.y + DIAMOND_SIZE;
  }
  return node.y + PERSON_HEIGHT / 2;
}

/** Connector helpers for a given card height and width (display settings). */
export function getConnectors(personHeight: number, personWidth: number = PERSON_WIDTH): ConnectorHelpers {
  const incomingXFor = (node: ChartNode): number => {
    if (node instanceof UnionNode) return node.x - CONNECTOR_WIDTH / 2 - personWidth / 2;
    if (isContainer(node) && node.children.length > 0) return incomingXFor(node.children[0]);
    return node.x;
  };
  return {
    hasIncomingConnector,
    incomingX: incomingXFor,
    incomingY(node: ChartNode) {
      return node.y - personHeight / 2;
    },
    outgoingX,
    outgoingY(node: ChartNode) {
      if (node instanceof UnionNode) {
        return node.y + DIAMOND_SIZE;
      }
      return node.y + personHeight / 2;
    },
    isContainer,
  };
}
