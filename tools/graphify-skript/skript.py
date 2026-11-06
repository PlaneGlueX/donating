"""Skript (.sk) extractor for graphify. Added to the Apache-2.0 graphify by this project (see install.py); not upstream.

Nodes: the file, each function, command, event ("on join") and timer ("every 5 ticks").
Edges: file contains block; a block calls a function ("%f()%" inside text counts) or runs a command
(`execute console command "/x"`). Skript functions and commands are global, so their ids don't depend on the file and
calls link across scripts.

shortcut: known names come from the sibling .sk files, and graphify caches by each file's own hash, so a function added
later links from an unchanged caller only after a rebuild without the cache. Variables ({-jail::cell}) aren't nodes yet;
add them if questions about shared state need it.
"""
from __future__ import annotations

import re
from pathlib import Path

from graphify.extractors.base import _make_id, _read_source_text

_COMMENT = re.compile(r"(?<!#)#(?!#).*$")
_FUNCTION = re.compile(r"^(?:local\s+)?function\s+([A-Za-z_]\w*)\s*\(")
_COMMAND = re.compile(r"^command\s+/?([\w:-]+)")
_EVENT = re.compile(r"^((?:on|at)\s+.+?|every\s+.+?)\s*:\s*$")
_CALL = re.compile(r"\b([A-Za-z_]\w*)\(")
_RUNS = re.compile(r'command\s+"/?(?:skript:)?([\w-]+)')

_known_by_dir: dict[str, tuple[set[str], set[str]]] = {}


def _strip(line: str) -> str:
    # Skript: "#" starts a comment anywhere, even inside a variable name; "##" is a literal one.
    return _COMMENT.sub("", line).rstrip()


def _known(folder: Path) -> tuple[set[str], set[str]]:
    key = str(folder)
    if key not in _known_by_dir:
        functions, commands = set(), set()
        for sk in folder.glob("*.sk"):
            for line in _read_source_text(sk).splitlines():
                line = _strip(line)
                m = _FUNCTION.match(line)
                if m:
                    functions.add(m.group(1))
                m = _COMMAND.match(line)
                if m:
                    commands.add(m.group(1))
        _known_by_dir[key] = (functions, commands)
    return _known_by_dir[key]


def extract_skript(path: Path) -> dict:
    try:
        src = _read_source_text(path)
    except OSError:
        return {"error": f"cannot read {path}"}
    functions, commands = _known(path.parent)
    source = str(path)
    file_id = _make_id(source)
    nodes = [{"id": file_id, "label": path.name, "file_type": "code", "source_file": source, "source_location": "L1"}]
    edges: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    def edge(a: str, b: str, relation: str, line: int) -> None:
        if a != b and (a, b, relation) not in seen:
            seen.add((a, b, relation))
            edges.append({"source": a, "target": b, "relation": relation, "confidence": "EXTRACTED",
                          "confidence_score": 1.0, "source_file": source, "source_location": f"L{line}", "weight": 1.0})

    current = None
    for n, raw in enumerate(src.splitlines(), 1):
        line = _strip(raw)
        if not line.strip():
            continue
        if not line[0].isspace():
            current = None
            label = None
            m = _FUNCTION.match(line)
            if m:
                current, label = _make_id("skript_function", m.group(1)), f"{m.group(1)}()"
            else:
                m = _COMMAND.match(line)
                if m:
                    current, label = _make_id("skript_command", m.group(1)), f"/{m.group(1)}"
                else:
                    m = _EVENT.match(line)
                    if m:
                        current, label = _make_id(source, "event", str(n)), m.group(1)
            if current:
                nodes.append({"id": current, "label": label, "file_type": "code", "source_file": source,
                              "source_location": f"L{n}"})
                edge(file_id, current, "contains", n)
            continue
        if current:
            for name in _CALL.findall(line):
                if name in functions:
                    edge(current, _make_id("skript_function", name), "calls", n)
            for name in _RUNS.findall(line):
                if name in commands:
                    edge(current, _make_id("skript_command", name), "runs_command", n)
    return {"nodes": nodes, "edges": edges}
