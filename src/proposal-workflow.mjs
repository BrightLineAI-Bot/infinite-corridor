import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const POLICY = Object.freeze({
  schema: "infinite-corridor-proposal/1.0.0",
  projectId: "8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6",
  repository: "C:\\AI-PROJECTS\\infinite-corridor",
  remote: "https://github.com/BrightLineAI-Bot/infinite-corridor.git",
  channelId: "1552902598372237312",
  mainBranch: "main",
  pagesBranch: "gh-pages",
  productionUrl: "https://brightlineai-bot.github.io/infinite-corridor/",
  provingGroundUrl: "https://brightlineai-bot.github.io/infinite-corridor/proving-ground/",
  verdictInterface: "orchestration-closure-record-v1",
  verdictPolicy: "protected-verdict-gate-required",
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
});

export const STATES = Object.freeze([
  "DRAFT", "IMPLEMENTED", "COMPONENT_VALIDATED", "INTEGRATION_VALIDATED",
  "WAITING_FOR_VERDICT_GATE", "VERDICT_REJECTED", "ELIGIBLE",
  "PROMOTION_STARTED", "DEPLOYED", "CONSUMED", "BLOCKED", "SUPERSEDED", "FAILED",
]);

const TERMINAL = new Set(["CONSUMED", "SUPERSEDED", "FAILED"]);
const PROTECTED = new Set(["ELIGIBLE", "PROMOTION_STARTED", "DEPLOYED", "CONSUMED"]);
const ID_RE = /^icp_[a-f0-9]{24}_[a-f0-9]{16}$/;

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value)).digest("hex");
}

function atomicJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  renameSync(temp, path);
}

export class CommandRunner {
  constructor(root = POLICY.repository) { this.root = resolve(root); }
  run(command, args, timeout = 300_000) {
    const startedAt = new Date().toISOString();
    const executable = process.platform === "win32" && command.toLowerCase().endsWith(".cmd")
      ? (process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe")
      : command;
    const executableArgs = executable === command ? args : ["/d", "/s", "/c", command, ...args];
    const result = spawnSync(executable, executableArgs, {
      cwd: this.root, encoding: "utf8", timeout, windowsHide: true,
      maxBuffer: 8 * 1024 * 1024, shell: false,
    });
    const stdout = String(result.stdout || "").slice(-64_000);
    const stderr = String(result.stderr || "").slice(-64_000);
    return {
      command: [command, ...args], startedAt, finishedAt: new Date().toISOString(),
      exitCode: Number.isInteger(result.status) ? result.status : -1,
      signal: result.signal || null, error: result.error?.message || null,
      stdoutDigest: digest(stdout), stderrDigest: digest(stderr),
      outputTail: `${stdout}\n${stderr}`.trim().slice(-4_000),
    };
  }
}

function requireInside(root, target) {
  const base = resolve(root);
  const full = resolve(target);
  if (full !== base && !full.startsWith(`${base}\\`) && !full.startsWith(`${base}/`)) {
    throw new Error("path escapes the Infinite Corridor repository");
  }
  return full;
}

export class ProposalWorkflow {
  constructor({ root = POLICY.repository, store, runner = new CommandRunner(root), now = () => Date.now() } = {}) {
    this.root = requireInside(POLICY.repository, root);
    this.store = resolve(store || process.env.IC_PROPOSAL_STORE || join(this.root, ".proposal-store"));
    this.runner = runner;
    this.now = now;
    mkdirSync(this.store, { recursive: true });
  }

  git(...args) {
    const receipt = this.runner.run("git", args, 60_000);
    if (receipt.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${receipt.outputTail}`);
    return receipt;
  }

  gitText(...args) {
    const result = spawnSync("git", args, { cwd: this.root, encoding: "utf8", windowsHide: true, shell: false });
    if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
    return String(result.stdout || "").trim();
  }

  snapshot() {
    const head = this.gitText("rev-parse", "HEAD");
    const tree = this.gitText("rev-parse", "HEAD^{tree}");
    const branch = this.gitText("branch", "--show-current");
    const dirty = this.gitText("status", "--porcelain=v1");
    const originMain = this.gitText("rev-parse", "origin/main");
    const originPages = this.gitText("rev-parse", "origin/gh-pages");
    const remote = this.gitText("remote", "get-url", "origin");
    return { head, tree, branch, dirty: Boolean(dirty), dirtyDigest: digest(dirty), originMain, originPages, remote };
  }

  proposalDir(id) {
    if (!ID_RE.test(String(id || ""))) throw new Error("invalid proposal ID");
    return join(this.store, id);
  }

  load(id) {
    const path = join(this.proposalDir(id), "current.json");
    if (!existsSync(path)) throw new Error("unknown proposal ID");
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (value.projectId !== POLICY.projectId || value.repository !== POLICY.repository) throw new Error("foreign proposal binding");
    const unsigned = { ...value };
    delete unsigned.manifestDigest;
    if (value.manifestDigest !== digest(unsigned)) throw new Error("proposal manifest integrity failure");
    return value;
  }

  save(value, event) {
    const prior = { ...value };
    delete prior.manifestDigest;
    const next = { ...prior, manifestDigest: digest(prior) };
    const dir = this.proposalDir(next.proposalId);
    mkdirSync(join(dir, "revisions"), { recursive: true });
    atomicJson(join(dir, "revisions", `${String(next.revision).padStart(4, "0")}.json`), next);
    atomicJson(join(dir, "current.json"), next);
    const eventPath = join(dir, "events", `${String(next.revision).padStart(4, "0")}-${event}.json`);
    atomicJson(eventPath, { event, at: new Date(this.now()).toISOString(), proposalId: next.proposalId, revision: next.revision, state: next.state, manifestDigest: next.manifestDigest });
    return next;
  }

  assertChannel(channelId) {
    if (String(channelId) !== POLICY.channelId) throw new Error("unauthorized Discord channel");
  }

  create({ channelId, title = "Infinite Corridor candidate", requirements = [], checkpoint = null } = {}) {
    this.assertChannel(channelId);
    const snap = this.snapshot();
    if (snap.remote.toLowerCase() !== POLICY.remote.toLowerCase()) throw new Error("wrong Git remote");
    if (snap.branch !== POLICY.mainBranch) throw new Error("proposal creation requires main");
    if (snap.dirty) throw new Error("proposal creation requires a clean committed candidate");
    const nonce = randomUUID().replaceAll("-", "");
    const createdAt = new Date(this.now()).toISOString();
    const seed = { projectId: POLICY.projectId, head: snap.head, tree: snap.tree, createdAt, nonce };
    const proposalId = `icp_${nonce.slice(0, 24)}_${digest(seed).slice(0, 16)}`;
    const changedFiles = this.gitText("diff", "--name-only", `${snap.originMain}..${snap.head}`).split(/\r?\n/).filter(Boolean).sort();
    const manifest = {
      schema: POLICY.schema, policyVersion: 1, proposalId, revision: 1,
      projectId: POLICY.projectId, repository: POLICY.repository, remote: POLICY.remote,
      authorizedChannelId: POLICY.channelId, title: String(title).slice(0, 200),
      state: "DRAFT", createdAt, updatedAt: createdAt, expiresAt: new Date(this.now() + POLICY.maxAgeMs).toISOString(),
      baseCommit: snap.originMain, candidateCommit: snap.head, candidateTree: snap.tree,
      branch: snap.branch, dirtyState: snap.dirty, dirtyDigest: snap.dirtyDigest,
      pagesBefore: snap.originPages, changedFiles,
      component: "main", ownedPaths: ["."], interfaces: { "local-save-schema": "14.0.0", "offline-pwa": "1.0.0", "offline-narrative-pack": "1.0.0" },
      checkpoint, requirements: requirements.map((item) => String(item).slice(0, 500)),
      acceptanceCriteria: ["complete test suite passes", "release build passes", "production and Proving Ground remain separate", "protected Verdict Gate PASS required for promotion"],
      validationCommands: [["npm.cmd", "test"], ["npm.cmd", "run", "build"]],
      evidence: [], evidenceBundleDigest: null, dependencySnapshotDigest: digest({ interfaces: { save: "14.0.0", pwa: "1.0.0", narrative: "1.0.0" }, package: readFileSync(join(this.root, "package.json"), "utf8") }),
      artifacts: {}, provingGround: { url: POLICY.provingGroundUrl, required: true, manualVerification: "UNVERIFIED" },
      production: { url: POLICY.productionUrl, required: true },
      verdictGate: { interface: POLICY.verdictInterface, policy: POLICY.verdictPolicy, endpointConfigured: false, verdict: "BLOCKED", verdictId: null },
      blockers: ["protected Verdict Gate authorization unavailable"],
      rollback: { main: snap.originMain, ghPages: snap.originPages }, supersededBy: null, consumedAt: null,
    };
    return this.save(manifest, "created");
  }

  list() {
    if (!existsSync(this.store)) return [];
    return readdirSync(this.store, { withFileTypes: true }).filter((entry) => entry.isDirectory() && ID_RE.test(entry.name)).map((entry) => this.load(entry.name)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  status() {
    const snap = this.snapshot();
    const proposals = this.list();
    return { ok: true, projectId: POLICY.projectId, repository: POLICY.repository, head: snap.head, clean: !snap.dirty, mainAligned: snap.head === snap.originMain, proposals: Object.fromEntries(STATES.map((state) => [state, proposals.filter((item) => item.state === state).length])), verifier: "UNAVAILABLE", promotionEnabled: false, nextBoundary: "WAITING_FOR_VERDICT_GATE" };
  }

  show(id) { return this.load(id); }

  reconcile(value) {
    const snap = this.snapshot();
    const problems = [];
    if (value.projectId !== POLICY.projectId) problems.push("wrong project UUID");
    if (value.repository !== POLICY.repository) problems.push("wrong repository root");
    if (snap.remote.toLowerCase() !== POLICY.remote.toLowerCase()) problems.push("wrong remote");
    if (snap.head !== value.candidateCommit || snap.tree !== value.candidateTree) problems.push("candidate drift");
    if (snap.dirty) problems.push("working tree is dirty");
    if (this.now() > Date.parse(value.expiresAt)) problems.push("proposal expired");
    if (TERMINAL.has(value.state)) problems.push(`proposal is ${value.state}`);
    if (value.dependencySnapshotDigest !== digest({ interfaces: { save: "14.0.0", pwa: "1.0.0", narrative: "1.0.0" }, package: readFileSync(join(this.root, "package.json"), "utf8") })) problems.push("dependency snapshot drift");
    return { ok: problems.length === 0, problems, snapshot: snap };
  }

  validate(id, { execute = true } = {}) {
    let value = this.load(id);
    const reconciliation = this.reconcile(value);
    if (!reconciliation.ok) return { ok: false, proposalId: id, state: value.state, reconciliation };
    if (["WAITING_FOR_VERDICT_GATE", "VERDICT_REJECTED"].includes(value.state) && value.evidenceBundleDigest) return { ok: true, idempotent: true, proposal: value };
    if (value.state !== "DRAFT" && value.state !== "IMPLEMENTED" && value.state !== "COMPONENT_VALIDATED" && value.state !== "INTEGRATION_VALIDATED") throw new Error(`cannot validate proposal in ${value.state}`);
    const receipts = execute ? [this.runner.run("npm.cmd", ["test"], 600_000), this.runner.run("npm.cmd", ["run", "build"], 300_000)] : [
      { command: ["npm.cmd", "test"], exitCode: 0, fixture: true }, { command: ["npm.cmd", "run", "build"], exitCode: 0, fixture: true },
    ];
    const results = receipts.map((receipt) => ({ requirement: receipt.command.join(" "), status: receipt.exitCode === 0 ? "PASS" : "FAIL", receiptDigest: digest(receipt), receipt }));
    const aggregate = results.every((item) => item.status === "PASS") ? "PASS" : "FAIL";
    const artifacts = {};
    for (const relative of ["dist/index.html", "dist/manifest.webmanifest", "dist/sw.js", "dist/proving-ground/index.html", "dist/proving-ground/manifest.webmanifest", "dist/proving-ground/sw.js"]) {
      const path = requireInside(this.root, join(this.root, relative));
      artifacts[relative] = existsSync(path) ? digest(readFileSync(path)) : null;
    }
    const evidenceBundle = { proposalId: id, revision: value.revision + 1, candidateCommit: value.candidateCommit, candidateTree: value.candidateTree, dependencySnapshotDigest: value.dependencySnapshotDigest, results, artifacts, aggregate };
    value = { ...value, revision: value.revision + 1, updatedAt: new Date(this.now()).toISOString(), state: aggregate === "PASS" ? "WAITING_FOR_VERDICT_GATE" : "FAILED", evidence: results, evidenceBundleDigest: digest(evidenceBundle), artifacts, blockers: aggregate === "PASS" ? ["protected Verdict Gate authorization unavailable"] : ["local validation failed"], verdictGate: { ...value.verdictGate, verdict: aggregate === "PASS" ? "BLOCKED" : "UNVERIFIED" } };
    return { ok: aggregate === "PASS", proposal: this.save(value, aggregate === "PASS" ? "validated-awaiting-verdict" : "validation-failed") };
  }

  preview(id) {
    const value = this.load(id);
    const reconciliation = this.reconcile(value);
    const plan = { mode: "DRY_RUN_ONLY", proposalId: id, candidateCommit: value.candidateCommit, candidateTree: value.candidateTree, destination: POLICY.remote, refs: { main: { before: reconciliation.snapshot.originMain, expected: value.candidateCommit }, ghPages: { before: reconciliation.snapshot.originPages, expectedArtifactDigest: digest(value.artifacts) } }, artifacts: value.artifacts, urls: { production: POLICY.productionUrl, provingGround: POLICY.provingGroundUrl }, rollback: value.rollback, mutationsPerformed: false, blockers: [...new Set([...value.blockers, ...reconciliation.problems, "protected Verdict Gate authorization unavailable"])] };
    return { ok: reconciliation.ok, previewDigest: digest(plan), plan };
  }

  push(id, { channelId } = {}) {
    this.assertChannel(channelId);
    if (!id) return { ok: false, state: "BLOCKED", message: "Bare push never deploys. Use push <proposal-id> after reviewing the proposal." , proposals: this.list().map(({ proposalId, state }) => ({ proposalId, state })) };
    const value = this.load(id);
    const reconciliation = this.reconcile(value);
    if (!reconciliation.ok) return { ok: false, state: "BLOCKED", message: "BLOCKED: proposal reconciliation failed", reconciliation };
    if (value.state !== "WAITING_FOR_VERDICT_GATE") return { ok: false, state: "BLOCKED", message: `BLOCKED: proposal state ${value.state} is not promotion-ready` };
    return { ok: false, state: "WAITING_FOR_VERDICT_GATE", proposalId: id, message: "BLOCKED: protected Verdict Gate authorization unavailable", externalMutations: false };
  }

  supersede(id, { channelId } = {}) {
    this.assertChannel(channelId);
    let value = this.load(id);
    if (value.state === "SUPERSEDED") return { ok: true, idempotent: true, proposal: value };
    if (PROTECTED.has(value.state) || value.state === "DEPLOYED") throw new Error(`cannot supersede proposal in ${value.state}`);
    value = { ...value, revision: value.revision + 1, updatedAt: new Date(this.now()).toISOString(), state: "SUPERSEDED", blockers: [...new Set([...value.blockers, "superseded by explicit project action"])] };
    return { ok: true, proposal: this.save(value, "superseded") };
  }
}
