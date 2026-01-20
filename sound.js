/* ============================================
   SOUND SYSTEM
   Web Audio API based sound effects
============================================ */

class SoundSystem {
	constructor() {
		this.audioContext = null;
		this.enabled = true;
		this.volume = 0.3;
		this.sounds = {};
	}

	init() {
		try {
			this.audioContext = new (
				window.AudioContext || window.webkitAudioContext
			)();
		} catch (e) {
			console.warn("Web Audio API not supported");
			this.enabled = false;
		}
	}

	resume() {
		if (this.audioContext && this.audioContext.state === "suspended") {
			this.audioContext.resume();
		}
	}

	// Generate sound effects programmatically
	play(soundName) {
		if (!this.enabled || !this.audioContext) return;

		this.resume();

		switch (soundName) {
			case "shoot":
				this.playShoot();
				break;
			case "explosion":
				this.playExplosion();
				break;
			case "bomb":
				this.playBomb();
				break;
			case "powerup":
				this.playPowerup();
				break;
			case "hit":
				this.playHit();
				break;
			case "levelup":
				this.playLevelUp();
				break;
			case "gameover":
				this.playGameOver();
				break;
			case "boss":
				this.playBossAlert();
				break;
		}
	}

	playShoot() {
		const osc = this.audioContext.createOscillator();
		const gain = this.audioContext.createGain();

		osc.connect(gain);
		gain.connect(this.audioContext.destination);

		osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
		osc.frequency.exponentialRampToValueAtTime(
			200,
			this.audioContext.currentTime + 0.1,
		);

		gain.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(
			0.01,
			this.audioContext.currentTime + 0.1,
		);

		osc.start();
		osc.stop(this.audioContext.currentTime + 0.1);
	}

	playExplosion() {
		const bufferSize = this.audioContext.sampleRate * 0.3;
		const buffer = this.audioContext.createBuffer(
			1,
			bufferSize,
			this.audioContext.sampleRate,
		);
		const data = buffer.getChannelData(0);

		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
		}

		const source = this.audioContext.createBufferSource();
		const gain = this.audioContext.createGain();
		const filter = this.audioContext.createBiquadFilter();

		source.buffer = buffer;
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
		filter.frequency.exponentialRampToValueAtTime(
			100,
			this.audioContext.currentTime + 0.3,
		);

		source.connect(filter);
		filter.connect(gain);
		gain.connect(this.audioContext.destination);

		gain.gain.setValueAtTime(this.volume * 0.5, this.audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(
			0.01,
			this.audioContext.currentTime + 0.3,
		);

		source.start();
	}

	playBomb() {
		// Low rumble
		const osc = this.audioContext.createOscillator();
		const gain = this.audioContext.createGain();

		osc.type = "sawtooth";
		osc.connect(gain);
		gain.connect(this.audioContext.destination);

		osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
		osc.frequency.exponentialRampToValueAtTime(
			20,
			this.audioContext.currentTime + 0.5,
		);

		gain.gain.setValueAtTime(this.volume * 0.6, this.audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(
			0.01,
			this.audioContext.currentTime + 0.5,
		);

		osc.start();
		osc.stop(this.audioContext.currentTime + 0.5);

		// Add noise
		this.playExplosion();
	}

	playPowerup() {
		const osc = this.audioContext.createOscillator();
		const gain = this.audioContext.createGain();

		osc.type = "sine";
		osc.connect(gain);
		gain.connect(this.audioContext.destination);

		const now = this.audioContext.currentTime;
		osc.frequency.setValueAtTime(400, now);
		osc.frequency.setValueAtTime(500, now + 0.1);
		osc.frequency.setValueAtTime(600, now + 0.2);
		osc.frequency.setValueAtTime(800, now + 0.3);

		gain.gain.setValueAtTime(this.volume * 0.3, now);
		gain.gain.setValueAtTime(this.volume * 0.3, now + 0.3);
		gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

		osc.start();
		osc.stop(now + 0.4);
	}

	playHit() {
		const osc = this.audioContext.createOscillator();
		const gain = this.audioContext.createGain();

		osc.type = "square";
		osc.connect(gain);
		gain.connect(this.audioContext.destination);

		osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
		osc.frequency.exponentialRampToValueAtTime(
			50,
			this.audioContext.currentTime + 0.2,
		);

		gain.gain.setValueAtTime(this.volume * 0.4, this.audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(
			0.01,
			this.audioContext.currentTime + 0.2,
		);

		osc.start();
		osc.stop(this.audioContext.currentTime + 0.2);
	}

	playLevelUp() {
		const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

		notes.forEach((freq, index) => {
			const osc = this.audioContext.createOscillator();
			const gain = this.audioContext.createGain();

			osc.type = "sine";
			osc.connect(gain);
			gain.connect(this.audioContext.destination);

			const startTime = this.audioContext.currentTime + index * 0.15;

			osc.frequency.setValueAtTime(freq, startTime);
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.05);
			gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

			osc.start(startTime);
			osc.stop(startTime + 0.3);
		});
	}

	playGameOver() {
		const notes = [392, 349.23, 329.63, 293.66]; // G4, F4, E4, D4

		notes.forEach((freq, index) => {
			const osc = this.audioContext.createOscillator();
			const gain = this.audioContext.createGain();

			osc.type = "sawtooth";
			osc.connect(gain);
			gain.connect(this.audioContext.destination);

			const startTime = this.audioContext.currentTime + index * 0.3;

			osc.frequency.setValueAtTime(freq, startTime);
			gain.gain.setValueAtTime(this.volume * 0.3, startTime);
			gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

			osc.start(startTime);
			osc.stop(startTime + 0.4);
		});
	}

	playBossAlert() {
		for (let i = 0; i < 3; i++) {
			const osc = this.audioContext.createOscillator();
			const gain = this.audioContext.createGain();

			osc.type = "square";
			osc.connect(gain);
			gain.connect(this.audioContext.destination);

			const startTime = this.audioContext.currentTime + i * 0.3;

			osc.frequency.setValueAtTime(440, startTime);
			osc.frequency.setValueAtTime(880, startTime + 0.1);

			gain.gain.setValueAtTime(this.volume * 0.3, startTime);
			gain.gain.setValueAtTime(this.volume * 0.3, startTime + 0.2);
			gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

			osc.start(startTime);
			osc.stop(startTime + 0.25);
		}
	}

	toggle() {
		this.enabled = !this.enabled;
		return this.enabled;
	}

	setVolume(vol) {
		this.volume = Math.max(0, Math.min(1, vol));
	}
}

// Global sound instance
window.SoundFX = new SoundSystem();
