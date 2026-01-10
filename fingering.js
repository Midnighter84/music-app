/**
 * Piano Fingering Module
 * Automatically determines optimal hand positions and finger assignments
 * Based on piano pedagogy best practices for beginners
 *
 * Finger numbering (both hands):
 * 1 = Thumb, 2 = Index, 3 = Middle, 4 = Ring, 5 = Pinky
 */

class FingeringEngine {
    constructor() {
        // Define hand positions for RIGHT hand
        // Each position maps note names to finger numbers
        // Right hand: finger 1 (thumb) on base note, going up to finger 5
        this.rightHandPositions = {
            // C Position: C-D-E-F-G with fingers 1-2-3-4-5
            'C': {
                name: 'C Position',
                baseNote: 'C',
                mapping: { 'C': 1, 'D': 2, 'E': 3, 'F': 4, 'G': 5 },
                extended: { 'A': 5, 'B': 5 },
                // Keys covered (for keyboard display): C4, D4, E4, F4, G4
                keys: ['C', 'D', 'E', 'F', 'G']
            },
            // G Position: G-A-B-C-D with fingers 1-2-3-4-5
            'G': {
                name: 'G Position',
                baseNote: 'G',
                mapping: { 'G': 1, 'A': 2, 'B': 3, 'C': 4, 'D': 5 },
                extended: { 'E': 5, 'F': 4 },
                keys: ['G', 'A', 'B', 'C', 'D']
            },
            // F Position: F-G-A-B-C with fingers 1-2-3-4-5
            'F': {
                name: 'F Position',
                baseNote: 'F',
                mapping: { 'F': 1, 'G': 2, 'A': 3, 'B': 4, 'C': 5 },
                extended: { 'D': 5, 'E': 4 },
                keys: ['F', 'G', 'A', 'B', 'C']
            },
            // D Position: D-E-F#-G-A with fingers 1-2-3-4-5
            'D': {
                name: 'D Position',
                baseNote: 'D',
                mapping: { 'D': 1, 'E': 2, 'F': 3, 'F#': 3, 'G': 4, 'A': 5 },
                extended: { 'B': 5, 'C': 4 },
                keys: ['D', 'E', 'F', 'G', 'A']
            }
        };

        // Define hand positions for LEFT hand (mirrored fingering)
        // Left hand: finger 5 (pinky) on base note, going up to finger 1 (thumb)
        this.leftHandPositions = {
            // C Position: C-D-E-F-G with fingers 5-4-3-2-1
            'C': {
                name: 'C Position',
                baseNote: 'C',
                mapping: { 'C': 5, 'D': 4, 'E': 3, 'F': 2, 'G': 1 },
                extended: { 'A': 1, 'B': 1 },
                keys: ['C', 'D', 'E', 'F', 'G']
            },
            // G Position: G-A-B-C-D with fingers 5-4-3-2-1
            'G': {
                name: 'G Position',
                baseNote: 'G',
                mapping: { 'G': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 },
                extended: { 'E': 1, 'F': 2 },
                keys: ['G', 'A', 'B', 'C', 'D']
            },
            // F Position: F-G-A-B-C with fingers 5-4-3-2-1
            'F': {
                name: 'F Position',
                baseNote: 'F',
                mapping: { 'F': 5, 'G': 4, 'A': 3, 'B': 2, 'C': 1 },
                extended: { 'D': 1, 'E': 2 },
                keys: ['F', 'G', 'A', 'B', 'C']
            },
            // D Position: D-E-F-G-A with fingers 5-4-3-2-1
            'D': {
                name: 'D Position',
                baseNote: 'D',
                mapping: { 'D': 5, 'E': 4, 'F': 3, 'F#': 3, 'G': 2, 'A': 1 },
                extended: { 'B': 1, 'C': 2 },
                keys: ['D', 'E', 'F', 'G', 'A']
            }
        };

        // Default to right hand positions for backward compatibility
        this.positions = this.rightHandPositions;

        // Bass clef threshold (octave 3 and below = left hand)
        this.bassClefThreshold = 3;

        // Note order for calculating intervals
        this.noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    }

    /**
     * Determine if a note is for left hand based on octave
     */
    isLeftHand(octave) {
        return octave <= this.bassClefThreshold;
    }

    /**
     * Get the appropriate positions map for a hand
     */
    getPositionsForHand(isLeftHand) {
        return isLeftHand ? this.leftHandPositions : this.rightHandPositions;
    }

    /**
     * Convert note pitch to base note (remove sharps/flats for position matching)
     */
    getBaseNote(pitch) {
        return pitch.replace('#', '').replace('b', '');
    }

    /**
     * Check if a note entry is a chord (multiple notes)
     */
    isChord(noteEntry) {
        return noteEntry.notes && Array.isArray(noteEntry.notes);
    }

    /**
     * Get all unique notes in a tune (ignoring octave and accidentals for position analysis)
     */
    getUniqueNotes(notes) {
        const uniqueNotes = new Set();
        notes.forEach(noteEntry => {
            if (this.isChord(noteEntry)) {
                // Extract notes from chord
                noteEntry.notes.forEach(note => {
                    if (note.pitch !== 'R') {
                        uniqueNotes.add(this.getBaseNote(note.pitch));
                    }
                });
            } else if (noteEntry.pitch !== 'R') {
                uniqueNotes.add(this.getBaseNote(noteEntry.pitch));
            }
        });
        return Array.from(uniqueNotes);
    }

    /**
     * Calculate how well a position covers the notes in a tune
     * Returns a score (higher is better)
     */
    scorePosition(positionKey, tuneNotes) {
        const position = this.positions[positionKey];
        const uniqueNotes = this.getUniqueNotes(tuneNotes);

        let score = 0;
        let coveredNotes = 0;
        let extendedNotes = 0;
        let uncoveredNotes = 0;

        uniqueNotes.forEach(note => {
            if (position.mapping[note] !== undefined) {
                coveredNotes++;
                score += 10; // Full points for notes in position
            } else if (position.extended && position.extended[note] !== undefined) {
                extendedNotes++;
                score += 5; // Partial points for reachable notes
            } else {
                uncoveredNotes++;
                score -= 10; // Penalty for unreachable notes
            }
        });

        return {
            positionKey,
            score,
            coveredNotes,
            extendedNotes,
            uncoveredNotes,
            coverage: coveredNotes / uniqueNotes.length
        };
    }

    /**
     * Determine the best hand position for a tune or section
     */
    determineBestPosition(notes) {
        const scores = Object.keys(this.positions).map(posKey =>
            this.scorePosition(posKey, notes)
        );

        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);

        return scores[0];
    }

    /**
     * Analyze tune and determine optimal positions for different sections
     * For simple tunes, usually one position suffices
     */
    analyzePositions(notes) {
        // For simple beginner tunes, try to use a single position
        const bestOverall = this.determineBestPosition(notes);

        // If coverage is good (>= 80%), use single position
        if (bestOverall.coverage >= 0.8) {
            return [{
                startIndex: 0,
                endIndex: notes.length - 1,
                position: bestOverall.positionKey
            }];
        }

        // Otherwise, try to find position changes
        return this.findOptimalPositionChanges(notes);
    }

    /**
     * Find optimal points to change hand position
     */
    findOptimalPositionChanges(notes) {
        const segments = [];
        let currentSegmentStart = 0;

        // Analyze in chunks and find natural break points
        const chunkSize = 8; // Analyze 8 notes at a time

        for (let i = 0; i < notes.length; i += chunkSize) {
            const chunk = notes.slice(i, Math.min(i + chunkSize, notes.length));
            const bestPos = this.determineBestPosition(chunk);

            if (segments.length === 0 ||
                segments[segments.length - 1].position !== bestPos.positionKey) {
                if (segments.length > 0) {
                    segments[segments.length - 1].endIndex = i - 1;
                }
                segments.push({
                    startIndex: i,
                    endIndex: Math.min(i + chunkSize - 1, notes.length - 1),
                    position: bestPos.positionKey
                });
            } else {
                segments[segments.length - 1].endIndex = Math.min(i + chunkSize - 1, notes.length - 1);
            }
        }

        return segments;
    }

    /**
     * Get finger number for a specific note given a position and hand
     */
    getFingerForNote(pitch, positionKey, octave = 4) {
        if (pitch === 'R') return null; // Rest

        const isLeftHand = this.isLeftHand(octave);
        const positions = this.getPositionsForHand(isLeftHand);
        const position = positions[positionKey];
        const baseNote = this.getBaseNote(pitch);

        // Check main mapping first
        if (position.mapping[baseNote] !== undefined) {
            return position.mapping[baseNote];
        }

        // Check extended range
        if (position.extended && position.extended[baseNote] !== undefined) {
            return position.extended[baseNote];
        }

        // Fallback: try to find closest finger
        return this.estimateFinger(baseNote, positionKey, isLeftHand);
    }

    /**
     * Estimate finger for notes outside standard position
     */
    estimateFinger(baseNote, positionKey, isLeftHand = false) {
        const positions = this.getPositionsForHand(isLeftHand);
        const position = positions[positionKey];
        const noteIdx = this.noteOrder.indexOf(baseNote);
        const baseIdx = this.noteOrder.indexOf(position.baseNote);

        if (noteIdx === -1) return 3; // Default to middle finger

        const distance = noteIdx - baseIdx;

        // Map distance to finger (clamped to 1-5)
        const finger = Math.max(1, Math.min(5, distance + 1));
        return finger;
    }

    /**
     * Generate fingering for a chord
     * Returns array of finger numbers for each note in the chord
     */
    generateChordFingering(chordNotes, positionKey) {
        // Separate notes into left hand and right hand
        const lhNotes = chordNotes.filter(n => this.isLeftHand(n.octave));
        const rhNotes = chordNotes.filter(n => !this.isLeftHand(n.octave));

        // If chord spans both hands, finger each hand independently using position-based fingering
        if (lhNotes.length > 0 && rhNotes.length > 0) {
            return chordNotes.map(note => {
                const isLH = this.isLeftHand(note.octave);
                return this.getFingerForNote(note.pitch, positionKey, note.octave);
            });
        }

        // Single-hand chord - use spread fingering
        const sortedNotes = [...chordNotes].sort((a, b) => {
            const aValue = this.noteOrder.indexOf(this.getBaseNote(a.pitch)) + a.octave * 7;
            const bValue = this.noteOrder.indexOf(this.getBaseNote(b.pitch)) + b.octave * 7;
            return aValue - bValue;
        });

        const fingers = [];
        const numNotes = sortedNotes.length;

        sortedNotes.forEach((note, i) => {
            let finger;
            // Use spread fingering for single-hand chords
            if (numNotes === 2) {
                finger = i === 0 ? 1 : 5;
            } else if (numNotes === 3) {
                finger = [1, 3, 5][i];
            } else if (numNotes === 4) {
                finger = [1, 2, 4, 5][i];
            } else if (numNotes >= 5) {
                finger = i + 1;
            } else {
                // Single note, use position-based
                finger = this.getFingerForNote(note.pitch, positionKey, note.octave);
            }
            fingers.push(finger);
        });

        // Return fingers in original chord order
        return chordNotes.map(note => {
            const sortedIndex = sortedNotes.findIndex(n =>
                n.pitch === note.pitch && n.octave === note.octave
            );
            return fingers[sortedIndex];
        });
    }

    /**
     * Generate fingering for an entire tune
     * Returns array of finger numbers (or null for rests/repeats)
     * Supports both single notes and chords
     */
    generateFingering(notes) {
        if (!notes || notes.length === 0) return [];

        // Analyze positions
        const positionSegments = this.analyzePositions(notes);

        const fingering = [];
        let lastFinger = null;
        let lastPitch = null;
        let lastFingers = null;

        notes.forEach((noteEntry, index) => {
            // Find which position segment this note belongs to
            const segment = positionSegments.find(s =>
                index >= s.startIndex && index <= s.endIndex
            ) || positionSegments[0];

            const isPositionChange = index === segment.startIndex && index > 0;

            // Handle chords
            if (this.isChord(noteEntry)) {
                // Determine hand based on average octave of chord
                const avgOctave = noteEntry.notes.reduce((sum, n) => sum + n.octave, 0) / noteEntry.notes.length;
                const isLeftHand = this.isLeftHand(Math.round(avgOctave));
                const positions = this.getPositionsForHand(isLeftHand);

                const fingers = this.generateChordFingering(noteEntry.notes, segment.position);

                // Show fingering if it's different from last or first entry
                const fingersStr = fingers.join(',');
                const lastFingersStr = lastFingers ? lastFingers.join(',') : '';
                const showFinger = (fingersStr !== lastFingersStr) ||
                                  isPositionChange ||
                                  index === 0;

                fingering.push({
                    fingers,
                    finger: null, // No single finger for chords
                    showFinger,
                    position: segment.position,
                    positionName: positions[segment.position].name,
                    isPositionChange,
                    isChord: true,
                    isLeftHand,
                    octave: Math.round(avgOctave),
                    pitch: noteEntry.notes[0].pitch // Primary pitch for display
                });

                lastFingers = fingers;
                lastFinger = null;
                lastPitch = null;
                return;
            }

            // Handle rest
            if (noteEntry.pitch === 'R') {
                fingering.push({
                    finger: null,
                    showFinger: false,
                    position: segment.position,
                    isPositionChange: false,
                    isLeftHand: false
                });
                lastFingers = null;
                return;
            }

            // Handle single note
            const isLeftHand = this.isLeftHand(noteEntry.octave);
            const positions = this.getPositionsForHand(isLeftHand);
            const finger = this.getFingerForNote(noteEntry.pitch, segment.position, noteEntry.octave);

            // Determine if we should show the finger number
            // Show if: different finger, different note, or position change
            const showFinger = (finger !== lastFinger) ||
                              (noteEntry.pitch !== lastPitch) ||
                              isPositionChange ||
                              index === 0; // Always show first note

            fingering.push({
                finger,
                showFinger,
                position: segment.position,
                positionName: positions[segment.position].name,
                isPositionChange,
                isLeftHand,
                octave: noteEntry.octave,
                pitch: noteEntry.pitch
            });

            lastFinger = finger;
            lastPitch = noteEntry.pitch;
            lastFingers = null;
        });

        // Apply additional pedagogical rules
        return this.applyPedagogicalRules(fingering, notes);
    }

    /**
     * Apply additional rules based on piano pedagogy
     */
    applyPedagogicalRules(fingering, notes) {
        // Rule 1: For repeated notes, alternate fingers for faster passages
        // (but keep it simple for beginners - only suggest alternation for very fast repeats)

        // Rule 2: Don't show finger on every note - reduce visual clutter
        // Already handled by showFinger logic

        // Rule 3: Always show finger after a rest
        for (let i = 1; i < fingering.length; i++) {
            const prevNote = notes[i - 1];
            const currNote = notes[i];
            const isRest = prevNote.pitch === 'R' || (this.isChord(prevNote) === false && prevNote.pitch === 'R');
            const currIsNote = this.isChord(currNote) || (currNote.pitch && currNote.pitch !== 'R');

            if (isRest && currIsNote) {
                fingering[i].showFinger = true;
            }
        }

        // Rule 4: Show finger at the start of each measure/phrase
        // (simplified: show every 4-8 notes as a reminder)
        const reminderInterval = 8;
        for (let i = reminderInterval; i < fingering.length; i += reminderInterval) {
            if (fingering[i].finger !== null || fingering[i].fingers) {
                fingering[i].showFinger = true;
            }
        }

        return fingering;
    }

    /**
     * Get a human-readable description of the positions used
     */
    getPositionSummary(notes) {
        const segments = this.analyzePositions(notes);
        if (segments.length === 1) {
            return `Using ${this.positions[segments[0].position].name}`;
        }
        return segments.map(s =>
            `${this.positions[s.position].name} (notes ${s.startIndex + 1}-${s.endIndex + 1})`
        ).join(', ');
    }
}

// Create global instance
const fingeringEngine = new FingeringEngine();
