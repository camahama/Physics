import type { SimulationId } from './registry';

export type Language = 'sv' | 'en';

const UI_TEXT_EN = {
  appTitle: 'Rainbow Physics Simulator - choose a module to begin',
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

const UI_TEXT_SV: typeof UI_TEXT_EN = {
  appTitle: 'Regnbågsfysik-simulator - välj en modul för att börja',
  appSubtitle: 'vibekodad av martin.magnusson@fysik.lu.se 2026',
  menuButton: 'Meny',
  fallbackTitle: 'Modulen är inte tillgänglig',
  fallbackBody: 'Den här modulen finns inte med i den aktuella byggnaden.',
  menuAriaLabel: 'Simuleringsmeny',
  languageLabel: 'Språk',
  languageSwitch: {
    sv: 'Svenska',
    en: 'Engelska',
  },
  panel: {
    infoButton: '(i)',
    infoButtonAriaPrefix: 'Öppna beskrivning för',
  },
  descriptionPage: {
    titleSuffix: 'beskrivning',
    lead: 'Pedagogisk genomgång med figurer och formler.',
    backToModule: 'Tillbaka till simuleringen',
    sectionWhat: 'Vad simuleringen visar',
    sectionPhysics: 'Fysikidéer',
    sectionTry: 'Saker att prova',
  },
  spectrumColors: {
    Red: 'Röd',
    Orange: 'Orange',
    Yellow: 'Gul',
    Green: 'Grön',
    Blue: 'Blå',
    Indigo: 'Indigo',
    Violet: 'Violett',
  },
  moduleButtons: {
    refraction: 'Brytning',
    prism: 'Prisma',
    raytrace: 'Strålgång',
    droplet: 'Regnbågsvinklar',
    droplet2: 'Spridning i droppe',
    rainbow: 'Regnbåge',
  },
  modules: {
    refraction: {
      title: 'Brytning',
      lead:
        'En plan våg går in i ett andra medium över en lutad gränsyta. Den lägre våghastigheten i det tätare mediet böjer utbredningsriktningen.',
      interfaceAngle: 'Gränsytans vinkel',
      mediumIndex: 'Brytningsindex n',
      canvasAria: 'Visualisering av brytningens vågfält',
    },
    prism: {
      title: 'Ljusets hastighet i medier - prismat',
      lead: 'Strålspårning i polygon med våglängdsberoende brytningsindex.',
      clear: 'Rensa',
      air: 'Luft',
      straight: 'Rak',
      rotated: 'Vinklad',
      prism: 'Prisma',
      angle: 'Vinkel',
      colorSeparation: 'Färgseparation i y-led',
      controlsAria: 'Kontroller för prismalägen',
      canvasAria: 'Visualisering av strålspårning i prisma',
      modeDescriptions: {
        air: 'Luftläge: alla färger färdas med samma hastighet och håller ihop.',
        block_straight: 'Rakt block: ljuset saktar in i mediet och rött ligger något före violett.',
        block_rotated: 'Vinklat block: parallella ytor bevarar utgående riktning men förskjuter strålen i sidled.',
        triangle: 'Triangulärt prisma: icke-parallella ytor ger en tydlig spektral uppdelning.',
      },
      legendNPrefix: 'n=',
    },
    raytrace: {
      title: 'Strålspårning i en sfär',
      dragHint: 'Dra var som helst för att flytta källstrålen.',
      lead: 'Strålen reflekteras och bryts genom sfären utan färgspridning i den här modulen.',
      canvasAria: 'Rekursiv strålspårning i sfärisk droppe',
      size: 'Droppstorlek',
    },
    droplet: {
      title: 'Regnbågsvinklar',
      lead:
        'Dra till vänster om mitten för den primära strålen och till höger för den sekundära. Klicka på en färg för att välja den och slå av eller på dess synlighet.',
      canvasAria: 'Primära och sekundära strålbanor i en sfärisk vattendroppe',
      rayFamiliesAria: 'Strålfamiljer',
      colorFocusAria: 'Färgsynlighet och fokus',
      primaryOn: 'Primär på',
      primaryOff: 'Primär av',
      secondaryOn: 'Sekundär på',
      secondaryOff: 'Sekundär av',
      optimalAngles: 'Ställ in optimala vinklar',
      radius: 'Droppradie',
      pxSuffix: 'px',
      focusedColor: 'Styrd färg',
      primaryDeflection: 'Avvikelse för primärstråle',
      secondaryDeflection: 'Avvikelse för sekundärstråle',
      notAvailable: 'Ej tillgänglig',
    },
    droplet2: {
      title: 'Ljusets dispersion i en droppe',
      lead:
        'Vitt ljus går in i en sfärisk vattendroppe och delas upp till ett spektrum. Slå av eller på enkel och dubbel reflektion. Det mesta ljuset går rakt igenom.',
      primaryStart: 'Primär: starta',
      primaryClear: 'Primär: rensa',
      secondaryStart: 'Sekundär: starta',
      secondaryClear: 'Sekundär: rensa',
      radius: 'Droppradie',
      controlsAria: 'Kontroller för droppdispersion',
      canvasAria: 'Animerad uppbyggnad av droppdispersion',
    },
    rainbow: {
      title: 'Regnbågssimulator',
      lead:
        'Regndroppar ändrar färg med observationsvinkeln när de faller. Placera droppar manuellt eller starta kraftigt regn och se en regnbåge växa fram.',
      clear: 'Rensa',
      drops: 'Droppar',
      activeDrops: 'Aktivt regn',
      rainIntensity: 'Regnintensitet',
      rate: 'Takt',
      manualInput: 'Manuell inmatning',
      manualHint: 'Dra förhandsvisningen och släpp för att placera en droppe',
      frameSuffix: '/s',
      canvasAria: 'Animerat fallande regn som bildar regnbåge',
    },
  },
};

export type UiText = typeof UI_TEXT_EN;
export type SpectrumColorName = keyof typeof UI_TEXT_EN.spectrumColors;

export const UI_TEXT: Record<Language, UiText> = {
  sv: UI_TEXT_SV,
  en: UI_TEXT_EN,
};

export function translateSpectrumColor(text: UiText, englishName: string): string {
  return text.spectrumColors[englishName as SpectrumColorName] ?? englishName;
}
