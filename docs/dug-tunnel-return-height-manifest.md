# Dug tunnel return-height manifest

New digs in version-1 interior heightfields record the exact support level at the shared edge of the source tile. The opened tunnel is flat at that level, so a ramp-side or ramp-end approach remains traversable in both directions. Fractional levels are retained.

The additive save field is `digging.surfaces[areaKey]["x,y"] = { version: 1, elev }`. It is bounded by, and normalized against, the existing ordered `digging.dug` coordinates (60 per area). Valid unknown sibling fields are retained. Future-version coordinate records remain opaque and bounded, but are not interpreted as version 1.

Replay applies supported version-1 metadata only to version-1 interior heightfields. Coordinate-only saves, absent/invalid metadata, future metadata, overworld tunnels, and legacy maps use the historical tunnel geometry. No metadata is inferred from neighbours or synthesized for an old save.

Planning and commit both reject stale origins, changed support, temporary builds on either endpoint, malformed/out-of-range support, duplicates, and the existing area cap. The preflight is pure and runs before shovel crafting. Temporary places receive the correct live-map tunnel height but persist neither coordinate nor surface metadata. Treasure namespaces and `DIG.version` remain unchanged.

The Proving Ground Close View scenario `terrain-dig-return` loads a real current-version keep floor for the entered seed. It prefers the audited `DIG-AUDIT0` ramp at `(18,25)` facing `(18,26)`, otherwise performs a bounded scan of the generated floor for the same production geometry and reports an honest no-candidate diagnostic when none exists. It starts on the ramp with a held ordinary shovel, quiet enemies, an “Excavation ramp” teleport target at the origin, and no pre-dug or stamped terrain.

Integrated merged r823 animation/state changes before final packaging. The r824 integration selection passed54/54 focused digging, actual fixture/Act, gate, temporary-area, unknown-save, pause/resume and release-consistency checks; sequential r824 build passed. Core component0d054adc and fixture delta402aefa8 each received independent Astra clearance. Full exact-head CI, current since-live release review, Preview and hosted Act/enter/return remain required.
