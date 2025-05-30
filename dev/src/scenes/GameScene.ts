import Phaser from 'phaser';
import SceneKeys from '../consts/SceneKeys';
import TextureKeys from '../consts/TextureKeys';
import Player from '../game/Player';
// import { isUserHolder } from '../web3/ContractUtils'; // If checking holder status for skins etc.
import { getCurrentWalletAddress } from '../web3/MetamaskUtils';

export default class GameScene extends Phaser.Scene {
    private player!: Player;
    private obstacles!: Phaser.Physics.Arcade.Group;
    private pierogies!: Phaser.Physics.Arcade.Group;
    private ground!: Phaser.Physics.Arcade.StaticGroup;

    private bgKitchen!: Phaser.GameObjects.TileSprite;
    private bgParallaxFar!: Phaser.GameObjects.TileSprite;
    private bgParallaxMiddle!: Phaser.GameObjects.TileSprite;
    
    private scoreText!: Phaser.GameObjects.Text;
    private score: number = 0;
    private gameSpeed: number = 250; // Base speed for obstacles in pixels/sec
    private initialGameSpeed: number = 250;
    private maxGameSpeed: number = 500;
    
    private isPaused: boolean = false;
    private pauseKey!: Phaser.Input.Keyboard.Key;
    private pauseButton!: Phaser.GameObjects.Image;

    private obstacleTimer!: Phaser.Time.TimerEvent;
    private pierogiTimer!: Phaser.Time.TimerEvent;

    private worldTeleportX: number = 3200; // e.g. 4x game width of 800

    constructor() {
        super({ key: SceneKeys.Game });
    }

    preload() {
        // Enable transparency in all images
        this.load.image(TextureKeys.BackgroundKitchen, 'assets/kitchen_background_main.png');
        this.load.image(TextureKeys.BackgroundParallaxFar, 'assets/kitchen_background_parallax_far.png');
        this.load.image(TextureKeys.BackgroundParallaxMiddle, 'assets/kitchen_background_parallax_middle.png');
        this.load.image(TextureKeys.GroundKitchen, 'assets/kitchen_ground.png');
        
        // Updated frameWidth/Height to match our generated asset
        this.load.spritesheet(TextureKeys.PlayerSpriteSheet, 'assets/player_spritesheet.png', { 
            frameWidth: 64, 
            frameHeight: 64
        });
        
        // Load particle textures with explicit alpha channel support
        this.load.image('dust', 'assets/dust_particle.png');
        
        // Load obstacle images with explicit alpha channel support
        this.load.image(TextureKeys.KnifeObstacle, 'assets/knife_obstacle.png');
        this.load.image(TextureKeys.OnionObstacle, 'assets/onion_obstacle.png');
        this.load.image(TextureKeys.KielbasaObstacle, 'assets/kielbasa_obstacle.png');
        this.load.image(TextureKeys.GraterObstacle, 'assets/grater_obstacle.png');
        this.load.image(TextureKeys.RollingPinObstacle, 'assets/rolling_pin_obstacle.png');
        
        // Load collectible with explicit alpha channel support
        this.load.image(TextureKeys.Pierogi, 'assets/pierogi_collectible.png');
        this.load.image('pierogi_particle', 'assets/pierogi_particle.png');
        
        // FIX: Add this line to load the ObstacleKnife texture
        this.load.image(TextureKeys.ObstacleKnife, 'assets/knife_obstacle.png');
        
        this.load.image(TextureKeys.ObstacleKielbasa, 'assets/kielbasa_obstacle.png');
        this.load.image(TextureKeys.ObstacleOnion, 'assets/onion_obstacle.png');
        this.load.image(TextureKeys.ObstacleGrater, 'assets/grater_obstacle.png');
        this.load.image(TextureKeys.ObstacleRollingPin, 'assets/rolling_pin_obstacle.png');
        
        this.load.image(TextureKeys.PauseIcon, 'assets/pause_icon.png');
        this.load.image(TextureKeys.PlayIcon, 'assets/play_icon.png');
    }

    async create() { // Make create async if you await holder status
        this.score = 0;
        this.gameSpeed = this.initialGameSpeed;
        this.isPaused = false;
        this.physics.world.gravity.y = 0; // Player sets its own gravity

        // Parallax Backgrounds
        this.bgParallaxFar = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, TextureKeys.BackgroundParallaxFar)
            .setOrigin(0,0).setScrollFactor(0);
        this.bgParallaxMiddle = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, TextureKeys.BackgroundParallaxMiddle)
            .setOrigin(0,0).setScrollFactor(0);
        this.bgKitchen = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, TextureKeys.BackgroundKitchen)
            .setOrigin(0,0).setScrollFactor(0);
        
        this.ground = this.physics.add.staticGroup();
        const groundSprite = this.ground.create(this.scale.width / 2, this.scale.height - 40, TextureKeys.GroundKitchen)
            // .setScale(this.scale.width / groundSprite.width) // Stretch to fit width
            .refreshBody();
        groundSprite.body.updateFromGameObject();


        // Player - potentially check holder status for skin
        // const wallet = getCurrentWalletAddress();
        // let useHolderSkin = false;
        // if (wallet) { useHolderSkin = await isUserHolder(); } // If isUserHolder is async
        // this.player = new Player(this, 150, this.scale.height - groundSprite.displayHeight - 10, useHolderSkin);
        this.player = new Player(this, 150, this.scale.height - groundSprite.displayHeight);
        this.add.existing(this.player);
        this.player.body.setDragX(100); // Add some air resistance

        this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
        this.pierogies = this.physics.add.group({ allowGravity: false });

        this.scoreText = this.add.text(16, 16, 'Score: 0', { 
            fontSize: '28px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 5 
        }).setScrollFactor(0);

        this.physics.add.collider(this.player, this.ground);
        this.physics.add.overlap(this.player, this.obstacles, this.handlePlayerObstacleCollision, undefined, this);
        this.physics.add.overlap(this.player, this.pierogies, this.collectPierogi, undefined, this);
        
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.isPaused && !this.player.isDeadOrHit()) {
                if (this.pauseButton.getBounds().contains(pointer.x, pointer.y)) return;
                this.player.fly();
            }
        });
        const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.on('down', () => {
             if (!this.isPaused && !this.player.isDeadOrHit()) this.player.fly();
        });


        this.obstacleTimer = this.time.addEvent({
            delay: Phaser.Math.Between(1800, 2500), callback: this.spawnObstacle, callbackScope: this, loop: true
        });
        this.pierogiTimer = this.time.addEvent({
            delay: Phaser.Math.Between(1000, 2000), callback: this.spawnPierogiPattern, callbackScope: this, loop: true
        });

        this.pauseButton = this.add.image(this.scale.width - 40, 40, TextureKeys.PauseIcon)
            .setScrollFactor(0).setInteractive().setDepth(100);
        this.pauseButton.on('pointerdown', this.togglePause, this);
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

        this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.scale.height);
        this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.scale.height);
        
        // Smoother camera follow with improved lerp values and easing
        this.cameras.main.startFollow(
            this.player, 
            true, 
            0.08, // Horizontal lerp (smoother)
            0.05, // Vertical lerp (even smoother for jumps)
            -this.scale.width / 2 + 200, // X offset
            0, // Y offset
            true // Round pixels for sharper rendering
        );
        
        // Add subtle camera effects
        this.cameras.main.setFollowOffset(-this.scale.width / 2 + 200, 0);
        
        // Add smooth zoom effect on game start
        this.cameras.main.zoomTo(1.1, 1000, 'Sine.easeInOut', true, (camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
            if (progress === 1) {
                this.cameras.main.zoomTo(1, 500, 'Sine.easeInOut');
            }
        });

        // Game events
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.P);
        });
    }

    update(time: number, delta: number) {
        const dt = delta / 1000; // Convert delta to seconds

        if (this.player.isTrulyDead() && this.player.body.onFloor()) {
            if (this.scene.manager.isActive(SceneKeys.GameOver)) return;
            this.scene.launch(SceneKeys.GameOver, { score: Math.floor(this.score) });
            this.pauseTimers(true);
            this.physics.pause(); // Pause all physics
            return;
        }
        if (this.isPaused || this.player.isTrulyDead()) {
            return;
        }

        this.bgParallaxFar.tilePositionX = this.cameras.main.scrollX * 0.2;
        this.bgParallaxMiddle.tilePositionX = this.cameras.main.scrollX * 0.5;
        this.bgKitchen.tilePositionX = this.cameras.main.scrollX;

        // Move obstacles
        this.obstacles.getChildren().forEach(child => {
            const obstacle = child as Phaser.Physics.Arcade.Sprite;
            obstacle.x -= this.gameSpeed * dt;
            if (obstacle.x < this.cameras.main.scrollX - (obstacle.displayWidth || 100)) {
                this.obstacles.killAndHide(obstacle);
                obstacle.destroy(); // Or recycle
            }
        });
        // Move pierogies
         this.pierogies.getChildren().forEach(child => {
            const pierogi = child as Phaser.Physics.Arcade.Sprite;
            pierogi.x -= this.gameSpeed * dt;
             if (pierogi.x < this.cameras.main.scrollX - (pierogi.displayWidth || 50)) {
                this.pierogies.killAndHide(pierogi);
                pierogi.destroy(); // Or recycle
            }
        });


        if (this.cameras.main.scrollX > this.player.x - 150 && this.player.x > this.worldTeleportX * 0.5) { // Give player some room
             this.player.body.velocity.x = Math.max(this.player.body.velocity.x, this.gameSpeed * 0.8); // Ensure player moves forward
        } else if (this.player.x < 100 && this.cameras.main.scrollX < 50) { // Don't get stuck at start
             this.player.body.velocity.x = this.gameSpeed;
        }


        if (this.cameras.main.scrollX >= this.worldTeleportX) {
            this.teleportWorldObjects(this.worldTeleportX);
        }

        this.score += this.gameSpeed * dt * 0.1;
        this.scoreText.setText('Score: ' + Math.floor(this.score));
        
        if (this.gameSpeed < this.maxGameSpeed && Math.floor(this.score) % 75 === 0 && this.score > 1) {
            this.gameSpeed = Math.min(this.maxGameSpeed, this.gameSpeed + 5);
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }
    }

    private teleportWorldObjects(teleportDist: number) {
        this.player.x -= teleportDist;
        this.obstacles.getChildren().forEach(obstacle => { (obstacle as Phaser.GameObjects.Sprite).x -= teleportDist; });
        this.pierogies.getChildren().forEach(pierogi => { (pierogi as Phaser.GameObjects.Sprite).x -= teleportDist; });
        // Camera scrollX is automatically adjusted because it follows the player.
    }

    private spawnObstacle() {
        if (this.player.isTrulyDead() || this.isPaused) return;

        const obstacleTypes = [
            TextureKeys.ObstacleKnife, TextureKeys.ObstacleKielbasa, TextureKeys.ObstacleOnion,
            TextureKeys.ObstacleGrater, TextureKeys.ObstacleRollingPin
        ];
        const randomType = Phaser.Math.RND.pick(obstacleTypes);
        
        const spawnX = this.cameras.main.scrollX + this.scale.width + 100;
        let yPos = Phaser.Math.Between(150, this.scale.height - 150); // Default Y
        let obsWidth = 50, obsHeight = 100; // Default dimensions

        switch(randomType) {
            case TextureKeys.ObstacleKnife: obsWidth=30; obsHeight=Phaser.Math.Between(80, 200); yPos = Phaser.Math.Between(this.scale.height - 80 - obsHeight, this.scale.height - 80); break;
            case TextureKeys.ObstacleKielbasa: obsWidth=100; obsHeight=40; yPos = Phaser.Math.Between(100, this.scale.height - 100); break;
            case TextureKeys.ObstacleOnion: obsWidth=50; obsHeight=50; yPos = Phaser.Math.Between(this.scale.height - 80 - obsHeight, this.scale.height - 80); break;
            case TextureKeys.ObstacleGrater: obsWidth=60; obsHeight=Phaser.Math.Between(120, 250); yPos = this.scale.height - 40 - obsHeight / 2; break; // Stands on ground
            case TextureKeys.ObstacleRollingPin: obsWidth=120; obsHeight=30; yPos = Phaser.Math.RND.pick([150, this.scale.height / 2, this.scale.height - 150]); break; // Can appear at different heights
        }

        const obstacle = this.obstacles.get(spawnX, yPos, randomType) as Phaser.Physics.Arcade.Sprite;
        if (!obstacle) return; // Group might be full or unable to create

        obstacle.setActive(true).setVisible(true).setDisplaySize(obsWidth, obsHeight);
        obstacle.body.setSize(obsWidth * 0.8, obsHeight * 0.8); // Adjust hitbox
        obstacle.body.updateFromGameObject();
    }
    
    private spawnPierogiPattern() {
        if (this.player.isTrulyDead() || this.isPaused) return;
        const patternType = Phaser.Math.Between(0, 2);
        const startX = this.cameras.main.scrollX + this.scale.width + 50;
        const baseY = Phaser.Math.Between(150, this.scale.height - 200);

        for (let i = 0; i < 5; i++) { // Spawn a line of 5 pierogies
            let x = startX + (i * 60);
            let y = baseY;
            if (patternType === 1) y += Math.sin(i * 0.5) * 50; // Wave pattern
            if (patternType === 2 && i % 2 === 0) y -= 30; // Zig-zag

            const pierogi = this.pierogies.get(x, y, TextureKeys.Pierogi) as Phaser.Physics.Arcade.Sprite;
            if(!pierogi) continue;
            pierogi.setActive(true).setVisible(true).setDisplaySize(35, 25);
            pierogi.body.setSize(30,20).setCircle(12); // Smaller hitbox
            pierogi.body.updateFromGameObject();
        }
    }

    private handlePlayerObstacleCollision(playerObj: Phaser.GameObjects.GameObject, obstacleObj: Phaser.GameObjects.GameObject) {
        if (this.player.isDeadOrHit()) return;
        
        const obstacle = obstacleObj as Phaser.Physics.Arcade.Sprite;
        // Maybe add different effects per obstacle?
        // For now, all obstacles trigger 'hit'
        this.player.handleHit(); 
        this.cameras.main.shake(100, 0.01);

        // Optional: "destroy" the obstacle by making it non-collidable or visually changed
        obstacle.disableBody(true, false); // Keep it visible but non-colliding
        this.tweens.add({ targets: obstacle, alpha: 0.5, angle: 45, duration: 300});


        // If you want some obstacles to be instantly lethal:
        // if (obstacle.texture.key === TextureKeys.ObstacleGrater) {
        //     this.player.kill();
        //     this.cameras.main.stopFollow();
        //     this.pauseTimers(true);
        // }
    }

    private collectPierogi(playerObj: Phaser.GameObjects.GameObject, pierogiGameObject: Phaser.GameObjects.GameObject) {
        const pierogi = pierogiGameObject as Phaser.Physics.Arcade.Sprite;
        
        // Create collection animation before removing the pierogi
        this.tweens.add({
            targets: pierogi,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.pierogies.killAndHide(pierogi);
                pierogi.destroy();
            }
        });
        
        // Create particle burst effect
        const particles = this.add.particles(pierogi.x, pierogi.y, 'pierogi_particle', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.4, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            quantity: 10
        });
        
        // Auto-destroy particles after animation completes
        this.time.delayedCall(600, () => {
            particles.destroy();
        });
        
        // Increase score
        this.score += 10;
        
        // Optional: Play sound
        // this.sound.play('collect_sound');
    }

    private togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.pauseButton.setTexture(TextureKeys.PlayIcon);
            this.physics.pause();
            this.pauseTimers(true);
            
            // Optional: Show pause overlay
            const overlay = this.add.rectangle(
                this.cameras.main.scrollX + this.scale.width / 2, 
                this.scale.height / 2, 
                this.scale.width, 
                this.scale.height, 
                0x000000, 
                0.5
            ).setScrollFactor(0).setDepth(90);
            
            const pauseText = this.add.text(
                this.cameras.main.scrollX + this.scale.width / 2, 
                this.scale.height / 2, 
                'PAUSED', 
                { fontSize: '32px', fill: '#FFFFFF', fontStyle: 'bold' }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(91);
            
            // Store references to remove later
            this.data.set('pauseOverlay', overlay);
            this.data.set('pauseText', pauseText);
        } else {
            this.pauseButton.setTexture(TextureKeys.PauseIcon);
            this.physics.resume();
            this.pauseTimers(false);
            
            // Remove pause overlay
            const overlay = this.data.get('pauseOverlay') as Phaser.GameObjects.Rectangle;
            const pauseText = this.data.get('pauseText') as Phaser.GameObjects.Text;
            
            if (overlay) overlay.destroy();
            if (pauseText) pauseText.destroy();
        }
    }

    private pauseTimers(pause: boolean) {
        this.obstacleTimer.paused = pause;
        this.pierogiTimer.paused = pause;
    }
}
