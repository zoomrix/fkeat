document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const pixelFillProgress = document.getElementById('pixel-fill-progress');
    const percentageIndicator = document.getElementById('percentage-indicator');
    const winMessage = document.getElementById('win-message');
    const dialogOverlay = document.getElementById('dialog-overlay');

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
    }

    function checkWin() {
        if (filledPixels >= totalPixels) {
            gameWon = true;
            clearInterval(gameInterval); // Stop the game loop
            winMessage.style.display = 'block';
            // Restart game after a brief delay
            setTimeout(initGame, 3000);
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
                dialogOverlay.style.display = 'flex'; // Show dialog
                clearInterval(gameInterval); // Pause game
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

        // Handle movement keys only if dialog is not visible
        if (dialogOverlay.style.display === 'none') {
            if (e.key === ' ' && e.shiftKey) { // Shift + Spacebar for sticky movement
                stickyMovementMode = !stickyMovementMode;
                continuousMovementEnabled = false; // Ensure other mode is off
                console.log("Sticky Movement Mode: " + (stickyMovementMode ? "ON" : "OFF"));
                console.log("Continuous Movement: " + (continuousMovementEnabled ? "ON" : "OFF"));
            } else if (e.key === ' ') { // Spacebar for continuous movement
                continuousMovementEnabled = !continuousMovementEnabled;
                stickyMovementMode = false; // Ensure other mode is off
                if (continuousMovementEnabled) {
                    isArrowKeyPressed = false; // Reset key pressed state for continuous mode
                }
                console.log("Continuous Movement: " + (continuousMovementEnabled ? "ON" : "OFF"));
                console.log("Sticky Movement Mode: " + (stickyMovementMode ? "ON" : "OFF"));
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
    backButton.addEventListener('click', () => {
        window.location.href = 'https://fkeat.com/'; // Navigate to homepage
    });
});