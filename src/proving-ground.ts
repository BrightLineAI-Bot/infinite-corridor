import { createInput } from "./input.ts";
import { render, renderScaleForViewport } from "./renderer.ts";
import { SHELTER_FIXTURES, createShelterFixture, shelterFixtureReport } from "./proving-ground-fixtures.ts";

const canvas = document.querySelector("#game") as HTMLCanvasElement;
const app = document.querySelector("#app") as HTMLElement;
const ctx = canvas.getContext("2d")!;
document.body.classList.add("proving-ground");
document.querySelectorAll("#hud, dialog, #eventBanner, .story-scene").forEach((element) => ((element as HTMLElement).hidden = true));

const panel = document.createElement("aside");
panel.id = "provingGroundPanel";
panel.innerHTML = `
  <header><strong>Corridor Proving Ground</strong><span>Developer-only · progress is never saved</span></header>
  <label>Shelter fixture <select id="fixtureSelect"></select></label>
  <div class="proving-buttons">
    <button id="fixturePrevious">Previous</button><button id="fixtureNext">Next</button>
    <button id="fixtureReset">Reset fixture</button><button id="fixturePause">Pause</button>
  </div>
  <pre id="fixtureDiagnostics" aria-live="polite"></pre>
  <p>Move with drag, WASD, or arrow keys. Use Act to test doors and interiors. Attack, Tool, Dodge, Jump, Spell, and Potion use the production controls.</p>
  <div class="proving-buttons"><button id="fixtureCopy">Copy report</button><button id="fixtureExit">Exit to title</button></div>`;
document.body.append(panel);
const select = panel.querySelector("#fixtureSelect") as HTMLSelectElement;
for (const fixture of SHELTER_FIXTURES) select.add(new Option(fixture.label, fixture.id));

let current = createShelterFixture(select.value, performance.now());
let game = current.game;
const input = createInput(document, globalThis, { controlSmoothing: 38 });
let last = performance.now();
let paused = false;
let lastDiagnostic = 0;

function loadFixture(id: string) {
  current = createShelterFixture(id, performance.now());
  game = current.game;
  select.value = current.spec.id;
  paused = false;
  input.reset();
  last = performance.now();
  updateDiagnostics(true);
}
function updateDiagnostics(force = false) {
  const now = performance.now();
  if (!force && now - lastDiagnostic < 180) return;
  lastDiagnostic = now;
  const report = shelterFixtureReport(current);
  report.player = { x: Number(game.player.x.toFixed(2)), y: Number(game.player.y.toFixed(2)) };
  report.inside = current.shelter.interior?.some((cell) => Math.hypot(game.player.x - cell.x, game.player.y - cell.y) < .8) || false;
  report.paused = paused;
  (panel.querySelector("#fixtureDiagnostics") as HTMLElement).textContent = JSON.stringify(report, null, 2);
  (panel.querySelector("#fixturePause") as HTMLButtonElement).textContent = paused ? "Resume" : "Pause";
}
function resize() {
  const rect = app.getBoundingClientRect();
  const d = renderScaleForViewport(rect.width, rect.height, devicePixelRatio || 1, "balanced");
  canvas.width = Math.max(1, Math.round(rect.width * d));
  canvas.height = Math.max(1, Math.round(rect.height * d));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
function step(now: number) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
  last = now;
  input.update(dt);
  if (!paused) game.update(dt, input, now);
  render(ctx, game, canvas.clientWidth, canvas.clientHeight, now);
  updateDiagnostics();
  requestAnimationFrame(step);
}
function adjacent(delta: number) {
  const index = SHELTER_FIXTURES.findIndex((entry) => entry.id === current.spec.id);
  loadFixture(SHELTER_FIXTURES[(index + delta + SHELTER_FIXTURES.length) % SHELTER_FIXTURES.length].id);
}
select.addEventListener("change", () => loadFixture(select.value));
(panel.querySelector("#fixturePrevious") as HTMLButtonElement).onclick = () => adjacent(-1);
(panel.querySelector("#fixtureNext") as HTMLButtonElement).onclick = () => adjacent(1);
(panel.querySelector("#fixtureReset") as HTMLButtonElement).onclick = () => loadFixture(current.spec.id);
(panel.querySelector("#fixturePause") as HTMLButtonElement).onclick = () => { paused = !paused; game.setPaused(paused, performance.now()); input.reset(); updateDiagnostics(true); };
(panel.querySelector("#fixtureCopy") as HTMLButtonElement).onclick = async () => navigator.clipboard?.writeText(JSON.stringify(shelterFixtureReport(current), null, 2));
(panel.querySelector("#fixtureExit") as HTMLButtonElement).onclick = () => { location.href = `${location.pathname}${location.hash}`; };
addEventListener("resize", resize, { passive: true });
document.addEventListener("visibilitychange", () => { if (document.hidden) { paused = true; game.setPaused(true, performance.now()); input.reset(); updateDiagnostics(true); } });
resize();
updateDiagnostics(true);
requestAnimationFrame(step);
