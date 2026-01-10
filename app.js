/**
 * Main application module
 * Handles UI interactions and coordinates all components
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tuneSelect = document.getElementById('tune-select');
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const tempoSlider = document.getElementById('tempo-slider');
    const tempoValue = document.getElementById('tempo-value');
    const progressFill = document.getElementById('progress-fill');
    const timeDisplay = document.getElementById('time-display');
    const tuneTitle = document.getElementById('tune-title');
    const tuneComposer = document.getElementById('tune-composer');
    const positionModeToggle = document.getElementById('position-mode-toggle');
    const positionLegend = document.getElementById('position-legend');

    /**
     * Format time in MM:SS format
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Populate tune selector with available tunes
     */
    function populateTuneSelector() {
        TUNES.forEach(tune => {
            const option = document.createElement('option');
            option.value = tune.id;
            option.textContent = tune.title;
            tuneSelect.appendChild(option);
        });
    }

    /**
     * Get tune by ID
     */
    function getTuneById(id) {
        return TUNES.find(tune => tune.id === id);
    }

    /**
     * Update UI for tune info
     */
    function updateTuneInfo(tune) {
        if (tune) {
            tuneTitle.textContent = tune.title;
            tuneComposer.textContent = `Composed by: ${tune.composer}`;

            // Update tempo slider to tune's default tempo
            tempoSlider.value = tune.defaultTempo;
            tempoValue.textContent = tune.defaultTempo;
            tunePlayer.setTempo(tune.defaultTempo);
        } else {
            tuneTitle.textContent = '';
            tuneComposer.textContent = '';
        }
    }

    /**
     * Update control button states
     */
    function updateControls() {
        const isPlaying = tunePlayer.getIsPlaying();
        const isPaused = tunePlayer.getIsPaused();

        playBtn.disabled = isPlaying && !isPaused;
        pauseBtn.disabled = !isPlaying || isPaused;
        stopBtn.disabled = !isPlaying && !isPaused;

        // Update play button icon based on state
        if (isPaused) {
            playBtn.querySelector('.icon').textContent = '▶';
        } else if (isPlaying) {
            playBtn.querySelector('.icon').textContent = '▶';
        } else {
            playBtn.querySelector('.icon').textContent = '▶';
        }

        // Add/remove playing class for animation
        if (isPlaying && !isPaused) {
            playBtn.classList.add('playing');
        } else {
            playBtn.classList.remove('playing');
        }
    }

    /**
     * Handle tune selection change
     */
    function onTuneSelect() {
        const selectedId = tuneSelect.value;
        const tune = getTuneById(selectedId);

        if (tune) {
            tunePlayer.setTune(tune);
            updateTuneInfo(tune);

            // Update time display
            const totalDuration = tunePlayer.getTotalDuration();
            timeDisplay.textContent = `0:00 / ${formatTime(totalDuration)}`;
            progressFill.style.width = '0%';
        }

        updateControls();
    }

    /**
     * Handle play button click
     */
    async function onPlay() {
        await tunePlayer.play();
        updateControls();
    }

    /**
     * Handle pause button click
     */
    function onPause() {
        tunePlayer.pause();
        updateControls();
    }

    /**
     * Handle stop button click
     */
    function onStop() {
        tunePlayer.stop();
        updateControls();

        // Reset progress
        progressFill.style.width = '0%';
        const totalDuration = tunePlayer.getTotalDuration();
        timeDisplay.textContent = `0:00 / ${formatTime(totalDuration)}`;
    }

    /**
     * Handle tempo slider change
     */
    function onTempoChange() {
        const tempo = parseInt(tempoSlider.value, 10);
        tempoValue.textContent = tempo;
        tunePlayer.setTempo(tempo);
    }

    /**
     * Handle position mode toggle
     */
    function onPositionModeToggle() {
        const enabled = positionModeToggle.checked;

        // Show/hide the legend
        if (enabled) {
            positionLegend.classList.remove('hidden');
        } else {
            positionLegend.classList.add('hidden');
        }

        // Update score renderer
        if (scoreRenderer) {
            scoreRenderer.setPositionMode(enabled);
        }
    }

    /**
     * Handle playback progress update
     */
    function onProgressUpdate(progress, elapsed, total) {
        progressFill.style.width = `${progress * 100}%`;
        timeDisplay.textContent = `${formatTime(elapsed)} / ${formatTime(total)}`;
    }

    /**
     * Handle playback end
     */
    function onPlaybackEnd() {
        updateControls();
        progressFill.style.width = '100%';

        // Reset after a short delay
        setTimeout(() => {
            progressFill.style.width = '0%';
            const totalDuration = tunePlayer.getTotalDuration();
            timeDisplay.textContent = `0:00 / ${formatTime(totalDuration)}`;
        }, 1000);
    }

    /**
     * Initialize the application
     */
    function init() {
        // Populate tune selector
        populateTuneSelector();

        // Set up event listeners
        tuneSelect.addEventListener('change', onTuneSelect);
        playBtn.addEventListener('click', onPlay);
        pauseBtn.addEventListener('click', onPause);
        stopBtn.addEventListener('click', onStop);
        tempoSlider.addEventListener('input', onTempoChange);
        positionModeToggle.addEventListener('change', onPositionModeToggle);

        // Set up player callbacks
        tunePlayer.onProgressUpdate = onProgressUpdate;
        tunePlayer.onPlaybackEnd = onPlaybackEnd;

        // Select first tune by default
        if (TUNES.length > 0) {
            tuneSelect.value = TUNES[0].id;
            onTuneSelect();
        }

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (tunePlayer.getIsPlaying() && !tunePlayer.getIsPaused()) {
                    onPause();
                } else {
                    onPlay();
                }
            } else if (e.code === 'Escape') {
                onStop();
            }
        });

        // Handle window resize for canvas
        window.addEventListener('resize', () => {
            if (scoreRenderer && tunePlayer.currentTune) {
                scoreRenderer.render(
                    tunePlayer.currentTune,
                    tunePlayer.getCurrentNoteIndex()
                );
            }
        });
    }

    // Start the application
    init();
});
