#!/usr/bin/env node
import { ProposalWorkflow, POLICY } from "../src/proposal-workflow.mjs";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const action = process.argv[2] || "status";
const store = process.env.IC_PROPOSAL_STORE;
const workflow = new ProposalWorkflow({ store });
const channelId = arg("channel") || process.env.IC_DISCORD_CHANNEL_ID || "";
const id = arg("id");
let result;
try {
  if (action === "status") result = workflow.status();
  else if (action === "proposals") result = { ok: true, proposals: workflow.list() };
  else if (action === "proposal") result = { ok: true, proposal: workflow.show(id) };
  else if (action === "create") result = { ok: true, proposal: workflow.create({ channelId, title: arg("title") || "Infinite Corridor candidate", checkpoint: arg("checkpoint") || null }) };
  else if (action === "validate") result = workflow.validate(id, { execute: arg("fixture") !== "true" });
  else if (action === "preview") result = workflow.preview(id);
  else if (action === "push") result = workflow.push(id, { channelId });
  else if (action === "supersede") result = workflow.supersede(id, { channelId });
  else throw new Error(`unsupported action: ${action}`);
} catch (error) {
  result = { ok: false, error: error instanceof Error ? error.message : String(error), projectId: POLICY.projectId };
}
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exitCode = result.ok ? 0 : 2;

