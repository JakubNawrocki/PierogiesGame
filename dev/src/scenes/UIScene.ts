import Phaser from 'phaser';
import SceneKeys from '../consts/SceneKeys';
// Import GameScene if you need to cast to its type explicitly, e.g., for calling a public method.
// import GameScene from './GameScene'; 

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
            this.scene.stop(this.fromSceneKey); 
            this.scene.stop(SceneKeys.UI);
            // Ensure WelcomeScene is started, or another appropriate menu scene
            const gameScene = this.scene.get(this.fromSceneKey);
            if (gameScene && (gameScene as any).isPaused) { // Check if GameScene has an isPaused property
                 (gameScene as any).isPaused = false; // Reset pause state if managing manually
            }
            this.scene.start(SceneKeys.Welcome);
        }, this);
    }
    
    private closeUI() {
        this.scene.stop(SceneKeys.UI);
        if (this.fromSceneKey) {
            const fromSceneInstance = this.scene.get(this.fromSceneKey);
            // Check if the scene has a 'togglePause' method and is currently paused
            if (fromSceneInstance && typeof (fromSceneInstance as any).togglePause === 'function' && (fromSceneInstance as any).isPaused) {
                (fromSceneInstance as any).togglePause();
            } else if (fromSceneInstance && fromSceneInstance.sys.isPaused()) {
                 // Fallback if togglePause isn't the primary mechanism or if scene was paused by manager
                fromSceneInstance.scene.resume();
            }
        }
    }
}