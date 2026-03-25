"use client";

import { useState, useCallback } from "react";

const MENU_PANELS = [
  "showHistoryPanel",
  "showInfo",
  "showSearchPanel",
  "showDepthPanel",
  "showSettings",
] as const;

type MenuPanelKey = (typeof MENU_PANELS)[number];

export interface PanelVisibilityState {
  showHistoryPanel: boolean;
  showInfo: boolean;
  showSearchPanel: boolean;
  showDepthPanel: boolean;
  showSettings: boolean;
  showLegendModal: boolean;
  showLegendPanel: boolean;
  showDebugPanel: boolean;
}

export interface PanelVisibilityActions {
  setShowHistoryPanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowInfo: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowSearchPanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowDepthPanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowSettings: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowLegendModal: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowLegendPanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowDebugPanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  closeAllMenuPanels: () => void;
  toggleHistoryPanel: () => void;
  toggleInfoPanel: () => void;
  toggleSearchPanel: () => void;
  toggleDepthPanel: () => void;
  toggleSettingsPanel: () => void;
}

export function usePanelVisibility(): PanelVisibilityState & PanelVisibilityActions {
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showDepthPanel, setShowDepthPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [showLegendPanel, setShowLegendPanel] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const closeAllMenuPanels = useCallback(() => {
    setShowHistoryPanel(false);
    setShowInfo(false);
    setShowSearchPanel(false);
    setShowDepthPanel(false);
    setShowSettings(false);
  }, []);

  const makeToggle = useCallback((key: MenuPanelKey) => () => {
    const setters = {
      showHistoryPanel: setShowHistoryPanel,
      showInfo: setShowInfo,
      showSearchPanel: setShowSearchPanel,
      showDepthPanel: setShowDepthPanel,
      showSettings: setShowSettings,
    };
    MENU_PANELS.forEach((k) => {
      if (k === key) setters[k]((v) => !v);
      else setters[k](false);
    });
  }, []);

  return {
    showHistoryPanel,
    setShowHistoryPanel,
    showInfo,
    setShowInfo,
    showSearchPanel,
    setShowSearchPanel,
    showDepthPanel,
    setShowDepthPanel,
    showSettings,
    setShowSettings,
    showLegendModal,
    setShowLegendModal,
    showLegendPanel,
    setShowLegendPanel,
    showDebugPanel,
    setShowDebugPanel,
    closeAllMenuPanels,
    toggleHistoryPanel: makeToggle("showHistoryPanel"),
    toggleInfoPanel: makeToggle("showInfo"),
    toggleSearchPanel: makeToggle("showSearchPanel"),
    toggleDepthPanel: makeToggle("showDepthPanel"),
    toggleSettingsPanel: makeToggle("showSettings"),
  };
}
