/**
 * Audio synthesis module using Web Audio API
 * Creates piano-like sounds using oscillators with ADSR envelope
 */

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;

        // Note frequencies (A4 = 440Hz standard tuning)
        this.noteFrequencies = this.generateNoteFrequencies();
    }

    /**
     * Initialize the audio context (must be called after user interaction)
     */
    init() {
        if (this.isInitialized) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.audioContext.destination);
        this.isInitialized = true;
    }

    /**
     * Resume audio context if suspended
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Generate frequency map for all notes across octaves
     */
    generateNoteFrequencies() {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const frequencies = {};

        // A4 = 440Hz is our reference
        const A4 = 440;
        const A4_INDEX = 57; // A4 is the 57th key on a piano (0-indexed from C0)

        for (let octave = 0; octave <= 8; octave++) {
            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                const keyIndex = octave * 12 + i;
                const semitoneDistance = keyIndex - A4_INDEX;
                const frequency = A4 * Math.pow(2, semitoneDistance / 12);
                frequencies[`${note}${octave}`] = frequency;

                // Add flat note aliases
                if (note.includes('#')) {
                    const flatNote = notes[(i + 1) % 12] + 'b';
                    frequencies[`${flatNote}${octave}`] = frequency;
                }
            }
        }

        return frequencies;
    }

    /**
     * Get frequency for a note
     */
    getFrequency(pitch, octave) {
        if (pitch === 'R') return 0; // Rest

        // Handle flats by converting to sharps
        const flatToSharp = {
            'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#',
            'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B'
        };

        if (flatToSharp[pitch]) {
            pitch = flatToSharp[pitch];
        }

        const key = `${pitch}${octave}`;
        return this.noteFrequencies[key] || 440;
    }

    /**
     * Create a piano-like sound using multiple oscillators
     */
    createPianoSound(frequency, startTime, duration) {
        if (!this.audioContext || frequency === 0) return;

        // Create oscillators for richer sound
        const oscillators = [];
        const gains = [];

        // Main tone (fundamental)
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.value = frequency;
        oscillators.push(osc1);

        // Second harmonic (octave above, quieter)
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = frequency * 2;
        oscillators.push(osc2);

        // Third harmonic
        const osc3 = this.audioContext.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = frequency * 3;
        oscillators.push(osc3);

        // Create gain nodes for each oscillator
        const harmonicGains = [0.6, 0.2, 0.1];

        oscillators.forEach((osc, i) => {
            const gain = this.audioContext.createGain();
            gain.gain.value = harmonicGains[i];
            osc.connect(gain);
            gains.push(gain);
        });

        // Create envelope
        const envelope = this.audioContext.createGain();
        gains.forEach(g => g.connect(envelope));
        envelope.connect(this.masterGain);

        // ADSR envelope parameters
        const attack = 0.02;
        const decay = 0.1;
        const sustainLevel = 0.4;
        const release = 0.3;

        const now = startTime;
        const noteEnd = now + duration;

        // Apply envelope
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(1, now + attack);
        envelope.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);
        envelope.gain.setValueAtTime(sustainLevel, noteEnd - release);
        envelope.gain.linearRampToValueAtTime(0, noteEnd);

        // Start and stop oscillators
        oscillators.forEach(osc => {
            osc.start(now);
            osc.stop(noteEnd + 0.1);
        });
    }

    /**
     * Play a single note
     */
    playNote(pitch, octave, duration, startTime = null) {
        if (!this.isInitialized) {
            this.init();
        }

        const frequency = this.getFrequency(pitch, octave);
        const time = startTime !== null ? startTime : this.audioContext.currentTime;

        this.createPianoSound(frequency, time, duration);
    }

    /**
     * Check if a note entry is a chord (multiple notes)
     */
    isChord(noteEntry) {
        return noteEntry.notes && Array.isArray(noteEntry.notes);
    }

    /**
     * Play a chord (multiple notes simultaneously)
     */
    playChord(chordNotes, duration, startTime = null) {
        if (!this.isInitialized) {
            this.init();
        }

        const time = startTime !== null ? startTime : this.audioContext.currentTime;

        // Play each note in the chord
        chordNotes.forEach(note => {
            if (note.pitch !== 'R') {
                const frequency = this.getFrequency(note.pitch, note.octave);
                this.createPianoSound(frequency, time, duration);
            }
        });
    }

    /**
     * Schedule a sequence of notes (supports both single notes and chords)
     */
    scheduleNotes(notes, tempo, startCallback, noteCallback) {
        if (!this.isInitialized) {
            this.init();
        }

        const beatsPerSecond = tempo / 60;
        let currentTime = this.audioContext.currentTime + 0.1; // Small delay to ensure scheduling works
        const startTime = currentTime;

        const scheduledNotes = [];

        notes.forEach((noteEntry, index) => {
            const durationInSeconds = noteEntry.duration / beatsPerSecond;

            scheduledNotes.push({
                note: noteEntry,
                index,
                startTime: currentTime,
                endTime: currentTime + durationInSeconds
            });

            if (this.isChord(noteEntry)) {
                // Play all notes in the chord simultaneously
                this.playChord(noteEntry.notes, durationInSeconds, currentTime);
            } else if (noteEntry.pitch !== 'R') {
                // Play single note
                this.playNote(noteEntry.pitch, noteEntry.octave, durationInSeconds, currentTime);
            }

            currentTime += durationInSeconds;
        });

        const totalDuration = currentTime - startTime;

        return {
            scheduledNotes,
            startTime,
            endTime: currentTime,
            totalDuration
        };
    }

    /**
     * Get the current audio context time
     */
    getCurrentTime() {
        return this.audioContext ? this.audioContext.currentTime : 0;
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Stop all audio
     */
    stop() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.masterGain = null;
            this.isInitialized = false;
        }
    }
}

// Create global instance
const audioEngine = new AudioEngine();
