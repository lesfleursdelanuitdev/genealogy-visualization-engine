"use client";

import { useState, useCallback, useEffect } from "react";
import { collectAllPersonNodes, findUnionContainingPerson } from "../bounds";
import { CONNECTOR_WIDTH, PERSON_WIDTH } from "../strategies/descendancy/constants";
import type { ChartNode } from "../nodes";

export interface UsePanToPersonOptions {
  root: ChartNode;
  centerOnPosition: (x: number, y: number) => void;
  bounds: { minX: number; maxX: number; maxY: number } | undefined;
}

export interface UsePanToPersonResult {
  centerOnPerson: (personId: string) => void;
  scheduleCenterOnPerson: (personId: string) => void;
}

/**
 * Hook to pan the chart to center on a person (by id). Handles both direct
 * person nodes and spouse positions from union nodes. scheduleCenterOnPerson
 * defers the pan until after the next layout (e.g. after open/close spouse).
 */
export function usePanToPerson({
  root,
  centerOnPosition,
  bounds,
}: UsePanToPersonOptions): UsePanToPersonResult {
  const [pendingCenterPersonId, setPendingCenterPersonId] = useState<
    string | null
  >(null);

  const centerOnPerson = useCallback(
    (personId: string) => {
      const nodes = collectAllPersonNodes(root);
      const node = nodes.find(
        (n) => n.content && (n.content as { id: string }).id === personId
      );
      if (
        node &&
        "x" in node &&
        "y" in node &&
        typeof node.x === "number" &&
        typeof node.y === "number"
      ) {
        centerOnPosition(node.x, node.y);
        return;
      }
      const found = findUnionContainingPerson(root, personId);
      if (found) {
        const { union, isLeft } = found;
        const ux =
          "x" in union && typeof union.x === "number" ? union.x : 0;
        const uy =
          "y" in union && typeof union.y === "number" ? union.y : 0;
        const half = CONNECTOR_WIDTH / 2 + PERSON_WIDTH / 2;
        const spouseX = ux + (isLeft ? -1 : 1) * half;
        centerOnPosition(spouseX, uy);
      }
    },
    [root, centerOnPosition]
  );

  const scheduleCenterOnPerson = useCallback((personId: string) => {
    setPendingCenterPersonId(personId);
  }, []);

  const boundsKey = bounds
    ? `${bounds.minX},${bounds.maxX},${bounds.maxY}`
    : "";

  useEffect(() => {
    if (pendingCenterPersonId == null || !root) return;
    centerOnPerson(pendingCenterPersonId);
    setPendingCenterPersonId(null);
  }, [pendingCenterPersonId, boundsKey, root, centerOnPerson]);

  return { centerOnPerson, scheduleCenterOnPerson };
}
