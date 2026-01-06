/**
 * Score renderer module
 * Draws musical notation on a canvas element
 */

class ScoreRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Layout settings
        this.staffLineSpacing = 12;
        this.staffTop = 80;
        this.noteSpacing = 50;
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
            background: '#fafafa'
        };

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
        this.scrollOffset = 0;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = 200;
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw the staff lines
     */
    drawStaff() {
        this.ctx.strokeStyle = this.colors.staff;
        this.ctx.lineWidth = 1;

        // Draw 5 staff lines
        for (let i = 0; i < 5; i++) {
            const y = this.staffTop + i * this.staffLineSpacing;
            this.ctx.beginPath();
            this.ctx.moveTo(this.leftMargin - 30, y);
            this.ctx.lineTo(this.canvas.width - this.rightMargin, y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw the treble clef
     */
    drawClef() {
        this.ctx.fillStyle = this.colors.clef;
        this.ctx.font = 'bold 70px serif';
        this.ctx.textBaseline = 'middle';

        // Unicode treble clef character
        const clefY = this.staffTop + 2 * this.staffLineSpacing;
        this.ctx.fillText('𝄞', this.leftMargin - 25, clefY + 5);
    }

    /**
     * Get Y position for a note on the staff
     */
    getNoteY(pitch, octave) {
        // Remove sharps/flats for position calculation
        const basePitch = pitch.replace('#', '').replace('b', '');
        const key = `${basePitch}${octave}`;

        const position = this.notePositions[key];
        if (position === undefined) {
            // Default to middle line if note not found
            return this.staffTop + 2 * this.staffLineSpacing;
        }

        return this.staffTop + 2 * this.staffLineSpacing + position * this.staffLineSpacing;
    }

    /**
     * Draw a single note
     */
    drawNote(note, x, noteIndex) {
        if (note.pitch === 'R') {
            // Draw rest
            this.drawRest(x, note.duration, noteIndex);
            return;
        }

        const y = this.getNoteY(note.pitch, note.octave);

        // Determine note color based on playback state
        let fillColor = this.colors.notes;
        if (noteIndex === this.currentNoteIndex) {
            fillColor = this.colors.currentNote;
        } else if (noteIndex < this.currentNoteIndex) {
            fillColor = this.colors.playedNote;
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = fillColor;

        // Draw ledger lines if needed
        this.drawLedgerLines(x, y);

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
        if (note.duration < 4) {
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            const stemDirection = y > this.staffTop + 2 * this.staffLineSpacing ? -1 : 1;
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
    drawLedgerLines(x, y) {
        const staffBottom = this.staffTop + 4 * this.staffLineSpacing;

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
        if (y < this.staffTop) {
            let ledgerY = this.staffTop - this.staffLineSpacing;
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
    drawRest(x, duration, noteIndex) {
        const y = this.staffTop + 2 * this.staffLineSpacing;

        let fillColor = this.colors.notes;
        if (noteIndex === this.currentNoteIndex) {
            fillColor = this.colors.currentNote;
        } else if (noteIndex < this.currentNoteIndex) {
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
     * Draw the playhead indicator
     */
    drawPlayhead(x) {
        if (x < this.leftMargin || x > this.canvas.width - this.rightMargin) return;

        this.ctx.strokeStyle = this.colors.playhead;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, this.staffTop - 20);
        this.ctx.lineTo(x, this.staffTop + 4 * this.staffLineSpacing + 20);
        this.ctx.stroke();

        // Draw triangle at top
        this.ctx.fillStyle = this.colors.playhead;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 8, this.staffTop - 20);
        this.ctx.lineTo(x + 8, this.staffTop - 20);
        this.ctx.lineTo(x, this.staffTop - 10);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Calculate note X positions
     */
    calculateNotePositions(notes) {
        const positions = [];
        let x = this.leftMargin + 40;

        notes.forEach((note, index) => {
            positions.push({
                x,
                note,
                index
            });
            x += this.noteSpacing * Math.max(0.5, note.duration);
        });

        return positions;
    }

    /**
     * Render the entire score
     */
    render(tune, currentNoteIndex = -1, progress = 0) {
        this.currentNoteIndex = currentNoteIndex;
        this.clear();

        if (!tune || !tune.notes || tune.notes.length === 0) {
            this.drawStaff();
            this.drawClef();
            return;
        }

        // Calculate all note positions
        const notePositions = this.calculateNotePositions(tune.notes);
        const totalWidth = notePositions[notePositions.length - 1].x + 50;
        const visibleWidth = this.canvas.width - this.leftMargin - this.rightMargin;

        // Calculate scroll offset to keep current note visible
        if (currentNoteIndex >= 0 && currentNoteIndex < notePositions.length) {
            const currentNoteX = notePositions[currentNoteIndex].x;
            const targetScrollPosition = currentNoteX - visibleWidth / 2;
            this.scrollOffset = Math.max(0, Math.min(targetScrollPosition, totalWidth - visibleWidth));
        }

        // Draw staff and clef
        this.drawStaff();
        this.drawClef();

        // Draw notes with scroll offset
        this.ctx.save();

        notePositions.forEach(pos => {
            const adjustedX = pos.x - this.scrollOffset;
            if (adjustedX > this.leftMargin - 20 && adjustedX < this.canvas.width - this.rightMargin + 20) {
                this.drawNote(pos.note, adjustedX, pos.index);
            }
        });

        // Draw playhead at current position
        if (currentNoteIndex >= 0 && currentNoteIndex < notePositions.length) {
            const playheadX = notePositions[currentNoteIndex].x - this.scrollOffset;
            this.drawPlayhead(playheadX);
        }

        this.ctx.restore();

        // Draw title
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(tune.title, this.canvas.width / 2, 25);

        // Draw time signature
        this.ctx.font = 'bold 20px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(tune.timeSignature[0], this.leftMargin + 15, this.staffTop + this.staffLineSpacing);
        this.ctx.fillText(tune.timeSignature[1], this.leftMargin + 15, this.staffTop + 3 * this.staffLineSpacing);
    }

    /**
     * Get the X position for a specific note index
     */
    getNoteXPosition(notes, noteIndex) {
        if (!notes || noteIndex < 0 || noteIndex >= notes.length) return this.leftMargin;

        let x = this.leftMargin + 40;
        for (let i = 0; i < noteIndex; i++) {
            x += this.noteSpacing * Math.max(0.5, notes[i].duration);
        }
        return x - this.scrollOffset;
    }
}

// Create global instance
let scoreRenderer;
document.addEventListener('DOMContentLoaded', () => {
    scoreRenderer = new ScoreRenderer('score-canvas');
});
