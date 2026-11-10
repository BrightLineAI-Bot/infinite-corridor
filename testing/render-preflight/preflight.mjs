#!/usr/bin/env node
// Read-only GitHub evidence acquisition; browser child receives no Actions credentials.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, openSync, writeSync, closeSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { auditCandidate, REPOSITORY } from '../../scripts/candidate-audit.mjs';
import { disjointPaths } from '../render-lab/resources.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/;
const fail = message => { throw Error(message); };
const exactId = value => typeof value === 'number' && !Number.isSafeInteger(value) ? fail('Imprecise API identifier') : String(value);
export function selection(input) {
  const keys = ['candidate_id','candidate_commit','candidate_tree','payload_digest','preview_run_id','artifact_id','archive_digest'];
  if (!input || Object.keys(input).length !== keys.length || keys.some(key => typeof input[key] !== 'string')) fail('Supply all seven exact candidate inputs');
  if (!/^r\d+-[a-f0-9]{12}$/.test(input.candidate_id) || !SHA.test(input.candidate_commit) || !SHA.test(input.candidate_tree) ||
      !input.candidate_id.endsWith('-' + input.candidate_commit.slice(0, 12)) || !HASH.test(input.payload_digest) || !/^sha256:[a-f0-9]{64}$/.test(input.archive_digest) ||
      !/^[1-9]\d{0,14}$/.test(input.preview_run_id) || !/^[1-9]\d{0,14}$/.test(input.artifact_id)) fail('Invalid exact candidate selection');
  return { ...input };
}
export function verifyMetadata(input, artifact, run) {
  const s = selection(input);
  if (exactId(artifact.id) !== s.artifact_id || artifact.name !== `candidate-${s.candidate_id}` || artifact.expired !== false || artifact.digest !== s.archive_digest ||
      exactId(artifact.workflow_run?.id) !== s.preview_run_id || artifact.workflow_run?.head_sha !== s.candidate_commit || artifact.workflow_run?.head_branch !== 'main' ||
      exactId(run.id) !== s.preview_run_id || run.path !== '.github/workflows/preview.yml' || run.head_sha !== s.candidate_commit || run.head_branch !== 'main' ||
      !['push','workflow_dispatch'].includes(run.event) || run.status !== 'completed' || run.conclusion !== 'success' ||
      run.html_url !== `https://github.com/${REPOSITORY}/actions/runs/${s.preview_run_id}` || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) fail('Actions metadata differs from named candidate selection');
  return {
    repository: REPOSITORY,
    candidate: { proposalId: s.candidate_id, candidateCommit: s.candidate_commit, candidateTree: s.candidate_tree },
    artifact: { id: artifact.id, name: artifact.name, expired: artifact.expired, digest: artifact.digest,
      workflow_run: { id: artifact.workflow_run.id, head_sha: artifact.workflow_run.head_sha, head_branch: artifact.workflow_run.head_branch } },
    preview: Object.fromEntries(['id','run_attempt','path','head_sha','head_branch','event','status','conclusion','html_url'].map(key => [key, run[key]])),
  };
}
export function browserEnvironment(env) {
  // Do not pass GitHub tokens, runtime upload credentials, NODE_OPTIONS or arbitrary env to candidate execution.
  return Object.fromEntries(['PATH','HOME','TMPDIR','LANG','LC_ALL','XDG_RUNTIME_DIR'].filter(key => env[key] !== undefined).map(key => [key, env[key]]));
}
async function metadata(path, token) {
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' },
    signal: AbortSignal.timeout(30000), redirect: 'error',
  });
  if (!response.ok) fail(`GitHub metadata request failed (${response.status})`);
  const text = await response.text();
  if (text.length > 1024 * 1024) fail('Actions metadata exceeds 1 MiB');
  return JSON.parse(text);
}
export async function downloadArchive(artifactId, token, destination, expected, fetcher = fetch) {
  const response = await fetcher(`https://api.github.com/repos/${REPOSITORY}/actions/artifacts/${artifactId}/zip`, {
    headers: { authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' },
    signal: AbortSignal.timeout(30000), redirect: 'manual',
  });
  // Drop Authorization explicitly on the signed cross-origin artifact download.
  if (response.status !== 302) fail(`Archive redirect unavailable (${response.status})`);
  const url = new URL(response.headers.get('location'));
  if (url.protocol !== 'https:' || url.username || url.password ||
      !(url.hostname === 'productionresultssa0.blob.core.windows.net' || /^[a-z0-9.-]+\.blob\.core\.windows\.net$/.test(url.hostname) || /^[a-z0-9.-]+\.githubusercontent\.com$/.test(url.hostname))) fail('Unexpected artifact storage origin');
  const archive = await fetcher(url, { signal: AbortSignal.timeout(120000), redirect: 'error' });
  if (!archive.ok || !archive.body) fail(`Archive download failed (${archive.status})`);
  let size = 0; const hash = createHash('sha256'), fd = openSync(destination, 'wx', 0o600);
  try {
    for await (const chunk of archive.body) {
      size += chunk.length;
      if (size > 512 * 1024 * 1024) fail('Archive exceeds 512 MiB');
      hash.update(chunk); writeSync(fd, chunk);
    }
  } finally { closeSync(fd); }
  if ('sha256:' + hash.digest('hex') !== expected) fail('Downloaded archive digest mismatch');
  return { status: 'verified', sha256: expected, bytes: size };
}
export function checkAudit(audit, input) {
  const s = selection(input);
  if (audit.candidate.proposalId !== s.candidate_id || audit.candidate.candidateCommit !== s.candidate_commit || audit.candidate.candidateTree !== s.candidate_tree ||
      audit.payload.digest !== s.payload_digest || audit.git.status !== 'verified' || audit.archive.status !== 'matches_supplied_digest' || audit.publicationAuthorized !== false) fail('Candidate audit does not match exact selection and local Git commit');
}
export async function preflight({ input, directory, repositoryDirectory, token }) {
  const output = resolve(directory);
  if (existsSync(output)) fail('Preflight output must be a new directory');
  // Refuse output in or enclosing the checked-out code before creating any evidence.
  disjointPaths(repositoryDirectory, output);
  mkdirSync(output, { recursive: true });
  const receipt = { schema: 1, scope: 'nonpublishing frozen-candidate Chrome preflight', status: 'blocked', startedAt: new Date().toISOString(),
    candidate: null, acquisition: 'not_run', extraction: 'not_run', artifactAudit: 'not_run', browser: 'not_run', cleanup: 'not_run', rendererClass: 'unknown', screenshots: 'unavailable',
    physicalPhone: 'not_measured', visualAcceptance: 'not_reviewed', publicationAuthorized: false, errors: [] };
  writeFileSync(join(output, 'preflight.log'), 'Preflight initialized; no deployment operations exist.\n');
  writeFileSync(join(output, 'preflight-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  try {
    const s = selection(input); receipt.candidate = s;
    if (!token) fail('Read-only Actions token unavailable');
    const artifact = await metadata(`/actions/artifacts/${s.artifact_id}`, token);
    const run = await metadata(`/actions/runs/${s.preview_run_id}`, token);
    const evidence = verifyMetadata(s, artifact, run);
    writeFileSync(join(output, 'actions-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
    const archivePath = join(output, 'candidate.zip');
    receipt.acquisition = await downloadArchive(s.artifact_id, token, archivePath, s.archive_digest);
    const candidateDirectory = join(output, 'candidate');
    const extracted = spawnSync('python3', [join(HERE, 'extract.py'), archivePath, candidateDirectory], { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, env: browserEnvironment(process.env) });
    writeFileSync(join(output, 'extraction.log'), (String(extracted.stdout || '') + String(extracted.stderr || '')).slice(-64000).replaceAll(token, '<credential omitted>'));
    if (extracted.status !== 0) fail('Bounded archive extraction failed; see extraction.log');
    receipt.extraction = 'verified_bounded_archive';
    const audit = auditCandidate({ candidateDirectory, evidence, archivePath, repositoryDirectory });
    checkAudit(audit, s);
    receipt.artifactAudit = 'verified_exact_candidate';
    writeFileSync(join(output, 'candidate-audit.json'), JSON.stringify(audit, null, 2) + '\n');
    receipt.acquisition = { ...receipt.acquisition, artifactId: s.artifact_id, previewRunId: s.preview_run_id, previewAttempt: evidence.preview.run_attempt,
      provenance: 'read_only_github_api_then_bounded_extraction', gitCommitTree: 'verified', payloadDigest: s.payload_digest };
    const chrome = '/usr/bin/google-chrome-stable';
    const version = spawnSync(chrome, ['--version'], { encoding: 'utf8', timeout: 10000, env: browserEnvironment(process.env) });
    if (version.status !== 0 || !/^Google Chrome \d+\./.test(version.stdout.trim())) fail('Preinstalled stable Google Chrome unavailable');
    receipt.chromeVersion = version.stdout.trim();
    receipt.worker = { imageOS: process.env.ImageOS || 'unknown', imageVersion: process.env.ImageVersion || 'unknown',
      preflightCommit: process.env.GITHUB_SHA || 'unknown', runId: process.env.GITHUB_RUN_ID || 'unknown', runAttempt: process.env.GITHUB_RUN_ATTEMPT || 'unknown' };
    const labOutput = join(output, 'render');
    const child = spawnSync(process.execPath, [join(HERE, '../render-lab/run.mjs'), '--candidate', candidateDirectory, '--digest', s.payload_digest, '--out', labOutput, '--chromium', chrome],
      { encoding: 'utf8', timeout: 420000, maxBuffer: 1024 * 1024, env: browserEnvironment(process.env) });
    writeFileSync(join(output, 'render-process.log'), String(child.stdout || '') + String(child.stderr || ''));
    receipt.cleanup = 'unconfirmed';
    receipt.browser = { exitCode: child.status, signal: child.signal, error: child.error ? 'Browser runner failed or timed out; cleanup not confirmed' : null };
    if (existsSync(join(labOutput, 'receipt.json'))) {
      const rendered = JSON.parse(readFileSync(join(labOutput, 'receipt.json'), 'utf8'));
      receipt.cleanup = rendered.cleanup || 'unconfirmed';
      receipt.rendererClass = rendered.rendererClass || 'unknown';
      if(rendered.offline)receipt.offline=rendered.offline;
      receipt.screenshots = rendered.scenarios?.flatMap(scenario =>
        scenario.captures ?? [scenario.firstScreenshot, scenario.screenshot, ...(scenario.witness?.screenshots || [])].filter(Boolean)) || [];
      const last = rendered.scenarios?.at(-1);
      const transport = rendered.errors?.find(message => /^(CDP timeout: [A-Za-z.]+|Browser probe deadline exceeded)$/.test(message));
      receipt.browserProbe = { phase: rendered.phase, scenario: last?.scenario, transport,
        display: rendered.display, requestedQuality: rendered.requestedCloseViewQuality,
        observed: rendered.scenarios?.filter(scenario => scenario.status === 'render-observed').length ?? 0 };
      receipt.scenes = rendered.scenarios?.map(({ scenario, status, reasons, samples, captures, witness, errors, webglCaptured }) => ({
        scenario, status, captures: captures?.length ?? 0, witness: witness?.status,
        witnessSummary: witness && { before:witness.before, covered:witness.covered, advanced:witness.advanced,
          last:witness.samples?.at(-1) ?? witness.encounter?.at(-1) },
        webglCaptured, errors: errors?.slice(0, 3).map(({method,details}) => ({
          method, status: details?.response?.status, resource: details?.type, cancelled: details?.canceled,
        })),
        reasons, frames: samples?.map(({ frame, active, backend, player, asset, gpu, effectiveQuality }) =>
          ({ frame, active, backend, player, asset, gpu: gpu?.state, heroGPU: gpu?.heroState, effectiveQuality })),
      }));
      receipt.failureScreenshot = rendered.failureScreenshot || { status: 'unavailable' };
      if (child.status === 0 && rendered.status === 'render-observed' && rendered.candidate?.digest === s.payload_digest && rendered.cleanup?.browserGroupStopped === true) receipt.status = 'render_observed';
    }
    if (receipt.status === 'blocked') fail('Chrome/WebGL2/imported render preflight blocked; inspect retained evidence');
  } catch (error) {
    // Deliberately omit arbitrary API bodies, signed download URLs and token-bearing errors.
    const message = String(error.message || 'Preflight error').replace(/https?:\/\/\S+/g, '<url omitted>').replaceAll(token || '\0', '<credential omitted>').slice(0, 500);
    receipt.errors.push(message); receipt.status = 'blocked';
  } finally {
    receipt.finishedAt = new Date().toISOString();
    writeFileSync(join(output, 'preflight-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    writeFileSync(join(output, 'preflight.log'), `${receipt.status}\n${receipt.errors.join('\n')}\n`);
  }
  return receipt;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const receipt = await preflight({ input: JSON.parse(process.env.PREFLIGHT_INPUTS || '{}'), directory: process.env.PREFLIGHT_OUTPUT,
    repositoryDirectory: process.cwd(), token: process.env.GH_TOKEN });
  // This summary is produced by the harness, not by console text from the candidate.
  console.log(JSON.stringify({ status: receipt.status, probe: receipt.browserProbe, renderer: receipt.rendererClass,
    acquisition: receipt.artifactAudit, cleanup: receipt.cleanup, scenes: receipt.scenes, offline: receipt.offline,
    screenshots: Array.isArray(receipt.screenshots) ? receipt.screenshots.length : 0 }));
  process.exitCode = receipt.status === 'render_observed' ? 0 : 2;
}
