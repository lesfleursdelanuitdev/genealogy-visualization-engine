/**
 * Layout and connector constants for the descendancy view.
 * Discoverable via builder.getCurrentStrategy().constants.
 */

export const PERSON_WIDTH = 330;
/** Height of person card; includes extra space for name area top/bottom padding. */
export const PERSON_HEIGHT = 212;
export const DIAMOND_SIZE = 7;
export const CONNECTOR_WIDTH = 40;

/** Minimum horizontal space between sibling subtrees */
export const GAP = 40;

/** Vertical space between generations */
export const VERTICAL_GAP = 100;

/** Padding around the chart for SVG viewport */
export const PADDING = 80;

/** Sibling view connector/legend colors. */
export const SIBLING_COLORS = {
  xyUnion: "#6366f1",
  xCatchAll: "#fbbf24",
  yCatchAll: "#2dd4bf",
  wvUnion: "#a78bfa",
  wCatchAll: "#fb7185",
  vCatchAll: "#38bdf8",
} as const;
