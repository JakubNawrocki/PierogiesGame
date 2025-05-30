import Phaser from 'phaser';
import SceneKeys from '../consts/SceneKeys';
import { getCurrentWalletAddress, signMessage } from '../web3/MetamaskUtils';
// import { submitScoreToBackend } from '../web3/ContractUtils'; // If you have this

export default class GameOverScene extends Phaser.Scene {
    private finalScore: number = 0;

    constructor() {
        super({ key: SceneKeys.GameOver });
    }

    init(data: { score: number }) {
        this.finalScore = data.score || 0;
    }

    create() {
        // Add a fade-in transition for the game over overlay
        const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0);
        this.tweens.add({
            targets: overlay,
            alpha: 0.7,
            duration: 800,
            ease: 'Power2'
        });

        // Add the game over title with animation
        const gameOverTitle = this.add.text(this.scale.width / 2, -50, 'KAPUSTA KISZONA!', {
            fontSize: '48px', fill: '#FF6347', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5);
        
        // Animate the title dropping in with a bounce
        this.tweens.add({
            targets: gameOverTitle,
            y: 150,
            duration: 1200,
            ease: 'Bounce.Out',
            delay: 300
        });
        
        // Add the score with a scale-in animation
        const scoreText = this.add.text(this.scale.width / 2, 230, `Final Score: ${this.finalScore}`, {
            fontSize: '36px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5, align: 'center'
        }).setOrigin(0.5).setScale(0);
        
        this.tweens.add({
            targets: scoreText,
            scale: 1,
            duration: 600,
            ease: 'Back.Out',
            delay: 1000
        });

        // Add restart text with pulsing animation
        const restartText = this.add.text(this.scale.width / 2, this.scale.height - 150, 'Tap or Press SPACE to Restart', {
            fontSize: '28px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5).setAlpha(0);
        
        // Fade in the restart text after a delay
        this.tweens.add({
            targets: restartText,
            alpha: 1,
            duration: 500,
            delay: 1500,
            onComplete: () => {
                // Add pulsing animation after fade-in
                this.tweens.add({
                    targets: restartText,
                    alpha: 0.3,
                    duration: 800,
                    ease: 'Sine.InOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        });

        // Web3 Score Submission Button with animation
        const walletAddress = getCurrentWalletAddress();
        if (walletAddress) {
            const submitButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Submit Score', {
                fontSize: '24px', fill: '#4CAF50', backgroundColor: '#FFFFFF', padding: { left: 10, right: 10, top: 5, bottom: 5},
                fontStyle: 'bold',
            }).setOrigin(0.5).setInteractive().setAlpha(0);
            
            // Fade in the submit button with a slight delay
            this.tweens.add({
                targets: submitButton,
                alpha: 1,
                duration: 500,
                delay: 1200
            });
            
            // Add hover effect
            submitButton.on('pointerover', () => {
                this.tweens.add({
                    targets: submitButton,
                    scale: 1.1,
                    duration: 100
                });
            });
            
            submitButton.on('pointerout', () => {
                this.tweens.add({
                    targets: submitButton,
                    scale: 1,
                    duration: 100
                });
            });

            submitButton.on('pointerdown', async () => {
                submitButton.setText('Submitting...');
                const messageToSign = `My Pierogies Runner score on ${new Date().toISOString().substring(0,10)} is ${this.finalScore}`;
                const signature = await signMessage(messageToSign);
                if (signature) {
                    // const success = await submitScoreToBackend(this.finalScore, signature, walletAddress);
                    // if (success) submitButton.setText('Score Submitted!');
                    // else submitButton.setText('Submission Failed');
                    console.log('Score Signed (Concept):', signature); // Placeholder
                    
                    // Add success animation
                    submitButton.setText('Score Submitted!');
                    this.tweens.add({
                        targets: submitButton,
                        scale: 1.2,
                        duration: 200,
                        yoyo: true
                    });
                    
                    // Show a success particle effect
                    const particles = this.add.particles(submitButton.x, submitButton.y, 'pierogi_particle', {
                        speed: { min: 50, max: 150 },
                        scale: { start: 0.4, end: 0 },
                        lifespan: 1000,
                        blendMode: 'ADD',
                        quantity: 1,
                        frequency: 100,
                        emitting: true
                    });
                    
                    this.time.delayedCall(2000, () => {
                        particles.destroy();
                    });
                    
                } else {
                    submitButton.setText('Sign & Submit Score');
                    alert('Signing failed or was cancelled.');
                }
            });
        } else {
             const connectText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Connect Wallet on Welcome Screen to Submit Score', {
                fontSize: '16px', fill: '#CCCCCC', align: 'center', wordWrap: { width: 300 }
            }).setOrigin(0.5).setAlpha(0);
            
            this.tweens.add({
                targets: connectText,
                alpha: 1,
                duration: 500,
                delay: 1200
            });
        }

        const restartAction = () => {
            if (this.input.manager.enabled) {
                // Add a fade-out transition before restarting
                const fadeOut = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
                    .setOrigin(0)
                    .setDepth(1000);
                
                this.tweens.add({
                    targets: fadeOut,
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.input.manager.enabled = false;
                        this.scene.stop(SceneKeys.GameOver);
                        this.scene.get(SceneKeys.Game).scene.restart();
                    }
                });
            }
        };
        
        this.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Avoid restarting if clicking on submit button area
            const submitButtonBounds = walletAddress ? this.children.list.find(child => (child as Phaser.GameObjects.Text).text?.startsWith('Submit'))?.getBounds() : null;
            if (submitButtonBounds && submitButtonBounds.contains(pointer.x, pointer.y)) return;
            restartAction();
        });
        
        this.input.keyboard.once('keydown-SPACE', restartAction);
        
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => { this.input.manager.enabled = true; });
    }
}