"""Bounded extraction into a new directory; no archive entry is executed."""
import pathlib
import stat
import sys
import zipfile


def extract(archive, destination):
    root = pathlib.Path(destination)
    if root.exists() or root.is_symlink():
        raise ValueError('candidate extraction destination must be new')
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if len(entries) > 10000 or sum(entry.file_size for entry in entries) > 512 * 1024 * 1024:
            raise ValueError('archive exceeds extraction bounds')
        seen = set()
        for entry in entries:
            name = entry.filename.rstrip('/')
            parts = name.split('/')
            mode = entry.external_attr >> 16
            if (not name or '\\' in name or '\x00' in name or any(p in ('', '.', '..') for p in parts)
                    or parts[0] not in ('candidate.json', 'release', 'preview-site')
                    or (parts[0] == 'candidate.json' and (len(parts) != 1 or entry.is_dir()))
                    or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR))
                    or name.casefold() in seen):
                raise ValueError('unsafe or duplicate archive entry')
            seen.add(name.casefold())
        if 'candidate.json' not in seen:
            raise ValueError('archive lacks candidate manifest')
        root.mkdir(parents=True, exist_ok=False)
        for entry in entries:
            target = root.joinpath(*entry.filename.rstrip('/').split('/'))
            if entry.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with source.open(entry) as incoming, target.open('xb') as outgoing:
                written = 0
                while block := incoming.read(64 * 1024):
                    written += len(block)
                    if written > entry.file_size:
                        raise ValueError('archive entry exceeds declared size')
                    outgoing.write(block)


if __name__ == '__main__':
    extract(*sys.argv[1:])
