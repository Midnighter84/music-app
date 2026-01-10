/**
 * Player module
 * Coordinates audio playback with score visualization
 */

class TunePlayer {
    constructor() {
        this.currentTune = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.tempo = 120;

        // Playback tracking
        this.scheduledNotes = [];
        this.playbackStartTime = 0;
        this.pausedTime = 0;
        this.currentNoteIndex = -1;
        this.animationFrameId = null;

        // Callbacks
        this.onNoteChange = null;
        this.onPlaybackEnd = null;
        this.onProgressUpdate = null;
    }

    /**
     * Set the current tune to play
     */
    setTune(tune) {
        this.stop();
        this.currentTune = tune;
        this.currentNoteIndex = -1;

        if (tune && tune.defaultTempo) {
            this.tempo = tune.defaultTempo;
        }

        // Initial render
        if (scoreRenderer) {
            scoreRenderer.render(tune, -1);
        }

        // Initialize live keyboard with tune positions
        if (liveKeyboard) {
            liveKeyboard.updateFromTune(tune);
        }
    }

    /**
     * Set playback tempo
     */
    setTempo(bpm) {
        this.tempo = Math.max(40, Math.min(200, bpm));
    }

    /**
     * Calculate total duration of current tune in seconds
     */
    getTotalDuration() {
        if (!this.currentTune || !this.currentTune.notes) return 0;

        const beatsPerSecond = this.tempo / 60;
        let totalBeats = 0;
        this.currentTune.notes.forEach(note => {
            totalBeats += note.duration;
        });
        return totalBeats / beatsPerSecond;
    }

    /**
     * Start playback
     */
    async play() {
        if (!this.currentTune || !this.currentTune.notes) return;

        // Initialize audio if needed
        audioEngine.init();
        await audioEngine.resume();

        if (this.isPaused) {
            // Resume from paused position
            this.resumePlayback();
        } else {
            // Start fresh playback
            this.startPlayback();
        }
    }

    /**
     * Start fresh playback from the beginning
     */
    startPlayback() {
        this.isPlaying = true;
        this.isPaused = false;
        this.currentNoteIndex = 0;

        // Schedule all notes
        const result = audioEngine.scheduleNotes(
            this.currentTune.notes,
            this.tempo
        );

        this.scheduledNotes = result.scheduledNotes;
        this.playbackStartTime = result.startTime;

        // Start animation loop
        this.startAnimationLoop();
    }

    /**
     * Resume playback from paused position
     */
    resumePlayback() {
        // Re-initialize audio context (it may have been stopped)
        audioEngine.init();

        const beatsPerSecond = this.tempo / 60;
        const currentTime = audioEngine.getCurrentTime();

        // Find remaining notes and schedule them
        const remainingNotes = this.currentTune.notes.slice(this.currentNoteIndex);

        if (remainingNotes.length === 0) {
            this.stop();
            return;
        }

        const result = audioEngine.scheduleNotes(remainingNotes, this.tempo);

        // Adjust scheduled notes indices
        this.scheduledNotes = result.scheduledNotes.map(sn => ({
            ...sn,
            index: sn.index + this.currentNoteIndex
        }));

        this.playbackStartTime = result.startTime;
        this.isPlaying = true;
        this.isPaused = false;

        this.startAnimationLoop();
    }

    /**
     * Start the animation loop for visual updates
     */
    startAnimationLoop() {
        const animate = () => {
            if (!this.isPlaying) return;

            const currentTime = audioEngine.getCurrentTime();

            // Find current note based on time
            let newNoteIndex = this.currentNoteIndex;
            for (let i = 0; i < this.scheduledNotes.length; i++) {
                const sn = this.scheduledNotes[i];
                if (currentTime >= sn.startTime && currentTime < sn.endTime) {
                    newNoteIndex = sn.index;
                    break;
                } else if (currentTime >= sn.endTime && i === this.scheduledNotes.length - 1) {
                    // Past the last note
                    newNoteIndex = sn.index;
                }
            }

            // Update current note if changed
            if (newNoteIndex !== this.currentNoteIndex) {
                this.currentNoteIndex = newNoteIndex;
                if (this.onNoteChange) {
                    this.onNoteChange(this.currentNoteIndex);
                }

                // Update live keyboard
                this.updateLiveKeyboard();
            }

            // Calculate progress
            const totalDuration = this.getTotalDuration();
            let elapsed = 0;
            if (this.scheduledNotes.length > 0) {
                elapsed = currentTime - this.playbackStartTime;
            }
            const progress = Math.min(1, elapsed / totalDuration);

            // Update progress callback
            if (this.onProgressUpdate) {
                this.onProgressUpdate(progress, elapsed, totalDuration);
            }

            // Update score visualization
            if (scoreRenderer) {
                scoreRenderer.render(this.currentTune, this.currentNoteIndex, progress);
            }

            // Check if playback is complete
            const lastNote = this.scheduledNotes[this.scheduledNotes.length - 1];
            if (lastNote && currentTime > lastNote.endTime + 0.5) {
                this.stop();
                if (this.onPlaybackEnd) {
                    this.onPlaybackEnd();
                }
                return;
            }

            this.animationFrameId = requestAnimationFrame(animate);
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * Pause playback
     */
    pause() {
        if (!this.isPlaying || this.isPaused) return;

        this.isPlaying = false;
        this.isPaused = true;

        // Stop animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Stop audio (we'll re-schedule on resume)
        audioEngine.stop();

        // Keep track of where we paused
        this.pausedTime = audioEngine.getCurrentTime();
    }

    /**
     * Stop playback completely
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentNoteIndex = -1;
        this.scheduledNotes = [];

        // Stop animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Stop audio
        audioEngine.stop();

        // Reset score visualization
        if (scoreRenderer && this.currentTune) {
            scoreRenderer.render(this.currentTune, -1);
        }

        // Clear pressed keys but keep positions visible
        if (liveKeyboard) {
            liveKeyboard.clearPressedKeys();
        }

        // Update progress
        if (this.onProgressUpdate) {
            this.onProgressUpdate(0, 0, this.getTotalDuration());
        }
    }

    /**
     * Check if currently playing
     */
    getIsPlaying() {
        return this.isPlaying;
    }

    /**
     * Check if paused
     */
    getIsPaused() {
        return this.isPaused;
    }

    /**
     * Get current note index
     */
    getCurrentNoteIndex() {
        return this.currentNoteIndex;
    }

    /**
     * Update the live keyboard display
     */
    updateLiveKeyboard() {
        if (!liveKeyboard || !this.currentTune) return;

        const noteIndex = this.currentNoteIndex;
        if (noteIndex < 0 || noteIndex >= this.currentTune.notes.length) {
            liveKeyboard.clear();
            return;
        }

        const note = this.currentTune.notes[noteIndex];

        // Get fingering data for this note
        if (typeof fingeringEngine !== 'undefined') {
            const fingeringData = fingeringEngine.generateFingering(this.currentTune.notes);
            const fingerInfo = fingeringData[noteIndex];

            if (fingerInfo) {
                liveKeyboard.updateFromFingeringInfo(fingerInfo, note);
            } else {
                liveKeyboard.clear();
            }
        } else {
            liveKeyboard.clear();
        }
    }
}

// Create global instance
const tunePlayer = new TunePlayer();
