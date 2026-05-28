export const copy = {
  site: {
    domain: "physics.martinmagnusson.net",
    title: "Physics Apps",
    intro:
      "A humble abode for browser-based physics experiments, simulations, and study tools. Work in progress.",
    creditPrefix: "Vibecoded 2026 by Martin Magnusson, director of studies, Department of Physics, Lund University, Sweden",
    creditEmail: "martin.magnusson@fysik.lu.se",
    creditLicensePrefix: "Creative Commons licensing",
    creditLicenseLabel: "CC-BY-NC-SA",
    creditLicenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/?ref=chooser-v1",
    repositoryLabel: "Public GitHub repo",
    repositoryUrl: "https://github.com/camahama/Physics",
  },
  appsAriaLabel: "Physics apps",
  apps: {
    electricity: {
      title: "Electricity",
      description: "Interactive tools for electric fields, potentials, and circuits",
      label: "Electricity",
    },
    rainbow: {
      title: "Rainbow Physics",
      description: "A browser simulation for exploring rainbows and light",
      label: "Optics",
    },
    stirling: {
      title: "Stirling Engine Lab",
      description: "An interactive physics app for Stirling engine lab",
      label: "Thermodynamics",
    },
  },
} as const;
