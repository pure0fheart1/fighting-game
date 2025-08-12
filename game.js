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

        // Visual effects
        this.particles = [];
        this.maxParticles = 400;

        // Screen shake
        this.shakeTime = 0;
        this.shakeIntensity = 0;

        // Parallax/clouds
        this.clouds = [
            { x: 100, y: 100, radius: 30, speed: 8 },
            { x: 350, y: 80, radius: 40, speed: 10 },
            { x: 650, y: 120, radius: 35, speed: 7 }
        ];
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
        // Update environment
        this.updateClouds(deltaTime);

        // Update players
        this.player1.update(deltaTime, this.keys, this.platforms);
        this.player2.update(deltaTime, this.keys, this.platforms);
        
        // Spawn landing effects
        if (this.player1.justLanded) this.spawnLandingEffect(this.player1);
        if (this.player2.justLanded) this.spawnLandingEffect(this.player2);

        // Run dust while moving on ground
        this.spawnRunDust(this.player1);
        this.spawnRunDust(this.player2);
        
        // Handle attacks
        this.handleAttacks();
        
        // Update particles
        this.updateParticles(deltaTime);
        
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
                this.createHitEffect(
                    this.player2.x + this.player2.width / 2,
                    this.player2.y + this.player2.height / 2,
                    this.player2.color
                );
            }
        }
        
        // Player 2 attack
        if (this.keys.Enter && this.player2.canAttack()) {
            this.player2.attack();
            if (this.isPlayerInRange(this.player2, this.player1)) {
                this.player1.takeDamage(15);
                this.createHitEffect(
                    this.player1.x + this.player1.width / 2,
                    this.player1.y + this.player1.height / 2,
                    this.player1.color
                );
            }
        }
    }
    
    isPlayerInRange(attacker, target) {
        const distance = Math.abs(attacker.x - target.x);
        return distance < 60 && Math.abs(attacker.y - target.y) < 50;
    }
    
    createHitEffect(x, y, color = '#ffff00') {
        // Screen shake
        this.shakeTime = 180; // ms
        this.shakeIntensity = 6;

        // Particle burst
        this.spawnParticleBurst(x, y, color, 18);
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
        this.ctx.save();

        // Apply camera shake
        if (this.shakeTime > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(shakeX, shakeY);
            this.shakeTime -= 16; // approx per frame
            this.shakeIntensity *= 0.92;
            if (this.shakeTime <= 0) {
                this.shakeTime = 0;
                this.shakeIntensity = 0;
            }
        }
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw platforms
        this.drawPlatforms();
        
        // Draw players
        this.player1.render(this.ctx);
        this.player2.render(this.ctx);

        // Particles and effects
        this.renderParticles(this.ctx);
        
        // Draw UI elements on canvas
        this.drawCanvasUI();

        this.ctx.restore();
    }
    
    drawBackground() {
        // Sky gradient
        const sky = this.ctx.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, '#5cc6ff');
        sky.addColorStop(1, '#b8f7c2');
        this.ctx.fillStyle = sky;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Sun
        const sunX = 70;
        const sunY = 70;
        const sunGradient = this.ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 60);
        sunGradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
        sunGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
        this.ctx.fillStyle = sunGradient;
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
        this.ctx.fill();

        // Far mountains
        this.ctx.fillStyle = '#5a7a8a';
        this.drawMountain(0, 320, 180);
        this.drawMountain(180, 340, 200);
        this.drawMountain(360, 330, 160);
        this.drawMountain(540, 345, 220);

        // Near hills
        this.ctx.fillStyle = '#74a47a';
        this.drawHill(0, 420, 500);
        this.drawHill(350, 400, 600);
        
        // Clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        this.clouds.forEach(cloud => {
            this.drawCloud(cloud.x, cloud.y, cloud.radius);
        });
    }
    
    drawCloud(x, y, r = 30) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
        this.ctx.arc(x + r, y, r, 0, Math.PI * 2);
        this.ctx.arc(x + r * 2, y, r * 0.8, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.8, y - r * 0.7, r * 0.7, 0, Math.PI * 2);
        this.ctx.arc(x + r * 1.4, y - r * 0.7, r * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawMountain(x, baseY, width) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, baseY);
        this.ctx.lineTo(x + width / 2, baseY - width * 0.6);
        this.ctx.lineTo(x + width, baseY);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawHill(x, baseY, width) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, baseY);
        this.ctx.quadraticCurveTo(x + width / 2, baseY - width * 0.15, x + width, baseY);
        this.ctx.lineTo(x + width, baseY + 50);
        this.ctx.lineTo(x, baseY + 50);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawPlatforms() {
        this.platforms.forEach(platform => {
            // Dirt body with gradient
            const gradient = this.ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.height);
            gradient.addColorStop(0, '#8B5A2B');
            gradient.addColorStop(1, '#5C3A1E');
            this.ctx.fillStyle = gradient;
            this.ctx.strokeStyle = '#3e2714';
            this.ctx.lineWidth = 2;

            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

            // Grass top
            const grassHeight = 6;
            this.ctx.fillStyle = '#3fb34f';
            this.ctx.fillRect(platform.x - 2, platform.y - grassHeight, platform.width + 4, grassHeight);

            // Grass blades
            this.ctx.strokeStyle = '#2e8f3b';
            this.ctx.lineWidth = 1;
            for (let i = platform.x; i < platform.x + platform.width; i += 8) {
                this.ctx.beginPath();
                this.ctx.moveTo(i, platform.y - 2);
                this.ctx.lineTo(i + 2, platform.y - grassHeight);
                this.ctx.stroke();
            }
        });
    }
    
    drawCanvasUI() {
        // Draw round counter
        this.ctx.fillStyle = '#ffdd00';
        this.ctx.font = '20px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Round ${this.round}`, this.width / 2, 40);
    }

    updateClouds(deltaTime) {
        const dt = deltaTime / 1000;
        this.clouds.forEach(cloud => {
            cloud.x += cloud.speed * dt;
            if (cloud.x - cloud.radius * 2 > this.width) {
                cloud.x = -cloud.radius * 2;
            }
        });
    }

    updateParticles(deltaTime) {
        const dt = deltaTime / 1000;
        const next = [];
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.vx *= 0.98;
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life > 0 && p.radius > 0.5) {
                next.push(p);
            }
        }
        this.particles = next.slice(0, this.maxParticles);
    }

    renderParticles(ctx) {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    spawnParticleBurst(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 120 + Math.random() * 220;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color,
                life: 0.6 + Math.random() * 0.5,
                maxLife: 1.1,
                gravity: 500
            });
        }
    }

    spawnLandingEffect(player) {
        const dustY = player.y + player.height;
        for (let i = 0; i < 10; i++) {
            const dir = (Math.random() - 0.5) * 2;
            const speed = 80 + Math.random() * 120;
            this.particles.push({
                x: player.x + player.width / 2,
                y: dustY,
                vx: dir * speed,
                vy: -60 - Math.random() * 80,
                radius: 2 + Math.random() * 2,
                color: 'rgba(200,200,200,0.9)',
                life: 0.5 + Math.random() * 0.4,
                maxLife: 0.9,
                gravity: 800
            });
        }
    }

    spawnRunDust(player) {
        if (!player.onGround || Math.abs(player.velocityX) < 40) return;
        player.runDustTimer += 1;
        if (player.runDustTimer % 6 !== 0) return;
        const baseX = player.velocityX > 0 ? player.x : player.x + player.width;
        const baseY = player.y + player.height - 2;
        this.particles.push({
            x: baseX,
            y: baseY,
            vx: (player.velocityX > 0 ? -1 : 1) * (30 + Math.random() * 40),
            vy: -20 - Math.random() * 20,
            radius: 1.5 + Math.random() * 2,
            color: 'rgba(180,180,180,0.8)',
            life: 0.4,
            maxLife: 0.6,
            gravity: 700
        });
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

        // Movement/FX helpers
        this.justLanded = false;
        this.wasOnGround = false;
        this.facingDirection = 1; // 1 right, -1 left
        this.runDustTimer = 0;
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
        
        // Collision detection and landing detection
        this.wasOnGround = this.onGround;
        this.handleCollisions(platforms);
        this.justLanded = !this.wasOnGround && this.onGround && Math.abs(this.velocityY) < 5;
        
        // Keep player in bounds
        this.x = Math.max(0, Math.min(800 - this.width, this.x));
        
        // Update facing direction
        if (this.velocityX > 0) this.facingDirection = 1;
        else if (this.velocityX < 0) this.facingDirection = -1;
        
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
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        const shadowWidth = this.width * 0.9;
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width / 2,
            this.y + this.height + 4,
            shadowWidth / 2,
            6,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Body
        const bodyGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        const baseColor = this.isAttacking ? '#ffff66' : this.color;
        bodyGradient.addColorStop(0, baseColor);
        bodyGradient.addColorStop(1, '#111');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Head
        ctx.fillStyle = '#f2d7b6';
        ctx.strokeStyle = '#000';
        const headX = this.x + this.width / 2;
        const headY = this.y - 8;
        ctx.beginPath();
        ctx.arc(headX, headY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Face
        ctx.fillStyle = '#000';
        ctx.fillRect(headX - 4, headY - 2, 2, 2);
        ctx.fillRect(headX + 2, headY - 2, 2, 2);
        ctx.fillRect(headX - 3, headY + 2, 6, 1);
        
        // Attack indicator
        if (this.isAttacking) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.35)';
            const attackRange = 36;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
            ctx.arc(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.width + attackRange,
                this.facingDirection > 0 ? Math.PI * 1.6 : Math.PI * 0.4,
                this.facingDirection > 0 ? Math.PI * 2.1 : Math.PI * -0.1
            );
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Game();
}); 