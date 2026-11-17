#!/usr/bin/env python3
"""Replay recorded game QA in a new scratch directory, never in the source repository."""
import argparse, hashlib, json, shutil, subprocess, sys
from pathlib import Path
PIN='04c11a0d3b73eeb9c767e9548cd3724c92a8dba9'
SUITES={
 'slow':('interactions','core/verify-slow.mjs'),
 'bombard':('interactions','weapons/bombard-glyphs.mjs'),
 'clone-cooldown':('interactions','spells/verify-clone-cooldown.mjs'),
 'supplies':('interactions','core/consumables.mjs'),
 'spells':('interactions','spells/matrix.mjs'),
 'spell-glyphs':('interactions','spells/glyph-cross.mjs'),
 'glyphs':('interactions','glyphs/audit.mjs'),
 'constellations':('interactions','glyphs/constellations.mjs'),
 'threshold':('baseline','reachability/natural-repro.mjs'),
 'save-economy':('baseline','saves-economy/audit.mjs'),
 'endurance':('baseline','endurance/run.mjs'),
 'bosses':('baseline','bosses/measure.mjs'),
 'far-array':('baseline','bosses/array.mjs'),
}
def fail(message):
 print('STOP: '+message,file=sys.stderr);sys.exit(2)
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--repo',required=True,type=Path,help='Separate clean checkout of the audited commit; not the later documentation branch')
 p.add_argument('--workdir',required=True,type=Path,help='New nonexistent scratch directory to retain results')
 p.add_argument('--suite',choices=sorted(SUITES),default='slow')
 a=p.parse_args();repo=a.repo.resolve();root=Path(__file__).resolve().parent;work=a.workdir.resolve()
 sha=subprocess.run(['git','-C',str(repo),'rev-parse','HEAD'],capture_output=True,text=True)
 if sha.returncode or sha.stdout.strip()!=PIN:fail('wrong source SHA; required '+PIN+', got '+sha.stdout.strip())
 for args in [['diff','--quiet'],['diff','--cached','--quiet']]:
  if subprocess.run(['git','-C',str(repo),*args]).returncode:fail('tracked source checkout is dirty')
 expected=json.loads((root/'source-sha256.json').read_text())
 for path,digest in expected.items():
  f=repo/path
  if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=digest:fail('source differs: '+path)
 if work.exists():fail('--workdir must not already exist; evidence will not be overwritten')
 if work==repo or repo in work.parents or work==root or root in work.parents:fail('scratch must be outside the source checkout and evidence package')
 work.mkdir(parents=True)
 names={'baseline':'ic-audit-cloud','interactions':'ic-interactions'}
 for phase,name in names.items():
  shutil.copytree(root/phase,work/name)
 (work/'ic-audit-cloud/repo').symlink_to(repo,target_is_directory=True)
 # Preserve originals. Only scratch copies get portable absolute artifact/source prefixes.
 for name in names.values():
  for f in (work/name).rglob('*'):
   if f.is_file() and not f.is_symlink() and f.suffix in {'.mjs','.py'} and 'repo' not in f.relative_to(work/name).parts:
    text=f.read_text();text=text.replace('/tmp/ic-audit-cloud',str(work/'ic-audit-cloud')).replace('/tmp/ic-interactions',str(work/'ic-interactions'));f.write_text(text)
 phase,script=SUITES[a.suite];target=work/names[phase]/script
 print('Source:',PIN,'\nSuite:',a.suite,'\nScratch:',work,flush=True)
 result=subprocess.run(['node',str(target)],cwd=str(repo))
 print('Exit:',result.returncode,'; inspect copied JSON/log evidence and assertions, not process exit alone.',flush=True)
 sys.exit(result.returncode)
if __name__=='__main__':main()
