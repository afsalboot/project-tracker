export const DEFAULT_SIDEBAR_THEME = "forest";

export const SIDEBAR_THEMES = [
  { id: "forest", name: "Indigo", description: "A crisp indigo workspace with a modern, focused feel.", background: "#172033", accent: "#4f46e5", accentHover: "#4338ca" },
  { id: "midnight", name: "Midnight", description: "A calm navy theme with cool blue depth.", background: "#17243b", accent: "#3568c8", accentHover: "#2955aa" },
  { id: "ocean", name: "Ocean", description: "A rich teal-blue theme with a crisp finish.", background: "#103b47", accent: "#0f7f8f", accentHover: "#0c6875" },
  { id: "plum", name: "Plum", description: "A warm, understated purple workspace theme.", background: "#3e2c49", accent: "#7b4b91", accentHover: "#653c78" },
  { id: "graphite", name: "Graphite", description: "A neutral dark theme for focused work.", background: "#282d33", accent: "#59636e", accentHover: "#454e57" },
];

export function sidebarTheme(themeId) {
  return SIDEBAR_THEMES.find((theme) => theme.id === themeId) || SIDEBAR_THEMES[0];
}
