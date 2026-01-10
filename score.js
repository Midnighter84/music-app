/**
 * Score renderer module
 * Draws musical notation on a canvas element with multiple rows
 * Supports both treble and bass clef (grand staff)
 */

class ScoreRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Layout settings
        this.staffLineSpacing = 12;
        this.staffHeight = 4 * this.staffLineSpacing; // 5 lines = 4 gaps
        this.grandStaffGap = 40; // Gap between treble and bass staves
        this.rowSpacing = 100; // Space between staff systems (single staff)
        this.grandStaffRowSpacing = 160; // Space between grand staff systems
        this.firstRowTop = 60;
        this.noteSpacing = 45;
        this.leftMargin = 80;
        this.rightMargin = 40;

        // Colors
        this.colors = {
            staff: '#333',
            notes: '#1a1a2e',
            playhead: '#e94560',
            playedNote: '#4ecca3',
            currentNote: '#e94560',
            clef: '#333',
            background: '#fafafa',
            fingering: '#888',           // Soft gray for finger numbers
            fingeringActive: '#e94560',  // Highlight current finger
            positionChange: '#667eea'    // Purple for position change indicator
        };

        // Hand position colors for position mode (right hand - lighter/warmer)
        this.rightHandPositionColors = {
            'C': '#5dade2',  // Light blue for RH C Position
            'G': '#ec7063',  // Light red for RH G Position
            'F': '#58d68d',  // Light green for RH F Position
            'D': '#bb8fce'   // Light purple for RH D Position
        };

        // Hand position colors for position mode (left hand - darker/cooler)
        this.leftHandPositionColors = {
            'C': '#2874a6',  // Dark blue for LH C Position
            'G': '#b03a2e',  // Dark red for LH G Position
            'F': '#1e8449',  // Dark green for LH F Position
            'D': '#6c3483'   // Dark purple for LH D Position
        };

        // Legacy: combined position colors (for backward compatibility)
        this.positionColors = this.rightHandPositionColors;

        // Show hand position mode (color notes by position)
        this.showPositionMode = false;

        // Hover state for keyboard overlay
        this.hoveredNoteIndex = -1;
        this.hoverX = 0;
        this.hoverY = 0;

        // Fingering data
        this.fingeringData = [];

        // Whether current tune uses bass clef
        this.usesBassClef = false;

        // Treble clef note positions (relative to middle line, in staff line units)
        // Treble clef: Lines are E4, G4, B4, D5, F5 (bottom to top)
        // Spaces are F4, A4, C5, E5 (bottom to top)
        // Middle C (C4) is on first ledger line below staff
        this.trebleNotePositions = {
            'C4': 3, 'D4': 2.5, 'E4': 2, 'F4': 1.5, 'G4': 1, 'A4': 0.5, 'B4': 0,
            'C5': -0.5, 'D5': -1, 'E5': -1.5, 'F5': -2, 'G5': -2.5, 'A5': -3, 'B5': -3.5,
            'C6': -4, 'D6': -4.5, 'E6': -5
        };

        // Bass clef note positions (relative to middle line, in staff line units)
        // Bass clef: Lines are G2, B2, D3, F3, A3 (bottom to top)
        // Spaces are A2, C3, E3, G3 (bottom to top)
        // Middle C (C4) is on first ledger line above bass staff
        this.bassNotePositions = {
            'C2': 3.5, 'D2': 3, 'E2': 2.5, 'F2': 2, 'G2': 1.5, 'A2': 1, 'B2': 0.5,
            'C3': 0, 'D3': -0.5, 'E3': -1, 'F3': -1.5, 'G3': -2, 'A3': -2.5, 'B3': -3,
            'C4': -3.5, 'D4': -4, 'E4': -4.5
        };

        // Threshold octave for bass clef (notes at or below this octave use bass clef)
        this.bassClefThreshold = 3;

        // Current playback state
        this.currentNoteIndex = -1;
        this.noteLayout = []; // Stores calculated positions for all notes

        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.currentTune) {
                this.render(this.currentTune, this.currentNoteIndex);
            }
        });

        // Mouse event listeners for hover detection
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    }

    /**
     * Handle mouse move for hover detection
     */
    handleMouseMove(e) {
        if (!this.showPositionMode || !this.noteLayout.length) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find if we're hovering over a note
        const hoveredIndex = this.findNoteAtPosition(x, y);

        if (hoveredIndex !== this.hoveredNoteIndex) {
            this.hoveredNoteIndex = hoveredIndex;
            this.hoverX = x;
            this.hoverY = y;
            // Re-render to show/hide keyboard overlay
            if (this.currentTune) {
                this.render(this.currentTune, this.currentNoteIndex);
            }
        }
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        if (this.hoveredNoteIndex !== -1) {
            this.hoveredNoteIndex = -1;
            if (this.currentTune) {
                this.render(this.currentTune, this.currentNoteIndex);
            }
        }
    }

    /**
     * Find note at a given canvas position
     */
    findNoteAtPosition(x, y) {
        const hitRadius = 15; // Pixels around note center to detect hover

        for (let i = 0; i < this.noteLayout.length; i++) {
            const noteInfo = this.noteLayout[i];
            const note = noteInfo.note;

            if (note.pitch === 'R') continue;

            // Get Y position for the note
            let noteY;
            if (this.isChord(note)) {
                // For chords, use the center of all notes
                const yPositions = note.notes.map(n =>
                    this.getNoteY(n.pitch, n.octave, noteInfo.row)
                );
                noteY = (Math.min(...yPositions) + Math.max(...yPositions)) / 2;
            } else {
                noteY = this.getNoteY(note.pitch, note.octave, noteInfo.row);
            }

            // Check if mouse is within hit radius
            const dx = x - noteInfo.x;
            const dy = y - noteY;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Resize canvas to fit container width
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        // Height will be set dynamically based on number of rows
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Set hand position display mode
     */
    setPositionMode(enabled) {
        this.showPositionMode = enabled;
        if (this.currentTune) {
            this.render(this.currentTune, this.currentNoteIndex);
        }
    }

    /**
     * Get position colors for legend display
     */
    getPositionColors() {
        return {
            rightHand: this.rightHandPositionColors,
            leftHand: this.leftHandPositionColors
        };
    }

    /**
     * Get position color based on hand
     */
    getPositionColor(position, isLeftHand) {
        const colors = isLeftHand ? this.leftHandPositionColors : this.rightHandPositionColors;
        return colors[position] || this.colors.notes;
    }

    /**
     * Draw keyboard overlay showing finger positions
     */
    drawKeyboardOverlay(fingeringInfo, noteX, noteY) {
        if (!fingeringInfo || !fingeringInfo.position) return;

        const isLeftHand = fingeringInfo.isLeftHand;
        const position = fingeringInfo.position;
        const currentFinger = fingeringInfo.finger;
        const positions = isLeftHand ?
            (typeof fingeringEngine !== 'undefined' ? fingeringEngine.leftHandPositions : null) :
            (typeof fingeringEngine !== 'undefined' ? fingeringEngine.rightHandPositions : null);

        if (!positions || !positions[position]) return;

        const positionData = positions[position];

        // Keyboard dimensions
        const keyWidth = 24;
        const keyHeight = 80;
        const blackKeyWidth = 16;
        const blackKeyHeight = 50;
        const padding = 15;
        const overlayWidth = keyWidth * 8 + padding * 2;
        const overlayHeight = keyHeight + 60 + padding * 2;

        // Position the overlay near the note but within canvas bounds
        let overlayX = noteX - overlayWidth / 2;
        let overlayY = noteY - overlayHeight - 20;

        // Keep within canvas bounds
        overlayX = Math.max(10, Math.min(overlayX, this.canvas.width - overlayWidth - 10));
        overlayY = Math.max(10, overlayY);
        if (overlayY < 10) {
            overlayY = noteY + 30;
        }

        // Draw overlay background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(overlayX, overlayY, overlayWidth, overlayHeight, 8);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw title
        const handLabel = isLeftHand ? 'Left Hand' : 'Right Hand';
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${handLabel} - ${positionData.name}`, overlayX + overlayWidth / 2, overlayY + 18);

        // Draw piano keys
        const keysStartX = overlayX + padding;
        const keysStartY = overlayY + 35;

        // All white keys in an octave: C D E F G A B C
        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2'];
        // Black keys positions (relative to white key index)
        const blackKeyPositions = {
            0: 'C#', // After C
            1: 'D#', // After D
            3: 'F#', // After F
            4: 'G#', // After G
            5: 'A#'  // After A
        };

        // Finger positions for this hand position
        const fingerMap = positionData.mapping;
        const positionKeys = positionData.keys;

        // Draw white keys
        whiteKeys.forEach((key, i) => {
            const keyX = keysStartX + i * keyWidth;
            const keyName = key.replace('2', '');

            // Check if this key is part of the position
            const isInPosition = positionKeys.includes(keyName);
            const finger = fingerMap[keyName];
            const isCurrentFinger = finger === currentFinger && isInPosition;

            // Key background
            if (isCurrentFinger) {
                this.ctx.fillStyle = '#e94560';
            } else if (isInPosition) {
                this.ctx.fillStyle = this.getPositionColor(position, isLeftHand);
            } else {
                this.ctx.fillStyle = '#fff';
            }

            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.rect(keyX, keysStartY, keyWidth - 1, keyHeight);
            this.ctx.fill();
            this.ctx.stroke();

            // Key label
            this.ctx.fillStyle = isCurrentFinger || isInPosition ? '#fff' : '#666';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(keyName, keyX + keyWidth / 2, keysStartY + keyHeight - 8);

            // Finger number
            if (isInPosition && finger) {
                this.ctx.fillStyle = isCurrentFinger ? '#fff' : '#333';
                this.ctx.font = 'bold 14px sans-serif';
                this.ctx.fillText(finger.toString(), keyX + keyWidth / 2, keysStartY + keyHeight - 25);
            }
        });

        // Draw black keys
        Object.entries(blackKeyPositions).forEach(([whiteKeyIndex, blackKeyName]) => {
            const i = parseInt(whiteKeyIndex);
            const keyX = keysStartX + (i + 1) * keyWidth - blackKeyWidth / 2;

            // Check if this key is part of the position (for F# in D position)
            const baseName = blackKeyName.replace('#', '');
            const isInPosition = positionKeys.includes(blackKeyName) || fingerMap[blackKeyName];
            const finger = fingerMap[blackKeyName];
            const isCurrentFinger = finger === currentFinger && isInPosition;

            if (isCurrentFinger) {
                this.ctx.fillStyle = '#e94560';
            } else if (isInPosition) {
                this.ctx.fillStyle = this.getPositionColor(position, isLeftHand);
            } else {
                this.ctx.fillStyle = '#222';
            }

            this.ctx.beginPath();
            this.ctx.rect(keyX, keysStartY, blackKeyWidth, blackKeyHeight);
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.stroke();

            // Finger number for black keys in position
            if (isInPosition && finger) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 11px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(finger.toString(), keyX + blackKeyWidth / 2, keysStartY + blackKeyHeight - 8);
            }
        });

        // Draw hand indicator (simple representation)
        this.drawHandIndicator(overlayX + overlayWidth / 2, keysStartY + keyHeight + 25, isLeftHand, currentFinger);
    }

    /**
     * Draw a simple hand indicator showing which finger is active
     */
    drawHandIndicator(centerX, centerY, isLeftHand, activeFinger) {
        // Simple circles representing fingers
        const fingerSpacing = 18;
        const fingerRadius = 7;

        // Finger order for display (pinky to thumb or thumb to pinky)
        const fingerOrder = isLeftHand ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];

        fingerOrder.forEach((finger, i) => {
            const x = centerX + (i - 2) * fingerSpacing;
            const y = centerY;

            this.ctx.beginPath();
            this.ctx.arc(x, y, fingerRadius, 0, Math.PI * 2);

            if (finger === activeFinger) {
                this.ctx.fillStyle = '#e94560';
            } else {
                this.ctx.fillStyle = '#ddd';
            }
            this.ctx.fill();

            this.ctx.strokeStyle = '#999';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Finger number
            this.ctx.fillStyle = finger === activeFinger ? '#fff' : '#666';
            this.ctx.font = '9px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(finger.toString(), x, y);
        });

        // Label
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px sans-serif';
        this.ctx.textBaseline = 'alphabetic';
        const label = isLeftHand ? 'LH' : 'RH';
        this.ctx.fillText(label, centerX - fingerSpacing * 3, centerY + 3);
    }

    /**
     * Lighten a hex color by a given amount (0-1)
     */
    lightenColor(hex, amount) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse RGB values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Lighten by mixing with white
        const newR = Math.round(r + (255 - r) * amount);
        const newG = Math.round(g + (255 - g) * amount);
        const newB = Math.round(b + (255 - b) * amount);

        // Convert back to hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * Check if a note should be on the bass clef
     */
    isBassClefNote(pitch, octave) {
        if (pitch === 'R') return false;
        return octave <= this.bassClefThreshold;
    }

    /**
     * Check if a tune contains any bass clef notes
     */
    tuneHasBassClefNotes(notes) {
        for (const noteEntry of notes) {
            if (this.isChord(noteEntry)) {
                for (const note of noteEntry.notes) {
                    if (this.isBassClefNote(note.pitch, note.octave)) {
                        return true;
                    }
                }
            } else if (noteEntry.pitch !== 'R' && this.isBassClefNote(noteEntry.pitch, noteEntry.octave)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the top Y position for a specific row (treble staff)
     */
    getRowTop(rowIndex) {
        const spacing = this.usesBassClef ? this.grandStaffRowSpacing : this.rowSpacing;
        return this.firstRowTop + rowIndex * spacing;
    }

    /**
     * Get the top Y position for bass staff in a specific row
     */
    getBassStaffTop(rowIndex) {
        return this.getRowTop(rowIndex) + this.staffHeight + this.grandStaffGap;
    }

    /**
     * Draw staff lines for a specific row
     */
    drawStaffRow(rowIndex) {
        const trebleTop = this.getRowTop(rowIndex);

        this.ctx.strokeStyle = this.colors.staff;
        this.ctx.lineWidth = 1;

        // Draw treble staff (5 lines)
        for (let i = 0; i < 5; i++) {
            const y = trebleTop + i * this.staffLineSpacing;
            this.ctx.beginPath();
            this.ctx.moveTo(this.leftMargin - 30, y);
            this.ctx.lineTo(this.canvas.width - this.rightMargin, y);
            this.ctx.stroke();
        }

        // Draw bass staff if needed
        if (this.usesBassClef) {
            const bassTop = this.getBassStaffTop(rowIndex);

            for (let i = 0; i < 5; i++) {
                const y = bassTop + i * this.staffLineSpacing;
                this.ctx.beginPath();
                this.ctx.moveTo(this.leftMargin - 30, y);
                this.ctx.lineTo(this.canvas.width - this.rightMargin, y);
                this.ctx.stroke();
            }

            // Draw brace connecting the staves
            this.drawGrandStaffBrace(rowIndex);
        }
    }

    /**
     * Draw a brace connecting treble and bass staves
     */
    drawGrandStaffBrace(rowIndex) {
        const trebleTop = this.getRowTop(rowIndex);
        const bassBottom = this.getBassStaffTop(rowIndex) + this.staffHeight;

        this.ctx.strokeStyle = this.colors.staff;
        this.ctx.lineWidth = 2;

        // Simple bracket line
        const x = this.leftMargin - 35;
        this.ctx.beginPath();
        this.ctx.moveTo(x, trebleTop);
        this.ctx.lineTo(x, bassBottom);
        this.ctx.stroke();

        // Top and bottom caps
        this.ctx.beginPath();
        this.ctx.moveTo(x, trebleTop);
        this.ctx.lineTo(x + 5, trebleTop);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(x, bassBottom);
        this.ctx.lineTo(x + 5, bassBottom);
        this.ctx.stroke();
    }

    /**
     * Draw clef(s) for a specific row
     */
    drawClef(rowIndex) {
        const trebleTop = this.getRowTop(rowIndex);

        this.ctx.fillStyle = this.colors.clef;
        this.ctx.font = 'bold 70px serif';
        this.ctx.textBaseline = 'middle';

        // Unicode treble clef character
        const trebleClefY = trebleTop + 2 * this.staffLineSpacing;
        this.ctx.fillText('𝄞', this.leftMargin - 25, trebleClefY + 5);

        // Draw bass clef if needed
        if (this.usesBassClef) {
            const bassTop = this.getBassStaffTop(rowIndex);
            this.ctx.font = 'bold 50px serif';
            // Unicode bass clef character
            const bassClefY = bassTop + 1.5 * this.staffLineSpacing;
            this.ctx.fillText('𝄢', this.leftMargin - 25, bassClefY);
        }
    }

    /**
     * Get Y position for a note on the staff (relative to a row)
     */
    getNoteY(pitch, octave, rowIndex) {
        // Remove sharps/flats for position calculation
        const basePitch = pitch.replace('#', '').replace('b', '');
        const key = `${basePitch}${octave}`;

        // Determine which staff and position map to use
        const useBass = this.usesBassClef && this.isBassClefNote(pitch, octave);
        const staffTop = useBass ? this.getBassStaffTop(rowIndex) : this.getRowTop(rowIndex);
        const positionMap = useBass ? this.bassNotePositions : this.trebleNotePositions;

        const position = positionMap[key];
        if (position === undefined) {
            // Default to middle line if note not found
            return staffTop + 2 * this.staffLineSpacing;
        }

        return staffTop + 2 * this.staffLineSpacing + position * this.staffLineSpacing;
    }

    /**
     * Calculate the layout of notes across multiple rows
     */
    calculateLayout(notes) {
        const layout = [];
        const availableWidth = this.canvas.width - this.leftMargin - this.rightMargin - 40;

        let currentRow = 0;
        let xInRow = 0;
        const startX = this.leftMargin + 40;

        notes.forEach((note, index) => {
            const noteWidth = this.noteSpacing * Math.max(0.5, note.duration);

            // Check if we need to wrap to next row
            if (xInRow + noteWidth > availableWidth && xInRow > 0) {
                currentRow++;
                xInRow = 0;
            }

            layout.push({
                note,
                index,
                row: currentRow,
                x: startX + xInRow,
                width: noteWidth
            });

            xInRow += noteWidth;
        });

        return layout;
    }

    /**
     * Check if a note entry is a chord (multiple notes)
     */
    isChord(noteEntry) {
        return noteEntry.notes && Array.isArray(noteEntry.notes);
    }

    /**
     * Draw a single note head at a specific position
     */
    drawNoteHead(x, y, duration, fillColor, row) {
        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = fillColor;

        // Draw note head (oval)
        this.ctx.beginPath();
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(1, 0.75);

        const noteRadius = duration >= 2 ? 8 : 7;

        if (duration >= 2) {
            // Hollow note head for half notes and whole notes
            this.ctx.lineWidth = 2;
            this.ctx.arc(0, 0, noteRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        } else {
            // Filled note head for quarter notes and shorter
            this.ctx.arc(0, 0, noteRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    /**
     * Draw accidental (sharp or flat) for a note
     */
    drawAccidental(x, y, pitch) {
        if (pitch.includes('#')) {
            this.ctx.font = '16px serif';
            this.ctx.fillText('♯', x - 20, y + 5);
        } else if (pitch.includes('b')) {
            this.ctx.font = '16px serif';
            this.ctx.fillText('♭', x - 18, y + 5);
        }
    }

    /**
     * Draw a single note or chord
     */
    drawNote(noteInfo, currentNoteIndex) {
        const { note, index, row, x } = noteInfo;

        // Handle rest
        if (note.pitch === 'R') {
            this.drawRest(x, note.duration, index, row, currentNoteIndex);
            return;
        }

        // Determine note color based on playback state or position mode
        let fillColor = this.colors.notes;

        // Check if position mode is enabled and we have fingering data
        if (this.showPositionMode && this.fingeringData && this.fingeringData[index]) {
            const fingerInfo = this.fingeringData[index];
            const position = fingerInfo.position;
            const isLeftHand = fingerInfo.isLeftHand;
            if (position) {
                fillColor = this.getPositionColor(position, isLeftHand);
            }
        }

        // Override with playback state colors
        if (index === currentNoteIndex) {
            fillColor = this.colors.currentNote;
        } else if (index < currentNoteIndex) {
            // In position mode, dim the played notes but keep position tint
            if (this.showPositionMode && this.fingeringData && this.fingeringData[index]) {
                const fingerInfo = this.fingeringData[index];
                const position = fingerInfo.position;
                const isLeftHand = fingerInfo.isLeftHand;
                if (position) {
                    // Lighten the position color for played notes
                    fillColor = this.lightenColor(this.getPositionColor(position, isLeftHand), 0.4);
                } else {
                    fillColor = this.colors.playedNote;
                }
            } else {
                fillColor = this.colors.playedNote;
            }
        }

        const staffTop = this.getRowTop(row);
        const duration = note.duration;

        // Check if this is a chord
        if (this.isChord(note)) {
            // Draw all notes in the chord
            const chordNotes = note.notes;
            const yPositions = [];

            chordNotes.forEach(chordNote => {
                const y = this.getNoteY(chordNote.pitch, chordNote.octave, row);
                yPositions.push(y);

                // Draw ledger lines if needed (check if this note is on bass clef)
                const isBassNote = this.isBassClefNote(chordNote.pitch, chordNote.octave);
                this.drawLedgerLines(x, y, row, isBassNote);

                // Draw note head
                this.drawNoteHead(x, y, duration, fillColor, row);

                // Draw accidental
                this.ctx.fillStyle = fillColor;
                this.drawAccidental(x, y, chordNote.pitch);
            });

            // Draw single stem for the chord (from outermost note)
            if (duration < 4 && yPositions.length > 0) {
                const minY = Math.min(...yPositions);
                const maxY = Math.max(...yPositions);
                const avgY = (minY + maxY) / 2;

                // Stem direction based on average position
                const stemDirection = avgY > staffTop + 2 * this.staffLineSpacing ? -1 : 1;
                const stemX = x + (stemDirection === -1 ? 7 : -7);
                const stemStartY = stemDirection === -1 ? maxY : minY;
                const stemEndY = stemStartY + stemDirection * 35;

                this.ctx.strokeStyle = fillColor;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(stemX, stemStartY);
                this.ctx.lineTo(stemX, stemEndY);
                this.ctx.stroke();

                // Draw flag for eighth notes and shorter
                if (duration <= 0.5) {
                    this.drawFlag(stemX, stemEndY, stemDirection);
                }
            }
        } else {
            // Draw single note
            const y = this.getNoteY(note.pitch, note.octave, row);

            // Draw ledger lines if needed (check if this note is on bass clef)
            const isBassNote = this.isBassClefNote(note.pitch, note.octave);
            this.drawLedgerLines(x, y, row, isBassNote);

            // Draw note head
            this.drawNoteHead(x, y, duration, fillColor, row);

            // Draw stem for notes shorter than whole note
            if (duration < 4) {
                this.ctx.strokeStyle = fillColor;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                const stemDirection = y > staffTop + 2 * this.staffLineSpacing ? -1 : 1;
                this.ctx.moveTo(x + (stemDirection === -1 ? 7 : -7), y);
                this.ctx.lineTo(x + (stemDirection === -1 ? 7 : -7), y + stemDirection * 35);
                this.ctx.stroke();

                // Draw flag for eighth notes and shorter
                if (duration <= 0.5) {
                    this.drawFlag(x + (stemDirection === -1 ? 7 : -7), y + stemDirection * 35, stemDirection);
                }
            }

            // Draw accidental
            this.ctx.fillStyle = fillColor;
            this.drawAccidental(x, y, note.pitch);

            // Draw dot for dotted notes
            if (duration === 1.5 || duration === 0.75 || duration === 3) {
                this.ctx.beginPath();
                this.ctx.arc(x + 15, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    /**
     * Draw ledger lines for notes above or below the staff
     */
    drawLedgerLines(x, y, rowIndex, isBassNote = false) {
        // Determine which staff this note belongs to
        let staffTop, staffBottom;
        if (this.usesBassClef && isBassNote) {
            staffTop = this.getBassStaffTop(rowIndex);
            staffBottom = staffTop + 4 * this.staffLineSpacing;
        } else {
            staffTop = this.getRowTop(rowIndex);
            staffBottom = staffTop + 4 * this.staffLineSpacing;
        }

        this.ctx.strokeStyle = this.colors.staff;
        this.ctx.lineWidth = 1;

        // Ledger lines below staff
        if (y > staffBottom) {
            let ledgerY = staffBottom + this.staffLineSpacing;
            while (ledgerY <= y + this.staffLineSpacing / 2) {
                this.ctx.beginPath();
                this.ctx.moveTo(x - 12, ledgerY);
                this.ctx.lineTo(x + 12, ledgerY);
                this.ctx.stroke();
                ledgerY += this.staffLineSpacing;
            }
        }

        // Ledger lines above staff
        if (y < staffTop) {
            let ledgerY = staffTop - this.staffLineSpacing;
            while (ledgerY >= y - this.staffLineSpacing / 2) {
                this.ctx.beginPath();
                this.ctx.moveTo(x - 12, ledgerY);
                this.ctx.lineTo(x + 12, ledgerY);
                this.ctx.stroke();
                ledgerY -= this.staffLineSpacing;
            }
        }
    }

    /**
     * Draw a flag for eighth notes
     */
    drawFlag(x, y, direction) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.quadraticCurveTo(x + 15, y + direction * 10, x + 10, y + direction * 25);
        this.ctx.stroke();
    }

    /**
     * Draw a rest symbol
     */
    drawRest(x, duration, noteIndex, rowIndex, currentNoteIndex) {
        const staffTop = this.getRowTop(rowIndex);
        const y = staffTop + 2 * this.staffLineSpacing;

        let fillColor = this.colors.notes;
        if (noteIndex === currentNoteIndex) {
            fillColor = this.colors.currentNote;
        } else if (noteIndex < currentNoteIndex) {
            fillColor = this.colors.playedNote;
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.font = '30px serif';
        this.ctx.textBaseline = 'middle';

        // Different rest symbols based on duration
        if (duration >= 4) {
            // Whole rest (rectangle below line)
            this.ctx.fillRect(x - 8, y - this.staffLineSpacing / 2, 16, 8);
        } else if (duration >= 2) {
            // Half rest (rectangle above line)
            this.ctx.fillRect(x - 8, y + 4, 16, 8);
        } else if (duration >= 1) {
            // Quarter rest
            this.ctx.fillText('𝄽', x - 8, y);
        } else {
            // Eighth rest
            this.ctx.fillText('𝄾', x - 6, y);
        }
    }

    /**
     * Draw the playhead indicator on a specific row
     */
    drawPlayhead(x, rowIndex) {
        const staffTop = this.getRowTop(rowIndex);

        if (x < this.leftMargin || x > this.canvas.width - this.rightMargin) return;

        // Calculate bottom of playhead (extends to bass staff if grand staff)
        let playheadBottom;
        if (this.usesBassClef) {
            playheadBottom = this.getBassStaffTop(rowIndex) + this.staffHeight + 15;
        } else {
            playheadBottom = staffTop + this.staffHeight + 15;
        }

        this.ctx.strokeStyle = this.colors.playhead;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, staffTop - 15);
        this.ctx.lineTo(x, playheadBottom);
        this.ctx.stroke();

        // Draw triangle at top
        this.ctx.fillStyle = this.colors.playhead;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 8, staffTop - 15);
        this.ctx.lineTo(x + 8, staffTop - 15);
        this.ctx.lineTo(x, staffTop - 5);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Draw finger number below a note or chord
     */
    drawFingerNumber(noteInfo, fingerInfo, currentNoteIndex) {
        if (!fingerInfo || !fingerInfo.showFinger) {
            return;
        }

        const { note, index, row, x } = noteInfo;

        // Determine color based on playback state
        let color = this.colors.fingering;
        if (index === currentNoteIndex) {
            color = this.colors.fingeringActive;
        }

        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Check if this is a chord with multiple fingers
        if (fingerInfo.fingers && Array.isArray(fingerInfo.fingers)) {
            // Draw finger number below each note in the chord
            fingerInfo.fingers.forEach((finger, i) => {
                if (finger !== null && note.notes && note.notes[i]) {
                    const chordNote = note.notes[i];
                    const noteY = this.getNoteY(chordNote.pitch, chordNote.octave, row);
                    const fingerY = noteY + 18;
                    this.ctx.fillText(finger.toString(), x, fingerY);
                }
            });
        } else if (fingerInfo.finger !== null) {
            // Single note
            const noteY = this.getNoteY(note.pitch, note.octave, row);
            const fingerY = noteY + 18;
            this.ctx.fillText(fingerInfo.finger.toString(), x, fingerY);
        }
    }

    /**
     * Render the entire score
     */
    render(tune, currentNoteIndex = -1) {
        this.currentNoteIndex = currentNoteIndex;
        this.currentTune = tune;

        if (!tune || !tune.notes || tune.notes.length === 0) {
            this.usesBassClef = false;
            this.canvas.height = 200;
            this.clear();
            this.drawStaffRow(0);
            this.drawClef(0);
            return;
        }

        // Detect if tune has bass clef notes (before layout calculation)
        this.usesBassClef = this.tuneHasBassClefNotes(tune.notes);

        // Calculate layout for all notes
        this.noteLayout = this.calculateLayout(tune.notes);

        // Calculate fingering if fingering engine is available
        if (typeof fingeringEngine !== 'undefined') {
            this.fingeringData = fingeringEngine.generateFingering(tune.notes);
        }

        // Determine number of rows needed
        const numRows = this.noteLayout.length > 0
            ? this.noteLayout[this.noteLayout.length - 1].row + 1
            : 1;

        // Set canvas height based on number of rows and whether grand staff is used
        const rowSpacing = this.usesBassClef ? this.grandStaffRowSpacing : this.rowSpacing;
        const requiredHeight = this.firstRowTop + numRows * rowSpacing + 20;
        this.canvas.height = Math.max(200, requiredHeight);

        this.clear();

        // Draw title
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(tune.title, this.canvas.width / 2, 25);

        // Draw hand position info below title
        if (typeof fingeringEngine !== 'undefined') {
            const positionSummary = fingeringEngine.getPositionSummary(tune.notes);
            this.ctx.fillStyle = '#666';
            this.ctx.font = 'italic 11px sans-serif';
            this.ctx.fillText(positionSummary, this.canvas.width / 2, 42);
        }

        // Draw each row
        for (let row = 0; row < numRows; row++) {
            this.drawStaffRow(row);
            this.drawClef(row);

            // Draw time signature only on first row
            if (row === 0) {
                const staffTop = this.getRowTop(0);
                this.ctx.fillStyle = '#333';
                this.ctx.font = 'bold 20px serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(tune.timeSignature[0], this.leftMargin + 15, staffTop + this.staffLineSpacing);
                this.ctx.fillText(tune.timeSignature[1], this.leftMargin + 15, staffTop + 3 * this.staffLineSpacing);
            }
        }

        // Draw all notes and finger numbers
        this.noteLayout.forEach((noteInfo, index) => {
            this.drawNote(noteInfo, currentNoteIndex);

            // Draw finger number if available
            if (this.fingeringData && this.fingeringData[index]) {
                this.drawFingerNumber(noteInfo, this.fingeringData[index], currentNoteIndex);
            }
        });

        // Draw playhead at current note position
        if (currentNoteIndex >= 0 && currentNoteIndex < this.noteLayout.length) {
            const currentNote = this.noteLayout[currentNoteIndex];
            this.drawPlayhead(currentNote.x, currentNote.row);
        }

        // Reset text alignment
        this.ctx.textAlign = 'left';

        // Draw keyboard overlay if hovering over a note in position mode
        if (this.showPositionMode && this.hoveredNoteIndex >= 0 && this.hoveredNoteIndex < this.noteLayout.length) {
            const hoveredNote = this.noteLayout[this.hoveredNoteIndex];
            const fingerInfo = this.fingeringData[this.hoveredNoteIndex];

            if (fingerInfo && hoveredNote.note.pitch !== 'R') {
                // Get Y position for overlay positioning
                let noteY;
                if (this.isChord(hoveredNote.note)) {
                    const yPositions = hoveredNote.note.notes.map(n =>
                        this.getNoteY(n.pitch, n.octave, hoveredNote.row)
                    );
                    noteY = Math.min(...yPositions);
                } else {
                    noteY = this.getNoteY(hoveredNote.note.pitch, hoveredNote.note.octave, hoveredNote.row);
                }

                this.drawKeyboardOverlay(fingerInfo, hoveredNote.x, noteY);
            }
        }
    }

    /**
     * Get the layout info for a specific note index
     */
    getNoteLayout(noteIndex) {
        if (noteIndex >= 0 && noteIndex < this.noteLayout.length) {
            return this.noteLayout[noteIndex];
        }
        return null;
    }
}

// Create global instance
let scoreRenderer;
document.addEventListener('DOMContentLoaded', () => {
    scoreRenderer = new ScoreRenderer('score-canvas');
});
