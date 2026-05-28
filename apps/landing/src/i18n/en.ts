export const copy = {
  site: {
    domain: "physics.martinmagnusson.net",
    title: "Physics Apps",
    intro:
      "A small home for browser-based physics experiments, simulations, and study tools.",
    repositoryLabel: "Public GitHub repo",
    repositoryUrl: "https://github.com/camahama/Physics",
  },
  appsAriaLabel: "Physics apps",
  apps: {
    electricity: {
      title: "Electricity",
      description: "Interactive tools for electric fields, potentials, and circuits.",
      label: "Electricity",
    },
    rainbow: {
      title: "RainbowSim",
      description: "A browser simulation for exploring rainbows and light.",
      label: "Optics",
    },
    stirling: {
      title: "Stirling",
      description: "An interactive physics app centered on the Stirling cycle.",
      label: "Thermodynamics",
    },
  },
} as const;
