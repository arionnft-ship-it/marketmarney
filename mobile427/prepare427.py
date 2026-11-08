#!/usr/bin/env python3
from pathlib import Path
base=Path(__file__).resolve().parent
source=''.join((base/f'prepare427.newpart{i}').read_text() for i in range(1,5))
namespace={'__name__':'__main__','__file__':str(base/'prepare427.impl.py')}
exec(compile(source,namespace['__file__'],'exec'),namespace)
