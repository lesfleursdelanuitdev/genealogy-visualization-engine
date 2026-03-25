"use client";

import { useState, useCallback } from "react";

export interface UseSpouseDrawerResult {
  /** Person id whose spouse drawer is open, or null if closed. */
  drawerPersonId: string | null;
  /** Open the drawer for the given person (e.g. "Show spouses"). */
  openDrawer: (personId: string) => void;
  /** Close the drawer. */
  closeDrawer: () => void;
  /**
   * Set drawer open state by id or null. For compatibility with context that
   * expects a single setter (id | null).
   */
  setDrawerPersonId: (id: string | null) => void;
}

export function useSpouseDrawer(): UseSpouseDrawerResult {
  const [drawerPersonId, setDrawerPersonIdState] = useState<string | null>(null);

  const openDrawer = useCallback((personId: string) => {
    setDrawerPersonIdState(personId);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerPersonIdState(null);
  }, []);

  const setDrawerPersonId = useCallback(
    (id: string | null) => {
      if (id === null) setDrawerPersonIdState(null);
      else setDrawerPersonIdState(id);
    },
    []
  );

  return { drawerPersonId, openDrawer, closeDrawer, setDrawerPersonId };
}
