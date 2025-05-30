enum TextureKeys {
    // Backgrounds & Ground
    BackgroundKitchen = 'background_kitchen',
    BackgroundParallaxFar = 'background_parallax_far',
    BackgroundParallaxMiddle = 'background_parallax_middle',
    GroundKitchen = 'ground_kitchen',
    TitleBanner = 'title_banner', // For Welcome Screen

    // Player & Collectibles
    PlayerSpriteSheet = 'player_spritesheet',
    Pierogi = 'pierogi_collectible',

    // Obstacles (Standardized naming)
    ObstacleKnife = 'obstacle_knife',
    ObstacleKielbasa = 'obstacle_kielbasa',
    ObstacleOnion = 'obstacle_onion',
    ObstacleGrater = 'obstacle_grater',
    ObstacleRollingPin = 'obstacle_rolling_pin',

    // UI Elements
    PauseIcon = 'pause_icon',
    PlayIcon = 'play_icon',
    ConnectWalletButton = 'connect_wallet_button',
    LeaderboardIcon = 'leaderboard_icon', // If used
    ProfileIcon = 'profile_icon',     // If used

    // Particles
    DustParticle = 'dust_particle',
    PierogiParticle = 'pierogi_particle',
}

export default TextureKeys;