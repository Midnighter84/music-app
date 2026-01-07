/**
 * Tune data format:
 * Each tune has:
 *   - id: unique identifier
 *   - title: display name
 *   - composer: composer name (or "Traditional")
 *   - timeSignature: [beats per measure, beat unit]
 *   - keySignature: key (e.g., "C", "G", "F")
 *   - defaultTempo: suggested BPM
 *   - notes: array of note objects or chord objects
 *
 * Single note format:
 *   - pitch: note name (C, D, E, F, G, A, B) with optional # for sharp, b for flat
 *            or "R" for rest
 *   - octave: octave number (4 = middle C octave)
 *   - duration: length in beats (1 = quarter note at standard time)
 *
 * Chord format (multiple notes played together):
 *   - duration: length in beats
 *   - notes: array of { pitch, octave } objects
 *   Example: { duration: 1, notes: [{ pitch: "C", octave: 4 }, { pitch: "E", octave: 4 }, { pitch: "G", octave: 4 }] }
 */

const TUNES = [
    {
        id: "twinkle",
        title: "Twinkle Twinkle Little Star",
        composer: "Traditional",
        timeSignature: [4, 4],
        keySignature: "C",
        defaultTempo: 100,
        notes: [
            // Twinkle twinkle little star
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 2 },
            // How I wonder what you are
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 2 },
            // Up above the world so high
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 2 },
            // Like a diamond in the sky
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 2 },
            // Twinkle twinkle little star
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 2 },
            // How I wonder what you are
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 2 }
        ]
    },
    {
        id: "ode_to_joy",
        title: "Ode to Joy",
        composer: "Ludwig van Beethoven",
        timeSignature: [4, 4],
        keySignature: "C",
        defaultTempo: 120,
        notes: [
            // First phrase
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1.5 },
            { pitch: "D", octave: 4, duration: 0.5 },
            { pitch: "D", octave: 4, duration: 2 },
            // Second phrase
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1.5 },
            { pitch: "C", octave: 4, duration: 0.5 },
            { pitch: "C", octave: 4, duration: 2 }
        ]
    },
    {
        id: "mary_lamb",
        title: "Mary Had a Little Lamb",
        composer: "Traditional",
        timeSignature: [4, 4],
        keySignature: "C",
        defaultTempo: 110,
        notes: [
            // Mary had a little lamb
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 2 },
            // Little lamb, little lamb
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 2 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 2 },
            // Mary had a little lamb
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            // Its fleece was white as snow
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 4 }
        ]
    },
    {
        id: "happy_birthday",
        title: "Happy Birthday",
        composer: "Traditional",
        timeSignature: [3, 4],
        keySignature: "C",
        defaultTempo: 140,
        notes: [
            // Happy birthday to you
            { pitch: "C", octave: 4, duration: 0.75 },
            { pitch: "C", octave: 4, duration: 0.25 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 2 },
            // Happy birthday to you
            { pitch: "C", octave: 4, duration: 0.75 },
            { pitch: "C", octave: 4, duration: 0.25 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 2 },
            // Happy birthday dear friend
            { pitch: "C", octave: 4, duration: 0.75 },
            { pitch: "C", octave: 4, duration: 0.25 },
            { pitch: "C", octave: 5, duration: 1 },
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            // Happy birthday to you
            { pitch: "A#", octave: 4, duration: 0.75 },
            { pitch: "A#", octave: 4, duration: 0.25 },
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 2 }
        ]
    },
    {
        id: "scale",
        title: "C Major Scale",
        composer: "Exercise",
        timeSignature: [4, 4],
        keySignature: "C",
        defaultTempo: 90,
        notes: [
            // Ascending
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "B", octave: 4, duration: 1 },
            { pitch: "C", octave: 5, duration: 1 },
            // Descending
            { pitch: "C", octave: 5, duration: 1 },
            { pitch: "B", octave: 4, duration: 1 },
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 2 }
        ]
    },
    {
        id: "frere_jacques",
        title: "Frère Jacques",
        composer: "Traditional French",
        timeSignature: [4, 4],
        keySignature: "C",
        defaultTempo: 120,
        notes: [
            // Frère Jacques
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            // Frère Jacques
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            // Dormez-vous
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 2 },
            // Dormez-vous
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 2 },
            // Sonnez les matines
            { pitch: "G", octave: 4, duration: 0.5 },
            { pitch: "A", octave: 4, duration: 0.5 },
            { pitch: "G", octave: 4, duration: 0.5 },
            { pitch: "F", octave: 4, duration: 0.5 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            // Sonnez les matines
            { pitch: "G", octave: 4, duration: 0.5 },
            { pitch: "A", octave: 4, duration: 0.5 },
            { pitch: "G", octave: 4, duration: 0.5 },
            { pitch: "F", octave: 4, duration: 0.5 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            // Ding dang dong
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "G", octave: 3, duration: 1 },
            { pitch: "C", octave: 4, duration: 2 },
            // Ding dang dong
            { pitch: "C", octave: 4, duration: 1 },
            { pitch: "G", octave: 3, duration: 1 },
            { pitch: "C", octave: 4, duration: 2 }
        ]
    },
    {
        id: "simple_chords",
        title: "Simple Chord Progression",
        composer: "Exercise",
        timeSignature: [4, 4],
        keySignature: "C",
        defaultTempo: 80,
        notes: [
            // C Major chord
            { duration: 2, notes: [{ pitch: "C", octave: 4 }, { pitch: "E", octave: 4 }, { pitch: "G", octave: 4 }] },
            // Single notes
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            // F Major chord
            { duration: 2, notes: [{ pitch: "C", octave: 4 }, { pitch: "F", octave: 4 }, { pitch: "A", octave: 4 }] },
            // Single notes
            { pitch: "A", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            // G Major chord
            { duration: 2, notes: [{ pitch: "B", octave: 3 }, { pitch: "D", octave: 4 }, { pitch: "G", octave: 4 }] },
            // Single notes
            { pitch: "G", octave: 4, duration: 1 },
            { pitch: "D", octave: 4, duration: 1 },
            // C Major chord (resolution)
            { duration: 4, notes: [{ pitch: "C", octave: 4 }, { pitch: "E", octave: 4 }, { pitch: "G", octave: 4 }] }
        ]
    },
    {
        id: "melody_with_chords",
        title: "Melody with Accompaniment",
        composer: "Exercise",
        timeSignature: [4, 4],
        keySignature: "C",
        defaultTempo: 100,
        notes: [
            // Melody line with occasional chords
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "G", octave: 4, duration: 1 },
            // G chord
            { duration: 2, notes: [{ pitch: "G", octave: 4 }, { pitch: "B", octave: 4 }] },
            { pitch: "F", octave: 4, duration: 1 },
            { pitch: "E", octave: 4, duration: 1 },
            // C chord
            { duration: 2, notes: [{ pitch: "C", octave: 4 }, { pitch: "E", octave: 4 }] },
            { pitch: "D", octave: 4, duration: 1 },
            { pitch: "C", octave: 4, duration: 1 },
            // Final C chord
            { duration: 4, notes: [{ pitch: "C", octave: 4 }, { pitch: "E", octave: 4 }, { pitch: "G", octave: 4 }] }
        ]
    }
];

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TUNES };
}
