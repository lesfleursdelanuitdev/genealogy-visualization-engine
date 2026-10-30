/**
 * Real family shapes as test fixtures (T48, T49), with invented names only: this repo is
 * public, and real names never go into code, tests or screenshots.
 */
import { person, union, type GraphFixture } from "../helpers/graph";

/**
 * (a) A man marries his sister-in-law's niece: his brother's wife's sibling's daughter.
 *   Edgar + Freya Lund → Max, Ben. Carlos + Dina Costa → Ana, Rita.
 *   Ben + Ana. Rita + João Neves → Nora. Max + Nora.
 */
export function sisterInLawsNiece(): GraphFixture {
  return {
    people: [
      person("@A1@", "Edgar", "Lund"), person("@A2@", "Freya", "Lund"),
      person("@A3@", "Max", "Lund"), person("@A4@", "Ben", "Lund"),
      person("@A5@", "Carlos", "Costa"), person("@A6@", "Dina", "Costa"),
      person("@A7@", "Ana", "Costa"), person("@A8@", "Rita", "Costa"),
      person("@A9@", "João", "Neves"), person("@A10@", "Nora", "Neves"),
    ],
    unions: [
      union("@FA1@", "@A1@", "@A2@", ["@A3@", "@A4@"]),
      union("@FA2@", "@A5@", "@A6@", ["@A7@", "@A8@"]),
      union("@FA3@", "@A4@", "@A7@", []),
      union("@FA4@", "@A9@", "@A8@", ["@A10@"]),
      union("@FA5@", "@A3@", "@A10@", []),
    ],
  };
}

/**
 * (b) + (c), one family file.
 * (b) Tomás Vale's birth mother Rosa Vale died (his father is unknown). Henrik + Greta Brand
 *     adopted him; their biological sons Olav and Nils are his adoptive brothers.
 * (c) Olav Brand and his wife Inês (née Moura) adopted Inês's niece Lia, daughter of Inês's
 *     brother Rui Moura and Sara Pinto. Lia's biological sister Clara married Tomás (Lia's
 *     adoptive uncle); their son is Duarte. Abel + Berta Moura are Inês's and Rui's parents.
 * FAMC order on each record: birth family first, then the adoption.
 */
export function adoptedCousins(): GraphFixture & { famcOrder: Map<string, string[]> } {
  return {
    people: [
      person("@I10@", "Rosa", "Vale"), person("@I11@", "Tomás", "Vale"),
      person("@I20@", "Henrik", "Brand"), person("@I21@", "Greta", "Brand"),
      person("@I22@", "Olav", "Brand"), person("@I23@", "Nils", "Brand"),
      person("@I30@", "Inês", "Brand"), person("@I31@", "Rui", "Moura"), person("@I32@", "Sara", "Pinto"),
      person("@I41@", "Lia", "Moura"), person("@I42@", "Clara", "Moura"),
      person("@I50@", "Abel", "Moura"), person("@I51@", "Berta", "Moura"),
      person("@I60@", "Duarte", "Vale"),
    ],
    unions: [
      union("@F10@", "", "@I10@", ["@I11@"]),
      union("@F20@", "@I20@", "@I21@", [{ id: "@I11@", pedi: "adopted" }, "@I22@", "@I23@"]),
      union("@F50@", "@I50@", "@I51@", ["@I30@", "@I31@"]),
      union("@F30@", "@I22@", "@I30@", [{ id: "@I41@", pedi: "adopted" }]),
      union("@F31@", "@I31@", "@I32@", ["@I41@", "@I42@"]),
      union("@F40@", "@I11@", "@I42@", ["@I60@"]),
    ],
    famcOrder: new Map([
      ["@I11@", ["@F10@", "@F20@"]],
      ["@I41@", ["@F31@", "@F30@"]],
    ]),
  };
}

/**
 * (d) A well-known public case, invented names: Martin Kerr has three children with Wilma:
 * Ada, Dora, Carl. Later Martin has a son, Sven, with his daughter Dora (a second FAM).
 * Martin's own parents are Peter and Paula Kerr.
 */
export function fatherAndDaughter(): GraphFixture {
  return {
    people: [
      person("@K1@", "Martin", "Kerr"), person("@K2@", "Wilma", "Kerr"),
      person("@K3@", "Ada", "Kerr"), person("@K4@", "Dora", "Kerr"), person("@K5@", "Carl", "Kerr"),
      person("@K6@", "Sven", "Kerr"),
      person("@K7@", "Peter", "Kerr"), person("@K8@", "Paula", "Kerr"),
    ],
    unions: [
      union("@FK0@", "@K7@", "@K8@", ["@K1@"]),
      union("@FK1@", "@K1@", "@K2@", ["@K3@", "@K4@", "@K5@"]),
      union("@FK2@", "@K1@", "@K4@", ["@K6@"]),
    ],
  };
}
