"""Materialize the reviewed Marney 4.17 source without downloading an older build."""
from pathlib import Path
from zipfile import ZipFile
import argparse
import hashlib
import json
import shutil

HERE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(source, manifest):
    actual = {str(p.relative_to(source)): digest(p) for p in source.rglob('*') if p.is_file()}
    expected = manifest['files']
    if actual != expected:
        changed = sorted(p for p in set(actual) | set(expected) if actual.get(p) != expected.get(p))
        raise SystemExit('Source differs from the reviewed snapshot: ' + ', '.join(changed))
    print('Verified', len(actual), 'source files; version', manifest['version'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path.cwd())
    parser.add_argument('--verify-only', type=Path)
    args = parser.parse_args()
    manifest = json.loads((HERE / 'files417.json').read_text())
    if args.verify_only:
        verify(args.verify_only, manifest)
        return
    archive = HERE / 'source417.zip'
    logo = HERE / 'logo.png'
    if digest(archive) != manifest['source_archive_sha256'] or digest(logo) != manifest['logo_sha256']:
        raise SystemExit('Source archive or approved logo checksum does not match.')
    target = args.output / 'android417'
    if target.exists():
        raise SystemExit('Refusing to overwrite an existing source directory: ' + str(target))
    args.output.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive) as z:
        if z.testzip() is not None:
            raise SystemExit('Source archive integrity check failed.')
        names = set()
        for info in z.infolist():
            p = Path(info.filename)
            if (p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0] != 'android417'
                    or '\\' in info.filename or info.filename in names
                    or (info.external_attr >> 16) & 0o170000 == 0o120000):
                raise SystemExit('Unexpected source archive path: ' + info.filename)
            names.add(info.filename)
        z.extractall(args.output)
    for relative in manifest['logo_copies']:
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(logo, destination)
    verify(target, manifest)
    print(target)


if __name__ == '__main__':
    main()
