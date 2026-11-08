# Dug tunnel return-height manifest

New digs in version-1 interior heightfields record the exact support level at the shared edge of the source tile. The opened tunnel is flat at that level, so a ramp-side or ramp-end approach remains traversable in both directions. Fractional levels are retained.

The additive save field is `digging.surfaces[areaKey]["x,y"] = { version: 1, elev }`. It is bounded by, and normalized against, the existing ordered `digging.dug` coordinates (60 per area). Valid unknown sibling fields are retained. Future-version coordinate records remain opaque and bounded, but are not interpreted as version 1.

Replay applies supported version-1 metadata only to version-1 interior heightfields. Coordinate-only saves, absent/invalid metadata, future metadata, overworld tunnels, and legacy maps use the historical tunnel geometry. No metadata is inferred from neighbours or synthesized for an old save.

Planning and commit both reject stale origins, changed support, temporary builds on either endpoint, malformed/out-of-range support, duplicates, and the existing area cap. The preflight is pure and runs before shovel crafting. Temporary places receive the correct live-map tunnel height but persist neither coordinate nor surface metadata. Treasure namespaces and `DIG.version` remain unchanged.
