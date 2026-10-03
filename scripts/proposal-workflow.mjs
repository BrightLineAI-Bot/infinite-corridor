#!/usr/bin/env node
import { ProposalWorkflow, POLICY } from "../src/proposal-workflow.mjs";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const action = process.argv[2] || "status";
const store = process.env.IC_PROPOSAL_STORE;
const workflow = new ProposalWorkflow({ store, root: process.env.IC_CANDIDATE_ROOT || POLICY.repository });
const channelId = arg("source") === "dot" ? "dot-owner" : arg("channel") || process.env.IC_DISCORD_CHANNEL_ID || "";
const id = arg("id");
let result;
try {
  if (action === "status") result = workflow.status();
  else if (action === "proposals") result = { ok: true, proposals: workflow.list() };
  else if (action === "proposal") result = { ok: true, proposal: workflow.show(id) };
  else if (action === "create") result = { ok: true, proposal: workflow.create({ channelId, title: arg("title") || "Infinite Corridor candidate", checkpoint: arg("checkpoint") || null }) };
  else if (action === "validate") {
    if (arg("fixture")) throw new Error("synthetic CLI validation is forbidden");
    result = workflow.validate(id);
  }
  else if (action === "preview") result = workflow.preview(id);
  else if (action === "push") result = workflow.push(id, { channelId });
  else if (action === "decide") result = workflow.decide(id, { channelId, ownerDecision: arg("owner-decision"), reviewDigest: arg("review-digest"), previewTested: arg("preview-tested") === "true" });
  else if (action === "publish-preview") result = workflow.publishPreview(id, { channelId, execute: arg("execute") === "true" });
  else if (action === "promote") result = workflow.promote(id, { channelId, execute: arg("execute") === "true" });
  else if (action === "recover-lock") result = workflow.recoverLock(id, { channelId, lockDigest: arg("lock-digest"), execute: arg("execute") === "true" });
  else if (action === "supersede") result = workflow.supersede(id, { channelId });
  else throw new Error(`unsupported action: ${action}`);
} catch (error) {
  result = { ok: false, error: error instanceof Error ? error.message : String(error), projectId: POLICY.projectId };
}
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exitCode = result.ok ? 0 : 2;

