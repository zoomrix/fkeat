document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const pixelFillProgress = document.getElementById('pixel-fill-progress');
    const percentageIndicator = document.getElementById('percentage-indicator');
    const winMessage = document.getElementById('win-message');
    const dialogOverlay = document.getElementById('dialog-overlay');
    const backButton = document.getElementById('back-button');
    const speedModeArrow = document.getElementById('speed-mode-arrow'); // Added
    const stickyModeArrow = document.getElementById('sticky-mode-arrow'); // Added

    console.log("DOM Content Loaded. Script starting.");
    console.log("Canvas: ", canvas);
    console.log("Pixel Fill Progress: ", pixelFillProgress);
    console.log("Back Button: ", backButton);
    console.log("Speed Mode Arrow: ", speedModeArrow); // Added log
    console.log("Sticky Mode Arrow: ", stickyModeArrow); // Added log

    const gridSize = 64; // Internal game resolution (e.g., 64x64 pixels)
    const pixelSize = 1; // Each game pixel is 1 unit in our internal grid

    // Set canvas internal resolution (this will be scaled by CSS)
    canvas.width = gridSize;
    canvas.height = gridSize;

    let grid = [];
    let playerX, playerY;
    let filledPixels = 0;
    const totalPixels = gridSize * gridSize;
    let gameWon = false;

    let gameInterval; // To hold the setInterval ID for the game loop
    let currentDirection = null; // Stores the last pressed arrow key direction
    let isArrowKeyPressed = false; // Tracks if an arrow key is currently held down
    let continuousMovementEnabled = false; // Toggled by spacebar
    let stickyMovementMode = false; // Toggled by Shift + Spacebar
    const gameSpeed = 50; // Milliseconds per move (adjust for faster/slower game)

    const confettiCanvas = document.getElementById('confettiCanvas');
    const confettiCtx = confettiCanvas.getContext('2d');
    let confettiParticles = [];

    function resizeConfettiCanvas() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeConfettiCanvas);

    function createConfettiParticle(x, y, isRightCannon) {
        let angle;
        if (isRightCannon) {
            // Shoots confetti up and to the left, from the right cannon
            angle = Math.random() * (Math.PI / 2) + (Math.PI / 2); // Angle from 90 to 180 degrees
        } else {
            // Shoots confetti up and to the right, from the left cannon
            angle = Math.random() * (Math.PI / 2); // Angle from 0 to 90 degrees
        }
        const velocity = Math.random() * 15 + 15; // Further increased velocity for more explosion
        return {
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: -Math.sin(angle) * velocity, // Negative sine for upward movement
            alpha: 1,
            life: Math.random() * 250 + 200, // Even longer life
            size: pixelSize * 10
        };
    }

    function startConfettiAnimation() {
        resizeConfettiCanvas();
        confettiParticles = [];
        const numberOfParticles = 300; // Even more particles for a bigger effect

        // Left cannon
        for (let i = 0; i < numberOfParticles; i++) {
            confettiParticles.push(createConfettiParticle(0, confettiCanvas.height, false));
        }

        // Right cannon
        for (let i = 0; i < numberOfParticles; i++) {
            // Adjust x for right cannon to ensure it starts at the very right edge and draws inwards
            confettiParticles.push(createConfettiParticle(confettiCanvas.width - (pixelSize * 10), confettiCanvas.height, true));
        }

        animateConfetti();
    }

    function animateConfetti() {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        const gravity = 0.1;

        for (let i = confettiParticles.length - 1; i >= 0; i--) {
            let p = confettiParticles[i];
            p.vy += gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.005;

            if (p.alpha <= 0) {
                confettiParticles.splice(i, 1);
            } else {
                confettiCtx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                confettiCtx.fillRect(p.x, p.y, p.size, p.size);
            }
        }

        if (confettiParticles.length > 0) {
            requestAnimationFrame(animateConfetti);
        } else {
            // Clear the confetti canvas once animation is done
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            setTimeout(initGame, 3000);
        }
    }

    // Cheat Code Variables
    const cheatCodeSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let playerInputSequence = [];
    let cheatCodeTimer;
    const cheatCodeInterval = 5000; // 5 seconds to enter the next key

    function initGame() {
        console.log("initGame() called.");
        clearInterval(gameInterval); // Clear any existing interval if restarting
        grid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
        playerX = Math.floor(gridSize / 2);
        playerY = Math.floor(gridSize / 2);
        filledPixels = 0;
        gameWon = false;
        winMessage.style.display = 'none';
        dialogOverlay.style.display = 'none'; // Hide dialog on new game
        currentDirection = null; // Reset direction on new game
        isArrowKeyPressed = false; // Reset key state
        stickyMovementMode = false; // Reset sticky mode on new game
        updateUI(); // Update UI to reflect initial mode (normal)
        draw('white'); // Initial player color is white
        gameInterval = setInterval(gameTick, gameSpeed); // Start the game loop
    }

    function draw(playerPixelColor) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw filled pixels (trail)
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (grid[y][x] === 1) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }

        // Draw player pixel with contrast
        ctx.fillStyle = playerPixelColor;
        ctx.fillRect(playerX, playerY, pixelSize, pixelSize);

        updateUI();
    }

    function updateUI() {
        const percentage = (filledPixels / totalPixels) * 100;
        pixelFillProgress.style.width = `${percentage}%`;
        percentageIndicator.textContent = `${Math.floor(percentage)}%`;

        // Update arrow visibility
        console.log("Updating UI. Continuous:", continuousMovementEnabled, "Sticky:", stickyMovementMode);
        speedModeArrow.style.display = continuousMovementEnabled ? 'block' : 'none';
        stickyModeArrow.style.display = stickyMovementMode ? 'block' : 'none';
        console.log("Speed Mode Arrow display:", speedModeArrow.style.display);
        console.log("Sticky Mode Arrow display:", stickyModeArrow.style.display);
    }

    function checkWin() {
        if (filledPixels >= totalPixels) {
            gameWon = true;
            clearInterval(gameInterval); // Stop the game loop
            winMessage.style.display = 'block';
            startConfettiAnimation(); // Start confetti animation
        }
    }

    function movePlayer() {
        let targetX = playerX;
        let targetY = playerY;

        switch (currentDirection) {
            case 'ArrowUp':
                targetY--;
                break;
            case 'ArrowDown':
                targetY++;
                break;
            case 'ArrowLeft':
                targetX--;
                break;
            case 'ArrowRight':
                targetX++;
                break;
        }

        // Boundary check for the target position
        if (targetX >= 0 && targetX < gridSize &&
            targetY >= 0 && targetY < gridSize) {

            // Determine player pixel color *before* moving and filling
            let playerPixelColor;
            if (grid[targetY][targetX] === 1) {
                playerPixelColor = 'black'; // Moving onto an already filled (white) area
            } else {
                playerPixelColor = 'white'; // Moving onto a new, unfilled (black) area
            }

            // Now update player's actual position
            playerX = targetX;
            playerY = targetY;

            // Fill the pixel if it's not already filled
            if (grid[playerY][playerX] === 0) {
                grid[playerY][playerX] = 1;
                filledPixels++;
                checkWin();
            }

            draw(playerPixelColor); // Pass the determined color to the draw function
        }
    }

    function gameTick() {
        if (gameWon) return; // Stop processing if game is won

        // Move if continuous movement is enabled AND an arrow key is held,
        // OR if sticky movement mode is enabled (regardless of key held).
        if ((continuousMovementEnabled && isArrowKeyPressed && currentDirection !== null) ||
            (stickyMovementMode && currentDirection !== null)) {
            movePlayer();
        }
    }

    

    document.addEventListener('keydown', (e) => {
        // Prevent default browser scrolling with arrow keys and spacebar
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }

        if (gameWon) return; // Ignore input if game is won

        // Handle Escape key for dialog toggle
        if (e.key === 'Escape' && !e.repeat) { // Only react to initial press of Escape
            if (dialogOverlay.style.display === 'none') {
                console.log("Escape key pressed. Showing dialog.");
                clearInterval(gameInterval); // Pause game
                dialogOverlay.style.display = 'flex'; // Show dialog
            } else {
                console.log("Escape key pressed. Hiding dialog.");
                dialogOverlay.style.display = 'none'; // Hide dialog
                gameInterval = setInterval(gameTick, gameSpeed); // Resume game
            }
            return; // Stop further processing for Escape key
        }

        // Handle Enter key for dialog restart
        if (e.key === 'Enter' && dialogOverlay.style.display === 'flex') { // Only react if dialog is visible
            console.log("Enter key pressed. Restarting game.");
            initGame(); // Restart game
            return; // Stop further processing for Enter key
        }

        // Cheat Code Logic
        clearTimeout(cheatCodeTimer);
        playerInputSequence.push(e.key);
        if (playerInputSequence.length > cheatCodeSequence.length) {
            playerInputSequence.shift(); // Remove oldest key if sequence is too long
        }

        // Check if the current sequence matches the cheat code
        if (playerInputSequence.length === cheatCodeSequence.length &&
            playerInputSequence.every((value, index) => value === cheatCodeSequence[index])) {
            console.log("Cheat Code Activated!");
            // Animate filling the entire canvas line by line
            let currentRow = 0;
            const fillAnimationInterval = setInterval(() => {
                if (currentRow < gridSize) {
                    for (let x = 0; x < gridSize; x++) {
                        if (grid[currentRow][x] === 0) {
                            grid[currentRow][x] = 1;
                            filledPixels++;
                        }
                    }
                    draw('white'); // Redraw after each row
                    currentRow++;
                } else {
                    clearInterval(fillAnimationInterval);
                    checkWin(); // Trigger win condition after animation
                }
            }, 10); // Slower animation for better visual effect
            playerInputSequence = []; // Reset sequence after cheat
            return; // Stop further processing after cheat
        }

        // Reset cheat code sequence if next key is not pressed in time
        cheatCodeTimer = setTimeout(() => {
            playerInputSequence = [];
            console.log("Cheat code sequence reset.");
        }, cheatCodeInterval);

        // Handle movement keys only if dialog is not visible
        if (dialogOverlay.style.display === 'none') {
            if (e.key === ' ' && e.shiftKey) { // Shift + Spacebar for sticky movement
                stickyMovementMode = !stickyMovementMode;
                continuousMovementEnabled = false; // Ensure other mode is off
                console.log("Sticky Movement Mode: " + (stickyMovementMode ? "ON" : "OFF"));
                console.log("Continuous Movement: " + (continuousMovementEnabled ? "ON" : "OFF"));
                updateUI(); // Update UI immediately after mode change
            } else if (e.key === ' ') { // Spacebar for continuous movement
                continuousMovementEnabled = !continuousMovementEnabled;
                stickyMovementMode = false; // Ensure other mode is off
                if (continuousMovementEnabled) {
                    isArrowKeyPressed = false; // Reset key pressed state for continuous mode
                }
                console.log("Continuous Movement: " + (continuousMovementEnabled ? "ON" : "OFF"));
                console.log("Sticky Movement Mode: " + (stickyMovementMode ? "ON" : "OFF"));
                updateUI(); // Update UI immediately after mode change
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                currentDirection = e.key;
                isArrowKeyPressed = true;

                // If continuous movement is OFF AND sticky movement is OFF, and this is the first press (not a repeat),
                // then move the player immediately for a single step.
                if (!continuousMovementEnabled && !stickyMovementMode && !e.repeat) {
                    movePlayer();
                }
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            // Only set isArrowKeyPressed to false if sticky movement is NOT active
            if (!stickyMovementMode) {
                isArrowKeyPressed = false;
            }
        }
    });

    // Initialize the game when the page loads
    initGame();

    // Back button functionality
    if (backButton) { // Check if button exists before adding listener
        backButton.addEventListener('click', () => {
            console.log("Back button clicked!"); // Added log
            window.location.href = '../index.html'; // Navigate to homepage
        });
    }
});