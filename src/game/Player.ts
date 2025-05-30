import Phaser from 'phaser';
import TextureKeys from '../consts/TextureKeys';
import AnimationKeys from '../consts/AnimationKeys';

enum PlayerState {
    Running,
    Flying,
    Falling,
    Hit, // For brief hit stun
    Dead
}

export default class Player extends Phaser.GameObjects.Container {
    public playerSprite: Phaser.GameObjects.Sprite; // Made public for GameScene to pause anims
    private currentState: PlayerState;
    public body!: Phaser.Physics.Arcade.Body;

    // These are IMPORTANT and depend on your actual sprite sheet frame size and desired hitbox.
    // The playerSprite's origin is (0.5, 1) [bottom-center].
    // The container's origin is (0,0) [top-left].
    // The physics body is positioned relative to the container's origin.
    private spriteActualWidth: number = 48; // Example: width of one frame
    private spriteActualHeight: number = 64; // Example: height of one frame
    
    private hitboxWidth: number = this.spriteActualWidth * 0.7; // Smaller hitbox
    private hitboxHeight: number = this.spriteActualHeight * 0.9;


    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.playerSprite = scene.add.sprite(0, 0, TextureKeys.PlayerSpriteSheet)
            .setOrigin(0.5, 1); // Origin at bottom-center for easier floor placement & body offset calc

        this.add(this.playerSprite);
        scene.physics.add.existing(this);
        
        this.body = this.body as Phaser.Physics.Arcade.Body;
        
        // Adjust physics body:
        // For origin (0.5,1) on sprite, to center hitbox under sprite:
        const offsetX = -this.hitboxWidth / 2;
        // To align hitbox top with (approximately) sprite's visual top (given sprite origin is at its visual bottom):
        const offsetY = -this.hitboxHeight; 
        this.body.setSize(this.hitboxWidth, this.hitboxHeight);
        this.body.setOffset(offsetX, offsetY);

        this.body.setCollideWorldBounds(true);
        this.body.setGravityY(1200); // Slightly higher gravity for more responsive feel

        this.currentState = PlayerState.Running;
        this.createAnimations();
        this.playerSprite.play(AnimationKeys.PlayerRun);
    }

    private createAnimations() {
        // IMPORTANT: Adjust 'start' and 'end' frame numbers based on YOUR sprite sheet!
        this.playerSprite.anims.create({
            key: AnimationKeys.PlayerRun,
            frames: this.scene.anims.generateFrameNumbers(TextureKeys.PlayerSpriteSheet, { start: 0, end: 5 }), // e.g., 6 frames
            frameRate: 12,
            repeat: -1
        });

        this.playerSprite.anims.create({
            key: AnimationKeys.PlayerFly,
            frames: this.scene.anims.generateFrameNumbers(TextureKeys.PlayerSpriteSheet, { start: 6, end: 7 }), // e.g., 2 frames
            frameRate: 10,
            repeat: -1
        });

        this.playerSprite.anims.create({
            key: AnimationKeys.PlayerFall,
            frames: this.scene.anims.generateFrameNumbers(TextureKeys.PlayerSpriteSheet, { start: 8, end: 9 }), // e.g., 2 frames
            frameRate: 10,
            repeat: 0 // Or a short loop
        });

        this.playerSprite.anims.create({
            key: AnimationKeys.PlayerHit,
            frames: this.scene.anims.generateFrameNumbers(TextureKeys.PlayerSpriteSheet, { start: 10, end: 11 }), // e.g., 2 frames
            frameRate: 10,
            repeat: 0 
        });
        
        this.playerSprite.anims.create({
            key: AnimationKeys.PlayerDead, // This could be a single frame or short anim
            frames: this.scene.anims.generateFrameNumbers(TextureKeys.PlayerSpriteSheet, { start: 12, end: 12 }), // e.g., 1 frame
            frameRate: 10
        });
    }

    private jumpStartTime: number = 0;
    private maxJumpTime: number = 300; // Max time in ms to hold jump button
    private minJumpVelocity: number = -350;
    private maxJumpVelocity: number = -550;
    private isJumping: boolean = false;

    public fly() {
        if (this.currentState === PlayerState.Dead || this.currentState === PlayerState.Hit) return;
        
        // Initial jump impulse with squash effect
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpStartTime = this.scene.time.now;
            
            // Squash effect before jumping
            this.scene.tweens.add({
                targets: this.playerSprite,
                scaleX: 1.2,
                scaleY: 0.8,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    // Apply initial velocity with easing
                    this.body.setVelocityY(this.minJumpVelocity);
                    
                    // Add dust particle effect on jump
                    this.createJumpDustEffect();
                }
            });
        }
        
        // Variable jump height based on button hold duration
        const jumpHoldTime = this.scene.time.now - this.jumpStartTime;
        if (jumpHoldTime < this.maxJumpTime) {
            // Calculate velocity based on hold time with easing
            const jumpProgress = Math.min(jumpHoldTime / this.maxJumpTime, 1);
            const easedProgress = this.easeOutQuad(jumpProgress);
            const jumpVelocity = this.minJumpVelocity + (this.maxJumpVelocity - this.minJumpVelocity) * easedProgress;
            
            this.body.setVelocityY(jumpVelocity);
        }
        
        if (this.currentState !== PlayerState.Flying) {
            this.playerSprite.play(AnimationKeys.PlayerFly, true);
            this.currentState = PlayerState.Flying;
        }
    }
    
    // Helper easing function for smoother jump
    private easeOutQuad(t: number): number {
        return t * (2 - t);
    }
    
    // Create dust particle effect when jumping
    private createJumpDustEffect() {
        if (!this.scene.particles) return;
        
        const particles = this.scene.add.particles(this.x, this.y + 30, 'dust', {
            speed: { min: 50, max: 100 },
            angle: { min: 230, max: 310 },
            scale: { start: 0.6, end: 0 },
            lifespan: 600,
            quantity: 8,
            gravityY: 300
        });
        
        // Auto-destroy particles after animation completes
        this.scene.time.delayedCall(600, () => {
            particles.destroy();
        });
    }
    
    // Call this when jump button is released
    public endJump() {
        this.isJumping = false;
    }

    preUpdate(time: number, delta: number) {
        // Delta-based movement for smoother animation
        const dt = delta / 1000; // Convert to seconds
        
        if (this.currentState === PlayerState.Dead) {
            if (this.body.velocity.x > 0) {
                this.body.velocity.x -= 20 * dt * 60; // Decelerate based on delta
                if (this.body.velocity.x < 0) this.body.setVelocityX(0);
            }
            // Smoother rotation when dead and falling
            if (!this.body.onFloor()) {
                this.playerSprite.rotation += 0.005 * delta;
            }
            return;
        }
        
        if (this.currentState === PlayerState.Hit) return; // Player can't act while hit

        const onFloor = this.body.onFloor();

        // Smoother state transitions with velocity thresholds
        if (this.body.velocity.y > 50 && !onFloor && this.currentState !== PlayerState.Falling) {
            // Transition animation from flying to falling
            this.playerSprite.play(AnimationKeys.PlayerFall, true);
            this.currentState = PlayerState.Falling;
            
            // Add subtle stretch effect when starting to fall
            this.scene.tweens.add({
                targets: this.playerSprite,
                scaleX: 0.9,
                scaleY: 1.1,
                duration: 200,
                yoyo: true,
                ease: 'Sine.Out'
            });
        } else if (onFloor && this.currentState !== PlayerState.Running) {
            // Landing animation with squash effect
            this.playerSprite.play(AnimationKeys.PlayerRun, true);
            this.currentState = PlayerState.Running;
            this.playerSprite.rotation = 0; // Reset rotation on landing
            
            // Add landing squash effect
            this.scene.tweens.add({
                targets: this.playerSprite,
                scaleX: 1.2,
                scaleY: 0.8,
                duration: 150,
                yoyo: true,
                ease: 'Bounce.Out'
            });
            
            // Create landing dust effect
            this.createLandingDustEffect();
        }
        
        // Add subtle bobbing animation while running
        if (this.currentState === PlayerState.Running && !this.scene.tweens.isTweening(this.playerSprite)) {
            this.scene.tweens.add({
                targets: this.playerSprite,
                y: this.playerSprite.y - 2,
                duration: 300,
                yoyo: true,
                ease: 'Sine.InOut',
                repeat: -1
            });
        }
    }
    
    // Create dust effect when landing
    private createLandingDustEffect() {
        if (!this.scene.particles) return;
        
        const particles = this.scene.add.particles(this.x, this.y + 30, 'dust', {
            speed: { min: 30, max: 80 },
            angle: { min: 230, max: 310 },
            scale: { start: 0.5, end: 0 },
            lifespan: 500,
            quantity: 6,
            gravityY: 200
        });
        
        // Auto-destroy particles after animation completes
        this.scene.time.delayedCall(500, () => {
            particles.destroy();
        });
    }
    
    public handleHit() {
        if (this.currentState === PlayerState.Dead || this.currentState === PlayerState.Hit) return;

        this.currentState = PlayerState.Hit;
        this.playerSprite.play(AnimationKeys.PlayerHit, true);
        this.body.setVelocityY(-200); // Knockback
        this.body.setVelocityX(this.body.velocity.x > 0 ? -50 : 0); // Slight backward push
        
        this.scene.tweens.add({
            targets: this.playerSprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.playerSprite.setAlpha(1);
                 // If still hit after blinking (e.g. not dead), return to falling or running
                if (this.currentState === PlayerState.Hit) {
                    this.currentState = this.body.onFloor() ? PlayerState.Running : PlayerState.Falling;
                    if (this.currentState === PlayerState.Running) this.playerSprite.play(AnimationKeys.PlayerRun)
                    else this.playerSprite.play(AnimationKeys.PlayerFall);
                }
            }
        });


        // After a short duration, player recovers or dies if hit again
        this.scene.time.delayedCall(800, () => {
            if (this.currentState === PlayerState.Hit) { // If not killed during hit stun
                this.currentState = PlayerState.Falling; // Default to falling
                 this.playerSprite.play(AnimationKeys.PlayerFall, true);
            }
        });
    }

    public kill() {
        if (this.currentState === PlayerState.Dead) return;

        this.currentState = PlayerState.Dead;
        this.playerSprite.play(AnimationKeys.PlayerDead, true);
        this.body.setAccelerationY(0);
        this.body.setVelocityY(Phaser.Math.Between(-150, -250)); 
        this.body.setVelocityX(100); 
        this.body.setCollideWorldBounds(false); 
        // this.playerSprite.setTint(0xff0000);
    }

    public isDeadOrHit(): boolean {
        return this.currentState === PlayerState.Dead || this.currentState === PlayerState.Hit;
    }
     public isTrulyDead(): boolean {
        return this.currentState === PlayerState.Dead;
    }
}