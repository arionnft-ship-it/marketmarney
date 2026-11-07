#!/usr/bin/env python3
"""Run the reviewed 4.24 patch after replacing one Java-string insertion with a line-safe insertion."""
from pathlib import Path

core = Path(__file__).with_name("prepare424_core.py")
source = core.read_text()
anchor = source.index('replace(main, "s.dataset.revision=\'423\'", "s.dataset.revision=\'424\'")')
start = source.index("\nreplace(main,\n'''        v.evaluateJavascript", anchor)
end = source.index("\n\n# The current guide", start)
replacement = r'''
# Insert theme synchronization after the existing depth installer line without
# rewriting the Java expression that contains nested string concatenation.
main_path = root / main
main_text = main_path.read_text()
marker = "        // Last stylesheet wins over the existing surface rules; no layout or routing changes.\n"
position = main_text.index(marker) + len(marker)
line_end = main_text.index("\n", position)
depth_line = main_text[position:line_end]
assert "MMDepth423" in depth_line and "evaluateJavascript" in depth_line
chrome_line = r'        v.evaluateJavascript("(function(){if(!("+ready+"))return;"+chromeScript+"\nif(window.MMChrome424)window.MMChrome424.install();})()",null);'
chrome_line = chrome_line.replace('\\"', '"')
main_text = main_text[:line_end + 1] + chrome_line + "\n" + main_text[line_end + 1:]
main_path.write_text(main_text)
'''
source = source[:start] + "\n" + replacement.strip("\n") + source[end:]
namespace = {"__file__": str(core), "__name__": "__main__"}
exec(compile(source, str(core), "exec"), namespace)
