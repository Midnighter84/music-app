/**
 * Score renderer module
 * Draws musical notation on a canvas element with multiple rows
 */

class ScoreRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Layout settings
        this.staffLineSpacing = 12;
        this.staffHeight = 4 * this.staffLineSpacing; // 5 lines = 4 gaps
        this.rowSpacing = 100; // Space between staff systems
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

        // Fingering data
        this.fingeringData = [];

        // Note position mapping (relative to middle line, in staff line units)
        // Treble clef: Lines are E4, G4, B4, D5, F5 (bottom to top)
        // Spaces are F4, A4, C5, E5 (bottom to top)
        // Middle C (C4) is on first ledger line below staff
        this.notePositions = {
            'C3': 6.5, 'D3': 6, 'E3': 5.5, 'F3': 5, 'G3': 4.5, 'A3': 4, 'B3': 3.5,
            'C4': 3, 'D4': 2.5, 'E4': 2, 'F4': 1.5, 'G4': 1, 'A4': 0.5, 'B4': 0,
            'C5': -0.5, 'D5': -1, 'E5': -1.5, 'F5': -2, 'G5': -2.5, 'A5': -3, 'B5': -3.5,
            'C6': -4
        };

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
     * Get the top Y position for a specific row
     */
    getRowTop(rowIndex) {
        return this.firstRowTop + rowIndex * this.rowSpacing;
    }

    /**
     * Draw staff lines for a specific row
     */
    drawStaffRow(rowIndex) {
        const staffTop = this.getRowTop(rowIndex);

        this.ctx.strokeStyle = this.colors.staff;
        this.ctx.lineWidth = 1;

        // Draw 5 staff lines
        for (let i = 0; i < 5; i++) {
            const y = staffTop + i * this.staffLineSpacing;
            this.ctx.beginPath();
            this.ctx.moveTo(this.leftMargin - 30, y);
            this.ctx.lineTo(this.canvas.width - this.rightMargin, y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw the treble clef for a specific row
     */
    drawClef(rowIndex) {
        const staffTop = this.getRowTop(rowIndex);

        this.ctx.fillStyle = this.colors.clef;
        this.ctx.font = 'bold 70px serif';
        this.ctx.textBaseline = 'middle';

        // Unicode treble clef character
        const clefY = staffTop + 2 * this.staffLineSpacing;
        this.ctx.fillText('𝄞', this.leftMargin - 25, clefY + 5);
    }

    /**
     * Get Y position for a note on the staff (relative to a row)
     */
    getNoteY(pitch, octave, rowIndex) {
        const staffTop = this.getRowTop(rowIndex);

        // Remove sharps/flats for position calculation
        const basePitch = pitch.replace('#', '').replace('b', '');
        const key = `${basePitch}${octave}`;

        const position = this.notePositions[key];
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
     * Draw a single note
     */
    drawNote(noteInfo, currentNoteIndex) {
        const { note, index, row, x } = noteInfo;

        if (note.pitch === 'R') {
            this.drawRest(x, note.duration, index, row, currentNoteIndex);
            return;
        }

        const y = this.getNoteY(note.pitch, note.octave, row);

        // Determine note color based on playback state
        let fillColor = this.colors.notes;
        if (index === currentNoteIndex) {
            fillColor = this.colors.currentNote;
        } else if (index < currentNoteIndex) {
            fillColor = this.colors.playedNote;
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = fillColor;

        // Draw ledger lines if needed
        this.drawLedgerLines(x, y, row);

        // Draw note head (oval)
        this.ctx.beginPath();
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(1, 0.75);

        const noteRadius = note.duration >= 2 ? 8 : 7;

        if (note.duration >= 2) {
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

        // Draw stem for notes shorter than whole note
        const staffTop = this.getRowTop(row);
        if (note.duration < 4) {
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            const stemDirection = y > staffTop + 2 * this.staffLineSpacing ? -1 : 1;
            this.ctx.moveTo(x + (stemDirection === -1 ? 7 : -7), y);
            this.ctx.lineTo(x + (stemDirection === -1 ? 7 : -7), y + stemDirection * 35);
            this.ctx.stroke();

            // Draw flag for eighth notes and shorter
            if (note.duration <= 0.5) {
                this.drawFlag(x + (stemDirection === -1 ? 7 : -7), y + stemDirection * 35, stemDirection);
            }
        }

        // Draw sharp or flat if needed
        if (note.pitch.includes('#')) {
            this.ctx.font = '16px serif';
            this.ctx.fillText('♯', x - 20, y + 5);
        } else if (note.pitch.includes('b')) {
            this.ctx.font = '16px serif';
            this.ctx.fillText('♭', x - 18, y + 5);
        }

        // Draw dot for dotted notes
        if (note.duration === 1.5 || note.duration === 0.75 || note.duration === 3) {
            this.ctx.beginPath();
            this.ctx.arc(x + 15, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * Draw ledger lines for notes above or below the staff
     */
    drawLedgerLines(x, y, rowIndex) {
        const staffTop = this.getRowTop(rowIndex);
        const staffBottom = staffTop + 4 * this.staffLineSpacing;

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

        this.ctx.strokeStyle = this.colors.playhead;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, staffTop - 15);
        this.ctx.lineTo(x, staffTop + 4 * this.staffLineSpacing + 15);
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
     * Draw finger number below a note
     */
    drawFingerNumber(noteInfo, fingerInfo, currentNoteIndex) {
        if (!fingerInfo || !fingerInfo.showFinger || fingerInfo.finger === null) {
            return;
        }

        const { note, index, row, x } = noteInfo;

        // Get the note's Y position
        const noteY = this.getNoteY(note.pitch, note.octave, row);

        // Position finger number below the note head
        const fingerY = noteY + 18;

        // Determine color based on playback state
        let color = this.colors.fingering;
        if (index === currentNoteIndex) {
            color = this.colors.fingeringActive;
        }

        // Draw finger number in a small circle for clarity
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(fingerInfo.finger.toString(), x, fingerY);
    }

    /**
     * Render the entire score
     */
    render(tune, currentNoteIndex = -1) {
        this.currentNoteIndex = currentNoteIndex;
        this.currentTune = tune;

        if (!tune || !tune.notes || tune.notes.length === 0) {
            this.canvas.height = 200;
            this.clear();
            this.drawStaffRow(0);
            this.drawClef(0);
            return;
        }

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

        // Set canvas height based on number of rows
        const requiredHeight = this.firstRowTop + numRows * this.rowSpacing + 20;
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
