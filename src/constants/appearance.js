export const DEFAULT_SIDEBAR_THEME = "forest";
export const DEFAULT_COLOR_MODE = "light";
export const COLOR_MODES = ["light", "dark"];

export const SIDEBAR_THEMES = [
  { id: "forest", mode: "light", name: "Indigo", description: "A crisp indigo workspace with a modern, focused feel.", background: "#172033", accent: "#4f46e5", accentHover: "#4338ca" },
  { id: "midnight", mode: "light", name: "Midnight", description: "A calm navy theme with cool blue depth.", background: "#17243b", accent: "#3568c8", accentHover: "#2955aa" },
  { id: "ocean", mode: "light", name: "Ocean", description: "A rich teal-blue theme with a crisp finish.", background: "#103b47", accent: "#0f7f8f", accentHover: "#0c6875" },
  { id: "plum", mode: "light", name: "Plum", description: "A warm, understated purple workspace theme.", background: "#3e2c49", accent: "#7b4b91", accentHover: "#653c78" },
  { id: "graphite", mode: "light", name: "Graphite", description: "A neutral dark navigation theme for a bright workspace.", background: "#282d33", accent: "#59636e", accentHover: "#454e57" },
  { id: "evergreen", mode: "light", name: "Evergreen", description: "A natural deep green with a calm, productive character.", background: "#16372f", accent: "#187451", accentHover: "#125d41" },
  { id: "cobalt", mode: "light", name: "Cobalt", description: "A confident royal blue for clear, energetic workspaces.", background: "#172a4d", accent: "#285fbd", accentHover: "#204d9a" },
  { id: "ruby", mode: "light", name: "Ruby", description: "A refined berry-red palette with warm visual emphasis.", background: "#472330", accent: "#a93658", accentHover: "#892b47" },
  { id: "sunset", mode: "light", name: "Sunset", description: "A grounded burnt orange theme with welcoming warmth.", background: "#472c22", accent: "#a84f27", accentHover: "#873d1e" },
  { id: "bronze", mode: "light", name: "Bronze", description: "An earthy golden-brown palette with a polished finish.", background: "#403426", accent: "#8b6226", accentHover: "#704d1d" },
  { id: "orchid", mode: "light", name: "Orchid", description: "A vivid violet theme that feels creative and expressive.", background: "#382448", accent: "#8246a8", accentHover: "#69378a" },
  { id: "slate", mode: "light", name: "Slate Blue", description: "A muted blue-gray theme for a quiet professional look.", background: "#273342", accent: "#526a86", accentHover: "#41556d" },
  { id: "dark-obsidian", mode: "dark", name: "Obsidian", description: "Deep charcoal surfaces with a focused indigo accent.", background: "#090d15", accent: "#5b55c7", accentHover: "#4b46aa" },
  { id: "dark-forest", mode: "dark", name: "Night Forest", description: "Near-black green surfaces with a rich evergreen accent.", background: "#071510", accent: "#147452", accentHover: "#105d42" },
  { id: "dark-ocean", mode: "dark", name: "Deep Ocean", description: "Dark blue-gray surfaces with a clear ocean accent.", background: "#08151e", accent: "#126f87", accentHover: "#0e5a6e" },
  { id: "dark-rose", mode: "dark", name: "Dark Rose", description: "A soft black canvas paired with a refined rose accent.", background: "#180d13", accent: "#a93658", accentHover: "#892b47" },
  { id: "dark-amber", mode: "dark", name: "Eclipse", description: "Warm charcoal surfaces with a restrained amber accent.", background: "#17130c", accent: "#8b6226", accentHover: "#704d1d" },
  { id: "dark-slate", mode: "dark", name: "Carbon Blue", description: "Cool carbon surfaces with a muted slate-blue accent.", background: "#0d1219", accent: "#526a86", accentHover: "#41556d" },
  { id: "dark-amethyst", mode: "dark", name: "Amethyst", description: "Inky violet surfaces with a sophisticated purple accent.", background: "#130c1c", accent: "#7041a1", accentHover: "#593382" },
  { id: "dark-arctic", mode: "dark", name: "Sapphire Night", description: "Ink-blue surfaces with a bold, unmistakably royal-blue accent.", background: "#080d24", accent: "#3156b8", accentHover: "#274594" },
  { id: "dark-crimson", mode: "dark", name: "Crimson Night", description: "A warm black-red canvas with a strong true-scarlet accent.", background: "#1b0807", accent: "#a32d25", accentHover: "#82231d" },
  { id: "dark-moss", mode: "dark", name: "Midnight Moss", description: "Earthy black-green surfaces with a muted moss accent.", background: "#10150b", accent: "#58752e", accentHover: "#465e24" },
  { id: "dark-copper", mode: "dark", name: "Burnished Copper", description: "Smoky brown surfaces paired with a warm copper accent.", background: "#190f0a", accent: "#95502d", accentHover: "#783f23" },
  { id: "dark-monochrome", mode: "dark", name: "Monochrome", description: "Pure charcoal surfaces with a restrained silver-gray accent.", background: "#0c0d0f", accent: "#555e6a", accentHover: "#444b55" },
];

export function themesForMode(mode = DEFAULT_COLOR_MODE) {
  return SIDEBAR_THEMES.filter((theme) => theme.mode === mode);
}

export function sidebarTheme(themeId, mode = DEFAULT_COLOR_MODE) {
  return SIDEBAR_THEMES.find((theme) => theme.id === themeId && theme.mode === mode) || themesForMode(mode)[0];
}
