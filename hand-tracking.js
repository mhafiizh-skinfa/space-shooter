/* ============================================
   HAND TRACKING MODULE
   Menggunakan MediaPipe Hands + TensorFlow.js
============================================ */

class HandTracker {
	constructor() {
		this.detector = null;
		this.video = null;
		this.isRunning = false;

		// Hasil tracking
		this.handPosition = { x: 0.5, y: 0.5 };
		this.gesture = "none";
		this.isHandDetected = false;

		// Callback
		this.onGestureChange = null;

		// Gesture history untuk smoothing
		this.gestureHistory = [];
		this.positionHistory = [];

		// Settings
		this.smoothingFrames = 5;
		this.lastGestureTime = 0;
		this.gestureCooldown = 300; // ms cooldown between gesture triggers
	}

	/* ----------------------------------------
       INITIALIZE HAND DETECTOR
    ---------------------------------------- */
	async initialize(videoElement, onProgress) {
		this.video = videoElement;

		try {
			// Step 1: Setup camera
			onProgress?.("Mengakses kamera... ", 20);
			await this.setupCamera();

			// Step 2: Load model
			onProgress?.("Memuat AI model...", 50);

			const model = handPoseDetection.SupportedModels.MediaPipeHands;
			const detectorConfig = {
				runtime: "mediapipe",
				solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
				modelType: "full",
				maxHands: 1,
			};

			this.detector = await handPoseDetection.createDetector(
				model,
				detectorConfig,
			);

			onProgress?.("Warming up AI... ", 80);

			// Warm up the model
			await this.detector.estimateHands(this.video);

			onProgress?.("Siap bermain! ", 100);

			await new Promise((resolve) => setTimeout(resolve, 500));

			return true;
		} catch (error) {
			console.error("Error initializing hand tracker:", error);
			throw error;
		}
	}

	/* ----------------------------------------
       SETUP CAMERA / WEBCAM
    ---------------------------------------- */
	async setupCamera() {
		const constraints = {
			video: {
				width: { ideal: 640 },
				height: { ideal: 480 },
				facingMode: "user",
				frameRate: { ideal: 30 },
			},
		};

		try {
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			this.video.srcObject = stream;

			return new Promise((resolve) => {
				this.video.onloadedmetadata = () => {
					this.video.play();
					resolve();
				};
			});
		} catch (error) {
			console.error("Camera access denied:", error);
			throw new Error(
				"Tidak dapat mengakses kamera.  Pastikan izin kamera diberikan.",
			);
		}
	}

	/* ----------------------------------------
       START/STOP TRACKING
    ---------------------------------------- */
	start() {
		this.isRunning = true;
		this.trackingLoop();
	}

	stop() {
		this.isRunning = false;
		// Stop camera stream
		if (this.video && this.video.srcObject) {
			this.video.srcObject.getTracks().forEach((track) => track.stop());
		}
	}

	async trackingLoop() {
		if (!this.isRunning) return;

		try {
			const hands = await this.detector.estimateHands(this.video);

			if (hands && hands.length > 0) {
				this.isHandDetected = true;
				this.processHand(hands[0]);
			} else {
				this.isHandDetected = false;
				this.gesture = "none";
			}
		} catch (error) {
			// Silent fail, continue tracking
		}

		requestAnimationFrame(() => this.trackingLoop());
	}

	/* ----------------------------------------
       PROCESS HAND DATA
    ---------------------------------------- */
	processHand(hand) {
		const keypoints = hand.keypoints;

		// Get palm center
		const wrist = keypoints[0];
		const middleBase = keypoints[9];

		const palmX = (wrist.x + middleBase.x) / 2;
		const palmY = (wrist.y + middleBase.y) / 2;

		// Normalize to 0-1 (flip X for mirror)
		const normalizedX = 1 - palmX / this.video.videoWidth;
		const normalizedY = palmY / this.video.videoHeight;

		// Smooth position
		this.positionHistory.push({ x: normalizedX, y: normalizedY });
		if (this.positionHistory.length > this.smoothingFrames) {
			this.positionHistory.shift();
		}

		// Average position
		this.handPosition = this.positionHistory.reduce(
			(acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }),
			{ x: 0, y: 0 },
		);
		this.handPosition.x /= this.positionHistory.length;
		this.handPosition.y /= this.positionHistory.length;

		// Detect gesture
		const newGesture = this.detectGesture(keypoints);

		// Smooth gesture
		this.gestureHistory.push(newGesture);
		if (this.gestureHistory.length > 3) {
			this.gestureHistory.shift();
		}

		// Get dominant gesture
		const gestureCount = {};
		this.gestureHistory.forEach((g) => {
			gestureCount[g] = (gestureCount[g] || 0) + 1;
		});

		const dominantGesture = Object.entries(gestureCount).sort(
			(a, b) => b[1] - a[1],
		)[0][0];

		// Trigger callback with cooldown
		const now = Date.now();
		if (dominantGesture !== this.gesture) {
			const previousGesture = this.gesture;
			this.gesture = dominantGesture;

			// Only trigger action gestures with cooldown
			if (
				(dominantGesture === "fist" || dominantGesture === "peace") &&
				now - this.lastGestureTime > this.gestureCooldown
			) {
				this.lastGestureTime = now;
				this.onGestureChange?.(dominantGesture, previousGesture);
			}
		}
	}

	/* ----------------------------------------
       GESTURE DETECTION
    ---------------------------------------- */
	detectGesture(keypoints) {
		const fingerTips = [4, 8, 12, 16, 20];
		const fingerBases = [2, 6, 10, 14, 18];

		let fingersUp = 0;

		// Check fingers (except thumb)
		for (let i = 1; i < 5; i++) {
			const tipY = keypoints[fingerTips[i]].y;
			const baseY = keypoints[fingerBases[i]].y;

			if (tipY < baseY - 20) {
				fingersUp++;
			}
		}

		// Check thumb
		const thumbTip = keypoints[4];
		const thumbBase = keypoints[2];
		const isRightHand = thumbBase.x < keypoints[17].x;

		if (isRightHand) {
			if (thumbTip.x < thumbBase.x - 20) fingersUp++;
		} else {
			if (thumbTip.x > thumbBase.x + 20) fingersUp++;
		}

		// Determine gesture
		if (fingersUp <= 1) {
			return "fist";
		} else if (fingersUp === 2) {
			const indexUp = keypoints[8].y < keypoints[6].y - 20;
			const middleUp = keypoints[12].y < keypoints[10].y - 20;
			const ringDown = keypoints[16].y >= keypoints[14].y - 20;
			const pinkyDown = keypoints[20].y >= keypoints[18].y - 20;

			if (indexUp && middleUp && ringDown && pinkyDown) {
				return "peace";
			}
			return "open";
		} else {
			return "open";
		}
	}

	/* ----------------------------------------
       DRAW HAND PREVIEW
    ---------------------------------------- */
	async drawToCanvas(canvas) {
		if (!canvas || !this.video) return;

		const ctx = canvas.getContext("2d");

		canvas.width = this.video.videoWidth;
		canvas.height = this.video.videoHeight;

		// Draw video
		ctx.drawImage(this.video, 0, 0);

		if (!this.isHandDetected) return;

		try {
			const hands = await this.detector.estimateHands(this.video);

			if (hands && hands.length > 0) {
				const keypoints = hands[0].keypoints;

				// Draw connections
				const connections = [
					[0, 1],
					[1, 2],
					[2, 3],
					[3, 4],
					[0, 5],
					[5, 6],
					[6, 7],
					[7, 8],
					[0, 9],
					[9, 10],
					[10, 11],
					[11, 12],
					[0, 13],
					[13, 14],
					[14, 15],
					[15, 16],
					[0, 17],
					[17, 18],
					[18, 19],
					[19, 20],
					[5, 9],
					[9, 13],
					[13, 17],
				];

				ctx.strokeStyle = "#00ffff";
				ctx.lineWidth = 3;

				connections.forEach(([i, j]) => {
					ctx.beginPath();
					ctx.moveTo(keypoints[i].x, keypoints[i].y);
					ctx.lineTo(keypoints[j].x, keypoints[j].y);
					ctx.stroke();
				});

				// Draw points
				keypoints.forEach((point, index) => {
					ctx.beginPath();
					ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
					ctx.fillStyle = index % 4 === 0 ? "#ff00ff" : "#00ffff";
					ctx.fill();
				});
			}
		} catch (e) {
			// Ignore
		}
	}

	/* ----------------------------------------
       GET STATE
    ---------------------------------------- */
	getState() {
		return {
			position: this.handPosition,
			gesture: this.gesture,
			isDetected: this.isHandDetected,
		};
	}
}

window.HandTracker = HandTracker;
