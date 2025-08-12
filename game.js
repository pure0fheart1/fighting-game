// Simple Browser Fighting Game
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'playing'; // 'playing', 'paused', 'roundOver', 'matchOver'
        this.round = 1;
        this.bestOf = 3;
        this.winsToWinMatch = Math.ceil(this.bestOf / 2);
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.roundDurationSeconds = 60;
        this.timeRemainingSeconds = this.roundDurationSeconds;
        
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
        
        // CPU opponent
        this.aiEnabled = true; // Player 2 controlled by CPU by default
        this.aiKeys = {}; // virtual key map used when AI is enabled
        
        // Effects (particles, flashes)
        this.effects = [];
        
        // Simple audio context for hit sounds (lazy-init)
        this.audioCtx = null;
        
        // Controls
        this.keys = {};
        this.setupControls();
        this.setupTouchControls();
        this.setupUiControls();
        
        // Start game loop
        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
        
        // UI elements
        this.player1HealthBar = document.getElementById('player1-health');
        this.player2HealthBar = document.getElementById('player2-health');
        this.gameMessage = document.getElementById('game-message');
        this.roundInfoEl = document.querySelector('.round-info');
        this.p1WinsEl = document.getElementById('p1-wins');
        this.p2WinsEl = document.getElementById('p2-wins');
        this.cpuToggleBtn = document.getElementById('cpu-toggle');
        
        this.updateUI();
    }
    
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent scrolling with space/enter/arrow keys during gameplay
            if (['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            // Pause/Resume
            if (e.code === 'Escape') {
                this.togglePause();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupUiControls() {
        if (this.cpuToggleBtn) {
            this.cpuToggleBtn.addEventListener('click', () => this.toggleAI());
        }
    }

    setupTouchControls() {
        const bindButton = (id, pressCodes) => {
            const el = document.getElementById(id);
            if (!el) return;
            const press = (ev) => {
                ev.preventDefault();
                pressCodes.forEach(code => this.setKey(code, true));
            };
            const release = (ev) => {
                ev.preventDefault();
                pressCodes.forEach(code => this.setKey(code, false));
            };
            el.addEventListener('touchstart', press, { passive: false });
            el.addEventListener('touchend', release, { passive: false });
            el.addEventListener('mousedown', press);
            el.addEventListener('mouseup', release);
            el.addEventListener('mouseleave', release);
        };
        // Mobile controls control Player 1
        bindButton('btn-left', ['KeyA']);
        bindButton('btn-right', ['KeyD']);
        bindButton('btn-jump', ['KeyW']);
        bindButton('btn-block', ['KeyS']);
        bindButton('btn-attack', ['Space']);
    }

    setKey(code, isPressed) {
        this.keys[code] = isPressed;
    }
    
    gameLoop(currentTime) {
        const deltaTime = this.lastTime === 0 ? 16 : (currentTime - this.lastTime);
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
        }
        this.render();
        
        requestAnimationFrame(this.gameLoop);
    }
    
    update(deltaTime) {
        // deltaTime in ms
        const dtSeconds = deltaTime / 1000;
        
        // Update inputs for CPU if enabled
        if (this.aiEnabled) {
            this.computeAI();
        }
        
        // Update players
        this.player1.update(deltaTime, this.keys, this.platforms, this.player2);
        this.player2.update(deltaTime, this.aiEnabled ? this.aiKeys : this.keys, this.platforms, this.player1);
        
        // Handle attacks
        this.handleAttacks();
        
        // Update effects
        this.updateEffects(dtSeconds);
        
        // Countdown timer
        this.timeRemainingSeconds = Math.max(0, this.timeRemainingSeconds - dtSeconds);
        if (this.timeRemainingSeconds <= 0) {
            // Time up: determine winner by health
            if (this.player1.health === this.player2.health) {
                this.endRound('draw');
            } else if (this.player1.health > this.player2.health) {
                this.endRound('player1');
            } else {
                this.endRound('player2');
            }
        }
        
        // Check for round end (health)
        if (this.player1.health <= 0) {
            this.endRound('player2');
        } else if (this.player2.health <= 0) {
            this.endRound('player1');
        }
        
        // Update UI
        this.updateUI();
    }
    
    computeAI() {
        // Simple heuristic AI for Player 2
        const ai = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, Enter: false };
        const me = this.player2;
        const opp = this.player1;

        const now = Date.now();
        const stunned = now < me.stunUntil;
        const horizontalCenterMe = me.x + me.width / 2;
        const horizontalCenterOpp = opp.x + opp.width / 2;
        const dx = horizontalCenterOpp - horizontalCenterMe;
        const absDx = Math.abs(dx);
        const verticalDiff = Math.abs((opp.y + opp.height/2) - (me.y + me.height/2));
        const desiredRange = 40; // target melee range
        const inRange = absDx < 50 && verticalDiff < 60;

        if (!stunned) {
            // Defensive: if opponent is attacking and close, block
            if (opp.isAttacking && absDx < 80 && me.onGround) {
                ai.ArrowDown = true;
            }
            // Movement toward/away
            if (!ai.ArrowDown) {
                if (absDx > desiredRange + 10) {
                    if (dx > 0) ai.ArrowRight = true; else ai.ArrowLeft = true;
                } else if (absDx < desiredRange - 10) {
                    if (dx > 0) ai.ArrowLeft = true; else ai.ArrowRight = true;
                }
            }
            // Try to align vertically: if opponent is significantly higher, try a jump
            if (me.onGround && opp.y + opp.height/2 < me.y && verticalDiff > 40) {
                ai.ArrowUp = true;
            }
            // Attack when in range and off cooldown
            if (inRange && me.canAttack() && !ai.ArrowDown) {
                ai.Enter = true;
            }
        }
        this.aiKeys = ai;
    }
    
    handleAttacks() {
        const tryAttack = (attacker, target, attackKey, keySet) => {
            if (keySet[attackKey] && attacker.canAttack()) {
                attacker.attack();
                if (this.isPlayerInRange(attacker, target)) {
                    // Damage calculation with blocking
                    const baseDamage = 15;
                    const targetBlocking = target.isBlocking;
                    const damage = targetBlocking ? Math.ceil(baseDamage * 0.3) : baseDamage;
                    target.takeDamage(damage);
                    
                    // Knockback
                    const direction = attacker.getFacingDirectionRelativeTo(target);
                    const kbX = targetBlocking ? 120 : 220;
                    const kbY = targetBlocking ? 150 : 250;
                    target.applyKnockback(direction, kbX, kbY);
                    
                    // Hit stun
                    const stunMs = targetBlocking ? 120 : 220;
                    target.startStun(stunMs);
                    
                    // Effects + sound
                    this.createHitEffect(target.x + target.width / 2, target.y + target.height / 2);
                    this.playHitSound();
                }
            }
        };
        
        // Player 1 attack (Space)
        tryAttack(this.player1, this.player2, 'Space', this.keys);
        // Player 2 attack (Enter)
        tryAttack(this.player2, this.player1, 'Enter', this.aiEnabled ? this.aiKeys : this.keys);
    }
    
    isPlayerInRange(attacker, target) {
        // Directional hitbox in front of attacker
        const attackRange = 50;
        const verticalTolerance = 60;
        const facing = attacker.facing;
        
        const hitbox = {
            x: facing === 'right' ? attacker.x + attacker.width : attacker.x - attackRange,
            y: attacker.y,
            width: attackRange,
            height: attacker.height,
        };
        
        // Expand slightly vertically
        hitbox.y -= 10;
        hitbox.height += 20;
        
        const targetBox = { x: target.x, y: target.y, width: target.width, height: target.height };
        
        const overlap = !(hitbox.x + hitbox.width < targetBox.x ||
                          hitbox.x > targetBox.x + targetBox.width ||
                          hitbox.y + hitbox.height < targetBox.y ||
                          hitbox.y > targetBox.y + targetBox.height);
        
        // Also check vertical difference to avoid hits across big height gaps
        const verticalOk = Math.abs((attacker.y + attacker.height/2) - (target.y + target.height/2)) < verticalTolerance;
        
        return overlap && verticalOk;
    }
    
    createHitEffect(x, y) {
        // Particle burst
        const particleCount = 10;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2) * (i / particleCount);
            const speed = 120 + Math.random() * 80;
            this.effects.push({
                type: 'particle',
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3, // seconds
                maxLife: 0.3,
                color: i % 2 === 0 ? '#ffff66' : '#ff4444',
            });
        }
    }
    
    updateEffects(dtSeconds) {
        const gravity = 600;
        this.effects.forEach(effect => {
            effect.life -= dtSeconds;
            if (effect.type === 'particle') {
                effect.vy += gravity * dtSeconds * 0.5;
                effect.x += effect.vx * dtSeconds;
                effect.y += effect.vy * dtSeconds;
            }
        });
        this.effects = this.effects.filter(e => e.life > 0);
    }
    
    renderEffects() {
        this.effects.forEach(effect => {
            const alpha = Math.max(0, effect.life / effect.maxLife);
            if (effect.type === 'particle') {
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = effect.color;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }
    
    playHitSound() {
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = this.audioCtx;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'square';
            o.frequency.value = 220 + Math.random() * 60;
            g.gain.value = 0.05;
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            setTimeout(() => { o.stop(); }, 100);
        } catch (_) {
            // ignore audio errors
        }
    }
    
    endRound(winner) {
        if (this.gameState === 'roundOver' || this.gameState === 'matchOver') return;
        this.gameState = 'roundOver';

        let message = '';
        if (winner === 'player1') {
            this.p1Wins += 1;
            message = 'Player 1 Wins the Round!';
        } else if (winner === 'player2') {
            this.p2Wins += 1;
            message = 'Player 2 Wins the Round!';
        } else {
            message = 'Draw!';
        }

        const matchWonBy = this.p1Wins >= this.winsToWinMatch ? 'player1' : (this.p2Wins >= this.winsToWinMatch ? 'player2' : null);

        if (matchWonBy) {
            const who = matchWonBy === 'player1' ? 'Player 1' : 'Player 2';
            this.gameMessage.innerHTML = `
                <div>${message}<br/>Match Over — ${who} Wins!</div>
                <button onclick="game.resetMatch()">New Match</button>
            `;
            this.gameState = 'matchOver';
        } else {
            this.gameMessage.innerHTML = `
                <div>${message}</div>
                <button onclick="game.nextRound()">Next Round</button>
                <button onclick="game.resetMatch()">New Match</button>
            `;
        }
        this.gameMessage.classList.remove('hidden');
        this.updateUI();
    }
    
    togglePause() {
        if (this.gameState === 'matchOver' || this.gameState === 'roundOver') return;
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.gameMessage.classList.add('hidden');
        } else if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.gameMessage.innerHTML = `
                <div>Paused</div>
                <button onclick="game.togglePause()">Resume</button>
                <button onclick="game.resetMatch()">Restart Match</button>
            `;
            this.gameMessage.classList.remove('hidden');
        }
    }
    
    nextRound() {
        this.round += 1;
        this.restartRound();
    }

    restartRound() {
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
        this.player1.isBlocking = false;
        this.player2.isBlocking = false;
        this.player1.stunUntil = 0;
        this.player2.stunUntil = 0;
        this.timeRemainingSeconds = this.roundDurationSeconds;
        this.effects = [];
        this.gameState = 'playing';
        this.gameMessage.classList.add('hidden');
        this.updateUI();
    }
    
    resetMatch() {
        this.round = 1;
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.restartRound();
    }
    
    updateUI() {
        this.player1HealthBar.style.width = Math.max(0, this.player1.health) + '%';
        this.player2HealthBar.style.width = Math.max(0, this.player2.health) + '%';
        if (this.roundInfoEl) {
            const time = Math.ceil(this.timeRemainingSeconds);
            this.roundInfoEl.textContent = `Round ${this.round} — ${time}s`;
        }
        if (this.p1WinsEl) this.p1WinsEl.textContent = String(this.p1Wins);
        if (this.p2WinsEl) this.p2WinsEl.textContent = String(this.p2Wins);
        if (this.cpuToggleBtn) {
            this.cpuToggleBtn.setAttribute('aria-pressed', this.aiEnabled ? 'true' : 'false');
            this.cpuToggleBtn.textContent = `CPU: ${this.aiEnabled ? 'On' : 'Off'}`;
        }
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
        
        // Draw effects on top
        this.renderEffects();
        
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

    toggleAI() {
        this.aiEnabled = !this.aiEnabled;
        // Clear any AI input when disabling
        if (!this.aiEnabled) {
            this.aiKeys = {};
        }
        this.updateUI();
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
        
        // Facing and state
        this.facing = 'right'; // 'left' | 'right'
        this.isBlocking = false;
        this.blockSpeedMultiplier = 0.35;
        this.stunUntil = 0;
        
        // Combat
        this.lastAttackTime = 0;
        this.attackCooldown = 500;
        this.isAttacking = false;
        this.attackDuration = 200;
    }
    
    update(deltaTime, keys, platforms, opponent) {
        const dt = deltaTime / 1000; // Convert to seconds
        
        // Update facing based on opponent position if not moving
        if (opponent) {
            if (opponent.x + opponent.width / 2 > this.x + this.width / 2) {
                this.facing = 'right';
            } else {
                this.facing = 'left';
            }
        }
        
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
        const now = Date.now();
        const stunned = now < this.stunUntil;
        
        this.velocityX = 0;
        this.isBlocking = false;
        
        if (this.id === 'player1') {
            // Player 1 controls (WASD + S for block)
            const left = keys.KeyA;
            const right = keys.KeyD;
            const jump = keys.KeyW;
            const block = keys.KeyS;
            
            if (block && this.onGround && !stunned) {
                this.isBlocking = true;
            }
            
            const currentSpeed = this.isBlocking ? this.speed * this.blockSpeedMultiplier : this.speed;
            if (left && !stunned) this.velocityX = -currentSpeed;
            if (right && !stunned) this.velocityX = currentSpeed;
            if (jump && this.onGround && !this.isBlocking && !stunned) {
                this.velocityY = -this.jumpPower;
                this.onGround = false;
            }
        } else {
            // Player 2 controls (Arrow keys + ArrowDown for block)
            const left = keys.ArrowLeft;
            const right = keys.ArrowRight;
            const jump = keys.ArrowUp;
            const block = keys.ArrowDown;
            
            if (block && this.onGround && !stunned) {
                this.isBlocking = true;
            }
            
            const currentSpeed = this.isBlocking ? this.speed * this.blockSpeedMultiplier : this.speed;
            if (left && !stunned) this.velocityX = -currentSpeed;
            if (right && !stunned) this.velocityX = currentSpeed;
            if (jump && this.onGround && !this.isBlocking && !stunned) {
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
        const now = Date.now();
        const stunned = now < this.stunUntil;
        return !this.isBlocking && !stunned && (now - this.lastAttackTime > this.attackCooldown);
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
    
    startStun(ms) {
        this.stunUntil = Math.max(this.stunUntil, Date.now() + ms);
    }
    
    applyKnockback(direction, kbX, kbY) {
        const dirX = direction === 'right' ? 1 : -1;
        this.velocityX = dirX * kbX;
        this.velocityY = -Math.abs(kbY);
        this.onGround = false;
    }
    
    getFacingDirectionRelativeTo(other) {
        return (other.x + other.width / 2) > (this.x + this.width / 2) ? 'right' : 'left';
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw player body
        ctx.fillStyle = this.color;
        if (this.isAttacking) {
            ctx.fillStyle = '#ffff00'; // Flash yellow when attacking
        }
        if (this.isBlocking) {
            ctx.fillStyle = '#999999'; // Gray when blocking
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
        
        // Draw attack indicator (directional)
        if (this.isAttacking) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
            const attackRange = 50;
            const hx = this.facing === 'right' ? this.x + this.width : this.x - attackRange;
            ctx.fillRect(hx, this.y - 10, attackRange, this.height + 20);
        }
        
        // Draw block indicator (shield)
        if (this.isBlocking) {
            ctx.strokeStyle = '#66ccff';
            ctx.lineWidth = 3;
            const shieldX = this.facing === 'right' ? this.x + this.width + 4 : this.x - 14;
            ctx.beginPath();
            ctx.arc(shieldX, this.y + this.height / 2, 10, Math.PI / 2, -Math.PI / 2, this.facing === 'left');
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Game();
}); 