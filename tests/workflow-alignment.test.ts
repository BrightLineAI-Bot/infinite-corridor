import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('root agent instructions retain workflow and field-guide invariants', () => {
  const text = read('AGENTS.md');
  for (const pattern of [/Node 22\+/, /npm test/, /npm run build/, /Test Bot makes all code changes/, /operator-approved merge into local main/, /Hermes profile only investigates and publishes merged main/, /create, validate, publish-preview, promote/, /Each publication requires its own Discord approval card/, /disabled workspace-wide/, /\.change-control\/.*historical/, /Deterministic generation/, /Version generation namespaces/, /Save compatibility\/migrations/, /exact-resume/, /unknown fields/, /Production vs Proving Ground isolation/, /distinct storage\/cache namespaces/, /Mobile performance/, /bounded active actors/]) assert.match(text, pattern);
});

test('current workflow documentation separates implementation and publication approval', () => {
  for (const path of ['README.md', 'docs/HERMES_PROJECT_FIELD_GUIDE.md', 'docs/proposal-publication-workflow.md']) {
    const text = read(path);
    const current = text.split('\n\n').slice(0, 5).join('\n\n');
    for (const pattern of [/Test Bot makes all code changes/, /operator-approved merge into local main/, /Hermes profile only investigates and publishes merged main/, /create, validate, publish-preview, promote/, /separate Discord approval card/, /disabled workspace-wide/, /Verdict Gate.*historical/]) assert.match(current, pattern, path);
  }
  assert.match(read('docs/proposal-publication-workflow.md'), /publication branch from merged local main, without code changes/);
});

test('obsolete governance instructions are retained only in labelled historical contexts', () => {
  const guide = read('docs/HERMES_PROJECT_FIELD_GUIDE.md');
  const [current, historical] = guide.split('### Historical governance (superseded 2026-10-11; not instructions for new work)');
  assert.ok(historical);
  assert.doesNotMatch(current, /Mandatory before any project write/);
  assert.match(historical, /Mandatory before any project write/);
  assert.match(guide, /Historical record: the Change-Control evidence/);
  assert.match(guide, /Historical policy also required/);
  assert.match(guide, /HISTORICAL CONTRACT ALIGNMENT/);
  assert.doesNotMatch(guide, /any future durable-schema bump must update.*provider declaration together/);
  const decision = read('docs/decisions/0001-field-guide-consistency-stewardship.md');
  assert.match(decision, /Status:\*\* historical workflow, superseded/);
  assert.ok(decision.indexOf('Historical record:') < decision.indexOf('use `Change-Control.ps1`'));
});
