# Mobile App Assets Guide

This directory contains all visual assets for the Jomla Grocery Store mobile app.

## Required Assets

### App Icon (icon.png)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Purpose**: Main app icon for iOS and Android
- **Design Guidelines**:
  - Simple, recognizable design
  - Avoid text (will be too small)
  - Use brand colors (e.g., green for grocery/fresh theme)
  - Ensure it looks good at small sizes

### Adaptive Icon (Android) (adaptive-icon.png)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Purpose**: Android adaptive icon foreground
- **Design Guidelines**:
  - Icon should fit within a 660x660 safe zone (centered)
  - Background will be solid color (set in app.json)
  - Consider how it looks in different shapes (circle, square, rounded square)

### Splash Screen (splash-icon.png)
- **Size**: 1242x2688 pixels (iPhone Pro Max size)
- **Format**: PNG
- **Purpose**: Loading screen shown when app launches
- **Design Guidelines**:
  - Center your logo/icon
  - Keep it simple - splash screens show for 1-3 seconds
  - Use brand colors matching app theme
  - Consider both light and dark modes

### Notification Icon (notification-icon.png)
- **Size**: 96x96 pixels
- **Format**: PNG with transparency
- **Purpose**: Icon shown in push notifications (Android)
- **Design Guidelines**:
  - Silhouette/flat design
  - White foreground on transparent background
  - Simple shape (will be small in notification tray)

### Favicon (favicon.png)
- **Size**: 48x48 pixels
- **Format**: PNG or ICO
- **Purpose**: Web browser tab icon (if running as PWA)

## Asset Generation Tools

### Online Tools
- **Icon Kitchen**: https://icon.kitchen/ - Generate all app icon sizes
- **Ape Tools**: https://apetools.webprofusion.com/ - Icon and splash screen generator
- **Figma/Sketch**: Design your icon and export at 1024x1024

### Expo Asset Generator
After creating your base icon (1024x1024):
```bash
# Generate all required sizes automatically
npx expo-generate-icons

# This will create:
# - iOS app icons (various sizes)
# - Android app icons (various densities)
# - Adaptive icon layers
# - Splash screen variants
```

## Current Configuration

The app.json file is already configured to use these assets:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#4CAF50"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## Design Recommendations

### Brand Colors
- **Primary**: #4CAF50 (Green) - Fresh, grocery theme
- **Secondary**: #FF9800 (Orange) - Offers, savings
- **Background**: #FFFFFF (White)
- **Text**: #333333 (Dark Gray)

### Icon Concepts
1. **Shopping Cart**: Classic grocery app icon
2. **Shopping Bag**: Modern, clean
3. **Grocery Items**: Stylized fruits/vegetables
4. **Letter "J"**: Brand initial with grocery element

### Splash Screen Layout
```
┌─────────────────┐
│                 │
│                 │
│     [LOGO]      │  ← Centered app icon
│                 │
│    Jomla        │  ← App name (optional)
│                 │
│                 │
└─────────────────┘
```

## Testing Your Assets

### Preview in Expo
```bash
cd mobile
npm start

# Then press 'a' for Android or 'i' for iOS
# Check if icons and splash screen display correctly
```

### Build Preview
```bash
# Create development build to test on real device
eas build --profile development --platform android
eas build --profile development --platform ios
```

## Checklist

- [ ] Create icon.png (1024x1024)
- [ ] Create adaptive-icon.png (1024x1024)
- [ ] Create splash-icon.png (1242x2688)
- [ ] Create notification-icon.png (96x96)
- [ ] Create favicon.png (48x48)
- [ ] Test in Expo Go
- [ ] Test in development build
- [ ] Verify icon on device home screen
- [ ] Verify splash screen timing and appearance
- [ ] Verify notification icon in system tray

## Resources

- [Expo Icon Guidelines](https://docs.expo.dev/develop/user-interface/app-icons/)
- [Expo Splash Screen Guide](https://docs.expo.dev/develop/user-interface/splash-screen/)
- [Android Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
- [iOS App Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
