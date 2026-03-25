/**
 * Config and defaults for FamilyTreeNodeFactory.
 */

import { PERSON_WIDTH, PERSON_HEIGHT, CONNECTOR_WIDTH } from "../strategies/descendancy/constants";

export interface FamilyTreeNodeFactoryConfig {
  personWidth?: number;
  personHeight?: number;
  unionWidth?: number;
  unionHeight?: number;
}

export const DEFAULT_PERSON_WIDTH = PERSON_WIDTH;
export const DEFAULT_PERSON_HEIGHT = PERSON_HEIGHT;
export const DEFAULT_UNION_WIDTH = PERSON_WIDTH + CONNECTOR_WIDTH + PERSON_WIDTH;
export const DEFAULT_UNION_HEIGHT = 20;
