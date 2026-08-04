export const DEFAULT_SIDEBAR_THEME = "forest";

export const SIDEBAR_THEMES = [
  { id: "forest", name: "Indigo", description: "A crisp indigo workspace with a modern, focused feel.", background: "#172033", accent: "#4f46e5", accentHover: "#4338ca" },
  { id: "midnight", name: "Midnight", description: "A calm navy theme with cool blue depth.", background: "#17243b", accent: "#3568c8", accentHover: "#2955aa" },
  { id: "ocean", name: "Ocean", description: "A rich teal-blue theme with a crisp finish.", background: "#103b47", accent: "#0f7f8f", accentHover: "#0c6875" },
  { id: "plum", name: "Plum", description: "A warm, understated purple workspace theme.", background: "#3e2c49", accent: "#7b4b91", accentHover: "#653c78" },
  { id: "graphite", name: "Graphite", description: "A neutral dark theme for focused work.", background: "#282d33", accent: "#59636e", accentHover: "#454e57" },
  { id: "evergreen", name: "Evergreen", description: "A natural deep green with a calm, productive character.", background: "#16372f", accent: "#187451", accentHover: "#125d41" },
  { id: "cobalt", name: "Cobalt", description: "A confident royal blue for clear, energetic workspaces.", background: "#172a4d", accent: "#285fbd", accentHover: "#204d9a" },
  { id: "ruby", name: "Ruby", description: "A refined berry-red palette with warm visual emphasis.", background: "#472330", accent: "#a93658", accentHover: "#892b47" },
  { id: "sunset", name: "Sunset", description: "A grounded burnt orange theme with welcoming warmth.", background: "#472c22", accent: "#a84f27", accentHover: "#873d1e" },
  { id: "bronze", name: "Bronze", description: "An earthy golden-brown palette with a polished finish.", background: "#403426", accent: "#8b6226", accentHover: "#704d1d" },
  { id: "orchid", name: "Orchid", description: "A vivid violet theme that feels creative and expressive.", background: "#382448", accent: "#8246a8", accentHover: "#69378a" },
  { id: "slate", name: "Slate Blue", description: "A muted blue-gray theme for a quiet professional look.", background: "#273342", accent: "#526a86", accentHover: "#41556d" },
];

export function sidebarTheme(themeId) {
  return SIDEBAR_THEMES.find((theme) => theme.id === themeId) || SIDEBAR_THEMES[0];
}
