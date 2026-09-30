import { useEffect, useState, type ReactNode } from 'react';
import rexJson from '@content/rex/lines.json';
import { LabNav } from '../overlay/LabNav';
import { audio, type EngineStats } from '../audio/engine';
import { useAudioSettings, type VolumeKey } from '../audio/settings';
import { ZONE_KEYS, ZONE_MUSIC, type ZoneKey } from '../audio/scales';
import { AMBIENT_PRESETS, WORLD_IDS, ambientDetail, worldForZone, type WorldId } from '../audio/ambient';
import { PREVIEWS, PREVIEW_IDS, benchOffline, encodeWav, measure, renderPreview, type BenchResult, type LevelStats, type PreviewId } from '../audio/render';
import { planMove } from '../audio/timeline';
import { syntheticMove } from '../audio/demo';
import { moodForText, type RexChirp, type RexMood } from '../audio/rex';
import type { BodyKind, Coat, Material, SfxId, SfxParams } from '../audio/sfx';
import type { MoveEvent } from '@ee/core';
import '../audio/audioLab.css';

type Critter = 'blob' | 'fur' | 'feather' | 'walker' | 'snake' | 'heavy';
const CRITTERS: Record<Critter, { label: string; body: BodyKind; coat: Coat }> = {
  blob: { label: 'Blob', body: 'blob', coat: 'bare' },
  fur: { label: 'Fell (Vierbeiner)', body: 'quadruped', coat: 'fur' },
  feather: { label: 'Federn (Zweibeiner)', body: 'biped', coat: 'feather' },
  walker: { label: 'Nackt (Vierbeiner)', body: 'quadruped', coat: 'bare' },
  snake: { label: 'Schlange', body: 'snake', coat: 'bare' },
  heavy: { label: 'Behäbig', body: 'heavy', coat: 'bare' },
};
const MATERIALS: Material[] = ['jelly', 'liquid', 'gas', 'fire'];
const MATERIAL_LABEL: Record<Material, string> = { jelly: 'Gelee', liquid: 'Flüssig', gas: 'Gas', fire: 'Feuer' };
const VOLUMES: Array<{ key: VolumeKey; label: string }> = [
  { key: 'master', label: 'Gesamt' },
  { key: 'music', label: 'Musik' },
  { key: 'sfx', label: 'Effekte' },
  { key: 'ambient', label: 'Ambient' },
  { key: 'voice', label: 'REX' },
];

/** First line of every REX trigger (quick picks). */
const REX_SAMPLES: string[] = (() => {
  const triggers = (rexJson as { triggers?: Record<string, Array<{ lines: string[] }>> }).triggers ?? {};
  const out: string[] = [];
  for (const entries of Object.values(triggers)) {
    const line = entries[0]?.lines[0];
    if (line && !out.includes(line)) out.push(line);
  }
  return out.slice(0, 14);
})();

function useEngineStats(): EngineStats {
  const [stats, setStats] = useState<EngineStats>(() => audio.stats());
  useEffect(() => {
    const update = () => setStats(audio.stats());
    const id = window.setInterval(update, 250);
    const off = audio.onChange(update);
    return () => {
      window.clearInterval(id);
      off();
    };
  }, []);
  return stats;
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="al-section">
      <h2>{title}</h2>
      {note ? <p className="al-note">{note}</p> : null}
      {children}
    </section>
  );
}

function Pick<T extends string>({ value, options, onChange, label }: { value: T; options: ReadonlyArray<{ id: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="al-pick" role="radiogroup" aria-label={label}>
      <span className="al-pick-label">{label}</span>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="al-chip" data-on={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * `/lab/audio`: every sound on a button, with zone/material/tier/creature pickers, REX babble with a text
 * field, music and ambience per zone/world, the mixer, live voice/CPU counters, an offline CPU bench and
 * the WAV previews (rendered offline, downloadable, auditionable).
 */
export function LabAudio() {
  const stats = useEngineStats();
  const settings = useAudioSettings();
  const [zone, setZone] = useState<ZoneKey>('tjorizo');
  const [material, setMaterial] = useState<Material>('jelly');
  const [tier, setTier] = useState(4);
  const [critter, setCritter] = useState<Critter>('blob');
  const [cells, setCells] = useState(2);
  const [text, setText] = useState('Hallo, Kleines. Zwei Gleiche. Schieb sie zusammen.');
  const [mood, setMood] = useState<RexMood | 'auto'>('auto');
  const [music, setMusic] = useState(false);
  const [musicMode, setMusicMode] = useState<'map' | 'level'>('map');
  const [ambient, setAmbient] = useState(false);
  const [world, setWorld] = useState<WorldId>('w09');
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [levels, setLevels] = useState<Partial<Record<PreviewId, LevelStats>>>({});

  // The lab starts quiet: no music/ambience until switched on; restore the game defaults on leave.
  useEffect(() => {
    audio.arm();
    audio.setMusicEnabled(false);
    audio.setAmbientEnabled(false);
    audio.setScene({ mode: 'map' });
    return () => {
      audio.setScene({ mode: 'silent' });
      audio.setMusicEnabled(true);
      audio.setAmbientEnabled(true);
    };
  }, []);

  useEffect(() => {
    audio.setScene({ zone, world, mode: musicMode });
  }, [zone, world, musicMode]);

  const critterSpec = CRITTERS[critter];
  const base = (): SfxParams => ({ zone, tier, material, body: critterSpec.body, coat: critterSpec.coat });

  /** Every button unlocks first (the click is the gesture), then plays. */
  const go = (fn: () => void) => () => {
    audio.unlock();
    fn();
  };
  const sfx = (id: SfxId, p: SfxParams = {}, delay = 0) => go(() => audio.sfx(id, { ...base(), ...p }, delay));

  /** A synthetic move through the real planner (same timing, caps and stagger as the game). */
  const playMove = (merges: number, opts: { rising?: boolean; stops?: number; extra?: MoveEvent[]; force?: Critter } = {}) =>
    go(() => {
      const { res, prev } = syntheticMove({ tier, material, merges, cells, stops: opts.stops ?? 0, rising: opts.rising ?? true, ...(opts.extra ? { extra: opts.extra } : {}) });
      const spec = CRITTERS[opts.force ?? critter];
      const plan = planMove(res, { zone, prev, guess: () => ({ body: spec.body, coat: spec.coat }) });
      audio.playMove(plan.sounds);
      if (plan.won) audio.chirp('yay', plan.endAt + 1.05);
    });

  const chain = go(() => {
    for (let t = 2; t <= 12; t++) {
      const d = (t - 2) * 0.5;
      audio.sfx('splash', { zone, tier: t, material }, d);
      audio.sfx('merge', { zone, tier: t, material }, d);
    }
  });

  const say = go(() => audio.say(text, mood === 'auto' ? moodForText(text) : mood, 0.02));
  const chirp = (k: RexChirp) => go(() => audio.chirp(k));

  const toggleMusic = go(() => {
    const on = !music;
    setMusic(on);
    audio.setScene({ zone, world, mode: musicMode });
    audio.setMusicEnabled(on);
  });
  const toggleAmbient = go(() => {
    const on = !ambient;
    setAmbient(on);
    audio.setScene({ zone, world, mode: musicMode });
    audio.setAmbientEnabled(on);
  });
  const detail = (kind: (typeof AMBIENT_PRESETS)[WorldId]['events'][number]) =>
    go(() => {
      const g = audio.graph;
      if (!g) return;
      audio.schedule(0, (t) => ambientDetail(g, kind.kind, t, kind.gain, AMBIENT_PRESETS[world].zone));
    });

  const runBench = async () => {
    setBusy('bench');
    try {
      setBench(await benchOffline(10, zone));
    } finally {
      setBusy(null);
    }
  };

  const preview = async (id: PreviewId, mode: 'download' | 'play') => {
    if (mode === 'play') audio.unlock();
    setBusy(id);
    try {
      const buf = await renderPreview(id, zone);
      setLevels((l) => ({ ...l, [id]: measure(buf) }));
      if (mode === 'play') audio.playBuffer(buf);
      else {
        const blob = new Blob([encodeWav(buf)], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${id}.wav`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } finally {
      setBusy(null);
    }
  };

  const zoneOptions = ZONE_KEYS.map((z) => ({ id: z, label: ZONE_MUSIC[z].label }));
  const tiers = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    // Own scroll box: the iOS app's web view does not scroll the document (Capacitor `scrollEnabled: false`).
    <div className="page-scroll">
    <main className="page audio-lab" data-testid="audio-lab" data-ctx-state={stats.state} data-sfx="none">
      <header className="al-head">
        <LabNav />
        <h1 className="display">Audio-Lab</h1>
        <p className="lede">Alles prozedural (Web Audio, keine Samples). Jeder Knopf entsperrt zuerst den Audio-Kontext – wie der erste Tipp im Spiel.</p>
      </header>

      <Section title="Status">
        <div className="al-stats" data-testid="audio-stats">
          <span>
            Kontext <b data-testid="ctx-state">{stats.state}</b>
          </span>
          <span>
            {stats.sampleRate ? `${stats.sampleRate} Hz` : '–'} · {stats.latencyMs} ms
          </span>
          <span>
            Stimmen <b>{stats.voices}</b> / Spitze {stats.peak}
          </span>
          <span>
            gestartet {stats.started} · gestohlen {stats.stolen} · verworfen {stats.dropped}
          </span>
          <span>Nodes {stats.nodes}</span>
          <span>Warteschlange {stats.queued}</span>
          <span>Main-Thread {stats.mainMsPerS} ms/s</span>
          <span>Render-Last {stats.load === null ? 'n/a' : `${Math.round(stats.load * 100)} %`}</span>
          <span>Musik {stats.music}</span>
          <span>Ambient {stats.ambient}</span>
        </div>
        <div className="al-row">
          <button type="button" className="btn" data-testid="audio-start" onClick={go(() => audio.enableLoadMeter())}>
            Audio starten
          </button>
          <button type="button" className="btn" data-on={!settings.muted} onClick={() => settings.toggleMuted()}>
            {settings.muted ? 'Ton an' : 'Ton aus'}
          </button>
          <button type="button" className="btn" disabled={busy !== null} onClick={() => void runBench()}>
            CPU-Bench (10 s offline)
          </button>
          {bench ? (
            <span className="al-bench" data-testid="bench-result">
              {bench.seconds} s Audio in {bench.renderMs} ms → {(bench.load * 100).toFixed(1)} % eines Kerns · {bench.nodes} Nodes
            </span>
          ) : null}
        </div>
      </Section>

      <Section title="Mixer">
        <div className="al-sliders">
          {VOLUMES.map((v) => (
            <label key={v.key} className="al-slider">
              <span>{v.label}</span>
              <input type="range" min={0} max={1} step={0.01} value={settings[v.key]} onChange={(e) => settings.setVolume(v.key, Number(e.target.value))} />
              <b>{Math.round(settings[v.key] * 100)}</b>
            </label>
          ))}
          <button type="button" className="al-chip" onClick={() => settings.reset()}>
            Zurücksetzen
          </button>
        </div>
      </Section>

      <Section title="Parameter" note={`${ZONE_MUSIC[zone].mood}. Stufe ${tier} = ${2 ** tier}.`}>
        <Pick label="Zone" value={zone} options={zoneOptions} onChange={setZone} />
        <Pick label="Material" value={material} options={MATERIALS.map((m) => ({ id: m, label: MATERIAL_LABEL[m] }))} onChange={setMaterial} />
        <Pick label="Wesen" value={critter} options={(Object.keys(CRITTERS) as Critter[]).map((c) => ({ id: c, label: CRITTERS[c].label }))} onChange={setCritter} />
        <div className="al-pick">
          <span className="al-pick-label">Stufe</span>
          {tiers.map((t) => (
            <button key={t} type="button" className="al-chip al-tier" data-on={tier === t} onClick={() => setTier(t)}>
              {2 ** t}
            </button>
          ))}
        </div>
        <div className="al-pick">
          <span className="al-pick-label">Weg</span>
          {[1, 2, 3, 4, 5].map((c) => (
            <button key={c} type="button" className="al-chip" data-on={cells === c} onClick={() => setCells(c)}>
              {c} {c === 1 ? 'Zelle' : 'Zellen'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Wischen & Verschmelzen" note="Zug-Knöpfe laufen durch den echten Zeitplan des Bretts (Körpertyp → Splash, Sprung, Umschlingen, Stampfen).">
        <div className="al-grid" data-testid="sfx-buttons">
          <button type="button" className="al-sfx" data-testid="sfx-slide" onClick={sfx('slide', { cells, dir: 'left', count: 2 })}>
            Wisch
          </button>
          <button type="button" className="al-sfx" onClick={sfx('stop')}>
            Stopp ({CRITTERS[critter].label})
          </button>
          <button type="button" className="al-sfx" data-testid="sfx-merge" onClick={playMove(1, { rising: false })}>
            Zug mit Merge
          </button>
          <button type="button" className="al-sfx" onClick={sfx('merge')}>
            Merge-Ton
          </button>
          <button type="button" className="al-sfx" onClick={sfx('splash')}>
            Splash
          </button>
          <button type="button" className="al-sfx" onClick={sfx('splash', { kind: 'big', tier: Math.max(7, tier) })}>
            Großer Splash
          </button>
          <button type="button" className="al-sfx" onClick={sfx('childPop')}>
            Kind-Pop
          </button>
          <button type="button" className="al-sfx al-wide" onClick={chain}>
            Merge-Kette 4 → 4096
          </button>
          <button type="button" className="al-sfx" onClick={playMove(2)}>
            Combo ×2
          </button>
          <button type="button" className="al-sfx" onClick={playMove(3)}>
            Combo ×3
          </button>
          <button type="button" className="al-sfx" onClick={playMove(4)}>
            Combo ×4
          </button>
          <button type="button" className="al-sfx" onClick={playMove(1, { stops: 3, rising: false })}>
            Zug + 3 Landungen
          </button>
          <button type="button" className="al-sfx" onClick={playMove(1, { rising: false, force: 'fur' })}>
            Sprung zur Kamera
          </button>
          <button type="button" className="al-sfx" onClick={playMove(1, { rising: false, force: 'snake' })}>
            Schlange schlingt
          </button>
          <button type="button" className="al-sfx" onClick={playMove(1, { rising: false, force: 'heavy' })}>
            Stampfen
          </button>
          <button type="button" className="al-sfx" onClick={sfx('creatureVoice')}>
            Kreatur-Stimme
          </button>
          <button type="button" className="al-sfx" onClick={sfx('bite')}>
            Biss
          </button>
          <button type="button" className="al-sfx" onClick={sfx('spawn')}>
            Spawn
          </button>
        </div>
      </Section>

      <Section title="Spezialsteine">
        <div className="al-grid">
          {(['line', 'burst', 'cross', 'tripleCross', 'burst5'] as const).map((k) => (
            <button key={k} type="button" className="al-sfx" onClick={sfx('special', { kind: k })}>
              {{ line: 'Strahl', burst: 'Knall', cross: 'Kreuz', tripleCross: 'Dreifachkreuz', burst5: 'Knall 5' }[k]}
            </button>
          ))}
          <button type="button" className="al-sfx" onClick={sfx('promote')}>
            Befördern
          </button>
          <button type="button" className="al-sfx" onClick={sfx('tierBomb')}>
            Stufenbombe
          </button>
          <button type="button" className="al-sfx" onClick={sfx('popOut')}>
            Weg-Pop
          </button>
        </div>
      </Section>

      <Section title="Blocker & Elemente">
        <div className="al-grid">
          <button type="button" className="al-sfx" onClick={sfx('scrap', { layers: 2 })}>
            Schrott (Lage)
          </button>
          <button type="button" className="al-sfx" onClick={sfx('scrap', { layers: 0 })}>
            Schrott weg
          </button>
          <button type="button" className="al-sfx" onClick={sfx('mound', { layers: 1 })}>
            Schrottberg
          </button>
          <button type="button" className="al-sfx" onClick={sfx('crustCrack')}>
            Kruste knackt
          </button>
          <button type="button" className="al-sfx" onClick={sfx('cage', { layers: 1 })}>
            Käfig-Ranke
          </button>
          <button type="button" className="al-sfx" onClick={sfx('cage', { layers: 0 })}>
            Käfig offen
          </button>
          <button type="button" className="al-sfx" onClick={sfx('fogLift')}>
            Nebel hebt sich
          </button>
          <button type="button" className="al-sfx" onClick={sfx('rotSquelch')}>
            Fäulnis brennt
          </button>
          <button type="button" className="al-sfx" onClick={sfx('rotGrow')}>
            Fäulnis wächst
          </button>
          <button type="button" className="al-sfx" onClick={sfx('oilGlug')}>
            Öl brennt
          </button>
          <button type="button" className="al-sfx" onClick={sfx('toxicTick')}>
            Gift-Tick
          </button>
          <button type="button" className="al-sfx" onClick={sfx('freeze')}>
            Einfrieren
          </button>
          <button type="button" className="al-sfx" onClick={sfx('push')}>
            Düse
          </button>
          <button type="button" className="al-sfx" onClick={sfx('strayMove')}>
            Streuner
          </button>
          <button type="button" className="al-sfx" onClick={sfx('strayCalm')}>
            Streuner ruhig
          </button>
          <button type="button" className="al-sfx" onClick={sfx('wake')}>
            Schläfer wacht
          </button>
        </div>
      </Section>

      <Section title="Fortschritt">
        <div className="al-grid">
          <button type="button" className="al-sfx" onClick={sfx('heal')}>
            Heilen (Blüte)
          </button>
          <button type="button" className="al-sfx" onClick={sfx('healStep')}>
            Heilen (Stufe)
          </button>
          <button type="button" className="al-sfx" onClick={sfx('collect', { total: 1 })}>
            Spore 1
          </button>
          <button type="button" className="al-sfx" onClick={sfx('collect', { total: 4 })}>
            Spore 4
          </button>
          <button type="button" className="al-sfx" onClick={sfx('release')}>
            Aufbruch
          </button>
          <button type="button" className="al-sfx" onClick={sfx('deliver')}>
            Liefern
          </button>
          <button type="button" className="al-sfx" onClick={sfx('goalDone')}>
            Ziel erreicht
          </button>
          <button type="button" className="al-sfx" data-testid="sfx-won" onClick={go(() => {
            audio.sfx('won', base());
            audio.chirp('yay', 1.05);
          })}>
            Gewonnen
          </button>
          <button type="button" className="al-sfx" onClick={go(() => {
            audio.sfx('lost', base());
            audio.chirp('ohno', 0.7);
          })}>
            Verloren
          </button>
          <button type="button" className="al-sfx" onClick={sfx('rewind')}>
            Zurückspulen
          </button>
          <button type="button" className="al-sfx" onClick={sfx('restart')}>
            Neustart
          </button>
        </div>
      </Section>

      <Section title="Flow & UI">
        <div className="al-grid">
          {(
            [
              ['hop', 'Hüpfer (Splash)'],
              ['land', 'Landung'],
              ['select', 'Knoten wählen'],
              ['flyIn', 'Anflug'],
              ['rise', 'Plateau hebt sich'],
              ['heroJump', 'Heldensprung'],
              ['depart', 'Aufbruch (Flug)'],
              ['sink', 'Plateau sinkt'],
              ['nodeUnlock', 'Knoten frei'],
              ['uiTick', 'UI-Tick (Holz)'],
              ['glassTap', 'Glas-Tipp'],
              ['soundOn', 'Ton an'],
            ] as Array<[SfxId, string]>
          ).map(([id, label]) => (
            <button key={id} type="button" className="al-sfx" onClick={sfx(id)}>
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="REX" note="Die Silben folgen dem Text (gleicher Takt wie REX' Kiefer), Vokale werden zu Formanten, die Melodie kommt aus Stimmung und Satzzeichen.">
        <div className="al-row">
          <input className="al-text" data-testid="rex-text" value={text} onChange={(e) => setText(e.target.value)} aria-label="REX-Zeile" />
          <select className="al-select" value={mood} onChange={(e) => setMood(e.target.value as RexMood | 'auto')} aria-label="Stimmung">
            <option value="auto">Stimmung: auto ({moodForText(text)})</option>
            <option value="happy">fröhlich</option>
            <option value="neutral">neutral</option>
            <option value="worried">besorgt</option>
          </select>
          <button type="button" className="btn" data-testid="rex-say" onClick={say}>
            Sprechen
          </button>
        </div>
        <div className="al-row">
          {(['yay', 'ohno', 'wow', 'hmm'] as RexChirp[]).map((k) => (
            <button key={k} type="button" className="al-chip" onClick={chirp(k)}>
              {{ yay: 'Yay!', ohno: 'Oh nein…', wow: 'Wow!', hmm: 'Hmm?' }[k]}
            </button>
          ))}
        </div>
        <div className="al-lines">
          {REX_SAMPLES.map((line) => (
            <button
              key={line}
              type="button"
              className="al-line"
              onClick={go(() => {
                setText(line);
                audio.say(line, moodForText(line), 0.02);
              })}
            >
              {line}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Musik & Ambient" note="Musik pro Zone (Pentatonik, generativ, Überblendung beim Zonenwechsel); Ambient pro Welt. Im Level ist die Musik dünner und leiser.">
        <div className="al-row">
          <button type="button" className="btn" data-on={music} data-testid="music-toggle" onClick={toggleMusic}>
            Musik {music ? 'aus' : 'an'}
          </button>
          <Pick label="Modus" value={musicMode} options={[{ id: 'map', label: 'Map (voller)' }, { id: 'level', label: 'Level (dünn)' }]} onChange={setMusicMode} />
        </div>
        <div className="al-row">
          <button type="button" className="btn" data-on={ambient} data-testid="ambient-toggle" onClick={toggleAmbient}>
            Ambient {ambient ? 'aus' : 'an'}
          </button>
          <select className="al-select" value={world} onChange={(e) => setWorld(e.target.value as WorldId)} aria-label="Welt">
            {WORLD_IDS.map((w) => (
              <option key={w} value={w}>
                {AMBIENT_PRESETS[w].name} ({ZONE_MUSIC[AMBIENT_PRESETS[w].zone].label})
              </option>
            ))}
          </select>
          <button type="button" className="al-chip" onClick={() => setWorld(worldForZone(zone))}>
            Welt der Zone
          </button>
        </div>
        <div className="al-row">
          {AMBIENT_PRESETS[world].events.map((e) => (
            <button key={e.kind} type="button" className="al-chip" onClick={detail(e)}>
              {e.kind}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Vorschau-WAVs" note="Offline gerendert (OfflineAudioContext, 44,1 kHz Stereo). ▶ spielt die Vorschau ab, ⤓ lädt sie als WAV.">
        <div className="al-previews">
          {PREVIEW_IDS.map((id) => (
            <div key={id} className="al-preview">
              <span className="al-preview-label">{PREVIEWS[id].label}</span>
              <span className="al-preview-meta">
                {PREVIEWS[id].seconds} s{levels[id] ? ` · Spitze ${levels[id]!.peakDb} dB · RMS ${levels[id]!.rmsDb} dB` : ''}
              </span>
              <button type="button" className="al-chip" disabled={busy !== null} onClick={() => void preview(id, 'play')} aria-label={`${PREVIEWS[id].label} abspielen`}>
                ▶
              </button>
              <button type="button" className="al-chip" data-testid={`wav-${id}`} disabled={busy !== null} onClick={() => void preview(id, 'download')} aria-label={`${PREVIEWS[id].label} als WAV laden`}>
                ⤓ WAV
              </button>
            </div>
          ))}
        </div>
      </Section>
    </main>
    </div>
  );
}
