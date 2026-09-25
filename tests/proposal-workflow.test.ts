import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProposalWorkflow, POLICY, canonical, digest } from "../src/proposal-workflow.mjs";

class FixtureWorkflow extends ProposalWorkflow {
  fixture = { head: "a".repeat(40), tree: "b".repeat(40), branch: "main", dirty: false, dirtyDigest: digest(""), originMain: "a".repeat(40), originPages: "c".repeat(40), remote: POLICY.remote };
  snapshot() { return { ...this.fixture }; }
  gitText(...args: string[]) {
    if (args[0] === "diff") return "";
    return "";
  }
}

function setup(now = 1_800_000_000_000) {
  const root = mkdtempSync(join(tmpdir(), "ic-proposal-root-"));
  const store = mkdtempSync(join(tmpdir(), "ic-proposal-store-"));
  mkdirSync(join(root, "dist", "proving-ground"), { recursive: true });
  writeFileSync(join(root, "package.json"), '{"name":"fixture"}');
  for (const path of ["dist/index.html", "dist/manifest.webmanifest", "dist/sw.js", "dist/proving-ground/index.html", "dist/proving-ground/manifest.webmanifest", "dist/proving-ground/sw.js"]) writeFileSync(join(root, path), path);
  const runner = { run(command: string, args: string[]) { return { command: [command, ...args], exitCode: 0, stdoutDigest: digest("ok"), stderrDigest: digest("") }; } };
  const workflow = new FixtureWorkflow({ root: POLICY.repository, store, runner: runner as any, now: () => now });
  // Tests use the real policy root binding but fixture filesystem artifacts through a safe override.
  workflow.root = root;
  return { workflow, store, now };
}

test("canonical hashing is key-order stable", () => assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 })));

test("valid proposal is non-guessable and project bound", () => {
  const { workflow } = setup();
  const proposal = workflow.create({ channelId: POLICY.channelId, checkpoint: "checkpoint" });
  assert.match(proposal.proposalId, /^icp_[a-f0-9]{24}_[a-f0-9]{16}$/);
  assert.equal(proposal.projectId, POLICY.projectId);
  assert.equal(proposal.state, "DRAFT");
  assert.equal(proposal.repository, POLICY.repository);
});

test("wrong Discord channel is rejected before creation and push", () => {
  const { workflow } = setup();
  assert.throws(() => workflow.create({ channelId: "wrong" }), /unauthorized/);
  assert.throws(() => workflow.push(undefined, { channelId: "wrong" }), /unauthorized/);
});

test("wrong repository and remote are rejected", () => {
  assert.throws(() => new ProposalWorkflow({ root: "C:\\AI-PROJECTS\\infinite-corridor-evil", store: mkdtempSync(join(tmpdir(), "store-")) }), /escapes/);
  const { workflow } = setup(); workflow.fixture.remote = "https://example.invalid/other.git";
  assert.throws(() => workflow.create({ channelId: POLICY.channelId }), /wrong Git remote/);
});

test("bare push never deploys", () => {
  const { workflow } = setup();
  const result = workflow.push(undefined, { channelId: POLICY.channelId });
  assert.equal(result.ok, false); assert.match(result.message, /Bare push never deploys/);
});

test("unknown and malformed proposal identifiers fail", () => {
  const { workflow } = setup();
  assert.throws(() => workflow.show("../escape"), /invalid/);
  assert.throws(() => workflow.show(`icp_${"a".repeat(24)}_${"b".repeat(16)}`), /unknown/);
});

test("validation is idempotent and ends at Verdict Gate boundary", () => {
  const { workflow } = setup();
  const created = workflow.create({ channelId: POLICY.channelId });
  const first = workflow.validate(created.proposalId, { execute: true });
  assert.equal(first.ok, true); assert.equal(first.proposal.state, "WAITING_FOR_VERDICT_GATE");
  const second = workflow.validate(created.proposalId, { execute: true });
  assert.equal(second.idempotent, true); assert.equal(second.proposal.manifestDigest, first.proposal.manifestDigest);
});

test("push remains repeatedly blocked without protected verdict", () => {
  const { workflow } = setup();
  const created = workflow.create({ channelId: POLICY.channelId }); workflow.validate(created.proposalId);
  const before = workflow.fixture;
  const one = workflow.push(created.proposalId, { channelId: POLICY.channelId });
  const two = workflow.push(created.proposalId, { channelId: POLICY.channelId });
  assert.deepEqual(one, two); assert.equal(one.state, "WAITING_FOR_VERDICT_GATE");
  assert.equal(one.externalMutations, false); assert.deepEqual(workflow.fixture, before);
});

test("candidate, dependency, expiry, and dirty drift block reconciliation", () => {
  const { workflow, now } = setup();
  const p = workflow.create({ channelId: POLICY.channelId });
  workflow.fixture.head = "d".repeat(40); assert.match(workflow.push(p.proposalId, { channelId: POLICY.channelId }).message, /reconciliation failed/);
  workflow.fixture.head = p.candidateCommit; workflow.fixture.dirty = true; assert.equal(workflow.reconcile(workflow.show(p.proposalId)).ok, false);
  workflow.fixture.dirty = false; (workflow as any).now = () => now + POLICY.maxAgeMs + 1; assert.equal(workflow.reconcile(workflow.show(p.proposalId)).ok, false);
});

test("supersession is explicit, durable, idempotent, and blocks push", () => {
  const { workflow } = setup();
  const p = workflow.create({ channelId: POLICY.channelId });
  const first = workflow.supersede(p.proposalId, { channelId: POLICY.channelId });
  const second = workflow.supersede(p.proposalId, { channelId: POLICY.channelId });
  assert.equal(first.proposal.state, "SUPERSEDED"); assert.equal(second.idempotent, true);
  assert.match(workflow.push(p.proposalId, { channelId: POLICY.channelId }).message, /reconciliation failed/);
});

test("failed checks produce FAILED and cannot be aggregated as success", () => {
  const { workflow } = setup();
  (workflow as any).runner = { run(command: string, args: string[]) { return { command: [command, ...args], exitCode: command === "npm.cmd" && args[0] === "test" ? 1 : 0 }; } };
  const p = workflow.create({ channelId: POLICY.channelId });
  const result = workflow.validate(p.proposalId);
  assert.equal(result.ok, false); assert.equal(result.proposal.state, "FAILED");
  assert.equal(result.proposal.evidence.some((item: any) => item.status === "FAIL"), true);
});

test("dry-run preview changes no state and always reports protected blocker", () => {
  const { workflow } = setup();
  const p = workflow.create({ channelId: POLICY.channelId }); workflow.validate(p.proposalId);
  const before = canonical(workflow.show(p.proposalId));
  const preview = workflow.preview(p.proposalId);
  assert.equal(preview.plan.mode, "DRY_RUN_ONLY"); assert.equal(preview.plan.mutationsPerformed, false);
  assert.ok(preview.plan.blockers.includes("protected Verdict Gate authorization unavailable"));
  assert.equal(canonical(workflow.show(p.proposalId)), before);
});

test("manifest tampering and foreign project substitution are rejected", () => {
  const { workflow } = setup();
  const p = workflow.create({ channelId: POLICY.channelId });
  const path = join((workflow as any).store, p.proposalId, "current.json");
  const value = JSON.parse(readFileSync(path, "utf8")); value.projectId = "other"; writeFileSync(path, JSON.stringify(value));
  assert.throws(() => workflow.show(p.proposalId), /foreign proposal/);
});
