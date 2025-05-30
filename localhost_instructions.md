# How to Run Pierogies Runner Locally

This guide will help you set up and run the Pierogies Runner game on your local machine.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation Steps

1. **Extract the ZIP file**
   - Extract the `pierogies-runner-improved.zip` file to a folder on your computer

2. **Install dependencies**
   - Open a terminal/command prompt
   - Navigate to the extracted folder
   - Run the following command:
   ```
   npm install
   ```

3. **Start the development server**
   - After the installation is complete, run:
   ```
   npm start
   ```
   - This will start the local development server

4. **Access the game**
   - Open your web browser
   - Navigate to `http://localhost:1234`
   - The game should now be running in your browser

## Game Controls

- Press **SPACE** to jump/fly
- Press **SPACE** at the game over screen to restart

## Troubleshooting

If you encounter any issues:

1. **Port already in use**
   - If port 1234 is already in use, you can modify the start script in package.json to use a different port:
   ```
   "start": "parcel src/index.html --port 3000"
   ```

2. **Missing dependencies**
   - If you see errors about missing dependencies, try:
   ```
   npm install --force
   ```

3. **Browser compatibility**
   - The game works best in Chrome, Firefox, or Edge
   - Make sure your browser is up to date

## Development Notes

- All game assets are in the `assets` folder
- Source code is in the `src` folder
- The game is built with Phaser 3 and TypeScript

Enjoy playing Pierogies Runner!
