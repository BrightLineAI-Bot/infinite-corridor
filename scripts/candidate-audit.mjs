#!/usr/bin/env node
// Offline observation only. Never stages, dispatches, authorizes, or publishes.
import { createHash } from 'node:crypto';
import { closeSync, lstatSync, openSync, readFileSync, readSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyCandidate, candidateId } from './pages-release.mjs';

export const REPOSITORY = 'BrightLineAI-Bot/infinite-corridor';
const SHA = /^[0-9a-f]{40}$/, DIGEST = /^sha256:[0-9a-f]{64}$/;
const fail = message => { throw new Error(message); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function exactKeys(value, required, optional = []) {
  if (!object(value) || required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail('Unexpected or missing evidence fields');
}
function bounded(value, max = 500) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) fail('Invalid bounded evidence text');
  return value;
}
function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail('Invalid observation timestamp');
  return value;
}
function binding(value) {
  exactKeys(value, ['proposalId', 'candidateCommit', 'candidateTree']);
  if (!SHA.test(value.candidateCommit) || !SHA.test(value.candidateTree) ||
      !/^r\d+-[0-9a-f]{12}$/.test(value.proposalId) || !value.proposalId.endsWith('-' + value.candidateCommit.slice(0, 12))) fail('Invalid exact candidate binding');
  return { ...value };
}
const same = (a, b) => ['proposalId', 'candidateCommit', 'candidateTree'].every(key => a[key] === b[key]);
function id(value) {
  // API IDs may eventually exceed JS precision; accept exact decimal strings too.
  if (!(Number.isSafeInteger(value) && value > 0) && !(typeof value === 'string' && /^[1-9]\d{0,24}$/.test(value))) fail('Invalid exact run/artifact identifier');
  return String(value);
}
function run(value, workflow, candidate) {
  if (value === undefined) return { status: 'unavailable', reason: 'No workflow snapshot supplied' };
  exactKeys(value, ['id', 'run_attempt', 'path', 'head_sha', 'head_branch', 'event', 'status', 'conclusion', 'html_url']);
  const runId = id(value.id), attempt = id(value.run_attempt);
  if (value.path !== `.github/workflows/${workflow}` || value.head_sha !== candidate.candidateCommit ||
      value.head_branch !== 'main' || !['push', 'workflow_dispatch'].includes(value.event) ||
      value.html_url !== `https://github.com/${REPOSITORY}/actions/runs/${runId}`) fail('Workflow snapshot is not bound to the exact main candidate');
  if (!['queued', 'in_progress', 'completed', 'waiting', 'pending', 'requested'].includes(value.status) ||
      ![null, 'success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral', 'stale', 'startup_failure'].includes(value.conclusion) ||
      (value.status !== 'completed' && value.conclusion !== null) || (value.status === 'completed' && value.conclusion === null)) fail('Invalid workflow status/conclusion');
  return { status: value.status === 'completed' ? (value.conclusion === 'success' ? 'reported_success' : 'reported_not_success') : 'pending',
    runId, attempt, workflow: value.path, commit: value.head_sha, branch: value.head_branch,
    event: value.event, runStatus: value.status, conclusion: value.conclusion, url: value.html_url,
    provenance: 'supplied_snapshot_not_authenticated' };
}
function report(value, candidate, baseline, review = false) {
  if (value === undefined) return { status: 'unavailable', reason: 'No report supplied' };
  exactKeys(value, ['candidate', 'status', 'reference', 'note', 'observedAt'], review ? ['liveBaseline'] : []);
  if (!same(binding(value.candidate), candidate)) fail('Report covers another candidate/tree');
  if (!['passed', 'failed', 'pending', 'unavailable', 'not_run'].includes(value.status)) fail('Invalid report status');
  const reference = bounded(value.reference, 300), note = bounded(value.note);
  // Opaque reference, never an authorization token or executable instruction.
  if (!/^(review|capture|device|conversation|operator):[A-Za-z0-9_.:/-]+$/.test(reference)) fail('Invalid report reference');
  const result = { status: `reported_${value.status}`, reference, note, observedAt: timestamp(value.observedAt), provenance: 'supplied_report_not_authenticated' };
  if (review) {
    if (!value.liveBaseline || !baseline) fail('Review needs an observed live baseline and exact reviewed baseline');
    result.liveBaseline = binding(value.liveBaseline);
    if (!same(result.liveBaseline, baseline)) fail('Review live baseline differs from the observed baseline');
  }
  return result;
}
export function readSnapshot(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) fail('Snapshot must be a regular JSON file of at most 1 MiB');
  return JSON.parse(readFileSync(path, 'utf8'));
}
function archiveDigest(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512 * 1024 * 1024) fail('Archive must be a regular file of at most 512 MiB');
  const fd = openSync(path, 'r'), hash = createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
  try { let count; while ((count = readSync(fd, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0, count)); }
  finally { closeSync(fd); }
  return 'sha256:' + hash.digest('hex');
}
function gitTree(directory, candidate) {
  if (!directory) return { status: 'unavailable', reason: 'No repository supplied for commit/tree lookup' };
  const git = (...args) => spawnSync('git', ['--no-replace-objects', '-C', resolve(directory), ...args],
    { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, env: { ...process.env, GIT_NO_LAZY_FETCH: '1' } });
  // Check the supplied object itself: ^{commit} or ^{tree} would peel annotated tags.
  const type = git('cat-file', '-t', candidate.candidateCommit);
  if (type.status !== 0) return { status: 'unavailable', reason: 'Candidate commit is unavailable in the supplied repository' };
  if (type.stdout.trim() !== 'commit') fail('Candidate commit SHA must name a commit object');
  const result = git('rev-parse', '--verify', `${candidate.candidateCommit}^{tree}`);
  if (result.status !== 0) return { status: 'unavailable', reason: 'Candidate commit is unavailable in the supplied repository' };
  if (result.stdout.trim() !== candidate.candidateTree) fail('Candidate commit/tree differs from Git');
  return { status: 'verified', commit: candidate.candidateCommit, tree: candidate.candidateTree };
}
export function auditCandidate({ candidateDirectory, evidence = {}, archivePath, repositoryDirectory, observedAt = new Date().toISOString() }) {
  exactKeys(evidence, [], ['repository', 'candidate', 'artifact', 'ci', 'preview', 'liveBaseline', 'review', 'acceptance']);
  // Existing verification remains authoritative for frozen inventories and preview isolation.
  const frozen = verifyCandidate(candidateDirectory);
  const candidate = binding(frozen.binding);
  if (frozen.id !== candidateId(frozen.release, frozen.commit) || !SHA.test(frozen.tree) || !/^[0-9a-f]{64}$/.test(frozen.digest)) fail('Invalid frozen candidate metadata');
  if (Object.keys(evidence).length && (evidence.repository !== REPOSITORY || !same(binding(evidence.candidate), candidate))) fail('Evidence must name this repository and exact candidate');
  const ci = run(evidence.ci, 'ci.yml', candidate), preview = run(evidence.preview, 'preview.yml', candidate);
  const artifact = { status: 'unavailable', reason: 'No Actions artifact snapshot supplied' };
  let archive = { status: 'unavailable', reason: 'No original downloaded archive supplied' };
  if (archivePath) archive = { status: 'hashed', sha256: archiveDigest(archivePath), relationToExtractedCandidate: 'not_established' };
  if (evidence.artifact !== undefined) {
    const value = evidence.artifact;
    exactKeys(value, ['id', 'name', 'expired', 'digest', 'workflow_run']);
    exactKeys(value.workflow_run, ['id', 'head_sha', 'head_branch']);
    if (value.name !== `candidate-${frozen.id}` || value.workflow_run.head_sha !== candidate.candidateCommit || value.workflow_run.head_branch !== 'main' ||
        typeof value.expired !== 'boolean' || !(value.digest === null || DIGEST.test(value.digest))) fail('Artifact snapshot does not name this frozen main candidate');
    const runId = id(value.workflow_run.id);
    if (preview.runId && runId !== preview.runId) fail('Artifact and Preview run identifiers differ');
    Object.assign(artifact, { status: value.expired ? 'reported_expired' : 'reported_available', artifactId: id(value.id), name: value.name, runId,
      digest: value.digest, provenance: 'supplied_snapshot_not_authenticated' });
    delete artifact.reason;
    if (archivePath && value.digest) {
      if (archive.sha256 !== value.digest) fail('Downloaded archive digest differs from supplied Actions digest');
      archive.status = 'matches_supplied_digest';
    }
  }
  let liveBaseline = { status: 'unavailable', reason: 'No live identity observation supplied' };
  if (evidence.liveBaseline !== undefined) {
    const value = evidence.liveBaseline;
    exactKeys(value, ['identity', 'ghPagesCommit', 'observedAt']);
    if (!SHA.test(value.ghPagesCommit)) fail('Live observation needs an exact gh-pages commit');
    liveBaseline = { status: 'reported', identity: binding(value.identity), ghPagesCommit: value.ghPagesCommit,
      observedAt: timestamp(value.observedAt), provenance: 'supplied_snapshot_not_authenticated', currentLiveRechecked: false };
  }
  const acceptanceInput = evidence.acceptance ?? {};
  exactKeys(acceptanceInput, [], ['hosted', 'visual', 'physicalPhone']);
  const acceptance = Object.fromEntries(['hosted', 'visual', 'physicalPhone'].map(key => [key, report(acceptanceInput[key], candidate)]));
  return { schema: 1, repository: REPOSITORY, observedAt: timestamp(observedAt), candidate,
    payload: { status: 'verified', digest: frozen.digest, algorithm: 'existing_inventoryDigest',
      manifestSha256: createHash('sha256').update(readFileSync(resolve(candidateDirectory, 'candidate.json'))).digest('hex') },
    git: gitTree(repositoryDirectory, candidate), artifact, archive, ci, preview, liveBaseline,
    review: report(evidence.review, candidate, liveBaseline.identity, true), acceptance,
    publicationAuthorized: false, releaseReadiness: 'not_assessed',
    limitations: ['This unsigned receipt is an observation, never user authorization or a publish gate.',
      'Supplied workflow and human reports are not independently authenticated. Missing evidence is unavailable.',
      'Archive digest matching does not establish that the extracted directory came from that archive.',
      'No main ancestry, hosted preview byte equality, current live identity, visual quality or phone performance is inferred.',
      'Existing CI, Preview and Publish checks and current owner review/acceptance requirements still apply.'] };
}
export function cli(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--candidate', '--evidence', '--archive', '--repository'].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i])) fail('Use unique --candidate directory [--evidence JSON] [--archive ZIP] [--repository checkout]');
    options[args[i]] = args[i + 1];
  }
  if (!options['--candidate']) fail('--candidate directory is required');
  return auditCandidate({ candidateDirectory: options['--candidate'], evidence: options['--evidence'] ? readSnapshot(options['--evidence']) : {},
    archivePath: options['--archive'], repositoryDirectory: options['--repository'] });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.stdout.write(JSON.stringify(cli(process.argv.slice(2)), null, 2) + '\n'); }
  catch (error) { process.stderr.write(`Candidate audit failed: ${error.message}\n`); process.exitCode = 1; }
}
