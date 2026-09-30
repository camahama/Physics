export const copy = {
  site: {
    domain: "physics.martinmagnusson.net",
    title: "Fysikappar",
    intro:
      "En plats för fysikexperiment, simuleringar och studieverktyg i webbläsaren. Under utveckling.",
    creditPrefix: "Vibekodat 2026 av Martin Magnusson, studierektor, Fysiska institutionen, Lunds universitet, Sverige",
    creditEmail: "martin.magnusson@fysik.lu.se",
    creditLicensePrefix: "Creative Commons-licens",
    creditLicenseLabel: "CC-BY-NC-SA",
    creditLicenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/?ref=chooser-v1",
    repositoryLabel: "Publikt GitHub-arkiv",
    repositoryUrl: "https://github.com/camahama/Physics",
  },
  appsAriaLabel: "Fysikappar",
  apps: {
    electricity: {
      title: "Elektricitet",
      description: "Interaktiva verktyg för elektriska fält, potentialer och kretsar",
      label: "Elektricitet",
    },
    thermodynamics: {
      title: "Termodynamik",
      description: "Interaktiva verktyg för värme, temperatur, energi och entropi",
      label: "Termodynamik",
    },
    rainbow: {
      title: "Regnbågens fysik",
      description: "En simulering i webbläsaren för att utforska regnbågar och ljus",
      label: "Optik",
    },
    sundial: {
      title: "Solursdesigner",
      description: "Utforma platsanpassade solur för utskrift",
      label: "Astronomi",
    },
  },
} as const;
