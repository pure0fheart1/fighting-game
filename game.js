// Simple Browser Fighting Game
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'playing'; // 'playing', 'paused', 'gameOver'
        this.round = 1;
        this.gameTime = 99;
        
        // Platform setup
        this.platforms = [
            { x: 0, y: 550, width: 800, height: 50 }, // Ground
            { x: 150, y: 450, width: 150, height: 20 }, // Left platform
            { x: 500, y: 450, width: 150, height: 20 }, // Right platform
            { x: 325, y: 350, width: 150, height: 20 }, // Center platform
        ];
        
        // Initialize players
        this.player1 = new Player(200, 500, '#ff4444', 'player1');
        this.player2 = new Player(600, 500, '#4444ff', 'player2');
        
        // Controls
        this.keys = {};
        this.setupControls();
        
        // Start game loop
        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
        
        // UI elements
        this.player1HealthBar = document.getElementById('player1-health');
        this.player2HealthBar = document.getElementById('player2-health');
        this.gameMessage = document.getElementById('game-message');
    }
    
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
        }
        this.render();
        
        requestAnimationFrame(this.gameLoop);
    }
    
    update(deltaTime) {
        // Update players
        this.player1.update(deltaTime, this.keys, this.platforms);
        this.player2.update(deltaTime, this.keys, this.platforms);
        
        // Handle attacks
        this.handleAttacks();
        
        // Check for game over
        this.checkGameOver();
        
        // Update UI
        this.updateUI();
    }
    
    handleAttacks() {
        // Player 1 attack
        if (this.keys.Space && this.player1.canAttack()) {
            this.player1.attack();
            if (this.isPlayerInRange(this.player1, this.player2)) {
                this.player2.takeDamage(15);
                this.createHitEffect(this.player2.x, this.player2.y);
            }
        }
        
        // Player 2 attack
        if (this.keys.Enter && this.player2.canAttack()) {
            this.player2.attack();
            if (this.isPlayerInRange(this.player2, this.player1)) {
                this.player1.takeDamage(15);
                this.createHitEffect(this.player1.x, this.player1.y);
            }
        }
    }
    
    isPlayerInRange(attacker, target) {
        const distance = Math.abs(attacker.x - target.x);
        return distance < 60 && Math.abs(attacker.y - target.y) < 50;
    }
    
    createHitEffect(x, y) {
        // Simple hit effect - could be enhanced with particles
        this.ctx.save();
        this.ctx.fillStyle = '#ffff00';
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 25, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    checkGameOver() {
        if (this.player1.health <= 0) {
            this.endGame('Player 2 Wins!');
        } else if (this.player2.health <= 0) {
            this.endGame('Player 1 Wins!');
        }
    }
    
    endGame(winner) {
        this.gameState = 'gameOver';
        this.gameMessage.innerHTML = `
            <div>${winner}</div>
            <button onclick="game.restart()">Play Again</button>
            <button onclick="game.resetGame()">New Game</button>
        `;
        this.gameMessage.classList.remove('hidden');
    }
    
    restart() {
        this.player1.health = 100;
        this.player2.health = 100;
        this.player1.x = 200;
        this.player1.y = 500;
        this.player2.x = 600;
        this.player2.y = 500;
        this.player1.velocityX = 0;
        this.player1.velocityY = 0;
        this.player2.velocityX = 0;
        this.player2.velocityY = 0;
        this.gameState = 'playing';
        this.gameMessage.classList.add('hidden');
    }
    
    resetGame() {
        this.restart();
        this.round = 1;
    }
    
    updateUI() {
        this.player1HealthBar.style.width = Math.max(0, this.player1.health) + '%';
        this.player2HealthBar.style.width = Math.max(0, this.player2.health) + '%';
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw platforms
        this.drawPlatforms();
        
        // Draw players
        this.player1.render(this.ctx);
        this.player2.render(this.ctx);
        
        // Draw UI elements on canvas
        this.drawCanvasUI();
    }
    
    drawBackground() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Simple clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.drawCloud(150, 100);
        this.drawCloud(450, 80);
        this.drawCloud(650, 120);
    }
    
    drawCloud(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 25, 0, Math.PI * 2);
        this.ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
        this.ctx.arc(x + 50, y, 25, 0, Math.PI * 2);
        this.ctx.arc(x + 15, y - 25, 25, 0, Math.PI * 2);
        this.ctx.arc(x + 35, y - 25, 25, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawPlatforms() {
        this.ctx.fillStyle = '#8B4513';
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        
        this.platforms.forEach(platform => {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        });
    }
    
    drawCanvasUI() {
        // Draw round counter
        this.ctx.fillStyle = '#ffdd00';
        this.ctx.font = '20px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Round ${this.round}`, this.width / 2, 40);
    }
}

class Player {
    constructor(x, y, color, id) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.color = color;
        this.id = id;
        
        // Stats
        this.health = 100;
        this.maxHealth = 100;
        
        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 300;
        this.jumpPower = 600;
        this.gravity = 1500;
        this.onGround = false;
        
        // Combat
        this.lastAttackTime = 0;
        this.attackCooldown = 500;
        this.isAttacking = false;
        this.attackDuration = 200;
    }
    
    update(deltaTime, keys, platforms) {
        const dt = deltaTime / 1000; // Convert to seconds
        
        // Handle input
        this.handleInput(keys, dt);
        
        // Apply gravity
        if (!this.onGround) {
            this.velocityY += this.gravity * dt;
        }
        
        // Update position
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;
        
        // Collision detection
        this.handleCollisions(platforms);
        
        // Keep player in bounds
        this.x = Math.max(0, Math.min(800 - this.width, this.x));
        
        // Update attack state
        this.updateAttackState();
    }
    
    handleInput(keys, dt) {
        this.velocityX = 0;
        
        if (this.id === 'player1') {
            // Player 1 controls (WASD)
            if (keys.KeyA) this.velocityX = -this.speed;
            if (keys.KeyD) this.velocityX = this.speed;
            if (keys.KeyW && this.onGround) {
                this.velocityY = -this.jumpPower;
                this.onGround = false;
            }
        } else {
            // Player 2 controls (Arrow keys)
            if (keys.ArrowLeft) this.velocityX = -this.speed;
            if (keys.ArrowRight) this.velocityX = this.speed;
            if (keys.ArrowUp && this.onGround) {
                this.velocityY = -this.jumpPower;
                this.onGround = false;
            }
        }
    }
    
    handleCollisions(platforms) {
        this.onGround = false;
        
        platforms.forEach(platform => {
            // Check if player is colliding with platform
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y < platform.y + platform.height &&
                this.y + this.height > platform.y) {
                
                // Landing on top of platform
                if (this.velocityY > 0 && this.y < platform.y) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                }
                // Hitting platform from below
                else if (this.velocityY < 0 && this.y > platform.y) {
                    this.y = platform.y + platform.height;
                    this.velocityY = 0;
                }
            }
        });
        
        // Ground collision
        if (this.y + this.height >= 600) {
            this.y = 600 - this.height;
            this.velocityY = 0;
            this.onGround = true;
        }
    }
    
    canAttack() {
        return Date.now() - this.lastAttackTime > this.attackCooldown;
    }
    
    attack() {
        this.lastAttackTime = Date.now();
        this.isAttacking = true;
    }
    
    updateAttackState() {
        if (this.isAttacking && Date.now() - this.lastAttackTime > this.attackDuration) {
            this.isAttacking = false;
        }
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw player body
        ctx.fillStyle = this.color;
        if (this.isAttacking) {
            ctx.fillStyle = '#ffff00'; // Flash yellow when attacking
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw player outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Draw simple face
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + 8, this.y + 8, 3, 3); // Left eye
        ctx.fillRect(this.x + 19, this.y + 8, 3, 3); // Right eye
        ctx.fillRect(this.x + 10, this.y + 18, 10, 2); // Mouth
        
        // Draw attack indicator
        if (this.isAttacking) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            const attackRange = 30;
            ctx.fillRect(this.x - attackRange/2, this.y, this.width + attackRange, this.height);
        }
        
        ctx.restore();
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Game();
}); 