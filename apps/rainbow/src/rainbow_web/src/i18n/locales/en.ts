import type { SimulationId } from '../../app/registry';

export const UI_TEXT_EN = {
  windowTitle: 'Rainbow Physics Simulations',
  appTitle: 'Rainbow Physics Simulator',
  appSubtitle: 'vibecoded by martin.magnusson@fysik.lu.se 2026',
  menuButton: 'Menu',
  fallbackTitle: 'Module unavailable',
  fallbackBody: 'This module is not available in the current build.',
  menuAriaLabel: 'Simulation menu',
  languageLabel: 'Language',
  languageSwitch: {
    sv: 'Swedish',
    en: 'English',
  },
  presentationDownload: 'Download a presentation (PDF)',
  panel: {
    infoButton: '(i)',
    infoButtonAriaPrefix: 'Open description for',
  },
  descriptionPage: {
    titleSuffix: 'description',
    lead: 'Pedagogical explanation with figures and formulas.',
    backToModule: 'Back to simulation',
    sectionWhat: 'What the simulation shows',
    sectionPhysics: 'Physics ideas',
    sectionTry: 'Things to try',
  },
  spectrumColors: {
    Red: 'Red',
    Orange: 'Orange',
    Yellow: 'Yellow',
    Green: 'Green',
    Blue: 'Blue',
    Indigo: 'Indigo',
    Violet: 'Violet',
  },
  moduleButtons: {
    refraction: 'Refraction',
    prism: 'Prism',
    raytrace: 'Ray tracing',
    droplet: 'Rainbow angles',
    droplet2: 'Droplet dispersion',
    rainbow: 'Rainbow',
  } as Record<SimulationId, string>,
  modules: {
    refraction: {
      title: 'Refraction',
      lead:
        'A plane wave enters a second medium across a tilted boundary. The lower wave speed in the denser medium bends the direction of travel.',
      interfaceAngle: 'Interface angle',
      mediumIndex: 'Medium index n',
      canvasAria: 'Refraction wave field visualization',
    },
    prism: {
      title: 'Light speed in media - the prism',
      lead: 'Polygon ray tracing with wavelength-dependent refractive indices.',
      clear: 'Clear',
      air: 'Air',
      straight: 'Straight',
      rotated: 'Rotated',
      prism: 'Prism',
      angle: 'Angle',
      colorSeparation: 'Color separation y-offset',
      controlsAria: 'Prism mode controls',
      canvasAria: 'Prism ray tracing visualization',
      modeDescriptions: {
        air: 'Air mode: all colors travel at the same speed and stay together.',
        block_straight: 'Straight block: light slows down in the medium, and red stays slightly ahead of violet.',
        block_rotated: 'Rotated block: parallel faces preserve the outgoing direction but shift the path sideways.',
        triangle: 'Triangular prism: non-parallel faces create a visible spectral fan.',
      },
      legendNPrefix: 'n=',
    },
    raytrace: {
      title: 'Ray tracing in a sphere',
      dragHint: 'Drag anywhere to move the source beam.',
      lead: 'The ray reflects and refracts through the sphere without color dispersion in this module.',
      canvasAria: 'Recursive ray tracing in a spherical droplet',
      size: 'Droplet size',
    },
    droplet: {
      title: 'Rainbow angles',
      lead:
        'Drag left of center to control the primary beam and right of center for the secondary beam. Click a color to select and toggle its visibility.',
      canvasAria: 'Primary and secondary ray paths in a spherical water droplet',
      rayFamiliesAria: 'Ray families',
      colorFocusAria: 'Color visibility and focus',
      primaryOn: 'Primary on',
      primaryOff: 'Primary off',
      secondaryOn: 'Secondary on',
      secondaryOff: 'Secondary off',
      optimalAngles: 'Set optimal angles',
      radius: 'Droplet radius',
      pxSuffix: 'px',
      focusedColor: 'Controlled color',
      primaryDeflection: 'Primary beam deflection',
      secondaryDeflection: 'Secondary beam deflection',
      notAvailable: 'N/A',
    },
    droplet2: {
      title: 'Light dispersion in a droplet',
      lead:
        'White light enters a spherical water droplet and disperses into a rainbow. Turn single and double reflection on or off. Most of the light passes through.',
      primaryStart: 'Primary: start',
      primaryClear: 'Primary: clear',
      secondaryStart: 'Secondary: start',
      secondaryClear: 'Secondary: clear',
      radius: 'Droplet radius',
      controlsAria: 'Droplet dispersion controls',
      canvasAria: 'Animated droplet accumulation',
    },
    rainbow: {
      title: 'Rainbow simulator',
      lead:
        'Raindrops change color with viewing angle as they fall. Place droplets manually or start heavy rain to watch a rainbow form.',
      clear: 'Clear',
      drops: 'Drops',
      activeDrops: 'Active rain',
      rainIntensity: 'Rain intensity',
      rate: 'Rate',
      manualInput: 'Manual input',
      manualHint: 'Drag preview, release to drop',
      frameSuffix: '/s',
      canvasAria: 'Animated falling rainbow rain',
    },
  },
};

export type UiText = typeof UI_TEXT_EN;
export type SpectrumColorName = keyof typeof UI_TEXT_EN.spectrumColors;

export function translateSpectrumColor(text: UiText, englishName: string): string {
  return text.spectrumColors[englishName as SpectrumColorName] ?? englishName;
}
