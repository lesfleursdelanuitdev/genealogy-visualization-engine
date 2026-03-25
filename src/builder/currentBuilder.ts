/**
 * Holds the current FamilyTreeBuilder so global getters delegate to it.
 */

import type { DescendancyPerson } from "../types";
import type { UnionRecord } from "../types";
import type { FamilyTreeBuilder } from "./FamilyTreeBuilder";

let currentBuilder: FamilyTreeBuilder | null = null;

export function setCurrentBuilder(builder: FamilyTreeBuilder | null): void {
  currentBuilder = builder;
}

export function clearCurrentBuilder(): void {
  currentBuilder = null;
}

export function getPeople(): Map<string, DescendancyPerson> {
  return currentBuilder?.getPeople() ?? new Map();
}

export function getUnions(): UnionRecord[] {
  return currentBuilder?.getUnions() ?? [];
}

export function getUnionsByPerson(): Map<string, UnionRecord[]> {
  return currentBuilder?.getUnionsByPerson() ?? new Map();
}

export function getAllChildrenOf(personId: string): string[] {
  return currentBuilder?.getAllChildrenOf(personId) ?? [];
}

export function getParentUnionsByChild(): Map<string, UnionRecord[]> {
  return currentBuilder?.getParentUnionsByChild() ?? new Map();
}

export function getUnionById(): Map<string, UnionRecord> {
  return currentBuilder?.getUnionById() ?? new Map();
}

export function getBirthUnionByChild(): Map<string, UnionRecord> {
  return currentBuilder?.getBirthUnionByChild() ?? new Map();
}

export function getSpousesOf(personId: string): { spouseId: string; union: UnionRecord }[] {
  return currentBuilder?.getSpousesOf(personId) ?? [];
}
