import { Game } from "./game.ts";
import { freshSave } from "./types.ts";

export const PROVING_GROUND_SEED = "CINDER-VERGE-47";

export const SHELTER_FIXTURES = [
  { id: "timber", label: "Timber shelter", rx: 0, ry: -1, family: "timber" },
  { id: "masonry", label: "Masonry house", rx: -2, ry: -2, family: "masonry" },
  { id: "gatehouse", label: "Ruined gatehouse", rx: 1, ry: 1, family: "ruinedGatehouse" },
  { id: "cyber", label: "Cyber relay", rx: 1, ry: -4, family: "cyberRelay" },
  { id: "alien", label: "Alien geometric shelter", rx: 3, ry: 2, family: "alienGeometric" },
  { id: "biomechanical", label: "Biomechanical shelter", rx: 2, ry: -3, family: "biomechanical" },
] as const;

export function createShelterFixture(id = "timber", now = 0) {
  const spec = SHELTER_FIXTURES.find((entry) => entry.id === id) || SHELTER_FIXTURES[0];
  const save = freshSave();
  save.name = "Proving Ground Wayfarer";
  save.seed = PROVING_GROUND_SEED;
  save.session.rx = spec.rx;
  save.session.ry = spec.ry;
  save.position.rx = spec.rx;
  save.position.ry = spec.ry;
  save.explored = { [`${spec.rx},${spec.ry}`]: true };
  save.checkpoints = {};
  save.activeCheckpoint = { rx: spec.rx, ry: spec.ry, x: 16, y: 16, name: "Proving Ground" };
  const game = new Game(save, now);
  game.installSystems();
  const shelter = game.map.objects.find((object) => object.kind === "shack" && object.family === spec.family);
  if (!shelter) throw new Error(`Fixture ${spec.id} did not generate ${spec.family}.`);
  const approach = shelter.entranceApproaches?.[0];
  if (!approach) throw new Error(`Fixture ${spec.id} has no validated entrance approach.`);
  game.player.x = approach.x;
  game.player.y = approach.y;
  save.session.x = approach.x;
  save.session.y = approach.y;
  save.position.x = approach.x;
  save.position.y = approach.y;
  return { spec, save, game, shelter, approach };
}

export function shelterFixtureReport(fixture) {
  const { spec, shelter, game } = fixture;
  return {
    mode: "developer-proving-ground",
    fixture: spec.id,
    label: spec.label,
    seed: game.save.seed,
    section: [game.rx, game.ry],
    family: shelter.family,
    shape: shelter.shape,
    theme: shelter.theme,
    enterable: shelter.enterable === true,
    entrances: shelter.entrances?.length || 0,
    interiorTiles: shelter.interior?.length || 0,
    boundaryTiles: shelter.boundary?.length || 0,
    area: game.area,
    player: { x: game.player.x, y: game.player.y },
  };
}
