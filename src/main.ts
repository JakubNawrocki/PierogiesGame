import Phaser from 'phaser';
import WelcomeScene from './scenes/WelcomeScene';
import GameScene from './scenes/GameScene';
import GameOverScene from './scenes/GameOverScene';
import UIScene from './scenes/UIScene'; // For potential UI overlays
import SceneKeys from './consts/SceneKeys';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800, // Adjust if your design needs a different base width
    height: 600, // Adjust if your design needs a different base height
    physics: {
        default: 'arcade',
        arcade: {
            // gravity: { y: 1000 }, // Global gravity; player/objects can set their own
            debug: false // SET TO TRUE to see physics bodies during development!
        }
    },
    scene: [WelcomeScene, GameScene, GameOverScene, UIScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Declare global window.ethereum for TypeScript
declare global {
    interface Window {
        ethereum?: any; // Use a more specific type if you have Metamask types installed
    }
}

export default new Phaser.Game(config);