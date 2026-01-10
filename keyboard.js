/**
 * Live Keyboard Renderer
 * Shows a piano keyboard with hand positions and currently pressed keys
 */

class LiveKeyboardRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Keyboard layout - 3 octaves (C2 to B4 for left hand range, C3 to B5 for right)
        // We'll show 4 octaves to cover both hands: C2 to B5
        this.startOctave = 2;
        this.numOctaves = 4;
        this.whiteKeysPerOctave = 7;
        this.totalWhiteKeys = this.numOctaves * this.whiteKeysPerOctave;

        // Key dimensions
        this.whiteKeyWidth = 0;
        this.whiteKeyHeight = 90;
        this.blackKeyWidth = 0;
        this.blackKeyHeight = 55;
        this.padding = 10;

        // Colors
        this.colors = {
            whiteKey: '#fafafa',
            blackKey: '#1a1a2e',
            whiteKeyBorder: '#999',
            blackKeyBorder: '#000',
            pressed: '#e94560',
            // Right hand position (lighter blue)
            rhPosition: '#5dade2',
            // Left hand position (darker blue)
            lhPosition: '#2874a6',
            keyLabel: '#666',
            fingerNumber: '#333',
            background: '#16213e'
        };

        // Current state
        this.leftHandPosition = null;   // Position name: 'C', 'G', 'F', 'D'
        this.rightHandPosition = null;
        this.leftHandOctave = 3;        // Which octave the LH position is in
        this.rightHandOctave = 4;       // Which octave the RH position is in
        this.pressedKeys = [];          // Array of { pitch, octave, isLeftHand }

        // White key note names
        this.whiteKeyNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        // Black key positions (after which white key index, 0-indexed)
        this.blackKeyAfter = [0, 1, 3, 4, 5]; // C#, D#, F#, G#, A#

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const width = rect.width - this.padding * 2;

        this.canvas.width = rect.width;
        this.canvas.height = this.whiteKeyHeight + this.padding * 2 + 25; // Extra space for labels

        // Calculate key widths based on canvas width
        this.whiteKeyWidth = (width - this.padding * 2) / this.totalWhiteKeys;
        this.blackKeyWidth = this.whiteKeyWidth * 0.6;

        this.render();
    }

    /**
     * Set the current hand positions
     */
    setPositions(leftHandPosition, leftHandOctave, rightHandPosition, rightHandOctave) {
        this.leftHandPosition = leftHandPosition;
        this.leftHandOctave = leftHandOctave || 3;
        this.rightHandPosition = rightHandPosition;
        this.rightHandOctave = rightHandOctave || 4;
        this.render();
    }

    /**
     * Set currently pressed keys
     */
    setPressedKeys(pressedKeys) {
        this.pressedKeys = pressedKeys || [];
        this.render();
    }

    /**
     * Update display with current note info
     */
    updateFromFingeringInfo(fingeringInfo, note) {
        if (!fingeringInfo) {
            this.pressedKeys = [];
            this.render();
            return;
        }

        // Get pressed keys from the note and separate by hand
        this.pressedKeys = [];
        let leftHandNotes = [];
        let rightHandNotes = [];

        if (note.notes && Array.isArray(note.notes)) {
            // Chord - separate into left and right hand based on octave
            note.notes.forEach(n => {
                if (n.pitch !== 'R') {
                    const noteInfo = {
                        pitch: n.pitch.replace('#', '').replace('b', ''),
                        octave: n.octave,
                        isLeftHand: this.isLeftHandNote(n.octave),
                        isSharp: n.pitch.includes('#'),
                        isFlat: n.pitch.includes('b')
                    };
                    this.pressedKeys.push(noteInfo);

                    if (noteInfo.isLeftHand) {
                        leftHandNotes.push(noteInfo);
                    } else {
                        rightHandNotes.push(noteInfo);
                    }
                }
            });
        } else if (note.pitch !== 'R') {
            // Single note
            const isLeftHand = fingeringInfo.isLeftHand;
            const noteInfo = {
                pitch: note.pitch.replace('#', '').replace('b', ''),
                octave: note.octave,
                isLeftHand: isLeftHand,
                isSharp: note.pitch.includes('#'),
                isFlat: note.pitch.includes('b')
            };
            this.pressedKeys.push(noteInfo);

            if (isLeftHand) {
                leftHandNotes.push(noteInfo);
            } else {
                rightHandNotes.push(noteInfo);
            }
        }

        // Update left hand position from actual LH notes
        if (leftHandNotes.length > 0) {
            // Find the lowest note to determine position
            const lowestNote = leftHandNotes.reduce((lowest, n) =>
                (n.octave < lowest.octave || (n.octave === lowest.octave && this.getNoteIndex(n.pitch) < this.getNoteIndex(lowest.pitch)))
                    ? n : lowest
            );
            const lhPosition = this.detectPositionFromNote(lowestNote.pitch, true);
            if (lhPosition) {
                this.leftHandPosition = lhPosition;
                this.leftHandOctave = lowestNote.octave;
            }
        }

        // Update right hand position from actual RH notes
        if (rightHandNotes.length > 0) {
            // Find the lowest note to determine position
            const lowestNote = rightHandNotes.reduce((lowest, n) =>
                (n.octave < lowest.octave || (n.octave === lowest.octave && this.getNoteIndex(n.pitch) < this.getNoteIndex(lowest.pitch)))
                    ? n : lowest
            );
            const rhPosition = this.detectPositionFromNote(lowestNote.pitch, false);
            if (rhPosition) {
                this.rightHandPosition = rhPosition;
                this.rightHandOctave = lowestNote.octave;
            }
        }

        this.render();
    }

    /**
     * Get note index in scale (C=0, D=1, ..., B=6)
     */
    getNoteIndex(pitch) {
        const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        return noteOrder.indexOf(pitch);
    }

    /**
     * Detect which position a note belongs to
     */
    detectPositionFromNote(pitch, isLeftHand) {
        const positions = isLeftHand ?
            (typeof fingeringEngine !== 'undefined' ? fingeringEngine.leftHandPositions : null) :
            (typeof fingeringEngine !== 'undefined' ? fingeringEngine.rightHandPositions : null);

        if (!positions) return null;

        // Check each position to see if this note is the base note
        for (const [posKey, posData] of Object.entries(positions)) {
            if (posData.baseNote === pitch) {
                return posKey;
            }
        }

        // If not a base note, find which position contains this note
        for (const [posKey, posData] of Object.entries(positions)) {
            if (posData.keys.includes(pitch)) {
                return posKey;
            }
        }

        return 'C'; // Default fallback
    }

    /**
     * Update positions from full tune analysis (for two-hand pieces)
     */
    updateFromTune(tune) {
        if (!tune || !tune.notes || typeof fingeringEngine === 'undefined') return;

        // Analyze the tune to find positions for both hands
        const fingeringData = fingeringEngine.generateFingering(tune.notes);

        // Find positions for each hand
        let foundLeftPosition = false;
        let foundRightPosition = false;

        for (const info of fingeringData) {
            if (!info || !info.position) continue;

            if (info.isLeftHand && !foundLeftPosition) {
                this.leftHandPosition = info.position;
                this.leftHandOctave = info.octave || 3;
                foundLeftPosition = true;
            } else if (!info.isLeftHand && !foundRightPosition) {
                this.rightHandPosition = info.position;
                this.rightHandOctave = info.octave || 4;
                foundRightPosition = true;
            }

            if (foundLeftPosition && foundRightPosition) break;
        }

        this.render();
    }

    /**
     * Check if a note is for left hand (based on octave)
     */
    isLeftHandNote(octave) {
        return octave <= 3;
    }

    /**
     * Clear pressed keys only (keep positions visible)
     */
    clearPressedKeys() {
        this.pressedKeys = [];
        this.render();
    }

    /**
     * Clear the entire display (positions and pressed keys)
     */
    clear() {
        this.leftHandPosition = null;
        this.rightHandPosition = null;
        this.pressedKeys = [];
        this.render();
    }

    /**
     * Get position keys for a given position
     */
    getPositionKeys(position, isLeftHand) {
        const positions = isLeftHand ?
            (typeof fingeringEngine !== 'undefined' ? fingeringEngine.leftHandPositions : null) :
            (typeof fingeringEngine !== 'undefined' ? fingeringEngine.rightHandPositions : null);

        if (!positions || !positions[position]) return null;
        return positions[position];
    }

    /**
     * Check if a key is in the position
     */
    isKeyInPosition(keyName, octave, position, positionOctave, isLeftHand) {
        const positionData = this.getPositionKeys(position, isLeftHand);
        if (!positionData) return { inPosition: false };

        const positionKeys = positionData.keys;
        const baseNote = positionData.baseNote;

        if (!positionKeys.includes(keyName)) return { inPosition: false };

        // Use musical note order (C=0, D=1, ..., B=6) to determine octave
        const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const keyMusicIndex = noteOrder.indexOf(keyName);
        const baseMusicIndex = noteOrder.indexOf(baseNote);

        // If the key comes before the base note in musical order (e.g., C in F position),
        // it belongs to the next octave
        let expectedOctave;
        if (keyMusicIndex >= baseMusicIndex) {
            expectedOctave = positionOctave;
        } else {
            expectedOctave = positionOctave + 1;
        }

        if (octave === expectedOctave) {
            return {
                inPosition: true,
                finger: positionData.mapping[keyName]
            };
        }

        return { inPosition: false };
    }

    /**
     * Check if a key is currently pressed
     */
    isKeyPressed(keyName, octave, isSharp = false) {
        return this.pressedKeys.some(pk => {
            const matchesNote = pk.pitch === keyName && pk.octave === octave;
            if (isSharp) {
                return matchesNote && pk.isSharp;
            }
            return matchesNote && !pk.isSharp && !pk.isFlat;
        });
    }

    /**
     * Render the keyboard
     */
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const startX = this.padding + (this.canvas.width - this.padding * 2 - this.totalWhiteKeys * this.whiteKeyWidth) / 2;
        const startY = this.padding;

        // Draw white keys first
        for (let octave = 0; octave < this.numOctaves; octave++) {
            const actualOctave = this.startOctave + octave;

            for (let keyInOctave = 0; keyInOctave < this.whiteKeysPerOctave; keyInOctave++) {
                const keyIndex = octave * this.whiteKeysPerOctave + keyInOctave;
                const keyX = startX + keyIndex * this.whiteKeyWidth;
                const keyName = this.whiteKeyNotes[keyInOctave];

                // Determine key state
                const isPressed = this.isKeyPressed(keyName, actualOctave);

                // Check if in left hand position
                let lhInfo = { inPosition: false };
                if (this.leftHandPosition) {
                    lhInfo = this.isKeyInPosition(keyName, actualOctave, this.leftHandPosition, this.leftHandOctave, true);
                }

                // Check if in right hand position
                let rhInfo = { inPosition: false };
                if (this.rightHandPosition) {
                    rhInfo = this.isKeyInPosition(keyName, actualOctave, this.rightHandPosition, this.rightHandOctave, false);
                }

                // Determine fill color
                let fillColor = this.colors.whiteKey;
                let finger = null;
                let isLeftHandKey = false;

                if (isPressed) {
                    fillColor = this.colors.pressed;
                } else if (lhInfo.inPosition) {
                    fillColor = this.colors.lhPosition;
                    finger = lhInfo.finger;
                    isLeftHandKey = true;
                } else if (rhInfo.inPosition) {
                    fillColor = this.colors.rhPosition;
                    finger = rhInfo.finger;
                }

                // Draw key
                this.ctx.fillStyle = fillColor;
                this.ctx.strokeStyle = this.colors.whiteKeyBorder;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.roundRect(keyX, startY, this.whiteKeyWidth - 1, this.whiteKeyHeight, [0, 0, 4, 4]);
                this.ctx.fill();
                this.ctx.stroke();

                // Draw key label for C notes
                if (keyName === 'C') {
                    this.ctx.fillStyle = isPressed ? '#fff' : this.colors.keyLabel;
                    this.ctx.font = '10px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(`C${actualOctave}`, keyX + this.whiteKeyWidth / 2, startY + this.whiteKeyHeight - 5);
                }

                // Draw finger number if in position
                if (finger && !isPressed) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 14px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(finger.toString(), keyX + this.whiteKeyWidth / 2, startY + this.whiteKeyHeight - 25);
                }
            }
        }

        // Draw black keys
        for (let octave = 0; octave < this.numOctaves; octave++) {
            const actualOctave = this.startOctave + octave;

            for (const whiteKeyIndex of this.blackKeyAfter) {
                const keyIndex = octave * this.whiteKeysPerOctave + whiteKeyIndex;
                const keyX = startX + (keyIndex + 1) * this.whiteKeyWidth - this.blackKeyWidth / 2;
                const blackKeyName = this.whiteKeyNotes[whiteKeyIndex] + '#';
                const baseName = this.whiteKeyNotes[whiteKeyIndex];

                // Check if pressed (as sharp)
                const isPressed = this.isKeyPressed(baseName, actualOctave, true);

                // Determine fill color
                let fillColor = this.colors.blackKey;

                if (isPressed) {
                    fillColor = this.colors.pressed;
                }

                // Draw key
                this.ctx.fillStyle = fillColor;
                this.ctx.strokeStyle = this.colors.blackKeyBorder;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.roundRect(keyX, startY, this.blackKeyWidth, this.blackKeyHeight, [0, 0, 3, 3]);
                this.ctx.fill();
                this.ctx.stroke();
            }
        }

        // Draw hand labels
        this.drawHandLabels(startX, startY);
    }

    /**
     * Draw labels showing which hand is which
     */
    drawHandLabels(startX, startY) {
        const labelY = startY + this.whiteKeyHeight + 18;

        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';

        // Left hand label (positioned around octave 3)
        if (this.leftHandPosition) {
            const lhOctaveIndex = this.leftHandOctave - this.startOctave;
            const lhCenterX = startX + (lhOctaveIndex * this.whiteKeysPerOctave + 3.5) * this.whiteKeyWidth;

            this.ctx.fillStyle = this.colors.lhPosition;
            this.ctx.fillText(`LH: ${this.leftHandPosition} Position`, lhCenterX, labelY);
        }

        // Right hand label (positioned around octave 4)
        if (this.rightHandPosition) {
            const rhOctaveIndex = this.rightHandOctave - this.startOctave;
            const rhCenterX = startX + (rhOctaveIndex * this.whiteKeysPerOctave + 3.5) * this.whiteKeyWidth;

            this.ctx.fillStyle = this.colors.rhPosition;
            this.ctx.fillText(`RH: ${this.rightHandPosition} Position`, rhCenterX, labelY);
        }
    }
}

// Create global instance
let liveKeyboard;
document.addEventListener('DOMContentLoaded', () => {
    liveKeyboard = new LiveKeyboardRenderer('live-keyboard-canvas');
});
