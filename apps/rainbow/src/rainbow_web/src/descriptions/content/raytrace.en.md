This content is currently automatically generated and will be developed further.

# What the simulation shows

This module focuses on geometry. A narrow beam hits a spherical droplet and splits into reflected and transmitted parts every time it meets the surface.

![Each contact point with the sphere creates both reflection and refraction, building a ray tree.](raytrace-overview.svg)

# Physics ideas

The Fresnel equations determine how much intensity goes into reflection and transmission. In this simplified visualization they are mainly used to weight the ray brightness.

$$
I = I_0 R^m T^k
$$

# Things to try

- Move the source sideways and follow how the entry point changes.
- Compare rays that pass near the center with rays that hit farther out.
- Look for how the number of internal reflections changes the visible intensity.
