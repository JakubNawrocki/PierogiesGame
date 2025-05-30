import Phaser from 'phaser';
import SceneKeys from '../consts/SceneKeys';
import TextureKeys from '../consts/TextureKeys';
import Player from '../game/Player';
// import { isUserHolder } from '../web3/ContractUtils';
import { getCurrentWalletAddress } from '../web3/MetamaskUtils';
// Assuming UIScene is correctly imported if GameScene needs to interact with its type, like in closeUI.
// If GameScene defines a public togglePause method, UIScene can call it.
// For now, removing explicit GameScene type cast in UIScene and relying on scene events or public methods if needed.

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
    private gameSpeed: number = 250;
    private initialGameSpeed: number = 250;
    private maxGameSpeed: number = 500;
    
    public isPaused: boolean = false; // Made public for UIScene if direct call needed, though event-based is often cleaner
    private pauseKey!: Phaser.Input.Keyboard.Key;
    private pauseButton!: Phaser.GameObjects.Image;

    private obstacleTimer!: Phaser.Time.TimerEvent;
    private pierogiTimer!: Phaser.Time.TimerEvent;

    private worldTeleportX: number = 3200;

    constructor() {
        super({ key: SceneKeys.Game });
    }

    preload() {
        // Backgrounds
        this.load.image(TextureKeys.BackgroundKitchen, 'assets/kitchen_background_main.png');
        this.load.image(TextureKeys.BackgroundParallaxFar, 'assets/kitchen_background_parallax_far.png');
        this.load.image(TextureKeys.BackgroundParallaxMiddle, 'assets/kitchen_background_parallax_middle.png');
        this.load.image(TextureKeys.GroundKitchen, 'assets/kitchen_ground.png');
        
        // Player
        this.load.spritesheet(TextureKeys.PlayerSpriteSheet, 'assets/player_spritesheet.png', { 
            frameWidth: 64, 
            frameHeight: 64
        }); // Ensure this file exists at public/assets/player_spritesheet.png
        
        // Particles
        this.load.image(TextureKeys.DustParticle, 'assets/dust_particle.png');
        this.load.image(TextureKeys.PierogiParticle, 'assets/pierogi_particle.png'); // Ensure this file exists
        
        // Obstacles
        this.load.image(TextureKeys.ObstacleKnife, 'assets/knife_obstacle.png');
        this.load.image(TextureKeys.ObstacleOnion, 'assets/onion_obstacle.png');
        this.load.image(TextureKeys.ObstacleKielbasa, 'assets/kielbasa_obstacle.png');
        this.load.image(TextureKeys.ObstacleGrater, 'assets/grater_obstacle.png');
        this.load.image(TextureKeys.ObstacleRollingPin, 'assets/rolling_pin_obstacle.png'); // Ensure this file exists
        
        // Collectible
        this.load.image(TextureKeys.Pierogi, 'assets/pierogi_collectible.png');
        
        // UI Icons
        this.load.image(TextureKeys.PauseIcon, 'assets/pause_icon.png');
        this.load.image(TextureKeys.PlayIcon, 'assets/play_icon.png'); // Ensure this file exists
    }

    async create() {
        this.score = 0;
        this.gameSpeed = this.initialGameSpeed;
        this.isPaused = false;
        this.physics.world.gravity.y = 0;

        this.bgParallaxFar = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, TextureKeys.BackgroundParallaxFar)
            .setOrigin(0,0).setScrollFactor(0);
        this.bgParallaxMiddle = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, TextureKeys.BackgroundParallaxMiddle)
            .setOrigin(0,0).setScrollFactor(0);
        this.bgKitchen = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, TextureKeys.BackgroundKitchen)
            .setOrigin(0,0).setScrollFactor(0);
        
        this.ground = this.physics.add.staticGroup();
        const groundSprite = this.ground.create(this.scale.width / 2, this.scale.height - 40, TextureKeys.GroundKitchen)
            .refreshBody();
        groundSprite.body.updateFromGameObject();

        this.player = new Player(this, 150, this.scale.height - groundSprite.displayHeight);
        this.add.existing(this.player);
        this.player.body.setDragX(100);

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
        
        this.cameras.main.startFollow(this.player, true, 0.08, 0.05, -this.scale.width / 2 + 200, 0, true);
        this.cameras.main.setFollowOffset(-this.scale.width / 2 + 200, 0);
        
        this.cameras.main.zoomTo(1.1, 1000, 'Sine.easeInOut', true, (camera, progress) => {
            if (progress === 1) {
                this.cameras.main.zoomTo(1, 500, 'Sine.easeInOut');
            }
        });

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.P);
        });
    }

    update(time: number, delta: number) {
        const dt = delta / 1000;

        if (this.player.isTrulyDead() && this.player.body.onFloor()) {
            if (this.scene.manager.isActive(SceneKeys.GameOver)) return;
            this.scene.launch(SceneKeys.GameOver, { score: Math.floor(this.score) });
            this.pauseTimers(true);
            this.physics.pause();
            return;
        }
        if (this.isPaused || this.player.isTrulyDead()) {
            return;
        }

        this.bgParallaxFar.tilePositionX = this.cameras.main.scrollX * 0.2;
        this.bgParallaxMiddle.tilePositionX = this.cameras.main.scrollX * 0.5;
        this.bgKitchen.tilePositionX = this.cameras.main.scrollX;

        this.obstacles.getChildren().forEach(child => {
            const obstacle = child as Phaser.Physics.Arcade.Sprite;
            obstacle.x -= this.gameSpeed * dt;
            if (obstacle.x < this.cameras.main.scrollX - (obstacle.displayWidth || 100)) {
                this.obstacles.killAndHide(obstacle);
                obstacle.destroy();
            }
        });
         this.pierogies.getChildren().forEach(child => {
            const pierogi = child as Phaser.Physics.Arcade.Sprite;
            pierogi.x -= this.gameSpeed * dt;
             if (pierogi.x < this.cameras.main.scrollX - (pierogi.displayWidth || 50)) {
                this.pierogies.killAndHide(pierogi);
                pierogi.destroy();
            }
        });

        if (this.cameras.main.scrollX > this.player.x - 150 && this.player.x > this.worldTeleportX * 0.5) {
             this.player.body.velocity.x = Math.max(this.player.body.velocity.x, this.gameSpeed * 0.8);
        } else if (this.player.x < 100 && this.cameras.main.scrollX < 50) {
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
    }

    private spawnObstacle() {
        if (this.player.isTrulyDead() || this.isPaused) return;

        const obstacleTypes = [
            TextureKeys.ObstacleKnife, TextureKeys.ObstacleKielbasa, TextureKeys.ObstacleOnion,
            TextureKeys.ObstacleGrater, TextureKeys.ObstacleRollingPin
        ];
        const randomType = Phaser.Math.RND.pick(obstacleTypes);
        
        const spawnX = this.cameras.main.scrollX + this.scale.width + 100;
        let yPos = Phaser.Math.Between(150, this.scale.height - 150);
        let obsWidth = 50, obsHeight = 100;

        switch(randomType) {
            case TextureKeys.ObstacleKnife: obsWidth=30; obsHeight=Phaser.Math.Between(80, 200); yPos = Phaser.Math.Between(this.scale.height - 80 - obsHeight, this.scale.height - 80); break;
            case TextureKeys.ObstacleKielbasa: obsWidth=100; obsHeight=40; yPos = Phaser.Math.Between(100, this.scale.height - 100); break;
            case TextureKeys.ObstacleOnion: obsWidth=50; obsHeight=50; yPos = Phaser.Math.Between(this.scale.height - 80 - obsHeight, this.scale.height - 80); break;
            case TextureKeys.ObstacleGrater: obsWidth=60; obsHeight=Phaser.Math.Between(120, 250); yPos = this.scale.height - 40 - obsHeight / 2; break;
            case TextureKeys.ObstacleRollingPin: obsWidth=120; obsHeight=30; yPos = Phaser.Math.RND.pick([150, this.scale.height / 2, this.scale.height - 150]); break;
        }

        const obstacle = this.obstacles.get(spawnX, yPos, randomType) as Phaser.Physics.Arcade.Sprite;
        if (!obstacle) return;

        obstacle.setActive(true).setVisible(true).setDisplaySize(obsWidth, obsHeight);
        obstacle.body.setSize(obsWidth * 0.8, obsHeight * 0.8);
        obstacle.body.updateFromGameObject();
    }
    
    private spawnPierogiPattern() {
        if (this.player.isTrulyDead() || this.isPaused) return;
        const patternType = Phaser.Math.Between(0, 2);
        const startX = this.cameras.main.scrollX + this.scale.width + 50;
        const baseY = Phaser.Math.Between(150, this.scale.height - 200);

        for (let i = 0; i < 5; i++) {
            let x = startX + (i * 60);
            let y = baseY;
            if (patternType === 1) y += Math.sin(i * 0.5) * 50;
            if (patternType === 2 && i % 2 === 0) y -= 30;

            const pierogi = this.pierogies.get(x, y, TextureKeys.Pierogi) as Phaser.Physics.Arcade.Sprite;
            if(!pierogi) continue;
            pierogi.setActive(true).setVisible(true).setDisplaySize(35, 25);
            pierogi.body.setSize(30,20).setCircle(12);
            pierogi.body.updateFromGameObject();
        }
    }

    private handlePlayerObstacleCollision(playerObj: Phaser.GameObjects.GameObject, obstacleObj: Phaser.GameObjects.GameObject) {
        if (this.player.isDeadOrHit()) return;
        
        const obstacle = obstacleObj as Phaser.Physics.Arcade.Sprite;
        this.player.handleHit(); 
        this.cameras.main.shake(100, 0.01);

        obstacle.disableBody(true, false);
        this.tweens.add({ targets: obstacle, alpha: 0.5, angle: 45, duration: 300});
    }

    private collectPierogi(playerObj: Phaser.GameObjects.GameObject, pierogiGameObject: Phaser.GameObjects.GameObject) {
        const pierogi = pierogiGameObject as Phaser.Physics.Arcade.Sprite;
        
        this.tweens.add({
            targets: pierogi, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 200, ease: 'Power2',
            onComplete: () => {
                this.pierogies.killAndHide(pierogi);
                pierogi.destroy();
            }
        });
        
        const particles = this.add.particles(pierogi.x, pierogi.y, TextureKeys.PierogiParticle, { // Using TextureKey
            speed: { min: 50, max: 150 }, scale: { start: 0.4, end: 0 },
            lifespan: 800, blendMode: 'ADD', quantity: 6, emitting: false
        });
        
        particles.explode(10, pierogi.x, pierogi.y);
        this.time.delayedCall(800, () => particles.destroy());
        
        const oldScore = this.score;
        this.score += 10;
        
        const floatingText = this.add.text(pierogi.x, pierogi.y - 20, '+10', {
            fontSize: '20px', fontStyle: 'bold', color: '#FFD700', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: floatingText, y: floatingText.y - 50, alpha: 0, duration: 1000, ease: 'Power1',
            onComplete: () => floatingText.destroy()
        });
        
        this.tweens.addCounter({
            from: oldScore, to: this.score, duration: 300, ease: 'Power1',
            onUpdate: (tween) => {
                const value = Math.floor(tween.getValue());
                this.scoreText.setText('Score: ' + value);
            }
        });
        
        const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xFFD700, 0.2)
            .setOrigin(0).setDepth(100).setBlendMode(Phaser.BlendModes.ADD);
            
        this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
    }
    
    public togglePause() { // Made public for UIScene to call if needed, otherwise can be private
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.pauseButton.setTexture(TextureKeys.PlayIcon);
            this.physics.pause();
            this.pauseTimers(true);
            if (this.player.playerSprite.anims.currentAnim) this.player.playerSprite.anims.pause(); // Check if anim exists
            this.scene.launch(SceneKeys.UI, { fromScene: SceneKeys.Game, type: 'pauseMenu' });
        } else {
            this.pauseButton.setTexture(TextureKeys.PauseIcon);
            this.physics.resume();
            this.pauseTimers(false);
            if(this.player.playerSprite.anims.currentAnim && this.player.playerSprite.anims.isPaused) this.player.playerSprite.anims.resume(); // Check if anim exists and is paused
            this.scene.stop(SceneKeys.UI);
        }
    }

    private pauseTimers(pause: boolean) {
        this.obstacleTimer.paused = pause;
        this.pierogiTimer.paused = pause;
    }
}