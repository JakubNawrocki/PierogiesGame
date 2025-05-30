import { ethers } from 'ethers';

let provider: ethers.providers.Web3Provider | null = null;
let signer: ethers.Signer | null = null;
let connectedAccount: string | null = null;

function ensureProvider(): ethers.providers.Web3Provider {
    if (!provider && window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
    }
    if (!provider) {
        throw new Error('Metamask not detected or Web3Provider could not be initialized.');
    }
    return provider;
}

export async function connectWallet(): Promise<string | null> {
    if (window.ethereum) {
        try {
            const currentProvider = ensureProvider();
            const accounts = await currentProvider.send("eth_requestAccounts", []);
            
            if (accounts && accounts.length > 0) {
                connectedAccount = accounts[0];
                signer = currentProvider.getSigner(connectedAccount);
                console.log('Wallet connected:', connectedAccount);
                
                // Listen for account changes
                window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
                    if (newAccounts.length > 0) {
                        connectedAccount = newAccounts[0];
                        signer = ensureProvider().getSigner(connectedAccount);
                        console.log('Account changed to:', connectedAccount);
                        // Dispatch a custom event or use a state manager to notify the game
                        document.dispatchEvent(new CustomEvent('walletAccountChanged', { detail: connectedAccount }));
                    } else {
                        // Handle disconnection
                        connectedAccount = null;
                        signer = null;
                        console.log('Wallet disconnected');
                        document.dispatchEvent(new CustomEvent('walletAccountChanged', { detail: null }));
                    }
                });

                return connectedAccount;
            }
            return null;
        } catch (error) {
            console.error('User denied account access or error connecting:', error);
            return null;
        }
    } else {
        console.warn('Metamask not detected. Please install Metamask.');
        alert('Metamask not detected. Please install Metamask to use Web3 features.');
        return null;
    }
}

export function getCurrentWalletAddress(): string | null {
    return connectedAccount;
}

export function getSigner(): ethers.Signer | null {
    return signer;
}

export async function signMessage(message: string): Promise<string | null> {
    const currentSigner = getSigner();
    if (!currentSigner) {
        alert('Please connect your wallet first.');
        return null;
    }
    try {
        const signature = await currentSigner.signMessage(message);
        return signature;
    } catch (error) {
        console.error('Error signing message:', error);
        return null;
    }
}