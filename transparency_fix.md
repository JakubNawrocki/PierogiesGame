# Transparency Fix for Game Assets

I've identified that despite generating new assets with transparency, the game engine is still displaying white backgrounds around the objects. This is likely due to one of the following issues:

1. **Phaser's Image Loading**: The game engine might not be correctly processing the alpha channel in the PNG files
2. **PNG Format Issues**: The generated PNGs might have transparency but with incorrect alpha channel settings
3. **Game Code Configuration**: The game code might need to explicitly enable transparency for sprites

## Potential Solutions:

### 1. Modify Game Code to Enable Transparency

In Phaser, we need to ensure that transparency is properly enabled when loading and displaying sprites. Let's modify the relevant code sections:

```typescript
// In preload() function, ensure PNGs are loaded with transparency enabled
this.load.image(TextureKeys.Pierogi, 'assets/pierogi_collectible.png');
// Add explicit alpha settings when creating sprites
const pierogi = this.pierogies.get(x, y, TextureKeys.Pierogi) as Phaser.Physics.Arcade.Sprite;
pierogi.setAlpha(1); // Ensure alpha channel is used
```

### 2. Process Images with ImageMagick

We can use ImageMagick to process the PNG files and ensure they have proper transparency:

```bash
# Install ImageMagick
apt-get install -y imagemagick

# Process each PNG to ensure transparency
for file in *.png; do
  convert "$file" -channel Alpha -threshold 0 "$file"
done
```

### 3. Use CSS to Set Background Color

If the game is rendered in an HTML canvas, we can set the background color of the canvas to match the game background:

```css
canvas {
  background-color: #f5e8d0; /* Match the beige background color */
}
```

### 4. Modify Asset Generation Process

When generating assets, we need to ensure:
- The background is truly transparent (alpha = 0)
- The edges of objects have proper anti-aliasing with transparency
- The PNG format preserves the alpha channel correctly

I'll implement these solutions systematically to resolve the transparency issues.
