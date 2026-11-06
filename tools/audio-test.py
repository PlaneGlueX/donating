#!/usr/bin/env python
"""Record what the PC plays during a test, measure it, keep the numbers, delete the recording.

  python tools/audio-test.py record <name> <seconds>   testing/recordings/<name>.wav and .png (a spectrogram to look at)
  python tools/audio-test.py ingest <name> [--note "what was checked"]
      testing/notes/<name>.md + a node in graphify-out/graph.json, then deletes the recording and its picture
  python tools/audio-test.py selftest

It hears everything the PC plays (Discord, Spotify too), so close those for a clean test. Recordings never leave the PC.
Needs: pip install soundcard numpy.
shortcut: writes the graph node directly and doesn't redraw graph.html or GRAPH_REPORT.md; a full /graphify run picks the notes up.
"""
import json, re, struct, sys, wave, zlib
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REC = ROOT / 'testing' / 'recordings'
NOTES = ROOT / 'testing' / 'notes'
RATE = 48000
FRAME = RATE // 50  # 20 ms


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-6))


def events(mono):
    """Sounds starting: a frame at least 8 dB over the one 60 ms before it and over -50 dB, at most one per 80 ms."""
    n = len(mono) // FRAME
    if n == 0:
        return []
    rms = np.sqrt(np.mean(mono[:n * FRAME].reshape(n, FRAME) ** 2, axis=1))
    level = db(rms)
    out, last = [], -99
    for i in range(3, n):
        if level[i] > -50 and level[i] - level[i - 3] >= 8 and i - last >= 4:
            last = i
            part = mono[i * FRAME:i * FRAME + RATE // 8]
            spec = np.abs(np.fft.rfft(part * np.hanning(len(part))))
            hz = float(np.argmax(spec) * RATE / len(part))
            out.append({'t': round(i * FRAME / RATE, 2), 'db': round(float(db(np.max(np.abs(part))))), 'hz': round(hz)})
    return out


def analyze(mono):
    ev = events(mono)
    peak = float(db(np.max(np.abs(mono)))) if len(mono) else -120.0
    rms = float(db(np.sqrt(np.mean(mono ** 2)))) if len(mono) else -120.0
    clipped = int(np.sum(np.abs(mono) >= 0.999))
    return {'seconds': round(len(mono) / RATE, 2), 'peak_db': round(peak, 1), 'rms_db': round(rms, 1), 'clipped_samples': clipped, 'events': ev}


def png(path, img):
    h, w = img.shape
    raw = b''.join(b'\0' + img[y].tobytes() for y in range(h))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 0, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


def spectrogram(mono, path, w=1200, h=400):
    """Time left to right, 50 Hz to 12 kHz bottom to top on a log scale, -80 to 0 dB dark to bright."""
    size = 4096
    img = np.zeros((h, w), dtype=np.uint8)
    edges = np.geomspace(50, 12000, h + 1) * size / RATE
    win = np.hanning(size)
    for x in range(w):
        at = int(x / w * max(1, len(mono) - size))
        part = mono[at:at + size]
        if len(part) < size:
            continue
        spec = np.abs(np.fft.rfft(part * win)) / (size / 4)
        for y in range(h):
            a, b = int(edges[y]), max(int(edges[y]) + 1, int(edges[y + 1]))
            img[h - 1 - y, x] = int(np.clip((db(spec[a:b].max()) + 80) / 80, 0, 1) * 255)
    png(path, img)


def record(name, seconds):
    import soundcard as sc
    REC.mkdir(parents=True, exist_ok=True)
    mic = sc.get_microphone(sc.default_speaker().id, include_loopback=True)
    with mic.recorder(samplerate=RATE) as r:
        data = r.record(numframes=int(seconds * RATE))
    mono = data.mean(axis=1)
    with wave.open(str(REC / f'{name}.wav'), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE)
        f.writeframes((np.clip(mono, -1, 1) * 32767).astype('<i2').tobytes())
    spectrogram(mono, REC / f'{name}.png')
    print(json.dumps(analyze(mono), indent=0))


def ingest(name, note):
    path = REC / f'{name}.wav'
    with wave.open(str(path), 'rb') as f:
        mono = np.frombuffer(f.readframes(f.getnframes()), '<i2').astype(float) / 32768
    a = analyze(mono)
    NOTES.mkdir(parents=True, exist_ok=True)
    rows = '\n'.join(f"| {e['t']} | {e['db']} | {e['hz']} |" for e in a['events'])
    md = NOTES / f'{name}.md'
    md.write_text(f"# Audio test: {name}\n\n{note}\n\n{a['seconds']} s, peak {a['peak_db']} dB, average {a['rms_db']} dB, {a['clipped_samples']} clipped samples.\n\n| Time (s) | Peak (dB) | Main pitch (Hz) |\n|---|---|---|\n{rows}\n", encoding='utf-8')
    graph_add(name, note, a)
    # Only once the notes and the graph hold the info.
    path.unlink()
    (REC / f'{name}.png').unlink(missing_ok=True)
    print(f'kept {md.relative_to(ROOT)}; recording deleted')


def graph_add(name, note, a):
    path = ROOT / 'graphify-out' / 'graph.json'
    g = json.loads(path.read_text(encoding='utf-8'))
    src = f'testing/notes/{name}.md'
    hub = 'audio_tests'
    def add(i, label, source):
        g['nodes'][:] = [n for n in g['nodes'] if n['id'] != i]
        comm = next((n['community'] for n in g['nodes'] if n.get('community_name') == 'Audio Tests'), None)
        if comm is None:
            comm = max(n.get('community', 0) for n in g['nodes']) + 1
        g['nodes'].append({'id': i, 'label': label, 'file_type': 'document', 'norm_label': label.lower(), 'source_file': source, 'source_location': 'L1', 'community': comm, 'community_name': 'Audio Tests'})
    add(hub, 'Audio test recordings', 'testing/notes')
    node = 'audio_test_' + re.sub(r'\W', '_', name).lower()
    add(node, f"Audio test {name}: {note} ({len(a['events'])} sounds, peak {a['peak_db']} dB, {a['clipped_samples']} clipped)", src)
    g['links'][:] = [l for l in g['links'] if not (l['source'] == node or l['target'] == node)]
    g['links'].append({'source': node, 'target': hub, 'relation': 'part_of', 'confidence': 'EXTRACTED', 'confidence_score': 1.0, 'source_file': src, 'weight': 1.0})
    path.write_text(json.dumps(g, ensure_ascii=False), encoding='utf-8')


def selftest():
    t = np.arange(RATE // 5) / RATE
    gap = np.zeros(RATE // 5)
    tones = [0.5 * np.sin(2 * np.pi * hz * t) for hz in (440, 880, 1760)]
    mono = np.concatenate([gap, tones[0], gap, tones[1], gap, tones[2], gap])
    a = analyze(mono)
    assert len(a['events']) == 3, a
    hz = [e['hz'] for e in a['events']]
    assert all(abs(h - w) < 20 for h, w in zip(hz, (440, 880, 1760))), hz
    assert abs(a['events'][1]['t'] - 0.6) < 0.05, a
    assert a['clipped_samples'] == 0 and analyze(np.ones(RATE // 10))['clipped_samples'] > 0
    print('ok')


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['selftest']:
        selftest()
    elif args[:1] == ['record'] and len(args) == 3 and re.fullmatch(r'[\w-]+', args[1]):
        record(args[1], float(args[2]))
    elif args[:1] == ['ingest'] and len(args) >= 2 and re.fullmatch(r'[\w-]+', args[1]):
        ingest(args[1], args[3] if args[2:3] == ['--note'] and len(args) > 3 else '')
    else:
        print(__doc__)
