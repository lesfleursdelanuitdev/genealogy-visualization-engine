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
} from "./GraphSnapshot";
export { countAncestors, parentFamilyToClimb, type AncestorClimbOptions } from "./queries";
