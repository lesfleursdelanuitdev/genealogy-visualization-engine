/**
 * Static test/demo people for the descendancy chart.
 * Used when no API data is set (fallback in getPeople() in treeData).
 */

import type { DescendancyPerson } from "../types";

function person(
  o: Partial<DescendancyPerson> & {
    id: string;
    firstName: string;
    lastName: string;
  }
): DescendancyPerson {
  return {
    birthYear: null,
    deathYear: null,
    photoUrl: null,
    ...o,
  };
}

/** Build canonical people map for test/demo tree; nodes reference these by ID. */
export function buildPeople(): Map<string, DescendancyPerson> {
  const people = new Map<string, DescendancyPerson>();
  const add = (p: DescendancyPerson) => people.set(p.id, p);

  add(person({ id: "oliver", firstName: "Oliver", lastName: "Smith", birthYear: 2005, deathYear: null }));
  add(person({ id: "sophie", firstName: "Sophie", lastName: "Smith", birthYear: 2007, deathYear: null }));
  add(person({ id: "ethan", firstName: "Ethan", lastName: "Smith", birthYear: 2009, deathYear: null }));
  add(person({ id: "grace", firstName: "Grace", lastName: "Smith", birthYear: 2011, deathYear: null }));
  add(person({ id: "lucas", firstName: "Lucas", lastName: "Smith", birthYear: 2013, deathYear: null }));
  add(person({ id: "henry", firstName: "Henry", lastName: "Smith", birthYear: 1988, deathYear: null }));
  add(person({ id: "michael", firstName: "Michael", lastName: "Collins", birthYear: 1992, deathYear: null }));
  add(person({ id: "james", firstName: "James", lastName: "Smith", birthYear: 1978, deathYear: null }));
  add(person({ id: "susan", firstName: "Susan", lastName: "Lee", birthYear: 1952, deathYear: 2019 }));
  add(person({ id: "carol", firstName: "Carol", lastName: "Wright", birthYear: 1960, deathYear: null }));
  add(person({ id: "mary", firstName: "Mary", lastName: "Johnson", birthYear: 1925, deathYear: 2005 }));
  add(person({ id: "lisa", firstName: "Lisa", lastName: "Smith", birthYear: 1981, deathYear: null }));
  add(person({ id: "patricia", firstName: "Patricia", lastName: "Smith", birthYear: 1955, deathYear: null }));
  add(person({ id: "thomas", firstName: "Thomas", lastName: "Smith", birthYear: 1957, deathYear: null }));
  add(person({ id: "robert", firstName: "Robert", lastName: "Smith", birthYear: 1948, deathYear: null }));
  add(person({ id: "john", firstName: "John", lastName: "Smith", birthYear: 1920, deathYear: 1998 }));
  add(person({ id: "diana", firstName: "Diana", lastName: "Smith", birthYear: 2001, deathYear: null }));
  add(person({ id: "margaret", firstName: "Margaret", lastName: "Brown", birthYear: 1965, deathYear: null }));
  add(person({ id: "peter", firstName: "Peter", lastName: "Smith", birthYear: 2003, deathYear: null }));
  add(person({ id: "claire", firstName: "Claire", lastName: "Smith", birthYear: 2005, deathYear: null }));
  add(person({ id: "sam", firstName: "Sam", lastName: "Smith", birthYear: 2007, deathYear: null }));
  add(person({ id: "linda", firstName: "Linda", lastName: "Chen", birthYear: 1970, deathYear: null }));
  add(person({ id: "sophie2", firstName: "Sophie", lastName: "Smith", birthYear: 1995, deathYear: null }));
  add(person({ id: "ben", firstName: "Ben", lastName: "Smith", birthYear: 1997, deathYear: null }));
  add(person({ id: "rachel", firstName: "Rachel", lastName: "Patel", birthYear: 1968, deathYear: null }));
  add(person({ id: "nina", firstName: "Nina", lastName: "Rivera", birthYear: 1980, deathYear: null }));
  add(person({ id: "leo", firstName: "Leo", lastName: "Smith", birthYear: 2008, deathYear: null }));
  add(person({ id: "mia", firstName: "Mia", lastName: "Smith", birthYear: 2010, deathYear: null }));
  add(person({ id: "priya", firstName: "Priya", lastName: "Sharma", birthYear: 2003, deathYear: null }));
  add(person({ id: "zara", firstName: "Zara", lastName: "Smith", birthYear: 2024, deathYear: null }));
  add(person({ id: "kai", firstName: "Kai", lastName: "Nakamura", birthYear: 1999, deathYear: null }));
  add(person({ id: "anna", firstName: "Anna", lastName: "Smith", birthYear: 1985, deathYear: null }));
  add(person({ id: "finn", firstName: "Finn", lastName: "Smith", birthYear: 2015, deathYear: null }));
  add(person({ id: "isla", firstName: "Isla", lastName: "Smith", birthYear: 2018, deathYear: null }));
  add(person({ id: "jade", firstName: "Jade", lastName: "Morris", birthYear: 2001, deathYear: null }));
  add(person({ id: "noah", firstName: "Noah", lastName: "Smith", birthYear: 2023, deathYear: null }));
  add(person({ id: "alex", firstName: "Alex", lastName: "Smith", birthYear: 2010, deathYear: null }));
  add(person({ id: "unknown1", firstName: "Unknown", lastName: "", birthYear: null, deathYear: null }));
  add(person({ id: "unknown_patricia", firstName: "Unknown", lastName: "", birthYear: null, deathYear: null }));
  add(person({ id: "unknown_anna", firstName: "Unknown", lastName: "", birthYear: null, deathYear: null }));
  add(person({ id: "unknown_lisa", firstName: "Unknown", lastName: "", birthYear: null, deathYear: null }));

  return people;
}
