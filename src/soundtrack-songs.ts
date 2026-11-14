// The soundtrack's songs (Tim, 2026-11-14: "a soundtrack... different songs play at different points... it kicks up when
// there are more enemies... bosses get their own music"; style, the same day: "Mirror that album over all else", slow
// atmospheric dungeon synth in the manner of a lone stone tower above moonlit snow). Every piece here is ORIGINAL: modal
// minor melodies over drones and slow chord changes, written for this game. Nothing quotes or paraphrases any record.
//
// Pure data and music theory, no audio. soundtrack.ts plays it; soundtrack-director.ts chooses what plays.
//
// Notation (all of it checked by validateSong, tests/soundtrack.test.ts):
// - root: MIDI note of the tonic (the bass and pad octave); mode: a key of MODES.
// - chords: 8 bars, one chord per bar, each "degree[:shape]" built diatonically from the mode (degree 1-7, CHORD_SHAPES).
// - bass / drums / arps / lead are laid on a 16-step grid per bar (sixteenth notes); swing delays the odd steps.
// - bass: [step, tone, length] with tone R (root), 3, 5, 7, 8 (root an octave up) or P (the tonic pedal).
// - drums: 16-character strings per voice ("X" accent, "x" normal, "o" soft, "." rest). Only the genre's drums:
//   frame (frame drum; X is the low dum, x and o the edge), tom (low tom) and timp (timpani, tuned to the tonic).
// - arps: 16 characters, a digit picks the n-th note of the pad voicing an octave up (wrapping a further octave).
// - motifs: two-bar lead phrases, [start step 0-31, scale step from the lead tonic, length in steps].
// - forms: four motifs per eight-bar phrase; leadPlan says which phrases the lead sings (the rest is air).
// - leads: the voice that sings each phrase in turn (phrase n: leads[n % length]). A wind (flute, recorder, ney) is never
//   the main voice: at most one turn in four, and in a fight its turn passes to the strings.
// - tiers: 0 calm, 1 combat, 2 driving combat. drums.calm / combat / drive and bass.calm / combat choose by tier.

export const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  // Hijaz (Phrygian dominant): the travelling scholar's colour, its augmented second between steps 1 and 2.
  hijaz: [0, 1, 4, 5, 7, 8, 10],
};

// Chord shapes as scale steps above the degree.
export const CHORD_SHAPES = { "": [0, 2, 4], "7": [0, 2, 4, 6], add9: [0, 2, 4, 8], sus2: [0, 1, 4], sus4: [0, 3, 4] };
export const DRUM_VOICES = ["frame", "tom", "timp"];
export const INSTRUMENTS = {
  pads: ["strings", "choir", "both"],
  arps: ["harpsichord", "lute", "dulcimer", "bell"],
  // Lead voices: the genre's choir, strings, cello, horn, plucks and bells carry most melodies; winds are an occasional answer.
  leads: ["choir", "strings", "cello", "horn", "harpsichord", "lute", "dulcimer", "bell", "celesta", "flute", "recorder", "ney"],
};
// What the song table must stay within (the brief: slow and spacious, about 60-84 BPM).
export const SONG_LIMITS = { bpm: [58, 84], swing: [0, .3], bars: 8, steps: 16 };

export const stepToSemi = (mode, s) => { const m = MODES[mode], o = Math.floor(s / 7), i = ((s % 7) + 7) % 7; return o * 12 + m[i]; };
export const pc = (n) => ((n % 12) + 12) % 12;
export function parseChord(spec) {
  const [d, q = ""] = String(spec).split(":");
  return { degree: Number(d) - 1, shape: CHORD_SHAPES[q] };
}
// The chord's tones as scale steps (root first).
export function chordSteps(spec) { const c = parseChord(spec); return c.shape ? c.shape.map((x) => c.degree + x) : []; }
// Semitones above the song root.
export const chordSemis = (song, spec) => chordSteps(spec).map((s) => stepToSemi(song.mode, s));
export const chordPcs = (song, spec) => new Set(chordSemis(song, spec).map((s) => pc(song.root + s)));
export const barSeconds = (song) => 240 / song.bpm;

// Shared bass figures. "P" holds the tonic pedal under every chord; `pedal` is silence, for songs whose drone already holds
// the tonic (a doubled pedal pumps against the drone).
const B = {
  pedal: [],
  held: [[0, "P", 16]],
  roots: [[0, "R", 16]],
  breath: [[0, "R", 10], [12, "5", 4]],
  halves: [[0, "R", 8], [8, "5", 8]],
  pulse: [[0, "R", 2], [4, "R", 2], [8, "R", 2], [12, "5", 2]],
  ostinato: [[0, "R", 2], [2, "R", 2], [4, "8", 2], [6, "R", 2], [8, "R", 2], [10, "5", 2], [12, "8", 2], [14, "5", 2]],
  tread: [[0, "R", 3], [3, "R", 1], [4, "5", 4], [8, "R", 3], [11, "R", 1], [12, "7", 4]],
};
// Shared ritual pulses (frame drum, low toms, timpani). No kit drums: the genre has none.
const D = {
  none: {},
  heartbeat: { frame: "X.......o......." },
  procession: { frame: "X.......x.......", tom: "............o..." },
  ritual: { frame: "X.....x.X.......", tom: "..........o...o." },
  rising: { frame: "X.....x.X...x...", tom: "......o...x...x.", timp: "X..............." },
  war: { frame: "X.x...x.X.x...x.", tom: "....x.....x.x.x.", timp: "X.......X......." },
  march: { frame: "X...x...X...x...", tom: "......o.......x.", timp: "X..............." },
  siege: { frame: "X.x.x.x.X.x.x.xo", tom: "..x...x...x.x.xx", timp: "X.......X...x..." },
};

export const SONGS = {
  // The departure: the Refuge behind, the first miles over pale hills; lute, strings and a horn sing, a recorder answers.
  roadOut: {
    id: "roadOut", name: "The Road Out", mood: "torpid and open, the first miles in thin morning light",
    bpm: 66, swing: .08, root: 50, mode: "dorian", leadOct: 2, pedal: false,
    pad: "strings", arp: "lute", leads: ["lute", "strings", "horn", "recorder"],
    chords: ["1:add9", "1:add9", "7", "7", "4", "3:7", "5:sus4", "5:7"],
    bass: { calm: B.breath, combat: B.pulse },
    drums: { calm: D.heartbeat, combat: D.ritual, drive: D.war },
    arps: { calm: "0...2...1...3...", busy: "0.2.1.3.2.4.1.3." },
    motifs: {
      a: [[0, 4, 8], [8, 2, 4], [12, 1, 4], [16, 0, 12], [28, 1, 4]],
      av: [[0, 4, 8], [8, 2, 4], [12, 1, 4], [16, 0, 6], [22, 2, 2], [24, 4, 8]],
      a2: [[0, 1, 8], [8, -1, 4], [12, 0, 4], [16, 3, 12], [28, 2, 4]],
      b: [[0, 5, 6], [6, 4, 2], [8, 3, 8], [16, 4, 8], [24, 1, 8]],
      c: [[0, 0, 8], [8, 1, 8], [16, -1, 8], [24, -3, 8]],
      cv: [[0, 0, 8], [8, 1, 8], [16, 4, 16]],
    },
    forms: [["a", "a2", "b", "c"], ["av", "a2", "b", "cv"]],
    leadPlan: [1, 1, 0],
    mix: { bed: .9, groove: .8, motion: .7, lead: .8 }, echo: .35, reverb: .45,
  },
  // Overworld at dusk and night: the closest to the reference. A choir over strings, a harpsichord turning slowly, a
  // string line over an A pedal, distant bells. i-VII-VI-iv, a chord every two bars.
  moonlitTower: {
    id: "moonlitTower", name: "The Moonlit Tower", mood: "nocturnal and meditative, a lone tower in moonlit snow",
    bpm: 64, swing: 0, root: 57, mode: "aeolian", leadOct: 1, pedal: true,
    pad: "both", arp: "harpsichord", leads: ["choir", "strings", "bell"],
    chords: ["1:add9", "1:add9", "7", "7", "6:7", "6:7", "4:7", "4:7"],
    bass: { calm: B.pedal, combat: B.pulse },
    drums: { calm: D.none, combat: D.procession, drive: D.rising },
    arps: { calm: "0.......2...1...", busy: "0...2...1...3.2." },
    motifs: {
      a: [[0, 4, 12], [12, 3, 2], [14, 2, 2], [16, 1, 8], [24, 0, 8]],
      av: [[0, 4, 12], [12, 3, 2], [14, 2, 2], [16, 1, 4], [20, 2, 4], [24, 4, 8]],
      a2: [[0, 3, 8], [8, 1, 4], [12, 2, 4], [16, -1, 12], [28, 0, 4]],
      b: [[0, 5, 10], [10, 4, 2], [12, 3, 4], [16, 2, 8], [24, 4, 8]],
      c: [[0, 3, 8], [8, 5, 8], [16, 4, 6], [22, 3, 2], [24, 0, 8]],
      cv: [[0, 3, 8], [8, 5, 8], [16, 2, 8], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"], ["av", "a2", "b", "cv"]],
    leadPlan: [1, 0, 1, 1, 0],
    mix: { bed: 1, groove: .8, motion: .6, lead: .8 }, echo: .45, reverb: .6,
  },
  // Dungeons: E Phrygian, a low cello, long silences, the bells far off, a dark flute now and then.
  underhollow: {
    id: "underhollow", name: "Underhollow", mood: "dark and sparse, dripping stone",
    bpm: 62, swing: 0, root: 52, mode: "phrygian", leadOct: 1, pedal: true,
    pad: "choir", arp: "bell", leads: ["cello", "bell", "choir", "flute", "bell"],
    chords: ["1", "1", "2:7", "2:7", "1:7", "1:7", "7", "1:sus4"],
    bass: { calm: B.pedal, combat: B.tread },
    drums: { calm: D.none, combat: D.ritual, drive: D.war },
    arps: { calm: "0...............", busy: "0.......2.......", motionCalm: false },
    motifs: {
      a: [[0, 4, 12], [12, 5, 4], [16, 4, 8], [24, 2, 8]],
      av: [[0, 4, 12], [12, 5, 4], [16, 2, 8], [24, 0, 8]],
      a2: [[0, 5, 8], [8, 3, 8], [16, 1, 16]],
      b: [[0, 7, 8], [8, 6, 4], [12, 5, 4], [16, 4, 12], [28, 2, 4]],
      c: [[0, 3, 8], [8, 1, 8], [16, 0, 8], [24, 3, 8]],
      cv: [[0, 3, 8], [8, 1, 8], [16, 4, 16]],
    },
    forms: [["a", "a2", "b", "c"], ["av", "a2", "b", "cv"]],
    leadPlan: [0, 1, 1, 0],
    mix: { bed: 1, groove: .85, motion: .55, lead: .75 }, echo: .5, reverb: .65,
  },
  // The Deep: B Aeolian at 60, bells over a drone and almost nothing else.
  deepbell: {
    id: "deepbell", name: "The Deep Bell", mood: "vast, cold and still, far below",
    bpm: 60, swing: 0, root: 47, mode: "aeolian", leadOct: 2, pedal: true,
    pad: "strings", arp: "bell", leads: ["bell", "choir", "celesta", "bell"],
    chords: ["1:add9", "1:add9", "1:add9", "1:add9", "6:7", "6:7", "4:7", "5:sus4"],
    bass: { calm: B.pedal, combat: B.pulse },
    drums: { calm: D.none, combat: D.procession, drive: D.rising },
    arps: { calm: "................", busy: "0.......1.......", motionCalm: false },
    motifs: {
      a: [[0, 4, 8], [8, 2, 8], [16, 1, 16]],
      a2: [[0, 7, 8], [8, 4, 8], [16, 2, 12], [28, 3, 4]],
      b: [[0, 5, 8], [8, 4, 8], [16, 0, 16]],
      c: [[0, 3, 8], [8, 2, 8], [16, 1, 8], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"], ["a2", "a", "b", "c"]],
    leadPlan: [1, 0, 1],
    mix: { bed: 1, groove: .85, motion: .5, lead: .6 }, echo: .55, reverb: .7,
  },
  // The open sea, boating and swimming: G Dorian, dulcimer ripples in the echo, dulcimer, strings and horn riding over them.
  saltwind: {
    id: "saltwind", name: "Saltwind", mood: "rolling and wistful, grey water to the horizon",
    bpm: 70, swing: .08, root: 55, mode: "dorian", leadOct: 1, pedal: false,
    pad: "strings", arp: "dulcimer", leads: ["dulcimer", "strings", "flute", "horn"],
    chords: ["1:add9", "1:add9", "4", "4", "7:add9", "7:add9", "3:7", "5:sus4"],
    bass: { calm: B.halves, combat: B.ostinato },
    drums: { calm: D.none, combat: D.ritual, drive: D.war },
    arps: { calm: "0..2..1..3..2...", busy: "0.2.1.3.2.4.1.3." },
    motifs: {
      a: [[0, 4, 6], [6, 5, 2], [8, 4, 4], [12, 2, 4], [16, 1, 8], [24, 0, 8]],
      av: [[0, 4, 6], [6, 5, 2], [8, 4, 4], [12, 2, 4], [16, 1, 6], [22, 2, 2], [24, 4, 8]],
      a2: [[0, 5, 8], [8, 3, 4], [12, 4, 4], [16, 7, 12], [28, 5, 4]],
      b: [[0, 6, 8], [8, 8, 4], [12, 7, 4], [16, 3, 8], [24, 1, 8]],
      c: [[0, 6, 6], [6, 5, 2], [8, 4, 8], [16, 1, 8], [24, 0, 8]],
      cv: [[0, 6, 6], [6, 5, 2], [8, 4, 8], [16, 4, 16]],
    },
    forms: [["a", "a2", "b", "c"], ["av", "a2", "b", "cv"]],
    leadPlan: [1, 1, 0],
    mix: { bed: .9, groove: .8, motion: .75, lead: .8 }, echo: .6, reverb: .55,
  },
  // The Pentagon, castles and keeps: C Aeolian, a stately harpsichord procession under strings and choir.
  fiveHalls: {
    id: "fiveHalls", name: "Five Halls", mood: "stately and mysterious, torchlit stone",
    bpm: 68, swing: 0, root: 48, mode: "aeolian", leadOct: 2, pedal: false,
    pad: "both", arp: "harpsichord", leads: ["harpsichord", "horn", "strings", "horn"],
    chords: ["1:7", "6:7", "4:7", "5:sus4", "1:7", "6:7", "3:7", "5:7"],
    bass: { calm: B.roots, combat: B.tread },
    drums: { calm: D.none, combat: D.march, drive: D.siege },
    arps: { calm: "0...1...2...1...", busy: "0.1.2.3.2.1.3.2." },
    motifs: {
      a: [[0, 4, 8], [8, 2, 4], [12, 1, 4], [16, 0, 8], [24, 2, 8]],
      a2: [[0, 3, 8], [8, 5, 4], [12, 4, 4], [16, 1, 12], [28, 0, 4]],
      b: [[0, 7, 6], [6, 6, 2], [8, 4, 8], [16, 5, 8], [24, 4, 8]],
      c: [[0, 6, 6], [6, 4, 2], [8, 2, 8], [16, 1, 8], [24, -1, 4], [28, 1, 4]],
    },
    forms: [["a", "a2", "b", "c"], ["b", "a2", "a", "c"]],
    leadPlan: [1, 1, 0],
    mix: { bed: .95, groove: .8, motion: .7, lead: .75 }, echo: .3, reverb: .55,
  },
  // The far realms and skylands: the travelling scholar's road. E Hijaz over an E pedal, a little ney shared with the dulcimer, and a
  // soft frame drum walking even in calm.
  astrolabe: {
    id: "astrolabe", name: "The Astrolabe", mood: "strange and airy, a scholar's road east under foreign stars",
    bpm: 72, swing: .12, root: 52, mode: "hijaz", leadOct: 2, pedal: true,
    pad: "strings", arp: "dulcimer", leads: ["ney", "dulcimer", "strings", "dulcimer", "strings"],
    chords: ["1", "1", "2", "1", "7", "4", "2", "1"],
    bass: { calm: B.pedal, combat: B.ostinato },
    drums: { calm: { frame: "X.....o...x....." }, combat: D.ritual, drive: D.war },
    arps: { calm: "0...2.1.....2...", busy: "0.2.1.2.0.2.1.3." },
    motifs: {
      a: [[0, 4, 6], [6, 3, 2], [8, 2, 6], [14, 1, 2], [16, 0, 12], [28, 1, 4]],
      av: [[0, 4, 6], [6, 3, 2], [8, 2, 6], [14, 1, 2], [16, 2, 4], [20, 1, 4], [24, 0, 8]],
      a2: [[0, 3, 8], [8, 1, 4], [12, 2, 4], [16, 0, 8], [24, -3, 8]],
      b: [[0, 6, 8], [8, 3, 4], [12, 5, 4], [16, 0, 8], [24, 3, 8]],
      c: [[0, 5, 6], [6, 4, 2], [8, 3, 8], [16, 2, 6], [22, 1, 2], [24, 0, 8]],
      cv: [[0, 5, 6], [6, 4, 2], [8, 3, 8], [16, 4, 12], [28, 2, 4]],
    },
    forms: [["a", "a2", "b", "c"], ["av", "a2", "b", "cv"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .9, groove: .85, motion: .7, lead: .8 }, echo: .45, reverb: .6,
  },
  // A second walking song for the overworld: F Dorian, horn and lute, a pilgrim's steady pace.
  pilgrimsWay: {
    id: "pilgrimsWay", name: "Pilgrim's Way", mood: "steady and hopeful, a long road between shrines",
    bpm: 72, swing: .1, root: 53, mode: "dorian", leadOct: 1, pedal: false,
    pad: "strings", arp: "lute", leads: ["horn", "lute", "strings", "lute"],
    chords: ["1:7", "4", "1:7", "4", "3:7", "7:add9", "2:7", "5:sus4"],
    bass: { calm: B.halves, combat: B.ostinato },
    drums: { calm: D.heartbeat, combat: D.ritual, drive: D.war },
    arps: { calm: "0...2...1...2...", busy: "0.2.1.2.3.2.1.2." },
    motifs: {
      a: [[0, 4, 6], [6, 6, 2], [8, 4, 4], [12, 2, 4], [16, 5, 8], [24, 3, 8]],
      a2: [[0, 7, 6], [6, 6, 2], [8, 6, 4], [12, 4, 4], [16, 5, 12], [28, 4, 4]],
      b: [[0, 8, 6], [6, 7, 2], [8, 6, 8], [16, 3, 8], [24, 7, 8]],
      c: [[0, 5, 8], [8, 3, 4], [12, 4, 4], [16, 4, 8], [24, 1, 8]],
      cv: [[0, 5, 8], [8, 3, 4], [12, 4, 4], [16, 7, 16]],
    },
    forms: [["a", "a2", "b", "c"], ["a", "a2", "b", "cv"]],
    leadPlan: [1, 1, 0],
    mix: { bed: .9, groove: .8, motion: .7, lead: .8 }, echo: .35, reverb: .5,
  },
  // Later chapters on the overworld: the weather turns, a harpsichord ostinato and frame drum push even in calm.
  stormPass: {
    id: "stormPass", name: "Storm on the Pass", mood: "urgent and rising, sleet and wind on the high road",
    bpm: 80, swing: 0, root: 55, mode: "aeolian", leadOct: 1, pedal: false,
    pad: "strings", arp: "harpsichord", leads: ["strings", "horn", "harpsichord"], arpOct: 0,
    chords: ["1", "7", "6:7", "7", "1", "4:7", "6:7", "5:sus4"],
    bass: { calm: B.pulse, combat: B.ostinato },
    drums: { calm: { frame: "X.......x...o..." }, combat: D.war, drive: D.siege },
    arps: { calm: "0.1.2.1.0.1.2.1.", busy: "0.1.2.3.2.1.2.3." },
    motifs: {
      a: [[0, 4, 6], [6, 5, 2], [8, 4, 4], [12, 2, 4], [16, 3, 8], [24, 1, 8]],
      a2: [[0, 2, 8], [8, 0, 4], [12, 2, 4], [16, 1, 8], [24, 3, 8]],
      b: [[0, 7, 6], [6, 6, 2], [8, 4, 8], [16, 5, 8], [24, 3, 8]],
      c: [[0, 6, 6], [6, 5, 2], [8, 4, 8], [16, 1, 8], [24, 0, 8]],
      cv: [[0, 6, 6], [6, 5, 2], [8, 4, 8], [16, 4, 16]],
    },
    forms: [["a", "a2", "b", "c"], ["a", "a2", "b", "cv"]],
    leadPlan: [1, 1, 1, 0],
    mix: { bed: .9, groove: .85, motion: .75, lead: .75 }, echo: .3, reverb: .45,
  },
  // Later chapters below ground and in the halls: F Phrygian, a slow tread rising toward something opening.
  gateOpens: {
    id: "gateOpens", name: "The Gate Opens", mood: "urgent and rising, stone grinding on stone",
    bpm: 72, swing: 0, root: 53, mode: "phrygian", leadOct: 1, pedal: false,
    pad: "both", arp: "harpsichord", leads: ["horn", "cello", "choir"], arpOct: 0,
    chords: ["1", "1", "2:7", "1", "7", "6:7", "2:7", "1:sus4"],
    bass: { calm: B.pulse, combat: B.tread },
    drums: { calm: D.procession, combat: D.war, drive: D.siege },
    arps: { calm: "0...1...2...1...", busy: "0.1.2.1.0.1.2.3." },
    motifs: {
      a: [[0, 4, 8], [8, 2, 8], [16, 0, 12], [28, 1, 4]],
      av: [[0, 4, 8], [8, 2, 8], [16, 2, 8], [24, 0, 8]],
      a2: [[0, 5, 8], [8, 3, 8], [16, 4, 8], [24, 2, 8]],
      b: [[0, 6, 8], [8, 3, 4], [12, 4, 4], [16, 5, 8], [24, 4, 8]],
      c: [[0, 1, 8], [8, 3, 8], [16, 4, 8], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"], ["av", "a2", "b", "c"]],
    leadPlan: [1, 0, 1, 1],
    mix: { bed: .95, groove: .85, motion: .7, lead: .75 }, echo: .35, reverb: .55,
  },
  // Revelation: the skylands and the late road, a choir and bells over F# Dorian, nearly still.
  observatory: {
    id: "observatory", name: "Observatory of Still Stars", mood: "awe, wide and slow, the sky turning overhead",
    bpm: 62, swing: 0, root: 54, mode: "dorian", leadOct: 2, pedal: true,
    pad: "both", arp: "dulcimer", leads: ["choir", "celesta", "strings", "bell"],
    chords: ["1:add9", "1:add9", "4", "4", "3:7", "3:7", "7:add9", "5:sus4"],
    bass: { calm: B.pedal, combat: B.pulse },
    drums: { calm: D.none, combat: D.procession, drive: D.rising },
    arps: { calm: "0.......2.......", busy: "0...2...1...3..." },
    motifs: {
      a: [[0, 4, 8], [8, 2, 8], [16, 1, 16]],
      a2: [[0, 3, 8], [8, -2, 8], [16, 0, 16]],
      b: [[0, 2, 8], [8, 1, 8], [16, -1, 16]],
      c: [[0, 1, 8], [8, 0, 8], [16, -3, 8], [24, 0, 8]],
      cv: [[0, 1, 8], [8, 0, 8], [16, 4, 16]],
    },
    forms: [["a", "a2", "b", "c"], ["a", "a2", "b", "cv"]],
    leadPlan: [1, 1, 0],
    mix: { bed: 1, groove: .8, motion: .6, lead: .6 }, echo: .55, reverb: .75,
  },
  // The shared boss track: D Phrygian, still slow, timpani and a low ostinato under an ominous choir. A world beast's own
  // theme (BOSS_THEMES in soundtrack-director.ts) is any further entry here with boss: true.
  boss: {
    id: "boss", name: "The Old Beasts Wake", mood: "heavy and ominous, the ground itself answering",
    bpm: 76, swing: 0, root: 50, mode: "phrygian", leadOct: 2, pedal: false, boss: true, intensityFloor: .72,
    pad: "both", arp: "harpsichord", leads: ["choir", "horn", "cello"], arpOct: 0,
    chords: ["1", "1", "2:7", "1", "6:7", "7:7", "1:sus4", "1"],
    bass: { calm: B.ostinato, combat: B.ostinato },
    drums: { calm: D.rising, combat: D.war, drive: D.siege },
    arps: { calm: "0.1.2.1.0.1.2.1.", busy: "0.1.2.1.0.1.2.3." },
    motifs: {
      a: [[0, 0, 6], [6, 1, 2], [8, 2, 8], [16, 4, 12], [28, 5, 4]],
      a2: [[0, 3, 8], [8, 5, 8], [16, 4, 8], [24, 2, 8]],
      b: [[0, 4, 8], [8, 2, 8], [16, 1, 8], [24, -1, 8]],
      c: [[0, 3, 8], [8, 4, 8], [16, 0, 16]],
    },
    forms: [["a", "a2", "b", "c"], ["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 1, 0],
    mix: { bed: .9, groove: .8, motion: .75, lead: .75 }, echo: .3, reverb: .5,
  },
};

// ---- The world bosses' own themes (Phase 2, Tim 2026-11-14: "each world boss gets its own unique track"). Each is ORIGINAL,
// from the album's palette (modal minor and Hijaz, strings, choir, horn, plucks, bells, drones; frame drum, toms and timpani
// only), with its own mode, tempo, lines and voices for that creature's story (LINER_NOTES). BOSS_THEMES (soundtrack-director.ts)
// maps each beast to its theme. intensityFloor is where its fight starts (.34 combat, .7 driving). `variantOf` marks a form of
// another theme (the same lines, rescored), `tremolo` bows the string pad (Hz), `modes` turns the mode each phrase.
export const BOSS_SONGS = {
  // The Ashen Moth: F# Phrygian, wings of ash fluttering in the dulcimer, a tremolo string pad, a celesta line like sparks.
  cinderWings: {
    id: "cinderWings", name: "Wings of Cinder", mood: "fluttering and eerie, ash drifting up from a burning wood",
    bpm: 74, swing: 0, root: 54, mode: "phrygian", leadOct: 1, pedal: false, boss: true, intensityFloor: .45, tremolo: 7.5,
    pad: "strings", arp: "dulcimer", leads: ["celesta", "strings", "celesta", "choir"],
    chords: ["1", "2:add9", "1", "7", "6:7", "2", "4:7", "1:sus4"],
    bass: { calm: [[0, "R", 8], [8, "5", 8]], combat: [[0, "R", 2], [3, "R", 1], [4, "5", 2], [8, "R", 2], [11, "R", 1], [12, "8", 2]] },
    drums: { calm: { frame: "X.......o.o....." }, combat: { frame: "X..o.oX...o.o...", tom: "........x......." }, drive: { frame: "X.oo.oX.x.oo.ox.", tom: "....x.......x.x.", timp: "X..............." } },
    arps: { calm: "0.1.2.1.....2.1.", busy: "0121012101210121" },
    motifs: {
      a: [[0, 2, 2], [2, 1, 2], [4, 2, 2], [6, 4, 2], [8, 0, 8], [16, 1, 2], [18, 2, 2], [20, 1, 2], [22, -1, 2], [24, 1, 8]],
      a2: [[0, 4, 6], [6, 3, 2], [8, 2, 8], [16, 3, 2], [18, 4, 2], [20, 5, 2], [22, 4, 2], [24, 3, 8]],
      b: [[0, 7, 4], [4, 8, 2], [6, 7, 2], [8, 5, 8], [16, 6, 2], [18, 5, 2], [20, 6, 2], [22, 8, 2], [24, 5, 8]],
      c: [[0, 3, 4], [4, 2, 2], [6, 1, 2], [8, 2, 8], [16, 4, 4], [20, 3, 2], [22, 1, 2], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"], ["a2", "a", "b", "c"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .85, groove: .7, motion: .8, lead: .8 }, echo: .5, reverb: .6,
  },
  // The Briar Stag: A Dorian at a gallop, hunting horns in fourths and fifths, a lute running beside them through the thorns.
  briarHunt: {
    id: "briarHunt", name: "The Briar Hunt", mood: "a forest hunt at full tilt, horns through the thorn wood",
    bpm: 80, swing: .1, root: 57, mode: "dorian", leadOct: 1, pedal: false, boss: true, intensityFloor: .5,
    pad: "strings", arp: "lute", leads: ["horn", "lute", "horn", "strings"],
    chords: ["1", "7", "4", "1", "3:7", "7", "4:sus2", "5:7"],
    bass: { calm: [[0, "R", 8], [8, "5", 8]], combat: [[0, "R", 2], [3, "R", 1], [4, "5", 2], [6, "R", 2], [8, "R", 2], [11, "R", 1], [12, "5", 2], [14, "8", 2]] },
    drums: { calm: { frame: "X..x..x.X......." }, combat: { frame: "X..x..x.X..x..x.", tom: "..............x." }, drive: { frame: "X.xx.xx.X.xx.xx.", tom: "......x.....x.xx", timp: "X.......X......." } },
    arps: { calm: "0..2..1.0..2..3.", busy: "0.21.2120.21.232" },
    motifs: {
      a: [[0, 0, 2], [2, 4, 2], [4, 4, 4], [8, 7, 6], [14, 4, 2], [16, 3, 8], [24, 1, 8]],
      a2: [[0, 3, 4], [4, 5, 2], [6, 4, 2], [8, 3, 8], [16, 4, 6], [22, 2, 2], [24, 0, 8]],
      b: [[0, 6, 6], [6, 5, 2], [8, 4, 4], [12, 2, 4], [16, 3, 4], [20, 4, 2], [22, 3, 2], [24, 1, 8]],
      c: [[0, 4, 8], [8, 3, 4], [12, 1, 4], [16, 1, 8], [24, 4, 8]],
      cv: [[0, 4, 6], [6, 5, 2], [8, 3, 4], [12, 1, 4], [16, 4, 4], [20, 6, 4], [24, 3, 8]],
    },
    forms: [["a", "a2", "b", "c"], ["a", "a2", "b", "cv"]],
    leadPlan: [1, 1, 1, 0],
    mix: { bed: .85, groove: .85, motion: .75, lead: .8 }, echo: .3, reverb: .45,
  },
  // The Crimson Tyrant: Eb Aeolian, broad and royal; horns and a choir over timpani, the court of a dragon that burns what it claims.
  crimsonCrown: {
    id: "crimsonCrown", name: "The Crimson Crown", mood: "fire and majesty, a dragon's court in smoke",
    bpm: 68, swing: 0, root: 51, mode: "aeolian", leadOct: 1, pedal: false, boss: true, intensityFloor: .5,
    pad: "both", arp: "harpsichord", leads: ["horn", "choir", "horn", "strings"], arpOct: 0,
    chords: ["1:add9", "6", "7", "1", "4:7", "6", "7:sus4", "5"],
    bass: { calm: [[0, "R", 16]], combat: [[0, "R", 3], [3, "R", 1], [4, "5", 4], [8, "R", 3], [11, "R", 1], [12, "7", 4]] },
    drums: { calm: { timp: "X.......x......." }, combat: { timp: "X.......X...x.x.", frame: "X.......x......." }, drive: { timp: "X.......X...x.xx", frame: "X...x...X...x.x.", tom: "....x.......x..." } },
    arps: { calm: "0...1...2...1...", busy: "0.1.2.3.4.3.2.1." },
    motifs: {
      a: [[0, 0, 4], [4, 2, 4], [8, 4, 8], [16, 5, 6], [22, 4, 2], [24, 2, 8]],
      a2: [[0, 6, 8], [8, 3, 4], [12, 4, 4], [16, 2, 8], [24, 4, 8]],
      b: [[0, 7, 6], [6, 6, 2], [8, 5, 8], [16, 7, 8], [24, 9, 8]],
      c: [[0, 6, 8], [8, 2, 4], [12, 3, 4], [16, 4, 8], [24, 1, 8]],
      cv: [[0, 6, 8], [8, 2, 4], [12, 3, 4], [16, 4, 4], [20, 6, 4], [24, 4, 8]],
    },
    forms: [["a", "a2", "b", "c"], ["a", "a2", "b", "cv"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .9, groove: .85, motion: .7, lead: .8 }, echo: .25, reverb: .6,
  },
  // The Doom Chaser: G Phrygian at the album's top speed, a low harpsichord ostinato and a galloping bass that never rest,
  // a dark choir above. It is always behind you: its fight starts driving.
  longPursuit: {
    id: "longPursuit", name: "The Long Pursuit", mood: "dark pursuit, footfalls that never stop",
    bpm: 84, swing: 0, root: 55, mode: "phrygian", leadOct: 1, pedal: false, boss: true, intensityFloor: .72,
    pad: "choir", arp: "harpsichord", leads: ["choir", "cello", "choir", "horn"], arpOct: 0,
    chords: ["1", "6", "7", "1", "4", "6", "2", "1:sus2"],
    bass: { calm: [[0, "R", 2], [4, "R", 2], [8, "R", 2], [12, "5", 2]], combat: [[0, "R", 1], [1, "R", 1], [2, "R", 2], [4, "R", 1], [5, "R", 1], [6, "5", 2], [8, "R", 1], [9, "R", 1], [10, "R", 2], [12, "8", 2], [14, "7", 2]] },
    drums: { calm: { frame: "X...x...X...x...", tom: "..............o." }, combat: { frame: "X.x.x.x.X.x.x.x.", tom: "...x.....x...x..", timp: "X..............." }, drive: { frame: "X.xxX.xxX.xxX.x.", tom: "..x...x...x...xx", timp: "X.......X......." } },
    arps: { calm: "0.1.0.2.0.1.0.2.", busy: "01.201.201.201.2" },
    motifs: {
      a: [[0, 4, 8], [8, 2, 6], [14, 1, 2], [16, 2, 8], [24, 0, 8]],
      a2: [[0, 3, 8], [8, 1, 6], [14, 2, 2], [16, 0, 8], [24, -3, 8]],
      b: [[0, 5, 4], [4, 4, 2], [6, 5, 2], [8, 7, 8], [16, 6, 4], [20, 5, 4], [24, 2, 8]],
      c: [[0, 1, 8], [8, 3, 8], [16, 1, 4], [20, 0, 4], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 1, 0],
    mix: { bed: .9, groove: .9, motion: .75, lead: .75 }, echo: .25, reverb: .45,
  },
  // The Lightning Giant: A Phrygian, a storm that works like an engine; struck bells in a fixed, mechanical figure, a pounding tom.
  thunderEngine: {
    id: "thunderEngine", name: "Thunder Engine", mood: "a mechanical storm, iron bells in the thunderhead",
    bpm: 78, swing: 0, root: 45, mode: "phrygian", leadOct: 2, pedal: false, boss: true, intensityFloor: .5,
    pad: "strings", arp: "bell", leads: ["bell", "horn", "strings", "horn"],
    chords: ["1", "1", "2", "2", "7", "7", "6:7", "2:sus2"],
    bass: { calm: [[0, "R", 4], [8, "R", 4]], combat: [[0, "R", 2], [4, "R", 2], [6, "R", 1], [8, "R", 2], [12, "5", 2], [14, "R", 1]] },
    drums: { calm: { tom: "X.......X......." }, combat: { tom: "X...X...X...X...", frame: "..x...x...x...x." }, drive: { tom: "X.x.X...X.x.X.xx", frame: "..x...x...x...x.", timp: "X.......X......." } },
    arps: { calm: "0...0...1...0...", busy: "0.0.1...0.0.1.2." },
    motifs: {
      a: [[0, 0, 2], [2, 0, 2], [4, 1, 2], [6, 0, 2], [8, 4, 8], [16, 0, 2], [18, 0, 2], [20, 1, 2], [22, 0, 2], [24, 2, 8]],
      a2: [[0, 1, 2], [2, 1, 2], [4, 2, 2], [6, 1, 2], [8, 5, 8], [16, 1, 2], [18, 1, 2], [20, 2, 2], [22, 3, 2], [24, 3, 8]],
      b: [[0, 6, 4], [4, 5, 4], [8, 3, 8], [16, 1, 8], [24, 6, 8]],
      c: [[0, 5, 8], [8, 4, 4], [12, 2, 4], [16, 1, 8], [24, 2, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .8, groove: .95, motion: .8, lead: .75 }, echo: .35, reverb: .45,
  },
  // The Morphing Blob: on C#, a shape that will not hold. Each phrase turns the mode (Dorian, Aeolian, Phrygian) under the same
  // chords and lines, so the dulcimer's tune keeps its outline while its colour slides; a lopsided 3+3+2 pulse.
  shapeless: {
    id: "shapeless", name: "The Shapeless Thing", mood: "shifting and uneasy, never the same shape twice",
    bpm: 70, swing: .14, root: 49, mode: "dorian", modes: ["dorian", "aeolian", "phrygian"], leadOct: 2, pedal: false, boss: true, intensityFloor: .45,
    pad: "strings", arp: "dulcimer", leads: ["dulcimer", "choir", "dulcimer", "strings"],
    chords: ["1", "4", "1", "7", "3", "4", "7", "1:sus4"],
    bass: { calm: [[0, "R", 6], [6, "5", 4], [12, "R", 4]], combat: [[0, "R", 3], [3, "5", 3], [6, "R", 2], [8, "8", 3], [11, "5", 3], [14, "R", 2]] },
    drums: { calm: { frame: "X.....o.....o..." }, combat: { frame: "X..o..x..o..X...", tom: "......o.....o..." }, drive: { frame: "X.ox..x.X.ox.ox.", tom: "...o..x....o.xx.", timp: "X..............." } },
    arps: { calm: "0..1..2..1..0...", busy: "0.21.32.10.23.1." },
    motifs: {
      a: [[0, 4, 6], [6, 5, 2], [8, 4, 4], [12, 2, 4], [16, 3, 8], [24, 5, 8]],
      a2: [[0, 2, 8], [8, 4, 4], [12, 3, 4], [16, 1, 6], [22, 0, 2], [24, -1, 8]],
      b: [[0, 6, 6], [6, 5, 2], [8, 4, 8], [16, 5, 4], [20, 4, 2], [22, 3, 2], [24, 7, 8]],
      c: [[0, 6, 4], [4, 5, 4], [8, 8, 4], [12, 6, 4], [16, 3, 8], [24, 0, 8]],
      cv: [[0, 6, 4], [4, 5, 4], [8, 8, 4], [12, 6, 4], [16, 4, 8], [24, 7, 8]],
    },
    forms: [["a", "a2", "b", "c"], ["a", "a2", "b", "cv"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .9, groove: .75, motion: .85, lead: .8 }, echo: .5, reverb: .55,
  },
  // The Mountain Turtle: Bb Aeolian at the slowest tempo the album allows, a deep drone and long chords like weather, a timpani
  // stroke for each great step, a cello and low choir carrying a line as slow as the beast.
  mountainWalks: {
    id: "mountainWalks", name: "The Mountain Walks", mood: "vast and slow, a hillside rising to its feet",
    bpm: 58, swing: 0, root: 46, mode: "aeolian", leadOct: 1, pedal: true, boss: true, intensityFloor: .38,
    pad: "both", arp: "bell", leads: ["cello", "choir", "horn", "cello"],
    chords: ["1:add9", "1:add9", "6:7", "6:7", "4", "4", "5:sus4", "1"],
    bass: { calm: [], combat: [[0, "R", 8], [8, "5", 8]] },
    drums: { calm: { timp: "X..............." }, combat: { timp: "X.......X.......", frame: "........o......." }, drive: { timp: "X.......X...x...", frame: "X.......x.......", tom: "....o.......o..." } },
    arps: { calm: "0...............", busy: "0.......2.......", motionCalm: false },
    motifs: {
      a: [[0, 0, 8], [8, 1, 8], [16, 2, 12], [28, 1, 4]],
      a2: [[0, 2, 8], [8, 0, 8], [16, -2, 16]],
      b: [[0, 4, 8], [8, 5, 4], [12, 4, 4], [16, 3, 12], [28, 2, 4]],
      c: [[0, 1, 8], [8, 0, 8], [16, 2, 8], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 0, 1],
    mix: { bed: 1, groove: .9, motion: .5, lead: .75 }, echo: .3, reverb: .7,
  },
  // The Nanobot Knight: E Aeolian, a cold and exact march; a harpsichord ostinato ticking like a mechanism, a brass horn's oath.
  clockworkOath: {
    id: "clockworkOath", name: "Clockwork Oath", mood: "a cold, precise march, a knight that never tires",
    bpm: 76, swing: 0, root: 52, mode: "aeolian", leadOct: 1, pedal: false, boss: true, intensityFloor: .5,
    pad: "strings", arp: "harpsichord", leads: ["horn", "harpsichord", "horn", "strings"], arpOct: 0,
    chords: ["1", "7", "6", "5:sus4", "1", "7", "4:7", "5"],
    bass: { calm: [[0, "R", 4], [4, "R", 4], [8, "R", 4], [12, "R", 4]], combat: [[0, "R", 2], [2, "8", 2], [4, "R", 2], [6, "8", 2], [8, "R", 2], [10, "8", 2], [12, "5", 2], [14, "8", 2]] },
    drums: { calm: { frame: "X...o...x...o..." }, combat: { frame: "X...x...X...x...", tom: "..o...o...o...o." }, drive: { frame: "X.o.x.o.X.o.x.ox", tom: "..x...x...x.x.x.", timp: "X.......X......." } },
    arps: { calm: "01..21..01..21..", busy: "0123012301230123" },
    motifs: {
      a: [[0, 0, 4], [4, 0, 2], [6, 1, 2], [8, 2, 4], [12, 4, 4], [16, 3, 8], [24, 1, 8]],
      a2: [[0, 2, 4], [4, 2, 2], [6, 3, 2], [8, 0, 4], [12, 2, 4], [16, 1, 8], [24, 0, 8]],
      b: [[0, 4, 4], [4, 4, 2], [6, 5, 2], [8, 7, 4], [12, 4, 4], [16, 6, 8], [24, 3, 8]],
      c: [[0, 3, 4], [4, 2, 2], [6, 3, 2], [8, 4, 4], [12, 2, 4], [16, 1, 8], [24, -3, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 1, 0],
    mix: { bed: .8, groove: .85, motion: .85, lead: .8 }, echo: .2, reverb: .4,
  },
  // The Psychic Crystal: G# Dorian, glassy and hypnotic; a bell figure that turns and turns, a celesta and choir over a held drone.
  glassMind: {
    id: "glassMind", name: "The Glass Mind", mood: "glassy and hypnotic, thoughts that are not yours",
    bpm: 66, swing: 0, root: 56, mode: "dorian", leadOct: 1, pedal: true, boss: true, intensityFloor: .4,
    pad: "choir", arp: "bell", leads: ["celesta", "choir", "bell", "celesta"],
    chords: ["1:add9", "3", "1:add9", "7", "4:sus2", "2:7", "1:add9", "5"],
    bass: { calm: [], combat: [[0, "R", 4], [6, "5", 2], [8, "R", 4], [14, "5", 2]] },
    drums: { calm: {}, combat: { frame: "X.......o...o..." }, drive: { frame: "X...o.o.X...o.o.", tom: "......x.......x.", timp: "X..............." } },
    arps: { calm: "0.2.1.2.0.2.1.2.", busy: "0.2.1.2...2.1.23" },
    motifs: {
      a: [[0, 4, 4], [4, 2, 4], [8, 4, 4], [12, 2, 4], [16, 6, 4], [20, 4, 4], [24, 2, 8]],
      a2: [[0, 1, 8], [8, 2, 4], [12, 1, 4], [16, 0, 8], [24, -1, 8]],
      b: [[0, 7, 6], [6, 8, 2], [8, 7, 8], [16, 8, 8], [24, 7, 4], [28, 6, 4]],
      c: [[0, 2, 8], [8, 1, 8], [16, 4, 8], [24, 6, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: 1, groove: .85, motion: .9, lead: .85 }, echo: .6, reverb: .75,
  },
  // The Tremor Worm: B Phrygian below ground, earthy low toms rolling like something moving under the floor, a drone held
  // beneath everything, a cello's low line.
  underTheFloor: {
    id: "underTheFloor", name: "Beneath the Floor", mood: "underground, the earth shrugging under your feet",
    bpm: 64, swing: 0, root: 47, mode: "phrygian", leadOct: 1, pedal: true, boss: true, intensityFloor: .45,
    pad: "both", arp: "lute", leads: ["cello", "choir", "horn", "cello"], arpOct: 0,
    chords: ["1", "1", "2", "1", "7", "6", "2", "1"],
    bass: { calm: [], combat: [[0, "R", 3], [3, "R", 3], [6, "R", 2], [8, "5", 4], [12, "R", 4]] },
    drums: { calm: { tom: "X.......o..o...." }, combat: { tom: "X..o..x.X..o.ox.", frame: "X..............." }, drive: { tom: "X.xo.xx.X.xo.xxx", frame: "X.......X.......", timp: "X..............." } },
    arps: { calm: "0.......1.......", busy: "0...1.0.2...1.0." },
    motifs: {
      a: [[0, 0, 12], [12, 1, 4], [16, 0, 8], [24, 2, 8]],
      a2: [[0, 1, 8], [8, 3, 8], [16, 2, 8], [24, 4, 8]],
      b: [[0, 6, 8], [8, 8, 4], [12, 6, 4], [16, 5, 8], [24, 7, 8]],
      c: [[0, 3, 8], [8, 1, 8], [16, 2, 4], [20, 1, 4], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 0, 1, 1],
    mix: { bed: .95, groove: .95, motion: .6, lead: .75 }, echo: .35, reverb: .55,
  },
  // The Void Walker: F Hijaz, an alien stillness between the stars; a choir, a sparse bell, long silences.
  walkerBetween: {
    id: "walkerBetween", name: "The Walker Between", mood: "an alien void, footsteps where there is no ground",
    bpm: 60, swing: 0, root: 53, mode: "hijaz", leadOct: 1, pedal: true, boss: true, intensityFloor: .36,
    pad: "choir", arp: "bell", leads: ["choir", "bell", "strings", "choir"],
    chords: ["1:sus2", "2", "1", "7", "4", "2", "1", "1:sus4"],
    bass: { calm: [], combat: [[0, "R", 8], [12, "5", 4]] },
    drums: { calm: {}, combat: { frame: "X.........o.....", tom: "........o......." }, drive: { frame: "X.....o...x.....", tom: "....o.......x...", timp: "X..............." } },
    arps: { calm: "0...............", busy: "0.......3.......", motionCalm: false },
    motifs: {
      a: [[0, 0, 8], [8, 1, 4], [12, 2, 4], [16, 1, 16]],
      a2: [[0, 4, 8], [8, 2, 8], [16, 3, 8], [24, 1, 8]],
      b: [[0, 7, 8], [8, 5, 4], [12, 4, 4], [16, 5, 12], [28, 3, 4]],
      c: [[0, 2, 8], [8, 4, 4], [12, 1, 4], [16, 0, 16]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 0, 1, 0],
    mix: { bed: 1, groove: .85, motion: .75, lead: .9 }, echo: .65, reverb: .8,
  },
  // The Wild Stegosaurus: E Dorian, wild and hungry but a bit of a romp (it was made for Tim's kid); a frame-drum gallop, a
  // bouncing lute, a horn, and once in a while a recorder having fun.
  fernsAndPlates: {
    id: "fernsAndPlates", name: "Ferns and Plates", mood: "wild, hungry and a little playful, a stampede through the ferns",
    bpm: 82, swing: .2, root: 52, mode: "dorian", leadOct: 1, pedal: false, boss: true, intensityFloor: .45,
    pad: "strings", arp: "lute", leads: ["lute", "horn", "lute", "recorder", "dulcimer"],
    chords: ["1", "4", "7", "1", "3", "4", "2", "5:7"],
    bass: { calm: [[0, "R", 4], [6, "5", 2], [8, "R", 4], [14, "5", 2]], combat: [[0, "R", 2], [3, "5", 1], [4, "R", 2], [6, "8", 2], [8, "R", 2], [11, "5", 1], [12, "R", 2], [14, "8", 2]] },
    drums: { calm: { frame: "X..x....X..x...." }, combat: { frame: "X..xX..xX..xX.x.", tom: "..........o...o." }, drive: { frame: "X.xxX.xxX.xxX.xx", tom: "...x...x...x..xx", timp: "X.......X......." } },
    arps: { calm: "0.2..1.20.2..3.2", busy: "0213.213.213.213" },
    motifs: {
      a: [[0, 0, 2], [2, 2, 2], [4, 4, 2], [6, 2, 2], [8, 4, 4], [12, 5, 2], [14, 4, 2], [16, 3, 6], [22, 4, 2], [24, 5, 4], [28, 3, 4]],
      a2: [[0, 6, 2], [2, 5, 2], [4, 6, 2], [6, 7, 2], [8, 8, 4], [12, 6, 4], [16, 4, 8], [24, 2, 4], [28, 0, 4]],
      b: [[0, 2, 4], [4, 4, 2], [6, 6, 2], [8, 4, 8], [16, 5, 2], [18, 6, 2], [20, 5, 2], [22, 4, 2], [24, 3, 8]],
      c: [[0, 1, 4], [4, 3, 2], [6, 5, 2], [8, 3, 8], [16, 4, 4], [20, 6, 2], [22, 5, 2], [24, 4, 8]],
      cv: [[0, 1, 4], [4, 3, 2], [6, 5, 2], [8, 3, 8], [16, 4, 2], [18, 5, 2], [20, 6, 2], [22, 7, 2], [24, 8, 8]],
    },
    forms: [["a", "a2", "b", "c"], ["a", "a2", "b", "cv"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .85, groove: .9, motion: .8, lead: .85 }, echo: .3, reverb: .4,
  },
  // The Spinosaurus: D Aeolian, a predator wading the shallows; low timpani prowling in dotted strides, a cello stalking.
  riverStalker: {
    id: "riverStalker", name: "The River Stalker", mood: "a predator in the shallows, patient and then not",
    bpm: 66, swing: .06, root: 50, mode: "aeolian", leadOct: 1, pedal: false, boss: true, intensityFloor: .5,
    pad: "strings", arp: "lute", leads: ["cello", "horn", "cello", "choir"], arpOct: 0,
    chords: ["1", "1", "6", "5", "1", "4:7", "6", "5:sus4"],
    bass: { calm: [[0, "R", 6], [10, "5", 6]], combat: [[0, "R", 3], [6, "R", 2], [10, "5", 3], [14, "R", 2]] },
    drums: { calm: { timp: "X.....x........." }, combat: { timp: "X.....x.....x...", frame: "........x......." }, drive: { timp: "X.....x.....x.x.", frame: "X...x...X...x...", tom: "..o.....o.....x." } },
    arps: { calm: "0.....1.....2...", busy: "0..1..2..1..2.3." },
    motifs: {
      a: [[0, 0, 6], [6, 1, 2], [8, 2, 8], [16, 0, 4], [20, -1, 2], [22, 0, 2], [24, -3, 8]],
      a2: [[0, 2, 8], [8, 0, 4], [12, -2, 4], [16, -3, 8], [24, -1, 8]],
      b: [[0, 4, 4], [4, 5, 2], [6, 4, 2], [8, 2, 8], [16, 3, 8], [24, 5, 8]],
      c: [[0, 5, 8], [8, 2, 4], [12, 1, 4], [16, 0, 8], [24, -3, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 1, 0],
    mix: { bed: .85, groove: .9, motion: .6, lead: .8 }, echo: .3, reverb: .5,
  },
  // The Questing Beast: C Dorian, the quarry that bays like a pack of hounds and is never caught; leaping string and horn calls
  // over a chord line that climbs step by step and falls back.
  quarryBays: {
    id: "quarryBays", name: "The Quarry That Bays", mood: "the endless chase, hounds baying in its belly",
    bpm: 78, swing: .12, root: 48, mode: "dorian", leadOct: 2, pedal: false, boss: true, intensityFloor: .5,
    pad: "strings", arp: "lute", leads: ["strings", "horn", "lute", "choir"],
    chords: ["1", "2", "3", "4", "5", "4", "7:add9", "1:sus4"],
    bass: { calm: [[0, "R", 4], [4, "5", 4], [8, "R", 4], [12, "5", 4]], combat: [[0, "R", 2], [2, "5", 2], [4, "8", 2], [6, "5", 2], [8, "R", 2], [10, "5", 2], [12, "8", 2], [14, "7", 2]] },
    drums: { calm: { frame: "X.....x...x....." }, combat: { frame: "X.x...x.X.x...x.", tom: "...x......x..x.." }, drive: { frame: "X.xxX.x.X.xxX.x.", tom: "...x..x....x..xx", timp: "X.......X......." } },
    arps: { calm: "0...2.1.0...3.1.", busy: "0.2.1.2.3.2.1.4." },
    motifs: {
      a: [[0, 4, 4], [4, 7, 4], [8, 4, 6], [14, 2, 2], [16, 3, 8], [24, 1, 8]],
      a2: [[0, 2, 4], [4, 6, 4], [8, 4, 8], [16, 5, 4], [20, 3, 2], [22, 5, 2], [24, 7, 8]],
      b: [[0, 8, 8], [8, 6, 4], [12, 4, 4], [16, 5, 4], [20, 6, 4], [24, 7, 8]],
      c: [[0, 6, 8], [8, 8, 4], [12, 7, 4], [16, 4, 8], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .85, groove: .85, motion: .8, lead: .8 }, echo: .35, reverb: .5,
  },
  // The Stalker: Bb Phrygian, something that follows just out of the light; a creeping half-step line, a cello, a far bell.
  eyesBehind: {
    id: "eyesBehind", name: "Eyes Behind the Light", mood: "creeping dread, something one step behind",
    bpm: 62, swing: 0, root: 46, mode: "phrygian", leadOct: 2, pedal: true, boss: true, intensityFloor: .45,
    pad: "strings", arp: "harpsichord", leads: ["cello", "bell", "choir", "cello"],
    chords: ["1", "2", "1", "2", "6:7", "7", "2:7", "1"],
    bass: { calm: [], combat: [[0, "R", 2], [8, "R", 2], [11, "5", 2], [14, "R", 2]] },
    drums: { calm: { frame: "X.........o....." }, combat: { frame: "X.....o.....o...", tom: "..........x....." }, drive: { frame: "X.....o.x...o.x.", tom: "...o......x...xx", timp: "X..............." } },
    arps: { calm: "0.........1.....", busy: "0.....1.....2..." },
    motifs: {
      a: [[0, 0, 8], [8, 1, 2], [10, 0, 6], [16, 1, 8], [24, 3, 4], [28, 1, 4]],
      a2: [[0, 4, 8], [8, 2, 4], [12, 1, 4], [16, 5, 8], [24, 3, 8]],
      b: [[0, 7, 8], [8, 5, 8], [16, 6, 4], [20, 5, 4], [24, 8, 8]],
      c: [[0, 1, 8], [8, 0, 8], [16, 0, 4], [20, -1, 4], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 0, 1, 1],
    mix: { bed: .95, groove: .85, motion: .6, lead: .75 }, echo: .5, reverb: .65,
  },
  // The Astral Worm: B Dorian, a coil of starlight between the worlds; rolling dulcimer arcs, strings and choir, a celesta.
  coilOfStars: {
    id: "coilOfStars", name: "Coil of Stars", mood: "cosmic and coiling, a road of light that bites",
    bpm: 70, swing: 0, root: 47, mode: "dorian", leadOct: 2, pedal: false, boss: true, intensityFloor: .45,
    pad: "both", arp: "dulcimer", leads: ["strings", "choir", "celesta", "strings"],
    chords: ["1:sus2", "4", "1:sus2", "4", "3:add9", "7", "4:sus2", "5"],
    bass: { calm: [[0, "R", 8], [8, "5", 8]], combat: [[0, "R", 3], [3, "5", 3], [6, "8", 2], [8, "R", 3], [11, "5", 3], [14, "8", 2]] },
    drums: { calm: { frame: "X.......o......." }, combat: { frame: "X..o..x.X..o..x.", tom: "...........o...." }, drive: { frame: "X..x..x.X..x.ox.", tom: "......o.....x.x.", timp: "X..............." } },
    arps: { calm: "0..1..2..3..2..1", busy: "01.32.1.01.32.1." },
    motifs: {
      a: [[0, 0, 4], [4, 1, 4], [8, 4, 8], [16, 3, 4], [20, 4, 4], [24, 7, 8]],
      a2: [[0, 4, 6], [6, 5, 2], [8, 1, 8], [16, 5, 8], [24, 3, 8]],
      b: [[0, 2, 8], [8, 4, 4], [12, 3, 4], [16, 6, 8], [24, 1, 8]],
      c: [[0, 3, 8], [8, 4, 8], [16, 6, 4], [20, 5, 4], [24, 4, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .9, groove: .8, motion: .8, lead: .75 }, echo: .55, reverb: .7,
  },
  // The Listener: C# Aeolian, a call into the dark and a long silence while something answers; signal pings, a bell and choir.
  whatListens: {
    id: "whatListens", name: "What Listens Back", mood: "eerie stillness, a signal and its answer",
    bpm: 60, swing: 0, root: 49, mode: "aeolian", leadOct: 1, pedal: true, boss: true, intensityFloor: .4,
    pad: "strings", arp: "harpsichord", leads: ["bell", "choir", "strings", "bell"],
    chords: ["1", "3", "4", "1", "6:7", "3", "5:7", "1:sus2"],
    bass: { calm: [], combat: [[0, "R", 4], [8, "R", 4], [12, "5", 4]] },
    drums: { calm: {}, combat: { frame: "X...........o..." }, drive: { frame: "X.......x...o...", tom: "....o.......x...", timp: "X..............." } },
    arps: { calm: "0.......0.......", busy: "0...0...1...0.2." },
    motifs: {
      a: [[0, 4, 4], [8, 4, 4], [12, 3, 2], [14, 2, 2], [16, 2, 12]],
      a2: [[0, 3, 8], [8, 5, 8], [16, 4, 4], [24, 0, 8]],
      b: [[0, 5, 8], [8, 7, 4], [12, 6, 4], [16, 4, 8], [24, 2, 8]],
      c: [[0, 4, 8], [8, 6, 8], [16, 1, 8], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 0, 1, 0],
    mix: { bed: .95, groove: .75, motion: .7, lead: .7 }, echo: .7, reverb: .75,
  },
  // Gloomvast: G Aeolian, a gloom that rises like water; a heavy choir and cello over timpani, a low lute turning underneath.
  gloomRises: {
    id: "gloomRises", name: "The Gloom Rises", mood: "heavy and drowning, the dark coming up like a tide",
    bpm: 63, swing: 0, root: 55, mode: "aeolian", leadOct: 1, pedal: false, boss: true, intensityFloor: .5,
    pad: "both", arp: "lute", leads: ["choir", "cello", "horn", "choir"], arpOct: 0,
    chords: ["1", "7", "6", "7", "1", "6", "4:7", "5"],
    bass: { calm: [[0, "R", 16]], combat: [[0, "R", 4], [4, "R", 2], [6, "5", 2], [8, "R", 4], [12, "7", 4]] },
    drums: { calm: { frame: "X.......o.......", timp: "........x......." }, combat: { timp: "X.......x.......", frame: "X...o...X...o..." }, drive: { timp: "X.......X...x.x.", frame: "X.o.x.o.X.o.x.o.", tom: "..o.......o...x." } },
    arps: { calm: "0...1...0...2...", busy: "0.1.0.2.0.1.0.3." },
    motifs: {
      a: [[0, 0, 8], [8, 2, 8], [16, 3, 8], [24, 1, 8]],
      a2: [[0, 2, 8], [8, 0, 4], [12, 2, 4], [16, 1, 12], [28, 0, 4]],
      b: [[0, 4, 8], [8, 7, 8], [16, 6, 8], [24, 5, 8]],
      c: [[0, 3, 8], [8, 2, 4], [12, 3, 4], [16, 4, 8], [24, 1, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .95, groove: .85, motion: .65, lead: .75 }, echo: .35, reverb: .6,
  },
  // The Gate Revenants: C Phrygian, the dead that come back through the gate, wave on wave; a grim relentless march.
  revenantsReturn: {
    id: "revenantsReturn", name: "The Revenants Return", mood: "relentless, the dead marching back through the gate",
    bpm: 80, swing: 0, root: 48, mode: "phrygian", leadOct: 2, pedal: false, boss: true, intensityFloor: .6,
    pad: "choir", arp: "harpsichord", leads: ["horn", "strings", "choir", "horn"], arpOct: 0,
    chords: ["1", "7", "6", "7", "1", "2", "7:7", "1"],
    bass: { calm: [[0, "R", 2], [4, "R", 2], [8, "R", 2], [12, "R", 2]], combat: [[0, "R", 2], [2, "R", 1], [4, "R", 2], [6, "R", 1], [8, "5", 2], [10, "5", 1], [12, "7", 2], [14, "8", 2]] },
    drums: { calm: { frame: "X...x...X...x..." }, combat: { frame: "X.x.X.x.X.x.X.x.", tom: "....x.......x..x" }, drive: { frame: "X.xxX.x.X.xxX.xx", tom: "..x.....x.x...xx", timp: "X.......X...X..." } },
    arps: { calm: "0.2.0.1.0.2.0.1.", busy: "0.2.1.2...2.1.23" },
    motifs: {
      a: [[0, 0, 4], [4, 0, 2], [6, 1, 2], [8, 2, 8], [16, 1, 8], [24, -1, 8]],
      a2: [[0, 0, 8], [8, -2, 8], [16, -1, 4], [20, 1, 4], [24, 3, 8]],
      b: [[0, 4, 4], [4, 5, 4], [8, 4, 8], [16, 3, 8], [24, 1, 8]],
      c: [[0, 5, 8], [8, 3, 8], [16, 2, 8], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 1, 0],
    mix: { bed: .85, groove: .9, motion: .75, lead: .8 }, echo: .25, reverb: .45,
  },
  // The Tyrant Mosasaur: Eb Phrygian with a rolling swing, swells that lift the boat and drop it; a horn and strings over the
  // deep, a dulcimer like light on the water.
  deepTide: {
    id: "deepTide", name: "Teeth of the Deep Tide", mood: "a sea predator rising, the swell lifting and falling",
    bpm: 72, swing: .2, root: 51, mode: "phrygian", leadOct: 1, pedal: false, boss: true, intensityFloor: .5,
    pad: "strings", arp: "dulcimer", leads: ["horn", "strings", "cello", "horn"],
    chords: ["1", "1", "6", "7", "1", "2", "6:7", "1:sus4"],
    bass: { calm: [[0, "R", 6], [6, "5", 6], [12, "R", 4]], combat: [[0, "R", 3], [3, "5", 3], [6, "8", 3], [9, "5", 3], [12, "R", 4]] },
    drums: { calm: { frame: "X.....o.........", timp: "............o..." }, combat: { frame: "X.....x.X.....x.", timp: "X..............." }, drive: { frame: "X..x..x.X..x..xx", tom: "......x.......x.", timp: "X.......X.....x." } },
    arps: { calm: "0...1..2..1.....", busy: "0.1..2.1.0.2..1." },
    motifs: {
      a: [[0, 0, 6], [6, 2, 2], [8, 4, 8], [16, 7, 6], [22, 5, 2], [24, 4, 8]],
      a2: [[0, 5, 8], [8, 2, 8], [16, 6, 8], [24, 3, 8]],
      b: [[0, 4, 4], [4, 2, 4], [8, 0, 8], [16, 1, 8], [24, 3, 8]],
      c: [[0, 4, 8], [8, 2, 8], [16, 3, 8], [24, 0, 8]],
    },
    forms: [["a", "a2", "b", "c"]],
    leadPlan: [1, 1, 0, 1],
    mix: { bed: .9, groove: .85, motion: .75, lead: .8 }, echo: .5, reverb: .6,
  },
};
// Forms a beast takes: the same lines and chords as its theme, rescored (not distinct themes of their own).
// The chrysalis on its great tree: the Ashen Moth's theme before it hatches, slower and hushed, the pulse barely there.
BOSS_SONGS.cinderSleep = {
  ...BOSS_SONGS.cinderWings, id: "cinderSleep", name: "The Chrysalis Sleeps", mood: "hushed, something waiting inside the ash",
  variantOf: "cinderWings", bpm: 64, intensityFloor: 0, tremolo: 4, arp: "bell", leads: ["celesta", "choir"],
  drums: { calm: {}, combat: { frame: "X.......o......." }, drive: { frame: "X.....o.X...o...", tom: "............o..." } },
  arps: { calm: "0...........2...", busy: "0...2...1...2..." },
  leadPlan: [0, 1, 0], mix: { bed: .9, groove: .6, motion: .7, lead: .6 }, echo: .55, reverb: .7,
};
// The Spinosaurus once its flesh has fallen away (e.spinoFossil): the same hunt in bone; a dry harpsichord and bell, a hollow
// choir pad, and the drums gone to clicking edge taps.
BOSS_SONGS.bonesHunt = {
  ...BOSS_SONGS.riverStalker, id: "bonesHunt", name: "The Bones Still Hunt", mood: "skeletal and dry, bone clicking on stone",
  variantOf: "riverStalker", intensityFloor: .6, pad: "choir", arp: "harpsichord", arpOct: 1, leads: ["bell", "harpsichord", "cello"],
  drums: { calm: { frame: "o.o...o.o.o....." }, combat: { timp: "X.....x.........", frame: "..o.o...o.o.o..." }, drive: { timp: "X.....x.....x...", frame: "X.o.o.x.o.o.X.o.", tom: "....o.......o..." } },
  arps: { calm: "0.0...1.0.....2.", busy: "0.01..1.0.02..2." },
  mix: { bed: .8, groove: 1, motion: 1, lead: .95 }, echo: .45, reverb: .35,
};
Object.assign(SONGS, BOSS_SONGS);

// Short scored moments, 2-6 s. Played in the current song's key (its tonic pitch class, around middle C), in their own
// mode. Events: [beat, instrument, scale step or [steps], length in beats, velocity].
export const STINGERS = {
  // The departure: the gate of the Refuge closes behind, a bell, a horn sets out.
  departure: { bpm: 60, mode: "dorian", events: [
    [0, "drone", -14, 5, .8], [0, "strings", [-7, -5, -3], 5, .7], [0, "bell", 7, 3, .55],
    [1, "horn", 0, 1, .7], [2, "horn", 2, .5, .7], [2.5, "horn", 4, 1.5, .75], [4, "bell", 4, 1.5, .45],
  ] },
  // A world beast appears or wakes: timpani roll, a low choir, a bell on the flat second.
  beast: { bpm: 66, mode: "phrygian", events: [
    [0, "timp", -14, 3, 1], [0, "drone", -14, 5, .9], [0, "choir", [-7, -5, -3], 5, .8],
    [2, "timp", -14, .25, .45], [2.25, "timp", -14, .25, .55], [2.5, "timp", -14, .25, .7], [2.75, "timp", -14, .25, .85],
    [3, "timp", -14, 2, 1], [3, "bell", -6, 2, .8], [3.5, "bell", -7, 1.5, .6],
  ] },
  // A boss is defeated: strings swell, the harpsichord climbs, a horn and a bell answer. Dorian, ending on its major fourth chord.
  victory: { bpm: 72, mode: "dorian", events: [
    [0, "strings", [-7, -5, -3], 2, .8], [2, "strings", [-4, -2, 0], 3.5, .85],
    [0, "harpsichord", 0, .5, .7], [.25, "harpsichord", 2, .5, .7], [.5, "harpsichord", 4, .5, .75], [.75, "harpsichord", 7, .5, .75],
    [1, "harpsichord", 9, .5, .8], [1.25, "harpsichord", 11, 1, .8], [2, "bell", 10, 2.5, .8], [2, "horn", 5, 1, .7], [3, "horn", 7, 2.5, .75],
  ] },
  // Rest at a Waystone or Crown Rest: a choir breath and three soft dulcimer notes.
  rest: { bpm: 60, mode: "dorian", events: [
    [0, "choir", [-7, -5, -3, -1], 4.5, .7], [0, "dulcimer", 0, 1, .6], [.5, "dulcimer", 4, 1, .55], [1, "dulcimer", 2, 1, .55],
    [2, "dulcimer", 7, 2, .6], [3, "bell", 8, 2, .45],
  ] },
  // Entering a new region: a celesta call over a sus chord and the drone.
  region: { bpm: 66, mode: "dorian", events: [
    [0, "drone", -14, 4, .8], [0, "strings", [-7, -4, -3], 4, .7],
    [0, "celesta", 4, 1, .75], [1, "celesta", 5, .5, .7], [1.5, "celesta", 4, .5, .7], [2, "celesta", 2, 2, .75],
  ] },
  // The Wayfarer dies: a cello falls through the scale over a darkening choir.
  death: { bpm: 56, mode: "aeolian", events: [
    [0, "timp", -14, 2, .6], [0, "choir", [-7, -5, -3], 2, .75], [2, "choir", [-9, -7, -5], 3, .7],
    [0, "cello", 4, 1, .75], [1, "cello", 3, 1, .7], [2, "cello", 2, 1, .7], [3, "cello", 1, .5, .65], [3.5, "cello", 0, 2, .7],
    [4, "bell", -7, 1.5, .5],
  ] },
};
export const STINGER_INSTRUMENTS = ["timp", "drone", "choir", "strings", "bell", "celesta", "harpsichord", "dulcimer", "horn", "cello"];
export const WINDS = ["flute", "recorder", "ney"];
export const stingerSeconds = (s) => Math.max(...s.events.map(([beat, , , len]) => (beat + len) * 60 / s.bpm)) + 1.2;

// Every problem with a song's data, as text (empty: valid). The test suite runs it over every song.
export function validateSong(song) {
  // A shape-shifter (`modes`, one per phrase in turn) must hold together in every mode it takes.
  if (song?.modes) {
    const id = song.id || "?";
    if (!Array.isArray(song.modes) || !song.modes.length || !song.modes.every((m) => MODES[m])) return [`${id}: bad modes`];
    if (song.modes[0] !== song.mode) return [`${id}: modes start in its own mode`];
    return [...new Set(song.modes.flatMap((mode) => validateSong({ ...song, mode, modes: undefined }).map((b) => `${b} (${mode})`)))];
  }
  const bad = [], L = SONG_LIMITS, id = song?.id || "?";
  if (!MODES[song.mode]) bad.push(`${id}: unknown mode ${song.mode}`);
  if (!(song.bpm >= L.bpm[0] && song.bpm <= L.bpm[1])) bad.push(`${id}: tempo ${song.bpm} outside ${L.bpm}`);
  if (!(song.swing >= L.swing[0] && song.swing <= L.swing[1])) bad.push(`${id}: swing ${song.swing}`);
  if (!Number.isInteger(song.root) || song.root < 45 || song.root > 59) bad.push(`${id}: root ${song.root}`);
  if (song.tremolo != null && !(song.tremolo >= 3 && song.tremolo <= 12)) bad.push(`${id}: tremolo ${song.tremolo}`);
  if (song.intensityFloor != null && !(song.intensityFloor >= 0 && song.intensityFloor <= 1)) bad.push(`${id}: intensity floor`);
  if (!INSTRUMENTS.pads.includes(song.pad) || !INSTRUMENTS.arps.includes(song.arp) || !(song.leads?.length && song.leads.every((l) => INSTRUMENTS.leads.includes(l)))) bad.push(`${id}: instrument`);
  if (song.chords?.length !== L.bars) bad.push(`${id}: needs ${L.bars} chords`);
  if (bad.length) return bad;
  const scale = new Set(MODES[song.mode].map((s) => pc(song.root + s)));
  for (const spec of song.chords) {
    const c = parseChord(spec);
    if (!c.shape || !(c.degree >= 0 && c.degree < 7)) { bad.push(`${id}: bad chord ${spec}`); continue; }
    for (const p of chordPcs(song, spec)) if (!scale.has(p)) bad.push(`${id}: chord ${spec} leaves the key`);
    // No diminished or augmented chords: every chord has a perfect fifth over its root.
    const semis = chordSemis(song, spec);
    if (pc(semis[2] - semis[0]) !== 7) bad.push(`${id}: chord ${spec} has no perfect fifth`);
  }
  for (const tier of ["calm", "combat"]) for (const [step, tone, len] of song.bass[tier] || []) {
    if (!(Number.isInteger(step) && step >= 0 && step < 16 && len > 0 && step + len <= 16)) bad.push(`${id}: bass ${tier} ${step}`);
    if (!["R", "3", "5", "7", "8", "P"].includes(tone)) bad.push(`${id}: bass tone ${tone}`);
  }
  for (const tier of ["calm", "combat", "drive"]) for (const [voice, pattern] of Object.entries(song.drums[tier] || {})) {
    if (!DRUM_VOICES.includes(voice)) bad.push(`${id}: drum ${voice}`);
    if (pattern.length !== L.steps || /[^Xxo.]/.test(pattern)) bad.push(`${id}: drums ${tier}.${voice}`);
  }
  for (const k of ["calm", "busy"]) if (song.arps[k]?.length !== L.steps || /[^0-7.]/.test(song.arps[k])) bad.push(`${id}: arp ${k}`);
  for (const [name, notes] of Object.entries(song.motifs)) for (const [start, , len] of notes)
    if (!(Number.isInteger(start) && start >= 0 && start < 32 && len > 0 && start + len <= 32)) bad.push(`${id}: motif ${name} at ${start}`);
  if (!Array.isArray(song.forms) || !song.forms.length) bad.push(`${id}: no forms`);
  for (const form of song.forms || []) {
    if (form.length !== 4) bad.push(`${id}: form length`);
    form.forEach((name, i) => {
      const notes = song.motifs[name];
      if (!notes) { bad.push(`${id}: motif ${name} missing`); return; }
      // Any note that starts on beat 1 or 3 and lasts at least a beat is a chord tone, or a whole-step ninth over the root.
      for (const [start, step, len] of notes) {
        if (start % 8 !== 0 || len < 4) continue;
        const spec = song.chords[i * 2 + (start >= 16 ? 1 : 0)], semis = chordSemis(song, spec), p = pc(stepToSemi(song.mode, step));
        const ok = semis.some((s) => pc(s) === p) || pc(p - semis[0]) === 2;
        if (!ok) bad.push(`${id}: motif ${name} note ${step} at ${start} clashes with ${spec}`);
      }
    });
  }
  if (!song.leadPlan?.length || !song.leadPlan.some(Boolean)) bad.push(`${id}: lead never sings`);
  return bad;
}
// The album: the songs in the order of the Wayfarer's journey, with where each belongs (liner notes). The arc runs from torpid,
// wandering passages through urgent, rising ones to awe; chapters (soundtrack-director.ts CHAPTERS) move a journey along it.
export const LINER_NOTES = [
  { id: "roadOut", moment: "The departure: the Refuge behind, the first miles", feel: "torpid" },
  { id: "pilgrimsWay", moment: "Wandering between shrines and waystones", feel: "torpid" },
  { id: "moonlitTower", moment: "Night on the road; the quiet tower in the snow", feel: "torpid" },
  { id: "saltwind", moment: "The open sea, under sail or swimming", feel: "torpid" },
  { id: "underhollow", moment: "The first descents into dungeons", feel: "torpid" },
  { id: "fiveHalls", moment: "The Pentagon, castles and keeps", feel: "awe" },
  { id: "stormPass", moment: "The weather turns: the later road, pursued", feel: "urgent" },
  { id: "gateOpens", moment: "Deeper crossings and halls; something opening", feel: "urgent" },
  { id: "deepbell", moment: "The Deep, far below", feel: "torpid" },
  { id: "astrolabe", moment: "The far realms and skylands: the scholar's road east", feel: "awe" },
  { id: "observatory", moment: "Revelation: the stars, the late road", feel: "awe" },
  { id: "boss", moment: "A world beast or boss: the ground itself answers", feel: "urgent" },
  // The world bosses' own themes (BOSS_THEMES): `beast` is who it belongs to, `story` what the music tells of it.
  { id: "cinderWings", beast: "The Ashen Moth", title: "Wings of Cinder", moment: "The Ashen Moth on the wing", feel: "urgent",
    story: "A moth the size of a cart, shedding ash and sparks. The strings never stop trembling, the dulcimer flutters like wings, and a celesta drifts up through it all like embers rising from a burning wood." },
  { id: "cinderSleep", beast: "The Ash Chrysalis", title: "The Chrysalis Sleeps", moment: "The chrysalis on its great tree", feel: "torpid",
    story: "Wings of Cinder before the wings: the moth's own tune, slowed and hushed, a slow tremolo and a few bells. Break the chrysalis and what is inside begins its song." },
  { id: "briarHunt", beast: "The Briar Stag", title: "The Briar Hunt", moment: "The Briar Stag in the thorn wood", feel: "urgent",
    story: "A hunt, though it is never quite clear who is hunting whom. Horn calls in open fourths and fifths, a lute racing at their heels, and the frame drum at a gallop through the briars." },
  { id: "crimsonCrown", beast: "The Crimson Tyrant", title: "The Crimson Crown", moment: "The Crimson Tyrant over its claimed ground", feel: "awe",
    story: "Fire and majesty: a dragon that rules the ground it burns. Broad horns and a court choir over rolling timpani, the harmony climbing like a procession to a throne of cinders." },
  { id: "longPursuit", beast: "The Doom Chaser", title: "The Long Pursuit", moment: "The Doom Chaser at your back", feel: "urgent",
    story: "It does not hurry and it does not stop. The fastest piece on the album: a low harpsichord ostinato and a galloping bass that never rest, a dark choir above them like a shadow lengthening." },
  { id: "thunderEngine", beast: "The Lightning Giant", title: "Thunder Engine", moment: "The Lightning Giant in its storm", feel: "urgent",
    story: "A storm that works like a machine. Struck bells repeat one fixed figure, a tom pounds like a piston, and the horn calls across the thunderhead on two chords a half-step apart." },
  { id: "shapeless", beast: "The Morphing Blob", title: "The Shapeless Thing", moment: "The Morphing Blob in the mire", feel: "urgent",
    story: "Nothing about it holds its shape, not even the music. The dulcimer's tune keeps its outline, but each phrase slides into a different mode (Dorian, then Aeolian, then Phrygian), so the same melody keeps turning darker and lighter under a lopsided pulse." },
  { id: "mountainWalks", beast: "The Mountain Turtle", title: "The Mountain Walks", moment: "The Mountain Turtle wakes and walks", feel: "awe",
    story: "The slowest tempo on the album. A drone as deep as bedrock, chords that change like weather, one timpani stroke for each great step, and a cello and low choir as patient as the hill on its back." },
  { id: "clockworkOath", beast: "The Nanobot Knight", title: "Clockwork Oath", moment: "The Nanobot Knight on its patrol", feel: "urgent",
    story: "A cold, precise march. The harpsichord ticks out an ostinato like a mechanism, the bass steps in octaves, and a brassy horn swears an oath that it will keep to the last bolt." },
  { id: "glassMind", beast: "The Psychic Crystal", title: "The Glass Mind", moment: "The Psychic Crystal in the dark water", feel: "awe",
    story: "Glassy and hypnotic. A bell figure turns and turns over a held drone, the celesta answers it, and a choir hums thoughts that are not quite yours." },
  { id: "underTheFloor", beast: "The Tremor Worm", title: "Beneath the Floor", moment: "The Tremor Worm under the ground", feel: "urgent",
    story: "Something moving under the floor. Low toms roll like earth giving way, a drone sits beneath everything, and a cello line keeps low, waiting to break the surface." },
  { id: "walkerBetween", beast: "The Void Walker", title: "The Walker Between", moment: "The Void Walker stepping between the stars", feel: "awe",
    story: "An alien void. A choir in Hijaz, a single bell now and then, long silences, footsteps where there is no ground. Of all the beasts, it gives the least away." },
  { id: "fernsAndPlates", beast: "The Wild Stegosaurus", title: "Ferns and Plates", moment: "The Wild Stegosaurus on the hunt for its supper", feel: "urgent",
    story: "Wild and hungry, but a bit of a romp. A frame-drum gallop, a bouncing lute and horn, and now and then a recorder having fun; big, clumsy and glad to see you, for a certain value of glad." },
  { id: "riverStalker", beast: "The Spinosaurus", title: "The River Stalker", moment: "The Spinosaurus in the shallows", feel: "urgent",
    story: "A predator wading the shallows. Low timpani prowl in long dotted strides and a cello stalks under the strings, patient, then not." },
  { id: "bonesHunt", beast: "The Spinosaurus, in bone", title: "The Bones Still Hunt", moment: "The Spinosaurus once its flesh falls away", feel: "urgent",
    story: "The River Stalker's own tune, stripped to the bone when its flesh falls away. A dry harpsichord and a bell take the line, a hollow choir replaces the strings, and the drums turn to the click of bone on stone." },
  { id: "quarryBays", beast: "The Questing Beast", title: "The Quarry That Bays", moment: "The Questing Beast and the endless chase", feel: "urgent",
    story: "The quarry nobody catches, with the sound of hounds baying inside it. Leaping string and horn calls over chords that climb step by step and fall back to the start, the chase begun again." },
  { id: "eyesBehind", beast: "The Stalker", title: "Eyes Behind the Light", moment: "The Stalker, just past the lamplight", feel: "urgent",
    story: "Creeping dread. A line that inches up a half-step and falls back, a cello and a far bell, the frame drum landing off the beat, as if something were one step behind you." },
  { id: "coilOfStars", beast: "The Astral Worm", title: "Coil of Stars", moment: "The Astral Worm between the worlds", feel: "awe",
    story: "A road of starlight that bites. The dulcimer rolls in coiling arcs, strings and choir rise through open suspended chords, and a celesta glints like the stars along its back." },
  { id: "whatListens", beast: "The Listener", title: "What Listens Back", moment: "The Listener at the Far Array", feel: "awe",
    story: "A signal sent into the dark and a long silence while something answers. The harpsichord pings like a beacon, a bell calls and the choir waits." },
  { id: "gloomRises", beast: "Gloomvast", title: "The Gloom Rises", moment: "Gloomvast rising from the dark", feel: "urgent",
    story: "The dark coming up like a tide. A heavy choir and cello over timpani, a low lute turning underneath, the melody rising a step at a time like water filling a room." },
  { id: "revenantsReturn", beast: "The Gate Revenants", title: "The Revenants Return", moment: "The Gate Revenants' hunt and horde", feel: "urgent",
    story: "The dead come back through the gate, wave on wave. A grim, relentless march in Phrygian: horns and a choir, a frame drum that never breaks step." },
  { id: "deepTide", beast: "The Tyrant Mosasaur", title: "Teeth of the Deep Tide", moment: "The Tyrant Mosasaur rising from the deep", feel: "urgent",
    story: "A sea predator rising under the boat. A rolling swing lifts and drops like a swell, a horn and strings call over the deep, and the dulcimer glints like light on dark water." },
];
// Which songs a place calls for, by chapter: [context, song, first chapter, last chapter, weight]. The heaviest eligible song
// is the one a place opens with; rotation (every 2-4 minutes) moves to another eligible song, never the same twice running.
export const MUSIC_SELECTION = [
  ["day", "roadOut", 1, 2, 3], ["day", "pilgrimsWay", 1, 4, 2], ["day", "moonlitTower", 1, 4, 1],
  ["day", "stormPass", 3, 4, 4], ["day", "observatory", 4, 4, 2],
  ["dusk", "moonlitTower", 1, 4, 3], ["dusk", "roadOut", 1, 2, 1], ["dusk", "stormPass", 3, 4, 2], ["dusk", "observatory", 4, 4, 2],
  ["dungeon", "underhollow", 1, 4, 3], ["dungeon", "deepbell", 1, 4, 1], ["dungeon", "gateOpens", 3, 4, 4],
  ["deep", "deepbell", 1, 4, 3], ["deep", "underhollow", 1, 4, 1], ["deep", "gateOpens", 3, 4, 1],
  ["sea", "saltwind", 1, 4, 3], ["sea", "moonlitTower", 1, 4, 1], ["sea", "observatory", 4, 4, 1],
  ["halls", "fiveHalls", 1, 4, 3], ["halls", "underhollow", 1, 2, 1], ["halls", "gateOpens", 2, 4, 2],
  ["sky", "astrolabe", 1, 4, 3], ["sky", "observatory", 2, 4, 3], ["sky", "moonlitTower", 1, 4, 1],
];
export const MUSIC_CONTEXTS = ["day", "dusk", "dungeon", "deep", "sea", "halls", "sky"];
export const songById = (id) => SONGS[id] || null;
