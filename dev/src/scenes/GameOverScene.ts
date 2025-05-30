import Phaser from 'phaser';
import SceneKeys from '../consts/SceneKeys';
import TextureKeys from '../consts/TextureKeys';
import { getCurrentWalletAddress, signMessage } from '../web3/MetamaskUtils';
// import { submitScoreToBackend } from '../web3/ContractUtils';

export default class GameOverScene extends Phaser.Scene {
    private finalScore: number = 0;

    constructor() {
        super({ key: SceneKeys.GameOver });
    }

    init(data: { score: number }) {
        this.finalScore = data.score || 0;
    }

    create() {
        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0);
        this.tweens.add({ targets: overlay, alpha: 0.7, duration: 800, ease: 'Power2' });

        const gameOverTitle = this.add.text(this.scale.width / 2, -50, 'KAPUSTA KISZONA!', {
            fontSize: '48px', fill: '#FF6347', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5);
        
        this.tweens.add({ targets: gameOverTitle, y: 150, duration: 1200, ease: 'Bounce.Out', delay: 300 });
        
        const scoreText = this.add.text(this.scale.width / 2, 230, `Final Score: ${this.finalScore}`, {
            fontSize: '36px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5, align: 'center'
        }).setOrigin(0.5).setScale(0);
        
        this.tweens.add({ targets: scoreText, scale: 1, duration: 600, ease: 'Back.Out', delay: 1000 });

        const restartText = this.add.text(this.scale.width / 2, this.scale.height - 150, 'Tap or Press SPACE to Restart', {
            fontSize: '28px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: restartText, alpha: 1, duration: 500, delay: 1500,
            onComplete: () => {
                this.tweens.add({
                    targets: restartText, alpha: 0.3, duration: 800, ease: 'Sine.InOut', yoyo: true, repeat: -1
                });
            }
        });

        const walletAddress = getCurrentWalletAddress();
        if (walletAddress) {
            const submitButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Submit Score', {
                fontSize: '24px', fill: '#4CAF50', backgroundColor: '#FFFFFF', padding: { left: 10, right: 10, top: 5, bottom: 5},
                fontStyle: 'bold',
            }).setOrigin(0.5).setInteractive().setAlpha(0);
            
            this.tweens.add({ targets: submitButton, alpha: 1, duration: 500, delay: 1200 });
            
            submitButton.on('pointerover', () => { this.tweens.add({ targets: submitButton, scale: 1.1, duration: 100 }); });
            submitButton.on('pointerout', () => { this.tweens.add({ targets: submitButton, scale: 1, duration: 100 }); });

            submitButton.on('pointerdown', async () => {
                submitButton.setText('Submitting...');
                const messageToSign = `My Pierogies Runner score on ${new Date().toISOString().substring(0,10)} is ${this.finalScore}`;
                const signature = await signMessage(messageToSign);
                if (signature) {
                    console.log('Score Signed (Concept):', signature);
                    submitButton.setText('Score Submitted!');
                    this.tweens.add({ targets: submitButton, scale: 1.2, duration: 200, yoyo: true });
                    
                    const particles = this.add.particles(submitButton.x, submitButton.y, TextureKeys.PierogiParticle, { // Using TextureKey
                        speed: { min: 50, max: 150 }, scale: { start: 0.4, end: 0 },
                        lifespan: 1000, blendMode: 'ADD', quantity: 1, frequency: 100, emitting: true
                    });
                    this.time.delayedCall(2000, () => { particles.destroy(); });
                } else {
                    submitButton.setText('Sign & Submit Score');
                    // You might want to alert the user that signing failed or was cancelled.
                }
            });
        } else {
             const connectText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Connect Wallet on Welcome Screen to Submit Score', {
                fontSize: '16px', fill: '#CCCCCC', align: 'center', wordWrap: { width: 300 }
            }).setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: connectText, alpha: 1, duration: 500, delay: 1200 });
        }

        const restartAction = () => {
            if (this.input.manager.enabled) {
                this.input.manager.enabled = false;
                const fadeOut = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
                    .setOrigin(0).setDepth(1000);
                
                this.tweens.add({
                    targets: fadeOut, alpha: 1, duration: 500,
                    onComplete: () => {
                        this.scene.stop(SceneKeys.GameOver);
                        const gameScene = this.scene.get(SceneKeys.Game);
                        if (gameScene) {
                             // Ensure isPaused is reset if GameScene uses it this way
                            if (typeof (gameScene as any).isPaused !== 'undefined') {
                                (gameScene as any).isPaused = false;
                            }
                            gameScene.scene.restart();
                        } else {
                            this.scene.start(SceneKeys.Game); // Fallback
                        }
                    }
                });
            }
        };
        
        this.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const submitButtonTextObj = this.children.list.find(child => child.type === 'Text' && (child as Phaser.GameObjects.Text).text?.toLowerCase().includes('submit')) as Phaser.GameObjects.Text;
            if (submitButtonTextObj) {
                const submitButtonBounds = submitButtonTextObj.getBounds();
                if (submitButtonBounds && submitButtonBounds.contains(pointer.x, pointer.y)) return;
            }
            restartAction();
        });
        
        this.input.keyboard.once('keydown-SPACE', restartAction);
        
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => { 
            this.input.manager.enabled = true; 
        });
    }
}