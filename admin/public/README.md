# Admin Dashboard Assets

This directory contains branding and visual assets for the Jomla Admin Dashboard.

## Required Assets

### Favicon (favicon.ico)
- **Size**: 32x32 pixels (or multi-size .ico file)
- **Format**: ICO (supports multiple sizes)
- **Purpose**: Browser tab icon
- **Sizes to include**: 16x16, 32x32, 48x48
- **Location**: `/public/favicon.ico`

### Apple Touch Icon (apple-touch-icon.png)
- **Size**: 180x180 pixels
- **Format**: PNG
- **Purpose**: iOS home screen icon
- **Location**: `/public/apple-touch-icon.png`

### Manifest Icons (icon-192.png, icon-512.png)
- **Sizes**: 192x192 and 512x512 pixels
- **Format**: PNG
- **Purpose**: PWA app icons for Android
- **Locations**:
  - `/public/icon-192.png`
  - `/public/icon-512.png`

### Logo Assets
- **logo.svg**: Main dashboard logo (vector format)
- **logo-dark.svg**: Dark mode variant (if needed)
- **logo-small.svg**: Compact version for navigation sidebar

## Current File Structure

```
public/
├── favicon.ico           # Browser tab icon
├── apple-touch-icon.png  # iOS home screen icon
├── icon-192.png          # PWA icon (small)
├── icon-512.png          # PWA icon (large)
├── logo.svg              # Main logo
├── logo-dark.svg         # Dark mode logo
├── logo-small.svg        # Compact logo for sidebar
├── og-image.png          # Open Graph image for social sharing
└── manifest.json         # PWA manifest file
```

## Branding Guidelines

### Color Palette
```css
/* Primary Colors */
--primary: #4CAF50;        /* Green - Main brand color */
--primary-dark: #388E3C;   /* Darker green for hover states */
--primary-light: #81C784;  /* Light green for backgrounds */

/* Secondary Colors */
--secondary: #FF9800;      /* Orange - Accents, offers */
--secondary-dark: #F57C00; /* Darker orange */

/* Neutral Colors */
--gray-50: #FAFAFA;
--gray-100: #F5F5F5;
--gray-200: #EEEEEE;
--gray-300: #E0E0E0;
--gray-400: #BDBDBD;
--gray-500: #9E9E9E;
--gray-600: #757575;
--gray-700: #616161;
--gray-800: #424242;
--gray-900: #212121;

/* Semantic Colors */
--success: #4CAF50;
--warning: #FF9800;
--error: #F44336;
--info: #2196F3;
```

### Typography
```css
/* Headings */
font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Body Text */
font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace (code, data) */
font-family: 'Geist Mono', 'Monaco', 'Courier New', monospace;
```

### Logo Usage

#### Primary Logo
- Use on light backgrounds
- Minimum size: 120px wide
- Clear space: Logo height × 0.5

#### Dark Mode Logo
- Use on dark backgrounds (#1F2937 or darker)
- Invert colors or use white version

#### Small Logo
- Sidebar navigation (collapsed state)
- Mobile header
- Minimum size: 32px × 32px

## PWA Manifest Configuration

Create `/public/manifest.json`:

```json
{
  "name": "Jomla Admin Dashboard",
  "short_name": "Jomla Admin",
  "description": "Admin dashboard for Jomla Grocery Store",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4CAF50",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Meta Tags for SEO and Social Sharing

Add to `/app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: "Jomla Admin Dashboard",
  description: "Admin dashboard for managing products, offers, and orders",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    title: "Jomla Admin Dashboard",
    description: "Admin dashboard for managing products, offers, and orders",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jomla Admin Dashboard",
    description: "Admin dashboard for managing products, offers, and orders",
    images: ["/og-image.png"],
  },
};
```

## Asset Generation Tools

### Favicon Generator
- **RealFaviconGenerator**: https://realfavicongenerator.net/
  - Upload your logo
  - Generates all required sizes
  - Provides HTML meta tags

### Icon Resizing
```bash
# Using ImageMagick
convert logo.png -resize 192x192 icon-192.png
convert logo.png -resize 512x512 icon-512.png
convert logo.png -resize 180x180 apple-touch-icon.png

# Create multi-size .ico file
convert logo.png -define icon:auto-resize=16,32,48 favicon.ico
```

### Online Tools
- **Favicon.io**: https://favicon.io/ - Generate from text, image, or emoji
- **Canva**: https://www.canva.com/ - Design logos and export assets

## Design Recommendations

### Favicon Design
- Simple, recognizable shape
- High contrast
- Avoid fine details (will be 16x16 or 32x32 pixels)
- Test on both light and dark backgrounds

### Logo Design
- Include "Jomla" text or stylized "J"
- Grocery/fresh theme (green colors, produce elements)
- Professional, clean appearance
- Scalable vector format (SVG preferred)

### Icon Concepts
1. **Shopping Cart + Letter J**: Combine brand initial with grocery icon
2. **Leaf + Basket**: Emphasize fresh, organic theme
3. **Minimalist "J"**: Clean, modern typography-based logo

## Testing

### Browser Testing
- Test favicon on Chrome, Firefox, Safari, Edge
- Check appearance on both light and dark browser themes
- Verify in browser tabs and bookmarks

### PWA Testing
```bash
# Build and serve locally
npm run build
npm run start

# Check manifest in Chrome DevTools:
# Application → Manifest
```

### Mobile Testing
- iOS: Add to home screen, check icon
- Android: Install as PWA, check icon and splash screen

## Checklist

- [ ] Create favicon.ico (16x16, 32x32, 48x48)
- [ ] Create apple-touch-icon.png (180x180)
- [ ] Create icon-192.png (192x192)
- [ ] Create icon-512.png (512x512)
- [ ] Create logo.svg
- [ ] Create logo-dark.svg
- [ ] Create logo-small.svg
- [ ] Create og-image.png (1200x630 for social sharing)
- [ ] Create manifest.json
- [ ] Update layout.tsx with metadata
- [ ] Test favicon in browsers
- [ ] Test PWA installation
- [ ] Test social media link previews

## Resources

- [Next.js Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [PWA Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Favicon Best Practices](https://github.com/audreyfeldroy/favicon-cheat-sheet)
- [Open Graph Protocol](https://ogp.me/)
