export const copy = {
  app: {
    eyebrow: "Mekaniklabbet",
    title: "Interaktiva mekaniksimuleringar",
    description:
      "Utforska rörelsemängdsmoment, vridmoment och precession med interaktiva simuleringar. Välj en modell i menyn.",
    backToMenu: "Tillbaka till menyn"
  },
  menu: {
    title: "Välj en simulering",
    description:
      "Varje simulering har en egen modul, så att fler områden inom mekanik kan läggas till.",
    launch: "Öppna simulering",
    available: "Tillgänglig nu",
    upcoming: "Kommer snart",
    items: {
      gyroscope: {
        title: "Gyroskopets precession",
        description:
          "Visualisera vridmoment, rörelsemängdsmoment, precession och inbromsning i ett roterande gyroskop."
      },
      angularMomentum: {
        title: "Grunderna i rörelsemängdsmoment",
        description:
          "En kommande simulering som bygger intuition med enkla exempel på stela kroppar."
      }
    }
  },
  gyroscope: {
    app: {
      eyebrow: "Mekaniklabbet",
      title: "Gyroskopets precession",
      description:
        "En enkel gyroskopmodell där tyngdkraften skapar vridmoment, rotorns rotation ger rörelsemängdsmoment och rörelsen blir en stadig precession.",
      sceneLabel: "Gyroskop i 3D"
    },
    controls: {
      heading: "Reglage",
      spin: "Rotationshastighet",
      inertia: "Rotorns tröghetsmoment",
      mass: "Massa",
      leverArm: "Hävarm",
      tilt: "Lutningsvinkel",
      friction: "Rotationsfriktion",
      pause: "Pausa tiden",
      play: "Återuppta tiden"
    },
    stats: {
      heading: "Tillstånd",
      spin: "Rotationshastighet",
      tilt: "Lutningsvinkel",
      angularMomentum: "Rörelsemängdsmoment",
      torque: "Vridmoment",
      precession: "Precessionshastighet"
    },
    figure: {
      angularMomentum: "L",
      torque: "tau",
      position: "r",
      gravity: "F_g",
      equationTorque: "tau = r x F_g",
      equationPrecession: "Omega_p = m g l / (I omega)"
    },
    equations: {
      heading: "Ekvationer",
      displayTitle: "Matematiska uttryck",
      derivationTitle: "Härledning",
      variablesTitle: "Variabler i koden",
      glossaryTitle: "Variabelbeskrivningar och enheter",
      derivation: [
        "Tyngdkraften verkar nedåt på gyroskopets masscentrum.",
        "Eftersom kraften verkar på ett avstånd från vridpunkten skapar den ett vridmoment.",
        "Den roterande rotorn har ett rörelsemängdsmoment längs gyroskopets axel.",
        "Vid stadig precession vrider vridmomentet rörelsemängdsmomentsvektorn i sidled i stället för att bara välta gyroskopet.",
        "Med friktion minskar rotorns rotationshastighet långsamt och lutningen kan öka med tiden."
      ],
      display: [
        "<math display=\"block\"><mrow><msub><mi>F</mi><mi>g</mi></msub><mo>=</mo><mo>(</mo><mn>0</mn><mo>,</mo><mo>-</mo><mi>m</mi><mi>g</mi><mo>,</mo><mn>0</mn><mo>)</mo></mrow></math>",
        "<math display=\"block\"><mrow><mi>r</mi><mo>=</mo><mi>&ell;</mi><msub><mover><mi>e</mi><mo>^</mo></mover><mtext>axis</mtext></msub></mrow></math>",
        "<math display=\"block\"><mrow><mi>&tau;</mi><mo>=</mo><mi>r</mi><mo>&times;</mo><msub><mi>F</mi><mi>g</mi></msub></mrow></math>",
        "<math display=\"block\"><mrow><mi>L</mi><mo>=</mo><mi>I</mi><mi>&omega;</mi><msub><mover><mi>e</mi><mo>^</mo></mover><mtext>axis</mtext></msub></mrow></math>",
        "<math display=\"block\"><mrow><msub><mi>&Omega;</mi><mi>p</mi></msub><mo>=</mo><mfrac><mrow><mi>m</mi><mi>g</mi><mi>&ell;</mi></mrow><mrow><mi>I</mi><mi>&omega;</mi></mrow></mfrac></mrow></math>",
        "<math display=\"block\"><mrow><mfrac><mrow><mi>d</mi><mi>&omega;</mi></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mo>-</mo><mi>c</mi><mi>&omega;</mi></mrow></math>",
        "<math display=\"block\"><mrow><mi>&phi;</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>=</mo><msub><mi>&Omega;</mi><mi>p</mi></msub><mi>t</mi></mrow></math>",
        "<math display=\"block\"><mrow><mi>&psi;</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>=</mo><mi>&omega;</mi><mi>t</mi></mrow></math>"
      ],
      variables: [
        "<math display=\"block\"><mrow><mi>m</mi><mo>&rarr;</mo><mtext>mass</mtext></mrow></math>",
        "<math display=\"block\"><mrow><mi>g</mi><mo>&rarr;</mo><mtext>gravity</mtext></mrow></math>",
        "<math display=\"block\"><mrow><mi>&ell;</mi><mo>&rarr;</mo><mtext>leverArm</mtext></mrow></math>",
        "<math display=\"block\"><mrow><mi>I</mi><mo>&rarr;</mo><mtext>rotorInertia</mtext></mrow></math>",
        "<math display=\"block\"><mrow><mi>&omega;</mi><mo>&rarr;</mo><mtext>spinRate</mtext></mrow></math>",
        "<math display=\"block\"><mrow><mi>c</mi><mo>&rarr;</mo><mtext>friction</mtext></mrow></math>",
        "<math display=\"block\"><mrow><msub><mi>&Omega;</mi><mi>p</mi></msub><mo>&rarr;</mo><mtext>precessionRate</mtext></mrow></math>",
        "<math display=\"block\"><mrow><msub><mover><mi>e</mi><mo>^</mo></mover><mtext>axis</mtext></msub><mo>&rarr;</mo><mtext>bodyAxis</mtext></mrow></math>"
      ],
      glossary: [
        { symbol: "m", name: "Massa", units: "kg", description: "Gyroskopets massa som påverkas av tyngdkraften." },
        { symbol: "g", name: "Tyngdacceleration", units: "m/s^2", description: "Det nedåtriktade gravitationsfältets styrka." },
        { symbol: "l", name: "Hävarm", units: "m", description: "Avståndet från vridpunkten till masscentrum." },
        { symbol: "I", name: "Rotorns tröghetsmoment", units: "kg m^2", description: "Den roterande rotorns tröghetsmoment kring sin axel." },
        { symbol: "omega", name: "Rotationshastighet", units: "rad/s", description: "Gyroskopets vinkelhastighet kring sin egen axel." },
        { symbol: "c", name: "Friktionskoefficient", units: "1/s", description: "Linjär dämpning som långsamt minskar rotationshastigheten." },
        { symbol: "Omega_p", name: "Precessionshastighet", units: "rad/s", description: "Vinkelhastigheten för gyroskopaxelns rörelse kring lodlinjen." },
        { symbol: "L", name: "Rörelsemängdsmoment", units: "kg m^2 / s", description: "Den roterande rotorns rörelsemängdsmoment." },
        { symbol: "tau", name: "Vridmoment", units: "N m", description: "Tyngdkraftens vridande verkan kring vridpunkten." },
        { symbol: "F_g", name: "Tyngdkraft", units: "N", description: "Nedåtriktad tyngdkraft, lika med m g." },
        { symbol: "r", name: "Lägesvektor", units: "m", description: "Vektor från vridpunkten till masscentrum." },
        { symbol: "e_axis", name: "Axelriktning", units: "dimensionslös", description: "Enhetsvektor längs gyroskopets symmetriaxel." },
        { symbol: "phi(t)", name: "Precessionsvinkel", units: "rad", description: "Gyroskopaxelns azimutvinkel över tid." },
        { symbol: "psi(t)", name: "Rotationsvinkel", units: "rad", description: "Hjulets rotationsvinkel kring sin egen axel över tid." }
      ]
    }
  }
} as const;

export type Copy = typeof copy;
