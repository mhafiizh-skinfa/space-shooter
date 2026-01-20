/* ============================================
   SPACE SHOOTER - COMPLETE GAME LOGIC
   With Boss Battles, Levels, and All Features
   UPDATED: Auto-fire saat mengepal
============================================ */

class SpaceShooterGame {
	constructor() {
		// Canvas
		this.canvas = document.getElementById("game-canvas");
		this.ctx = this.canvas.getContext("2d");
		this.previewCanvas = document.getElementById("preview-canvas");

		// Systems
		this.handTracker = new HandTracker();
		this.useKeyboard = false;
		this.keyboardState = { left: false, right: false, up: false, down: false };

		// Game state
		this.isRunning = false;
		this.isPaused = false;
		this.score = 0;
		this.lives = 3;
		this.bombs = 3;
		this.combo = 0;
		this.maxCombo = 0;
		this.enemiesKilled = 0;
		this.bossesKilled = 0;
		this.shotsFired = 0;
		this.shotsHit = 0;
		this.level = 1;
		this.highScore = this.loadHighScore();

		// Game objects
		this.player = null;
		this.bullets = [];
		this.enemies = [];
		this.particles = [];
		this.stars = [];
		this.powerUps = [];
		this.boss = null;
		this.enemyBullets = [];

		// Timing
		this.lastTime = 0;
		this.enemySpawnTimer = 0;
		this.enemySpawnInterval = 2000;
		this.shootCooldown = 0;
		this.shootCooldownTime = 250;

		// === NEW:  Auto-fire settings ===
		this.autoFireEnabled = false; // Status auto-fire aktif
		this.autoFireCooldown = 180; // Cooldown untuk auto-fire (ms) - lebih cepat!

		// Level system
		this.levelKillTarget = 15;
		this.levelKillCount = 0;
		this.isBossActive = false;

		// Screens
		this.screens = {
			start: document.getElementById("start-screen"),
			loading: document.getElementById("loading-screen"),
			game: document.getElementById("game-screen"),
			gameover: document.getElementById("gameover-screen"),
		};

		// Bind gameLoop
		this.gameLoop = this.gameLoop.bind(this);

		// Init
		this.setupEventListeners();
		this.resizeCanvas();
		this.updateHighScoreDisplay();

		window.addEventListener("resize", () => this.resizeCanvas());

		// Init sound
		if (window.SoundFX) {
			window.SoundFX.init();
		}

		console.log("🚀 Space Shooter initialized!");
	}

	/* ----------------------------------------
       SETUP EVENT LISTENERS
    ---------------------------------------- */
	setupEventListeners() {
		// Start buttons
		document.getElementById("start-btn").addEventListener("click", () => {
			console.log("Start button clicked - Camera mode");
			this.startGame(false);
		});

		document
			.getElementById("start-keyboard-btn")
			.addEventListener("click", () => {
				console.log("Start button clicked - Keyboard mode");
				this.startGame(true);
			});

		document.getElementById("restart-btn").addEventListener("click", () => {
			this.startGame(this.useKeyboard);
		});

		document.getElementById("menu-btn").addEventListener("click", () => {
			this.stopCamera();
			this.showScreen("start");
		});

		// Pause
		const pauseBtn = document.getElementById("pause-btn");
		if (pauseBtn) {
			pauseBtn.addEventListener("click", () => this.togglePause());
		}

		document
			.getElementById("resume-btn")
			.addEventListener("click", () => this.togglePause());
		document.getElementById("quit-btn").addEventListener("click", () => {
			this.isRunning = false;
			this.stopCamera();
			this.showScreen("start");
		});

		// Keyboard
		document.addEventListener("keydown", (e) => this.handleKeyDown(e));
		document.addEventListener("keyup", (e) => this.handleKeyUp(e));

		// Touch (mobile)
		this.canvas.addEventListener("touchstart", (e) => this.handleTouch(e), {
			passive: false,
		});
		this.canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e), {
			passive: false,
		});
	}

	handleKeyDown(e) {
		if (e.code === "Escape" || e.code === "KeyP") {
			if (this.isRunning) this.togglePause();
			return;
		}

		if (!this.isRunning || this.isPaused) return;

		switch (e.code) {
			case "ArrowLeft":
			case "KeyA":
				this.keyboardState.left = true;
				break;
			case "ArrowRight":
			case "KeyD":
				this.keyboardState.right = true;
				break;
			case "ArrowUp":
			case "KeyW":
				this.keyboardState.up = true;
				break;
			case "ArrowDown":
			case "KeyS":
				this.keyboardState.down = true;
				break;
			case "Space":
				e.preventDefault();
				this.shoot();
				break;
			case "KeyB":
				this.useBomb();
				break;
		}
	}

	handleKeyUp(e) {
		switch (e.code) {
			case "ArrowLeft":
			case "KeyA":
				this.keyboardState.left = false;
				break;
			case "ArrowRight":
			case "KeyD":
				this.keyboardState.right = false;
				break;
			case "ArrowUp":
			case "KeyW":
				this.keyboardState.up = false;
				break;
			case "ArrowDown":
			case "KeyS":
				this.keyboardState.down = false;
				break;
		}
	}

	handleTouch(e) {
		e.preventDefault();
		this.shoot();
	}

	handleTouchMove(e) {
		e.preventDefault();
		if (!this.player) return;

		const touch = e.touches[0];
		const rect = this.canvas.getBoundingClientRect();

		this.player.x =
			(touch.clientX - rect.left) * (this.canvas.width / rect.width);
		this.player.y =
			(touch.clientY - rect.top) * (this.canvas.height / rect.height);
	}

	/* ----------------------------------------
       UTILITY METHODS
    ---------------------------------------- */
	resizeCanvas() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.generateStars();
	}

	showScreen(screenName) {
		Object.values(this.screens).forEach((screen) =>
			screen.classList.add("hidden"),
		);
		this.screens[screenName].classList.remove("hidden");
	}

	stopCamera() {
		if (this.handTracker) {
			this.handTracker.stop();
		}
	}

	loadHighScore() {
		return parseInt(localStorage.getItem("spaceShooterHighScore")) || 0;
	}

	saveHighScore(score) {
		if (score > this.highScore) {
			this.highScore = score;
			localStorage.setItem("spaceShooterHighScore", Math.floor(score));
			return true;
		}
		return false;
	}

	updateHighScoreDisplay() {
		const el = document.getElementById("high-score-value");
		if (el) {
			el.textContent = this.highScore.toLocaleString();
		}
	}

	/* ----------------------------------------
       GAME START
    ---------------------------------------- */
	async startGame(keyboardOnly = false) {
		console.log("Starting game...  Keyboard only:", keyboardOnly);
		this.useKeyboard = keyboardOnly;

		if (keyboardOnly) {
			this.initGame();
			return;
		}

		// Camera mode - load hand tracking
		this.showScreen("loading");

		try {
			const video = document.getElementById("webcam");
			await this.handTracker.initialize(video, (text, progress) => {
				document.getElementById("loading-text").textContent = text;
				document.getElementById("progress-fill").style.width = `${progress}%`;
			});

			// === UPDATED:  Gesture callback untuk BOMB saja ===
			// Auto-fire ditangani di update loop, bukan di callback
			this.handTracker.onGestureChange = (gesture, previous) => {
				// Hanya peace sign yang trigger bomb
				if (gesture === "peace" && previous !== "peace") {
					this.useBomb();
				}
			};

			this.handTracker.start();
			this.initGame();
			this.updatePreview();
		} catch (error) {
			console.error("Error starting game:", error);
			alert("Error:  " + error.message + "\n\nMencoba mode keyboard...");
			this.useKeyboard = true;
			this.initGame();
		}
	}

	initGame() {
		console.log("Initializing game...");
		this.resetGame();
		this.showScreen("game");

		// Hide webcam preview if keyboard mode
		const preview = document.getElementById("webcam-preview");
		if (preview) {
			preview.style.display = this.useKeyboard ? "none" : "block";
		}

		this.isRunning = true;
		this.isPaused = false;
		this.lastTime = performance.now();

		requestAnimationFrame(this.gameLoop);
		console.log("Game loop started!");
	}

	resetGame() {
		this.score = 0;
		this.lives = 3;
		this.bombs = 3;
		this.combo = 0;
		this.maxCombo = 0;
		this.enemiesKilled = 0;
		this.bossesKilled = 0;
		this.shotsFired = 0;
		this.shotsHit = 0;
		this.level = 1;
		this.levelKillCount = 0;
		this.isBossActive = false;
		this.enemySpawnInterval = 2000;
		this.autoFireEnabled = false;

		this.bullets = [];
		this.enemies = [];
		this.particles = [];
		this.powerUps = [];
		this.enemyBullets = [];
		this.boss = null;

		// Create player
		this.player = {
			x: this.canvas.width / 2,
			y: this.canvas.height - 100,
			width: 50,
			height: 50,
			speed: 8,
			color: "#00ffff",
			isInvincible: false,
			invincibleTimer: 0,
		};

		this.generateStars();
		this.updateHUD();
	}

	generateStars() {
		this.stars = [];
		const starCount = Math.floor(
			(this.canvas.width * this.canvas.height) / 8000,
		);
		for (let i = 0; i < starCount; i++) {
			this.stars.push({
				x: Math.random() * this.canvas.width,
				y: Math.random() * this.canvas.height,
				size: Math.random() * 2 + 0.5,
				speed: Math.random() * 2 + 0.5,
				brightness: Math.random(),
			});
		}
	}

	/* ----------------------------------------
       GAME LOOP
    ---------------------------------------- */
	gameLoop(currentTime) {
		if (!this.isRunning) return;

		const deltaTime = currentTime - this.lastTime;
		this.lastTime = currentTime;

		if (!this.isPaused) {
			this.update(deltaTime);
			this.render();
		}

		requestAnimationFrame(this.gameLoop);
	}

	/* ----------------------------------------
       UPDATE - DENGAN AUTO-FIRE
    ---------------------------------------- */
	update(deltaTime) {
		// Update player
		this.updatePlayer(deltaTime);

		// === NEW: Check gesture untuk auto-fire ===
		this.updateGestureActions(deltaTime);

		// Update game objects
		this.updateBullets(deltaTime);
		this.updateEnemies(deltaTime);
		this.updateBoss(deltaTime);
		this.updateEnemyBullets(deltaTime);
		this.updateParticles(deltaTime);
		this.updatePowerUps(deltaTime);
		this.updateStars(deltaTime);

		// Spawn enemies (only if no boss)
		if (!this.isBossActive) {
			this.enemySpawnTimer += deltaTime;
			if (this.enemySpawnTimer >= this.enemySpawnInterval) {
				this.spawnEnemy();
				this.enemySpawnTimer = 0;
			}
		}

		// Update cooldowns
		if (this.shootCooldown > 0) {
			this.shootCooldown -= deltaTime;
		}

		// Update invincibility
		if (this.player && this.player.isInvincible) {
			this.player.invincibleTimer -= deltaTime;
			if (this.player.invincibleTimer <= 0) {
				this.player.isInvincible = false;
			}
		}

		// Check collisions
		this.checkCollisions();
	}

	/* ----------------------------------------
       NEW: UPDATE GESTURE ACTIONS (AUTO-FIRE)
    ---------------------------------------- */
	updateGestureActions(deltaTime) {
		if (this.useKeyboard) return;

		const handState = this.handTracker.getState();

		if (handState.isDetected) {
			// === AUTO-FIRE:  Tembak terus selama mengepal ===
			if (handState.gesture === "fist") {
				this.autoFireEnabled = true;
				// Tembak dengan cooldown yang lebih cepat
				if (this.shootCooldown <= 0) {
					this.shoot();
					this.shootCooldown = this.autoFireCooldown; // Lebih cepat dari manual
				}
			} else {
				this.autoFireEnabled = false;
			}
		} else {
			this.autoFireEnabled = false;
		}
	}

	updatePlayer(deltaTime) {
		if (!this.player) return;

		const speed = this.player.speed * (deltaTime / 16);

		if (this.useKeyboard) {
			// Keyboard control
			if (this.keyboardState.left) this.player.x -= speed;
			if (this.keyboardState.right) this.player.x += speed;
			if (this.keyboardState.up) this.player.y -= speed;
			if (this.keyboardState.down) this.player.y += speed;
		} else {
			// Hand tracking control
			const handState = this.handTracker.getState();
			if (handState.isDetected) {
				const targetX = handState.position.x * this.canvas.width;
				const targetY = handState.position.y * this.canvas.height;
				this.player.x += (targetX - this.player.x) * 0.12;
				this.player.y += (targetY - this.player.y) * 0.12;
			}
		}

		// Keep player in bounds
		const margin = 30;
		this.player.x = Math.max(
			margin,
			Math.min(this.canvas.width - margin, this.player.x),
		);
		this.player.y = Math.max(
			margin,
			Math.min(this.canvas.height - margin, this.player.y),
		);
	}

	updateBullets(deltaTime) {
		for (let i = this.bullets.length - 1; i >= 0; i--) {
			const bullet = this.bullets[i];
			bullet.y -= bullet.speed * (deltaTime / 16);

			if (bullet.y < -20) {
				this.bullets.splice(i, 1);
			}
		}
	}

	updateEnemies(deltaTime) {
		for (let i = this.enemies.length - 1; i >= 0; i--) {
			const enemy = this.enemies[i];
			enemy.y += enemy.speed * (deltaTime / 16);

			// Movement patterns
			if (enemy.pattern === "sine") {
				enemy.x += Math.sin(enemy.y * 0.02) * 2;
			} else if (enemy.pattern === "zigzag") {
				enemy.x += enemy.direction * 1.5;
				if (enemy.x < 50 || enemy.x > this.canvas.width - 50) {
					enemy.direction *= -1;
				}
			}

			// Remove if off screen
			if (enemy.y > this.canvas.height + 50) {
				this.enemies.splice(i, 1);
				this.combo = 0;
				this.updateComboDisplay();
			}
		}
	}

	updateBoss(deltaTime) {
		if (!this.boss) return;

		// Boss movement
		if (this.boss.y < 100) {
			this.boss.y += 1;
		} else {
			// Horizontal movement
			this.boss.x += this.boss.direction * this.boss.speed * (deltaTime / 16);
			if (this.boss.x < 100 || this.boss.x > this.canvas.width - 100) {
				this.boss.direction *= -1;
			}

			// Boss shooting
			this.boss.shootTimer += deltaTime;
			if (this.boss.shootTimer >= this.boss.shootInterval) {
				this.bossShoot();
				this.boss.shootTimer = 0;
			}
		}

		// Update boss health bar
		const healthFill = document.getElementById("boss-health-fill");
		if (healthFill) {
			healthFill.style.width = `${(this.boss.health / this.boss.maxHealth) * 100}%`;
		}
	}

	updateEnemyBullets(deltaTime) {
		for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
			const bullet = this.enemyBullets[i];
			bullet.x += bullet.vx * (deltaTime / 16);
			bullet.y += bullet.vy * (deltaTime / 16);

			if (
				bullet.y > this.canvas.height + 20 ||
				bullet.x < -20 ||
				bullet.x > this.canvas.width + 20
			) {
				this.enemyBullets.splice(i, 1);
			}
		}
	}

	updateParticles(deltaTime) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.x += p.vx * (deltaTime / 16);
			p.y += p.vy * (deltaTime / 16);
			p.life -= deltaTime;
			p.alpha = Math.max(0, p.life / p.maxLife);

			if (p.life <= 0) {
				this.particles.splice(i, 1);
			}
		}
	}

	updatePowerUps(deltaTime) {
		for (let i = this.powerUps.length - 1; i >= 0; i--) {
			const pu = this.powerUps[i];
			pu.y += pu.speed * (deltaTime / 16);
			pu.rotation += 0.05;

			if (pu.y > this.canvas.height + 30) {
				this.powerUps.splice(i, 1);
			}
		}
	}

	updateStars(deltaTime) {
		this.stars.forEach((star) => {
			star.y += star.speed * (deltaTime / 16);
			if (star.y > this.canvas.height) {
				star.y = 0;
				star.x = Math.random() * this.canvas.width;
			}
		});
	}

	/* ----------------------------------------
       SPAWNING
    ---------------------------------------- */
	spawnEnemy() {
		const types = ["basic", "fast", "tank", "sine", "zigzag"];
		const weights = [40, 25, 15, 10, 10];

		let random = Math.random() * 100;
		let type = "basic";
		let cumulative = 0;

		for (let i = 0; i < types.length; i++) {
			cumulative += weights[i];
			if (random < cumulative) {
				type = types[i];
				break;
			}
		}

		const configs = {
			basic: {
				width: 40,
				height: 40,
				speed: 2,
				health: 1,
				color: "#ff4444",
				points: 100,
			},
			fast: {
				width: 30,
				height: 30,
				speed: 4,
				health: 1,
				color: "#ffaa00",
				points: 150,
			},
			tank: {
				width: 55,
				height: 55,
				speed: 1.2,
				health: 3,
				color: "#aa44ff",
				points: 300,
			},
			sine: {
				width: 40,
				height: 40,
				speed: 2,
				health: 1,
				color: "#44ff44",
				points: 200,
			},
			zigzag: {
				width: 35,
				height: 35,
				speed: 2.5,
				health: 1,
				color: "#ff44aa",
				points: 175,
			},
		};

		const config = configs[type];
		const levelMultiplier = 1 + (this.level - 1) * 0.15;

		this.enemies.push({
			x: Math.random() * (this.canvas.width - 100) + 50,
			y: -50,
			width: config.width,
			height: config.height,
			speed: config.speed * levelMultiplier,
			health: config.health,
			maxHealth: config.health,
			color: config.color,
			points: config.points,
			type: type,
			pattern:
				type === "sine" ? "sine" : type === "zigzag" ? "zigzag" : "straight",
			direction: Math.random() > 0.5 ? 1 : -1,
		});
	}

	spawnBoss() {
		this.isBossActive = true;
		this.enemies = [];

		if (window.SoundFX) window.SoundFX.play("boss");

		const bossHealth = 20 + this.level * 10;

		this.boss = {
			x: this.canvas.width / 2,
			y: -100,
			width: 120,
			height: 100,
			speed: 2 + this.level * 0.3,
			health: bossHealth,
			maxHealth: bossHealth,
			color: "#ff0066",
			direction: 1,
			shootTimer: 0,
			shootInterval: 1500 - this.level * 100,
			points: 1000 + this.level * 500,
		};

		document.getElementById("boss-health-container").classList.remove("hidden");
	}

	bossShoot() {
		if (!this.boss || !this.player) return;

		const angle = Math.atan2(
			this.player.y - this.boss.y,
			this.player.x - this.boss.x,
		);

		const spreadCount = 3 + Math.floor(this.level / 2);
		const spreadAngle = 0.2;

		for (let i = 0; i < spreadCount; i++) {
			const bulletAngle = angle + (i - (spreadCount - 1) / 2) * spreadAngle;
			this.enemyBullets.push({
				x: this.boss.x,
				y: this.boss.y + this.boss.height / 2,
				radius: 8,
				vx: Math.cos(bulletAngle) * 5,
				vy: Math.sin(bulletAngle) * 5,
				color: "#ff0066",
			});
		}
	}

	spawnPowerUp(x, y) {
		const types = ["health", "bomb", "rapid"];
		const type = types[Math.floor(Math.random() * types.length)];

		const configs = {
			health: { color: "#ff4444", symbol: "❤️" },
			bomb: { color: "#ffaa00", symbol: "💣" },
			rapid: { color: "#44aaff", symbol: "⚡" },
		};

		this.powerUps.push({
			x: x,
			y: y,
			width: 30,
			height: 30,
			speed: 2,
			type: type,
			color: configs[type].color,
			symbol: configs[type].symbol,
			rotation: 0,
		});
	}

	/* ----------------------------------------
       ACTIONS
    ---------------------------------------- */
	shoot() {
		if (!this.player || this.shootCooldown > 0 || this.isPaused) return;

		this.bullets.push({
			x: this.player.x,
			y: this.player.y - this.player.height / 2,
			width: 6,
			height: 18,
			speed: 14,
			color: "#00ffff",
			damage: 1,
		});

		this.shotsFired++;

		// Cooldown berbeda untuk auto-fire vs manual
		if (this.autoFireEnabled) {
			this.shootCooldown = this.autoFireCooldown;
		} else {
			this.shootCooldown = this.shootCooldownTime;
		}

		this.createParticles(this.player.x, this.player.y - 25, "#00ffff", 3);

		if (window.SoundFX) window.SoundFX.play("shoot");
	}

	useBomb() {
		if (this.bombs <= 0 || this.isPaused) return;

		this.bombs--;
		this.updateHUD();

		if (window.SoundFX) window.SoundFX.play("bomb");

		// Destroy all enemies
		this.enemies.forEach((enemy) => {
			this.createExplosion(enemy.x, enemy.y, enemy.color);
			this.score += enemy.points;
			this.enemiesKilled++;
			this.shotsHit++;
			this.levelKillCount++;
		});
		this.enemies = [];

		// Damage boss
		if (this.boss) {
			this.boss.health -= 5;
			this.createExplosion(this.boss.x, this.boss.y, "#ff0066");
			if (this.boss.health <= 0) {
				this.defeatBoss();
			}
		}

		// Clear enemy bullets
		this.enemyBullets = [];

		this.createBombEffect();
		this.updateHUD();
		this.checkLevelUp();
	}

	togglePause() {
		this.isPaused = !this.isPaused;
		document
			.getElementById("pause-overlay")
			.classList.toggle("hidden", !this.isPaused);
	}

	/* ----------------------------------------
       COLLISIONS
    ---------------------------------------- */
	checkCollisions() {
		// Player bullets vs Enemies
		for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
			const bullet = this.bullets[bi];

			// Check vs regular enemies
			for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
				const enemy = this.enemies[ei];

				if (this.isColliding(bullet, enemy)) {
					this.bullets.splice(bi, 1);
					enemy.health -= bullet.damage;
					this.shotsHit++;
					this.createParticles(bullet.x, bullet.y, enemy.color, 5);

					if (enemy.health <= 0) {
						this.createExplosion(enemy.x, enemy.y, enemy.color);
						this.score += enemy.points * (1 + this.combo * 0.1);
						this.combo++;
						this.maxCombo = Math.max(this.maxCombo, this.combo);
						this.enemiesKilled++;
						this.levelKillCount++;

						if (Math.random() < 0.12) {
							this.spawnPowerUp(enemy.x, enemy.y);
						}

						this.enemies.splice(ei, 1);
						this.updateHUD();
						this.updateComboDisplay();
						this.checkLevelUp();

						if (window.SoundFX) window.SoundFX.play("explosion");
					}
					break;
				}
			}

			// Check vs Boss
			if (this.boss && this.bullets[bi]) {
				if (this.isColliding(bullet, this.boss)) {
					this.bullets.splice(bi, 1);
					this.boss.health -= bullet.damage;
					this.shotsHit++;
					this.createParticles(bullet.x, bullet.y, "#ff0066", 5);

					if (this.boss.health <= 0) {
						this.defeatBoss();
					}
				}
			}
		}

		// Player vs Enemies
		if (this.player && !this.player.isInvincible) {
			for (let i = this.enemies.length - 1; i >= 0; i--) {
				if (this.isColliding(this.player, this.enemies[i])) {
					this.playerHit();
					this.createExplosion(this.enemies[i].x, this.enemies[i].y, "#ff4444");
					this.enemies.splice(i, 1);
					break;
				}
			}
		}

		// Player vs Enemy Bullets
		if (this.player && !this.player.isInvincible) {
			for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
				const bullet = this.enemyBullets[i];
				const dx = this.player.x - bullet.x;
				const dy = this.player.y - bullet.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < this.player.width / 2 + bullet.radius) {
					this.playerHit();
					this.enemyBullets.splice(i, 1);
					break;
				}
			}
		}

		// Player vs Boss
		if (this.player && this.boss && !this.player.isInvincible) {
			if (this.isColliding(this.player, this.boss)) {
				this.playerHit();
			}
		}

		// Player vs PowerUps
		for (let i = this.powerUps.length - 1; i >= 0; i--) {
			if (this.player && this.isColliding(this.player, this.powerUps[i])) {
				this.collectPowerUp(this.powerUps[i]);
				this.powerUps.splice(i, 1);
			}
		}
	}

	isColliding(a, b) {
		return (
			Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
			Math.abs(a.y - b.y) < (a.height + b.height) / 2
		);
	}

	playerHit() {
		this.lives--;
		this.combo = 0;
		this.updateHUD();
		this.updateComboDisplay();

		this.shakeScreen();
		this.createExplosion(this.player.x, this.player.y, "#ff4444");

		if (window.SoundFX) window.SoundFX.play("hit");

		if (this.lives <= 0) {
			this.gameOver();
		} else {
			this.player.isInvincible = true;
			this.player.invincibleTimer = 2000;
		}
	}

	defeatBoss() {
		this.createExplosion(this.boss.x, this.boss.y, "#ff0066");
		this.createExplosion(this.boss.x - 40, this.boss.y - 20, "#ffaa00");
		this.createExplosion(this.boss.x + 40, this.boss.y + 20, "#ff4444");

		this.score += this.boss.points;
		this.bossesKilled++;
		this.combo += 5;
		this.maxCombo = Math.max(this.maxCombo, this.combo);

		if (window.SoundFX) {
			window.SoundFX.play("explosion");
			window.SoundFX.play("levelup");
		}

		document.getElementById("boss-health-container").classList.add("hidden");

		// Store boss position before nulling
		const bossX = this.boss.x;
		const bossY = this.boss.y;

		this.boss = null;
		this.isBossActive = false;

		// Spawn power-ups from boss
		for (let i = 0; i < 3; i++) {
			setTimeout(() => {
				this.spawnPowerUp(
					bossX + (Math.random() - 0.5) * 100,
					bossY + (Math.random() - 0.5) * 50,
				);
			}, i * 200);
		}

		this.levelUp();
	}

	collectPowerUp(powerUp) {
		if (window.SoundFX) window.SoundFX.play("powerup");

		switch (powerUp.type) {
			case "health":
				this.lives = Math.min(5, this.lives + 1);
				break;
			case "bomb":
				this.bombs = Math.min(5, this.bombs + 1);
				break;
			case "rapid":
				// Rapid fire power-up - kurangi cooldown
				const originalCooldown = this.autoFireCooldown;
				this.autoFireCooldown = 80; // Super cepat!
				this.shootCooldownTime = 100;
				setTimeout(() => {
					this.autoFireCooldown = originalCooldown;
					this.shootCooldownTime = 250;
				}, 5000);
				break;
		}

		this.createParticles(powerUp.x, powerUp.y, powerUp.color, 15);
		this.updateHUD();
	}

	/* ----------------------------------------
       LEVEL SYSTEM
    ---------------------------------------- */
	checkLevelUp() {
		if (!this.isBossActive && this.levelKillCount >= this.levelKillTarget) {
			this.spawnBoss();
		}
	}

	levelUp() {
		this.level++;
		this.levelKillCount = 0;
		this.levelKillTarget = 15 + this.level * 5;
		this.enemySpawnInterval = Math.max(800, 2000 - this.level * 150);

		const levelDisplay = document.getElementById("level-up-display");
		const newLevel = document.getElementById("new-level");
		if (levelDisplay && newLevel) {
			newLevel.textContent = this.level;
			levelDisplay.classList.remove("hidden");
			setTimeout(() => {
				levelDisplay.classList.add("hidden");
			}, 2000);
		}

		this.updateHUD();
	}

	/* ----------------------------------------
       EFFECTS
    ---------------------------------------- */
	createParticles(x, y, color, count) {
		for (let i = 0; i < count; i++) {
			this.particles.push({
				x: x,
				y: y,
				vx: (Math.random() - 0.5) * 8,
				vy: (Math.random() - 0.5) * 8,
				size: Math.random() * 4 + 2,
				color: color,
				life: 400,
				maxLife: 400,
				alpha: 1,
			});
		}
	}

	createExplosion(x, y, color) {
		for (let i = 0; i < 25; i++) {
			const angle = ((Math.PI * 2) / 25) * i;
			const speed = Math.random() * 4 + 2;
			this.particles.push({
				x: x,
				y: y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				size: Math.random() * 6 + 3,
				color: color,
				life: 600,
				maxLife: 600,
				alpha: 1,
			});
		}
	}

	createBombEffect() {
		const flash = document.createElement("div");
		flash.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: white;
            opacity: 0.7;
            pointer-events: none;
            z-index: 1000;
        `;
		document.body.appendChild(flash);
		setTimeout(() => flash.remove(), 100);
	}

	shakeScreen() {
		const gameScreen = document.getElementById("game-screen");
		if (gameScreen) {
			gameScreen.classList.add("shake");
			setTimeout(() => gameScreen.classList.remove("shake"), 500);
		}
	}

	/* ----------------------------------------
       RENDER
    ---------------------------------------- */
	render() {
		// Clear
		this.ctx.fillStyle = "#0a0a20";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw stars
		this.drawStars();

		// Draw game objects
		this.drawParticles();
		this.drawPowerUps();
		this.drawBullets();
		this.drawEnemyBullets();
		this.drawEnemies();
		this.drawBoss();
		this.drawPlayer();
	}

	drawStars() {
		this.stars.forEach((star) => {
			this.ctx.beginPath();
			this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
			this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.brightness * 0.7})`;
			this.ctx.fill();
		});
	}

	drawPlayer() {
		if (!this.player) return;
		const p = this.player;

		// Blinking when invincible
		if (p.isInvincible && Math.floor(Date.now() / 80) % 2 === 0) {
			return;
		}

		this.ctx.save();
		this.ctx.translate(p.x, p.y);

		// Ship body
		this.ctx.beginPath();
		this.ctx.moveTo(0, -p.height / 2);
		this.ctx.lineTo(-p.width / 2, p.height / 2);
		this.ctx.lineTo(p.width / 2, p.height / 2);
		this.ctx.closePath();

		// Gradient fill
		const gradient = this.ctx.createLinearGradient(
			0,
			-p.height / 2,
			0,
			p.height / 2,
		);
		gradient.addColorStop(0, p.color);
		gradient.addColorStop(1, "#004466");
		this.ctx.fillStyle = gradient;
		this.ctx.fill();

		// Glow - lebih terang saat auto-fire
		this.ctx.shadowColor = this.autoFireEnabled ? "#ff6600" : p.color;
		this.ctx.shadowBlur = this.autoFireEnabled ? 25 : 15;
		this.ctx.strokeStyle = this.autoFireEnabled ? "#ff6600" : p.color;
		this.ctx.lineWidth = 2;
		this.ctx.stroke();

		// Engine flame - lebih besar saat auto-fire
		const flameSize = this.autoFireEnabled ? 25 : 15;
		this.ctx.beginPath();
		this.ctx.moveTo(-12, p.height / 2);
		this.ctx.lineTo(0, p.height / 2 + flameSize + Math.random() * 10);
		this.ctx.lineTo(12, p.height / 2);
		this.ctx.fillStyle = this.autoFireEnabled ? "#ff4400" : "#ff6600";
		this.ctx.shadowBlur = 0;
		this.ctx.fill();

		this.ctx.restore();
	}

	drawBullets() {
		this.bullets.forEach((bullet) => {
			this.ctx.save();
			this.ctx.shadowColor = bullet.color;
			this.ctx.shadowBlur = 8;
			this.ctx.fillStyle = bullet.color;
			this.ctx.fillRect(
				bullet.x - bullet.width / 2,
				bullet.y - bullet.height / 2,
				bullet.width,
				bullet.height,
			);
			this.ctx.restore();
		});
	}

	drawEnemyBullets() {
		this.enemyBullets.forEach((bullet) => {
			this.ctx.save();
			this.ctx.beginPath();
			this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
			this.ctx.fillStyle = bullet.color;
			this.ctx.shadowColor = bullet.color;
			this.ctx.shadowBlur = 10;
			this.ctx.fill();
			this.ctx.restore();
		});
	}

	drawEnemies() {
		this.enemies.forEach((enemy) => {
			this.ctx.save();
			this.ctx.translate(enemy.x, enemy.y);

			this.ctx.shadowColor = enemy.color;
			this.ctx.shadowBlur = 12;

			// Hexagon shape
			this.ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const angle = ((Math.PI * 2) / 6) * i - Math.PI / 2;
				const x = (Math.cos(angle) * enemy.width) / 2;
				const y = (Math.sin(angle) * enemy.height) / 2;
				if (i === 0) this.ctx.moveTo(x, y);
				else this.ctx.lineTo(x, y);
			}
			this.ctx.closePath();
			this.ctx.fillStyle = enemy.color;
			this.ctx.fill();
			this.ctx.strokeStyle = "#ffffff";
			this.ctx.lineWidth = 2;
			this.ctx.stroke();

			// Health bar for tanks
			if (enemy.maxHealth > 1) {
				const barWidth = enemy.width;
				const healthPercent = enemy.health / enemy.maxHealth;
				this.ctx.shadowBlur = 0;
				this.ctx.fillStyle = "#333";
				this.ctx.fillRect(-barWidth / 2, -enemy.height / 2 - 12, barWidth, 4);
				this.ctx.fillStyle = "#00ff00";
				this.ctx.fillRect(
					-barWidth / 2,
					-enemy.height / 2 - 12,
					barWidth * healthPercent,
					4,
				);
			}

			this.ctx.restore();
		});
	}

	drawBoss() {
		if (!this.boss) return;

		this.ctx.save();
		this.ctx.translate(this.boss.x, this.boss.y);

		this.ctx.shadowColor = this.boss.color;
		this.ctx.shadowBlur = 25;

		// Boss body - octagon
		this.ctx.beginPath();
		for (let i = 0; i < 8; i++) {
			const angle = ((Math.PI * 2) / 8) * i - Math.PI / 2;
			const x = (Math.cos(angle) * this.boss.width) / 2;
			const y = (Math.sin(angle) * this.boss.height) / 2;
			if (i === 0) this.ctx.moveTo(x, y);
			else this.ctx.lineTo(x, y);
		}
		this.ctx.closePath();

		const gradient = this.ctx.createRadialGradient(
			0,
			0,
			0,
			0,
			0,
			this.boss.width / 2,
		);
		gradient.addColorStop(0, "#ff4488");
		gradient.addColorStop(1, this.boss.color);
		this.ctx.fillStyle = gradient;
		this.ctx.fill();
		this.ctx.strokeStyle = "#ffffff";
		this.ctx.lineWidth = 3;
		this.ctx.stroke();

		// Boss "eye"
		this.ctx.beginPath();
		this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
		this.ctx.fillStyle = "#ffffff";
		this.ctx.fill();
		this.ctx.beginPath();
		this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
		this.ctx.fillStyle = "#ff0000";
		this.ctx.fill();

		this.ctx.restore();
	}

	drawParticles() {
		this.particles.forEach((p) => {
			this.ctx.save();
			this.ctx.globalAlpha = p.alpha;
			this.ctx.beginPath();
			this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			this.ctx.fillStyle = p.color;
			this.ctx.fill();
			this.ctx.restore();
		});
	}

	drawPowerUps() {
		this.powerUps.forEach((pu) => {
			this.ctx.save();
			this.ctx.translate(pu.x, pu.y);
			this.ctx.rotate(pu.rotation);

			this.ctx.shadowColor = pu.color;
			this.ctx.shadowBlur = 15;

			this.ctx.beginPath();
			this.ctx.arc(0, 0, pu.width / 2, 0, Math.PI * 2);
			this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
			this.ctx.fill();
			this.ctx.strokeStyle = pu.color;
			this.ctx.lineWidth = 2;
			this.ctx.stroke();

			this.ctx.shadowBlur = 0;
			this.ctx.font = "18px Arial";
			this.ctx.textAlign = "center";
			this.ctx.textBaseline = "middle";
			this.ctx.fillText(pu.symbol, 0, 0);

			this.ctx.restore();
		});
	}

	/* ----------------------------------------
       HUD
    ---------------------------------------- */
	updateHUD() {
		document.getElementById("score").textContent = Math.floor(
			this.score,
		).toLocaleString();
		document.getElementById("level").textContent = this.level;
		document.getElementById("lives").textContent = "❤️".repeat(
			Math.max(0, this.lives),
		);
		document.getElementById("bombs").textContent = "💣".repeat(
			Math.max(0, this.bombs),
		);
	}

	updateComboDisplay() {
		const comboDisplay = document.getElementById("combo-display");
		const comboCount = document.getElementById("combo-count");

		if (this.combo >= 3) {
			comboCount.textContent = this.combo;
			comboDisplay.classList.remove("hidden");
		} else {
			comboDisplay.classList.add("hidden");
		}
	}

	/* ----------------------------------------
       GAME OVER
    ---------------------------------------- */
	gameOver() {
		this.isRunning = false;
		this.stopCamera();

		if (window.SoundFX) window.SoundFX.play("gameover");

		document.getElementById("boss-health-container").classList.add("hidden");

		document.getElementById("final-score").textContent = Math.floor(
			this.score,
		).toLocaleString();
		document.getElementById("final-level").textContent = this.level;
		document.getElementById("enemies-killed").textContent = this.enemiesKilled;
		document.getElementById("bosses-killed").textContent = this.bossesKilled;
		document.getElementById("max-combo").textContent = this.maxCombo;

		const accuracy =
			this.shotsFired > 0
				? Math.round((this.shotsHit / this.shotsFired) * 100)
				: 0;
		document.getElementById("accuracy").textContent = accuracy + "%";

		const isNewHighScore = this.saveHighScore(this.score);
		document
			.getElementById("new-highscore")
			.classList.toggle("hidden", !isNewHighScore);
		this.updateHighScoreDisplay();

		setTimeout(() => {
			this.showScreen("gameover");
		}, 800);
	}

	/* ----------------------------------------
       PREVIEW (Hand Tracking)
    ---------------------------------------- */
	updatePreview() {
		if (!this.isRunning || this.useKeyboard) return;

		this.handTracker.drawToCanvas(this.previewCanvas);

		const state = this.handTracker.getState();
		const statusEl = document.getElementById("hand-status");

		if (state.isDetected) {
			const gestureEmoji = {
				open: "👋 Bergerak",
				fist: "✊ AUTO-FIRE! ",
				peace: "✌️ BOM! ",
				none: "👋",
			};
			statusEl.textContent = gestureEmoji[state.gesture] || "👋 Terdeteksi";
			statusEl.style.color = state.gesture === "fist" ? "#ff6600" : "#00ff00";
		} else {
			statusEl.textContent = "👋 Mencari tangan... ";
			statusEl.style.color = "#ff6b6b";
		}

		requestAnimationFrame(() => this.updatePreview());
	}
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener("DOMContentLoaded", () => {
	console.log("DOM Loaded - Initializing Space Shooter.. .");
	window.game = new SpaceShooterGame();
});
