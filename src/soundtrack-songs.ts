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
  const bad = [], L = SONG_LIMITS, id = song?.id || "?";
  if (!MODES[song.mode]) bad.push(`${id}: unknown mode ${song.mode}`);
  if (!(song.bpm >= L.bpm[0] && song.bpm <= L.bpm[1])) bad.push(`${id}: tempo ${song.bpm} outside ${L.bpm}`);
  if (!(song.swing >= L.swing[0] && song.swing <= L.swing[1])) bad.push(`${id}: swing ${song.swing}`);
  if (!Number.isInteger(song.root) || song.root < 45 || song.root > 59) bad.push(`${id}: root ${song.root}`);
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
