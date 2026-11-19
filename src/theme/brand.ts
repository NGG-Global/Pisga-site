/**
 * The single place that holds the programme's branding: names, logo and graphic paths,
 * and every brand colour. Maccabi has not yet approved the final branding, so nothing
 * brand-specific may be written anywhere else. Stylesheets read these values through
 * CSS custom properties that `applyBrand()` sets at start-up.
 */
export const brand = {
  programmeName: 'פסגה',
  tagline: 'המנהיגים של המחר',
  clientName: 'מכבי',

  logos: {
    programmeStacked: '/brand/logos/pisga-logo-stacked.svg',
    programmeHorizontal: '/brand/logos/pisga-logo-horizontal.svg',
    programmeSymbol: '/brand/logos/pisga-symbol.svg',
    client: '/brand/logos/maccabi-logo-blue.png',
  },

  graphics: {
    rangeOnLight: '/brand/graphics/summit-range-light.svg',
    rangeOnDark: '/brand/graphics/summit-range-dark.svg',
  },

  iconsPath: '/brand/icons',

  colors: {
    ink: '#0a2b63',
    'ink-muted': '#3d4f75',
    'ink-subtle': '#5b6b8c',
    accent: '#1e4fb8',
    'accent-hover': '#163f99',
    'on-accent': '#ffffff',
    'accent-on-dark': '#6fa8ff',
    'on-accent-on-dark': '#061a40',
    pale: '#e8f1ff',
    surface: '#f7f9ff',
    'surface-raised': '#ffffff',
    line: '#cfdaf0',
    'line-strong': '#7183a8',
    sky: '#b7d2ff',
    'todo-soft': '#fbefd8',
    todo: '#8a5200',
    'done-soft': '#e0f3ea',
    done: '#17694b',
    'danger-soft': '#fbe5e2',
    danger: '#b3261e',
    'hero-ink': '#f7f9ff',
    'hero-muted': '#b7d2ff',
    'ridge-near': '#3f74e0',
    'ridge-near-lit': '#5a8cf0',
    'ridge-far': '#b7d2ff',
    'ridge-far-lit': '#dbe7fb',
    'page-outside': '#e8eef8',
  },

  gradients: {
    ground: 'linear-gradient(180deg, #ffffff 0%, #f7f9ff 45%, #cfe0fc 100%)',
    hero: 'linear-gradient(to top right, #061a40 0%, #0a2b63 55%, #1a47a6 100%)',
  },
} as const;

export type IconName =
  | 'arrow' | 'calendar' | 'dialogue' | 'direction' | 'document' | 'download'
  | 'goal' | 'location' | 'milestone' | 'summit' | 'team';

export function iconPath(name: IconName): string {
  return `${brand.iconsPath}/${name}.svg`;
}

export function applyBrand(root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(brand.colors)) root.style.setProperty(`--${name}`, value);
  root.style.setProperty('--ground', brand.gradients.ground);
  root.style.setProperty('--hero', brand.gradients.hero);
}
