import Phaser from 'phaser';
import SceneKeys from '../consts/SceneKeys';
import TextureKeys from '../consts/TextureKeys';
import { connectWallet, getCurrentWalletAddress } from '../web3/MetamaskUtils';

export default class WelcomeScene extends Phaser.Scene {
    private connectWalletButtonText!: Phaser.GameObjects.Text;
    private walletStatusText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: SceneKeys.Welcome });
    }

    preload() {
        this.load.image(TextureKeys.BackgroundKitchen, '/assets/kitchen_background_main.png'); // Main background
        this.load.image(TextureKeys.TitleBanner, '/assets/title_banner.png'); // Game title banner
        // this.load.image(TextureKeys.ConnectWalletButton, 'assets/ui/connect_wallet_button.png'); // If you have a graphical button
    }

    create() {
        // Debug asset loading
        console.log("Creating welcome scene with assets:", TextureKeys.BackgroundKitchen, TextureKeys.TitleBanner);
        console.log("Asset cache keys:", Object.keys(this.textures.list));
        
        this.add.image(this.scale.width / 2, this.scale.height / 2, TextureKeys.BackgroundKitchen);
        this.add.image(this.scale.width / 2, 150, TextureKeys.TitleBanner).setScale(0.8); // Adjust scale as needed

        const startText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Tap or Press SPACE to Start!', {
            fontSize: '32px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({ targets: startText, alpha: 0.3, duration: 800, ease: 'Power1', yoyo: true, loop: -1 });

        this.connectWalletButtonText = this.add.text(this.scale.width / 2, this.scale.height - 100, 'Connect Wallet', {
            fontSize: '24px', fill: '#4CAF50', backgroundColor: '#FFFFFF', padding: { left: 15, right: 15, top: 10, bottom: 10 },
            fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive();

        this.walletStatusText = this.add.text(this.scale.width / 2, this.scale.height - 50, 'Not Connected', {
            fontSize: '16px', fill: '#DDDDDD', align: 'center'
        }).setOrigin(0.5);

        this.connectWalletButtonText.on('pointerdown', async () => {
            const account = await connectWallet();
            this.updateWalletStatus(account);
        });

        // Check initial wallet status
        this.updateWalletStatus(getCurrentWalletAddress());
         // Listen for account changes from MetamaskUtils
        document.addEventListener('walletAccountChanged', (event) => {
            const detail = (event as CustomEvent).detail;
            this.updateWalletStatus(detail);
        });


        const startAction = () => {
            if (this.input.manager.enabled) {
                this.input.manager.enabled = false;
                this.scene.start(SceneKeys.Game);
            }
        };
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Don't start game if clicking on connect wallet button
            if (this.connectWalletButtonText.getBounds().contains(pointer.x, pointer.y)) {
                return;
            }
            startAction();
        });
        this.input.keyboard.on('keydown-SPACE', startAction);
    }

    private updateWalletStatus(account: string | null) {
        if (account) {
            this.connectWalletButtonText.setText('Wallet Connected');
            this.connectWalletButtonText.disableInteractive(); // Or change its appearance
            this.connectWalletButtonText.setStyle({ fill: '#8BC34A'});
            this.walletStatusText.setText(`Connected: ${account.substring(0, 6)}...${account.substring(account.length - 4)}`);
        } else {
            this.connectWalletButtonText.setText('Connect Wallet');
            this.connectWalletButtonText.setInteractive();
            this.connectWalletButtonText.setStyle({ fill: '#4CAF50'});
            this.walletStatusText.setText('Not Connected');
        }
    }
}