import Phaser from 'phaser';
import SceneKeys from '../consts/SceneKeys';
// import TextureKeys from '../consts/TextureKeys'; // Not used directly for loading here, but good for consistency if UI has icons

interface UISceneData {
    fromScene: SceneKeys;
    type?: 'pauseMenu' | 'leaderboard' | 'profile';
}

export default class UIScene extends Phaser.Scene {
    private fromSceneKey!: SceneKeys;
    private uiType?: 'pauseMenu' | 'leaderboard' | 'profile';

    constructor() {
        super({ key: SceneKeys.UI });
    }

    init(data: UISceneData) {
        this.fromSceneKey = data.fromScene;
        this.uiType = data.type;
    }

    create() {
        this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.5);

        if (this.uiType === 'pauseMenu') {
            this.createPauseMenu();
        } else if (this.uiType === 'leaderboard') {
            this.add.text(this.scale.width/2, this.scale.height/2, "Leaderboard (TODO)", {fontSize: '32px'}).setOrigin(0.5);
            this.add.text(this.scale.width/2, this.scale.height/2 + 50, "Tap to Close", {fontSize: '20px'}).setOrigin(0.5).setInteractive().on('pointerdown', this.closeUI, this);
        } else if (this.uiType === 'profile') {
             this.add.text(this.scale.width/2, this.scale.height/2, "User Profile (TODO)", {fontSize: '32px'}).setOrigin(0.5);
             this.add.text(this.scale.width/2, this.scale.height/2 + 50, "Tap to Close", {fontSize: '20px'}).setOrigin(0.5).setInteractive().on('pointerdown', this.closeUI, this);
        } else {
             this.add.text(this.scale.width/2, this.scale.height/2 + 50, "Tap to Close", {fontSize: '20px'}).setOrigin(0.5).setInteractive().on('pointerdown', this.closeUI, this);
        }

        this.input.keyboard.once('keydown-ESC', this.closeUI, this);
    }

    private createPauseMenu() {
        this.add.text(this.scale.width / 2, 200, 'PAUSED', {
            fontSize: '48px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        const resumeButton = this.add.text(this.scale.width / 2, 300, 'Resume', {
            fontSize: '32px', fill: '#4CAF50', backgroundColor: '#FFFFFF', padding: {x:10, y:5}
        }).setOrigin(0.5).setInteractive();
        resumeButton.on('pointerdown', this.closeUI, this);

        const quitButton = this.add.text(this.scale.width / 2, 380, 'Quit to Menu', {
            fontSize: '32px', fill: '#F44336', backgroundColor: '#FFFFFF', padding: {x:10, y:5}
        }).setOrigin(0.5).setInteractive();
        quitButton.on('pointerdown', () => {
            const fromSceneInstance = this.scene.get(this.fromSceneKey);
            if (fromSceneInstance) {
                // Reset pause state if GameScene manages it via a public property
                if (typeof (fromSceneInstance as any).isPaused !== 'undefined') {
                    (fromSceneInstance as any).isPaused = false;
                }
                this.scene.stop(this.fromSceneKey);
            }
            this.scene.stop(SceneKeys.UI);
            this.scene.start(SceneKeys.Welcome);
        }, this);
    }
    
    private closeUI() {
        this.scene.stop(SceneKeys.UI);
        if (this.fromSceneKey) {
            const fromSceneInstance = this.scene.get(this.fromSceneKey);
            if (fromSceneInstance && typeof (fromSceneInstance as any).togglePause === 'function' && (fromSceneInstance as any).isPaused) {
                (fromSceneInstance as any).togglePause(); // Call GameScene's public togglePause method
            } else if (fromSceneInstance && fromSceneInstance.sys.isPaused()) {
                fromSceneInstance.scene.resume(); // Fallback resume
            }
        }
    }
}