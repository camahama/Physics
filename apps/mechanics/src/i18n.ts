export const copy = {
  app: {
    eyebrow: "Mechanics Lab",
    title: "Interactive Mechanics Simulations",
    description:
      "Explore angular momentum, torque, and precession through focused simulations. Start from the menu and open each model independently.",
    backToMenu: "Back to menu"
  },
  menu: {
    title: "Choose a simulation",
    description:
      "Each simulation lives in its own module so we can keep adding mechanics topics without tangling physics, UI, and scene code together.",
    launch: "Open simulation",
    available: "Available now",
    upcoming: "Coming next",
    items: {
      gyroscope: {
        title: "Gyroscope Precession",
        description:
          "Visualize torque, angular momentum, precession, and spin-down in a rotating gyroscope."
      },
      angularMomentum: {
        title: "Angular Momentum Basics",
        description:
          "A future simulation for building intuition from simpler rigid-body examples."
      }
    }
  },
  gyroscope: {
    app: {
      eyebrow: "Mechanics Lab",
      title: "Gyroscope Precession",
      description:
        "A simple gyroscope model where gravity creates torque, rotor spin sets angular momentum, and the resulting motion appears as steady precession.",
      sceneLabel: "3D gyroscope scene"
    },
    controls: {
      heading: "Controls",
      spin: "Spin rate",
      inertia: "Rotor inertia",
      mass: "Mass",
      leverArm: "Lever arm",
      tilt: "Tilt angle",
      friction: "Spin friction",
      pause: "Pause time",
      play: "Resume time"
    },
    stats: {
      heading: "State",
      spin: "Spin rate",
      tilt: "Tilt angle",
      angularMomentum: "Angular momentum",
      torque: "Torque",
      precession: "Precession rate"
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
      heading: "Equations",
      displayTitle: "Display Math",
      derivationTitle: "Teaching Derivation",
      variablesTitle: "Code Variable Mapping",
      glossaryTitle: "Variable Descriptions and Units",
      derivation: [
        "Gravity exerts a downward force on the gyroscope's center of mass.",
        "Because that force acts a distance away from the pivot, it creates a torque.",
        "The spinning rotor carries angular momentum along the gyroscope axis.",
        "For steady precession, the torque turns the angular momentum vector sideways instead of simply tipping it over.",
        "With friction added, the rotor slowly loses spin and the tilt can grow over time."
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
        { symbol: "m", name: "Mass", units: "kg", description: "Mass of the gyroscope acting under gravity." },
        { symbol: "g", name: "Gravitational acceleration", units: "m/s^2", description: "Strength of the downward gravitational field." },
        { symbol: "l", name: "Lever arm", units: "m", description: "Distance from the pivot to the center of mass." },
        { symbol: "I", name: "Rotor inertia", units: "kg m^2", description: "Moment of inertia of the spinning rotor about its axis." },
        { symbol: "omega", name: "Spin rate", units: "rad/s", description: "Angular speed of the gyroscope spinning about its own axis." },
        { symbol: "c", name: "Friction coefficient", units: "1/s", description: "Linear damping that slowly reduces the spin rate." },
        { symbol: "Omega_p", name: "Precession rate", units: "rad/s", description: "Angular speed of the gyroscope axis sweeping around vertical." },
        { symbol: "L", name: "Angular momentum", units: "kg m^2 / s", description: "Rotational momentum carried by the spinning rotor." },
        { symbol: "tau", name: "Torque", units: "N m", description: "Turning effect produced by gravity about the pivot." },
        { symbol: "F_g", name: "Gravity force", units: "N", description: "Downward force due to weight, equal to m g." },
        { symbol: "r", name: "Position vector", units: "m", description: "Vector from the pivot to the center of mass." },
        { symbol: "e_axis", name: "Axis direction", units: "unitless", description: "Unit vector pointing along the gyroscope symmetry axis." },
        { symbol: "phi(t)", name: "Precession angle", units: "rad", description: "Azimuthal angle traced out by the gyroscope axis over time." },
        { symbol: "psi(t)", name: "Spin angle", units: "rad", description: "Rotation angle of the wheel about its own axis over time." }
      ]
    }
  }
} as const;

export type Copy = typeof copy;
