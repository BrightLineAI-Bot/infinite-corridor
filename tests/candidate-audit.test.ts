import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { freeze, sourceRelease, stagePreview, stageRelease } from '../scripts/pages-release.mjs';
import { inventory, inventoryDigest } from '../src/release-artifact.mjs';
import { auditCandidate, cli, readSnapshot, REPOSITORY } from '../scripts/candidate-audit.mjs';

const commit = 'a'.repeat(40), tree = 'b'.repeat(40), at = '2026-11-09T12:00:00.000Z';
const N = sourceRelease(fileURLToPath(new URL('..', import.meta.url)));
const binding = { proposalId: `r${N}-${commit.slice(0, 12)}`, candidateCommit: commit, candidateTree: tree };
const live = { proposalId: 'r1-cccccccccccc', candidateCommit: 'c'.repeat(40), candidateTree: 'd'.repeat(40) };
function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), 'ic-candidate-audit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    'index.html': `<script>const release = "${N}";</script>`,
    'sw.js': `const CACHE=\`\${CACHE_PREFIX}v${N}\`; const url="./src/main.js?v=${N}";`,
    'manifest.webmanifest': '{}', 'styles.css': '', 'icon.svg': '<svg/>', 'assets/a.png': 'fixture',
    'src/main.js': `const build={release:${N}};const label="Release ${N}";`,
    'src/proving-ground-mobile.js': `const rows={"Game release":"${N}"};const ns="ic-proving-ground-scratch-v1";`,
    'proving-ground/index.html': `<title>Infinite Corridor - Proving Ground</title><strong>PROVING GROUND</strong><script src="../src/proving-ground-mobile.js?v=${N}"></script>`,
    'proving-ground/sw.js': `const CACHE=\`\${PREFIX}pg1-r${N}\`;`,
    'proving-ground/manifest.webmanifest': '{}',
  };
  writeFileSync(join(root, 'index.html'), files['index.html']);
  for (const [path, bytes] of Object.entries(files)) {
    mkdirSync(join(root, 'dist', path, '..'), { recursive: true });
    writeFileSync(join(root, 'dist', path), bytes);
  }
  const candidateDirectory = join(root, 'candidate');
  freeze({ root, dist: join(root, 'dist'), out: candidateDirectory, commit, tree });
  return { root, candidateDirectory };
}
function run(workflow = 'ci.yml', runId = 10) {
  return { id: runId, run_attempt: 2, path: `.github/workflows/${workflow}`, head_sha: commit, head_branch: 'main', event: 'push',
    status: 'completed', conclusion: 'success', html_url: `https://github.com/${REPOSITORY}/actions/runs/${runId}` };
}
function report(status = 'passed') { return { candidate: binding, status, reference: 'capture:fixture', note: 'Synthetic test evidence only', observedAt: at }; }
function evidence(): any {
  return { repository: REPOSITORY, candidate: binding, ci: run(), preview: run('preview.yml', 11),
    artifact: { id: '9007199254740993', name: `candidate-${binding.proposalId}`, expired: false, digest: null, workflow_run: { id: 11, head_sha: commit, head_branch: 'main' } },
    liveBaseline: { identity: live, ghPagesCommit: 'e'.repeat(40), observedAt: at },
    review: { ...report(), reference: 'review:fixture', liveBaseline: live }, acceptance: { hosted: report(), visual: report('unavailable'), physicalPhone: report('not_run') } };
}

test('bare audit verifies frozen bytes, preserves inputs, and leaves all external evidence unavailable', t => {
  const f = fixture(t), before = inventoryDigest(inventory(f.root));
  const result = auditCandidate({ ...f, observedAt: at });
  assert.deepEqual(result.candidate, binding);
  assert.equal(result.payload.status, 'verified');
  assert.match(result.payload.digest, /^[a-f0-9]{64}$/);
  assert.equal(result.artifact.status, 'unavailable');
  for (const key of ['ci', 'preview', 'review', 'liveBaseline', 'git', 'archive']) assert.equal(result[key].status, 'unavailable');
  for (const key of ['hosted', 'visual', 'physicalPhone']) assert.equal(result.acceptance[key].status, 'unavailable');
  assert.equal(result.publicationAuthorized, false);
  assert.equal(result.releaseReadiness, 'not_assessed');
  assert.equal(inventoryDigest(inventory(f.root)), before);
});

test('receipt preserves exact run attempts, artifact IDs, baseline and distinct unavailable visual/phone reports', t => {
  const result = auditCandidate({ ...fixture(t), evidence: evidence(), observedAt: at });
  assert.equal(result.ci.status, 'reported_success');
  assert.equal(result.preview.runId, '11');
  assert.equal(result.preview.attempt, '2');
  assert.equal(result.artifact.artifactId, '9007199254740993');
  assert.equal(result.artifact.digest, null);
  assert.deepEqual(result.liveBaseline.identity, live);
  assert.equal(result.liveBaseline.currentLiveRechecked, false);
  assert.equal(result.review.status, 'reported_passed');
  assert.equal(result.acceptance.visual.status, 'reported_unavailable');
  assert.equal(result.acceptance.physicalPhone.status, 'reported_not_run');
  assert.equal(result.publicationAuthorized, false);
});

for (const [label, mutate] of [
  ['repository mismatch', (e: any) => e.repository = 'other/repository'],
  ['candidate tree mismatch', (e: any) => e.candidate = { ...binding, candidateTree: 'f'.repeat(40) }],
  ['wrong CI commit', (e: any) => e.ci.head_sha = 'f'.repeat(40)],
  ['wrong Preview workflow', (e: any) => e.preview.path = '.github/workflows/publish.yml'],
  ['PR synthetic merge CI', (e: any) => e.ci.event = 'pull_request'],
  ['wrong branch', (e: any) => e.preview.head_branch = 'topic'],
  ['wrong run URL', (e: any) => e.preview.html_url += '?token=x'],
  ['artifact/run mismatch', (e: any) => e.artifact.workflow_run.id = 12],
  ['dry-run artifact', (e: any) => e.artifact.name = 'dryrun-' + binding.proposalId],
  ['wrong artifact commit', (e: any) => e.artifact.workflow_run.head_sha = 'f'.repeat(40)],
  ['wrong review tree', (e: any) => e.review.candidate = { ...binding, candidateTree: 'f'.repeat(40) }],
  ['stale review baseline', (e: any) => e.review.liveBaseline = binding],
  ['missing review baseline', (e: any) => delete e.review.liveBaseline],
  ['review without live observation', (e: any) => delete e.liveBaseline],
  ['invented acceptance waiver', (e: any) => e.acceptance.visual.status = 'not_applicable'],
  ['acceptance from wrong tree', (e: any) => e.acceptance.hosted.candidate = { ...binding, candidateTree: 'f'.repeat(40) }],
  ['authorization field', (e: any) => e.publicationAuthorized = true],
  ['unsafe numeric ID', (e: any) => e.artifact.id = 9007199254740992],
  ['noncanonical timestamp', (e: any) => e.liveBaseline.observedAt = '2026-02-30T12:00:00.000Z'],
  ['contradictory run status', (e: any) => e.ci.status = 'in_progress'],
  ['oversized note', (e: any) => e.review.note = 'x'.repeat(501)],
] as const) test(`audit rejects ${label}`, t => {
  const f = fixture(t), e = evidence(); mutate(e);
  assert.throws(() => auditCandidate({ ...f, evidence: e }));
});

for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out', 'neutral']) test(`workflow ${conclusion} is never successful evidence`, t => {
  const e = evidence(); e.ci.conclusion = conclusion;
  assert.equal(auditCandidate({ ...fixture(t), evidence: e }).ci.status, 'reported_not_success');
});

test('queued workflow is pending; artifact expiry and missing Preview stay explicit', t => {
  const e = evidence(); e.ci.status = 'queued'; e.ci.conclusion = null; e.artifact.expired = true; delete e.preview;
  const r = auditCandidate({ ...fixture(t), evidence: e });
  assert.equal(r.ci.status, 'pending'); assert.equal(r.preview.status, 'unavailable'); assert.equal(r.artifact.status, 'reported_expired');
});

test('archive hash matches only its supplied digest and never claims extracted provenance', t => {
  const f = fixture(t), archivePath = join(f.root, 'archive.zip'); writeFileSync(archivePath, 'synthetic archive bytes');
  const e = evidence(); e.artifact.digest = 'sha256:' + createHash('sha256').update(readFileSync(archivePath)).digest('hex');
  const before = inventoryDigest(inventory(f.root));
  const r = auditCandidate({ ...f, evidence: e, archivePath });
  assert.equal(r.archive.status, 'matches_supplied_digest');
  assert.equal(r.archive.relationToExtractedCandidate, 'not_established');
  assert.equal(inventoryDigest(inventory(f.root)), before);
  e.artifact.digest = 'sha256:' + '0'.repeat(64);
  assert.throws(() => auditCandidate({ ...f, evidence: e, archivePath }), /archive digest/);
});

test('changed frozen payload and invalid tree cannot produce a successful receipt', t => {
  const f = fixture(t);
  writeFileSync(join(f.candidateDirectory, 'release', 'styles.css'), 'tampered');
  assert.throws(() => auditCandidate(f), /artifact changed/);
  const g = fixture(t), path = join(g.candidateDirectory, 'candidate.json');
  const metadata = JSON.parse(readFileSync(path, 'utf8')); metadata.tree = metadata.binding.candidateTree = 'not-a-tree';
  for (const part of ['release', 'preview-site']) writeFileSync(join(g.candidateDirectory, part, 'release-identity.json'), JSON.stringify(metadata.binding));
  writeFileSync(path, JSON.stringify(metadata));
  assert.throws(() => auditCandidate(g));
});

test('Git lookup checks exact commit tree using local objects only', t => {
  const f = fixture(t), repo = join(f.root, 'repo'); mkdirSync(repo);
  function git(...args: string[]) {
    const r = spawnSync('git', ['-c', 'maintenance.auto=false', '-C', repo, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  }
  git('init', '-q'); git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture');
  const realCommit = git('rev-parse', 'HEAD'), realTree = git('rev-parse', 'HEAD^{tree}');
  // Freeze an independent candidate with the real fixture commit and tree.
  const directory = join(f.root, 'git-candidate');
  freeze({ root: f.root, dist: join(f.root, 'dist'), out: directory, commit: realCommit, tree: realTree });
  const before = inventoryDigest(inventory(repo));
  assert.equal(auditCandidate({ candidateDirectory: directory, repositoryDirectory: repo }).git.status, 'verified');
  const wrong = join(f.root, 'wrong-tree');
  freeze({ root: f.root, dist: join(f.root, 'dist'), out: wrong, commit: realCommit, tree });
  assert.throws(() => auditCandidate({ candidateDirectory: wrong, repositoryDirectory: repo }), /differs from Git/);
  assert.equal(auditCandidate({ ...f, repositoryDirectory: repo }).git.status, 'unavailable');
  assert.equal(inventoryDigest(inventory(repo)), before);
});

for (const objectType of ['tree', 'annotated tag']) test(`Git lookup rejects ${objectType} supplied as the candidate commit`, t => {
  const f = fixture(t), repo = join(f.root, 'repo'); mkdirSync(repo);
  function git(...args: string[]) {
    const r = spawnSync('git', ['-c', 'maintenance.auto=false', '-C', repo, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  }
  git('init', '-q'); git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture');
  const realTree = git('rev-parse', 'HEAD^{tree}');
  git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'tag', '-a', 'fixture-tag', '-m', 'Annotated fixture tag', 'HEAD');
  const fakeCommit = objectType === 'tree' ? realTree : git('rev-parse', 'refs/tags/fixture-tag');
  assert.equal(git('cat-file', '-t', fakeCommit), objectType === 'tree' ? 'tree' : 'tag');
  // Both objects peel successfully to the real tree; neither is itself a commit.
  assert.equal(git('rev-parse', `${fakeCommit}^{tree}`), realTree);
  const candidateDirectory = join(f.root, 'non-commit-candidate');
  freeze({ root: f.root, dist: join(f.root, 'dist'), out: candidateDirectory, commit: fakeCommit, tree: realTree });
  const before = inventoryDigest(inventory(f.root));
  assert.throws(() => auditCandidate({ candidateDirectory, repositoryDirectory: repo }), /must name a commit object/);
  const result = spawnSync(process.execPath, ['scripts/candidate-audit.mjs', '--candidate', candidateDirectory, '--repository', repo], { encoding: 'utf8' });
  assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.match(result.stderr, /must name a commit object/);
  assert.equal(inventoryDigest(inventory(f.root)), before);
});

test('CLI emits JSON to stdout with no filesystem writes and fails closed for unknown commands', t => {
  const f = fixture(t), before = inventoryDigest(inventory(f.root));
  const result = spawnSync(process.execPath, ['scripts/candidate-audit.mjs', '--candidate', f.candidateDirectory], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).publicationAuthorized, false);
  assert.equal(inventoryDigest(inventory(f.root)), before);
  for (const args of [[], ['publish'], ['--candidate', f.candidateDirectory, '--candidate', f.candidateDirectory], ['--candidate', f.candidateDirectory, '--out', f.root]]) assert.throws(() => cli(args));
  const bad = spawnSync(process.execPath, ['scripts/candidate-audit.mjs', '--candidate', join(f.root, 'absent')], { encoding: 'utf8' });
  assert.equal(bad.status, 1); assert.equal(bad.stdout, '');
});

test('snapshot reader rejects oversized input, symlinks and malformed JSON', t => {
  const f = fixture(t), path = join(f.root, 'evidence.json');
  writeFileSync(path, '{}'); assert.deepEqual(readSnapshot(path), {});
  const link = join(f.root, 'link'); symlinkSync(path, link); assert.throws(() => readSnapshot(link));
  writeFileSync(path, 'x'.repeat(1024 * 1024 + 1)); assert.throws(() => readSnapshot(path), /at most/);
  writeFileSync(path, '{'); assert.throws(() => readSnapshot(path));
});

// Existing staging functions mutate only this disposable copy. The audit remains read-only.
// Keep fixture Git metadata stable while the test inventories and copies it.
for (const tamperPreview of [false, true]) test(`isolated test-release rehearsal ${tamperPreview ? 'refuses altered preview bytes' : 'stages exact frozen bytes without certifying external gates'}`, t => {
  const f = fixture(t), ownerSite = join(f.root, 'owner-site'), rehearsalSite = join(f.root, 'rehearsal-site');
  mkdirSync(join(ownerSite, 'previews', live.proposalId), { recursive: true });
  writeFileSync(join(ownerSite, 'release-identity.json'), JSON.stringify(live));
  writeFileSync(join(ownerSite, 'index.html'), 'synthetic original live entry');
  writeFileSync(join(ownerSite, 'previews', live.proposalId, 'index.html'), 'synthetic retained live preview');
  writeFileSync(join(ownerSite, 'CNAME'), 'fixture.example.invalid');
  writeFileSync(join(ownerSite, '.nojekyll'), '');
  for (const args of [['init', '-q'], ['add', '--all'], ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic baseline']]) {
    const r = spawnSync('git', ['-c', 'maintenance.auto=false', '-C', ownerSite, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  }
  const beforeOwner = inventoryDigest(inventory(ownerSite)), beforeCandidate = inventoryDigest(inventory(f.candidateDirectory));
  cpSync(ownerSite, rehearsalSite, { recursive: true });
  const remotes = spawnSync('git', ['-C', rehearsalSite, 'remote'], { encoding: 'utf8' });
  assert.equal(remotes.status, 0); assert.equal(remotes.stdout, '');
  const beforeReceipt = auditCandidate({ ...f, observedAt: at });
  const stagedPreview = stagePreview({ site: rehearsalSite, candidate: f.candidateDirectory });
  assert.equal(stagedPreview.id, binding.proposalId);
  assert.deepEqual(JSON.parse(readFileSync(join(rehearsalSite, 'release-identity.json'), 'utf8')), live);
  if (tamperPreview) {
    writeFileSync(join(rehearsalSite, 'previews', binding.proposalId, 'index.html'), 'altered staged bytes');
    const beforeRefusal = inventoryDigest(inventory(rehearsalSite));
    assert.throws(() => stageRelease({ site: rehearsalSite, candidate: f.candidateDirectory }), /differs from the candidate artifact/);
    assert.equal(inventoryDigest(inventory(rehearsalSite)), beforeRefusal);
  } else {
    const stagedRelease = stageRelease({ site: rehearsalSite, candidate: f.candidateDirectory });
    assert.deepEqual(stagedRelease.previous, live);
    assert.deepEqual(stagedRelease.identity, binding);
    assert.deepEqual(JSON.parse(readFileSync(join(rehearsalSite, 'release-identity.json'), 'utf8')), binding);
    const files = JSON.parse(readFileSync(join(f.candidateDirectory, 'candidate.json'), 'utf8')).files;
    const stagedFiles = inventory(rehearsalSite, { ignoreGit: true });
    const rootFiles = Object.fromEntries(Object.entries(stagedFiles).filter(([path]) => !path.startsWith('previews/') && !['CNAME', '.nojekyll'].includes(path)));
    assert.equal(inventoryDigest(rootFiles), inventoryDigest(files.release));
    assert.equal(inventoryDigest(inventory(join(rehearsalSite, 'previews', binding.proposalId))), inventoryDigest(files.preview));
    assert.equal(readFileSync(join(rehearsalSite, 'CNAME'), 'utf8'), 'fixture.example.invalid');
    assert.equal(readFileSync(join(rehearsalSite, '.nojekyll'), 'utf8'), '');
    assert.equal(readFileSync(join(rehearsalSite, 'previews', live.proposalId, 'index.html'), 'utf8'), 'synthetic retained live preview');
  }
  // Successful local staging is not evidence of Actions, hosted acceptance or permission.
  const afterReceipt = auditCandidate({ ...f, observedAt: at });
  assert.deepEqual(afterReceipt, beforeReceipt);
  assert.equal(afterReceipt.ci.status, 'unavailable'); assert.equal(afterReceipt.preview.status, 'unavailable');
  assert.equal(afterReceipt.acceptance.visual.status, 'unavailable'); assert.equal(afterReceipt.acceptance.physicalPhone.status, 'unavailable');
  assert.equal(afterReceipt.publicationAuthorized, false);
  assert.equal(inventoryDigest(inventory(ownerSite)), beforeOwner);
  assert.equal(inventoryDigest(inventory(f.candidateDirectory)), beforeCandidate);
});
