import Phaser from 'phaser';
import SceneKeys from '../consts/SceneKeys';
// import { fetchLeaderboardFromBackend } from '../web3/ContractUtils';

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
        // Semi-transparent background overlay
        this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.5);

        if (this.uiType === 'pauseMenu') {
            this.createPauseMenu();
        } else if (this.uiType === 'leaderboard') {
            // this.createLeaderboardDisplay();
            this.add.text(this.scale.width/2, this.scale.height/2, "Leaderboard (TODO)", {fontSize: '32px'}).setOrigin(0.5);
            this.add.text(this.scale.width/2, this.scale.height/2 + 50, "Tap to Close", {fontSize: '20px'}).setOrigin(0.5).setInteractive().on('pointerdown', this.closeUI, this);

        } else if (this.uiType === 'profile') {
            // this.createProfileDisplay();
             this.add.text(this.scale.width/2, this.scale.height/2, "User Profile (TODO)", {fontSize: '32px'}).setOrigin(0.5);
             this.add.text(this.scale.width/2, this.scale.height/2 + 50, "Tap to Close", {fontSize: '20px'}).setOrigin(0.5).setInteractive().on('pointerdown', this.closeUI, this);
        } else {
             this.add.text(this.scale.width/2, this.scale.height/2 + 50, "Tap to Close", {fontSize: '20px'}).setOrigin(0.5).setInteractive().on('pointerdown', this.closeUI, this);
        }

        this.input.keyboard.once('keydown-ESC', this.closeUI, this); // Close with ESC
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
            this.scene.stop(this.fromSceneKey); // Stop GameScene
            this.scene.stop(SceneKeys.UI);      // Stop this UI Scene
            this.scene.start(SceneKeys.Welcome); // Go to Welcome
        }, this);
    }
    
    // private async createLeaderboardDisplay() { /* ... Fetch and display ... */ }
    // private async createProfileDisplay() { /* ... Fetch and display ... */ }

    private closeUI() {
        this.scene.stop(SceneKeys.UI);
        if (this.fromSceneKey && this.scene.manager.getScene(this.fromSceneKey).sys.isPaused()) {
            // This relies on the GameScene handling its own unpausing logic (physics, timers, anims)
            (this.scene.get(this.fromSceneKey) as GameScene)['togglePause'](); // Call the public togglePause method if GameScene has it
        }
    }
}