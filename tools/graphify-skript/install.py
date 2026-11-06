"""Adds .sk support to the installed graphify, then checks it. Run again after upgrading graphify:
python tools/graphify-skript/install.py
"""
import shutil
import tempfile
from pathlib import Path

import graphify

PKG = Path(graphify.__file__).parent
HERE = Path(__file__).parent


def patch(file: str, old: str, new: str, marker: str) -> None:
    path = PKG / file
    text = path.read_bytes().decode("utf-8")
    if marker in text:
        return
    if text.count(old) != 1:
        raise SystemExit(f"{file}: this graphify changed, update install.py ({old!r} found {text.count(old)} times)")
    path.write_bytes(text.replace(old, new).encode("utf-8"))


shutil.copy(HERE / "skript.py", PKG / "extractors" / "skript.py")
patch("detect.py", "CODE_EXTENSIONS = {'.py',", "CODE_EXTENSIONS = {'.sk', '.py',", "'.sk'")
patch("extract.py", "\n_DISPATCH: dict[str, Any] = {",
      '\nfrom graphify.extractors.skript import extract_skript  # local change: .sk support\n'
      '_DISPATCH: dict[str, Any] = {\n    ".sk": extract_skript,', "extract_skript")

# Check: a fresh process would see the same files, so test the extractor itself on two scripts.
from graphify.detect import CODE_EXTENSIONS  # noqa: E402
from graphify.extractors.skript import extract_skript  # noqa: E402

assert ".sk" in CODE_EXTENSIONS
with tempfile.TemporaryDirectory() as d:
    a, b = Path(d) / "a.sk", Path(d) / "b.sk"
    a.write_text('function helper(x: text) :: text:\n\treturn "%other()%"\n\n# function ghost():\n'
                 'on join:\n\tset {_v} to helper("a") # gone()\n\texecute console command "/heal %player%"\n'
                 '\tnotAFunction(1)\n\nevery 5 ticks:\n\thelper("b")\n', encoding="utf-8")
    b.write_text('function other():\n\tstop\n\ncommand /heal <text>:\n\ttrigger:\n\t\thelper("c")\n', encoding="utf-8")
    r = extract_skript(a)
    labels = {n["label"] for n in r["nodes"]}
    assert labels == {"a.sk", "helper()", "on join", "every 5 ticks"}, labels
    ids = {n["label"]: n["id"] for n in r["nodes"]}
    links = {(e["source"], e["relation"]) for e in r["edges"]}
    assert (ids["helper()"], "calls") in links      # inside %...% in text, to another file
    assert (ids["on join"], "calls") in links and (ids["on join"], "runs_command") in links
    assert (ids["every 5 ticks"], "calls") in links
    calls = [e for e in r["edges"] if e["source"] == ids["on join"]]
    assert len(calls) == 2, calls                   # nothing from the comment or the unknown name
    r2 = extract_skript(b)
    assert any(e["target"] == ids["helper()"] for e in r2["edges"]), r2  # the same id across files
print("graphify .sk support installed and checked")
