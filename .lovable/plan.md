
# Fix Washed-Out Colors and Blurry Rendering in Android APK

## Problem
When you build the APK and run it on your Android tablet, the colors look faded/fake and the text isn't crisp like a Full HD display should be. This happens because the Android WebView needs specific native-side configuration that your project is currently missing.

## Root Causes

1. **Android Force Dark Mode** is algorithmically inverting/washing out your colors in the WebView (even though you have CSS `color-scheme: light only`, the native side needs it disabled too)
2. **Missing native WebView settings** for wide viewport and overview mode, so the UI doesn't scale correctly to the tablet's full resolution
3. **One remaining `geometricPrecision`** in the Pizza Modal causes blurry text on Android WebViews (should be `optimizeLegibility`)

## Plan

### Step 1: Fix the Pizza Modal text rendering
In `src/components/pos/POSPizzaModal.tsx`, change `textRendering: 'geometricPrecision'` to `textRendering: 'optimizeLegibility'` on the DialogContent. `geometricPrecision` causes sub-pixel rendering artifacts on Android WebViews.

### Step 2: Add native Android WebView configuration instructions
You will need to manually edit the native Android file after running `npx cap sync`. The file is:

`android/app/src/main/java/.../MainActivity.java`

You need to add these WebView settings:

```text
// In your MainActivity.java, override onCreate and configure WebView:

import android.webkit.WebSettings;
import android.webkit.WebView;

// Inside onCreate, after super.onCreate():
WebView webView = getBridge().getWebView();
WebSettings settings = webView.getSettings();

// Render at native resolution (FHD clarity)
settings.setUseWideViewPort(true);
settings.setLoadWithOverviewMode(true);

// Disable Android's algorithmic dark mode (prevents color washing)
if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
    settings.setForceDark(WebSettings.FORCE_DARK_OFF);
}
```

This is the key fix -- without these native settings, Android scales the WebView like a mobile page (blurry upscaling) and may apply Force Dark which washes out all your carefully chosen colors.

### Step 3: Capacitor config enhancement
Add `webViewChromium` settings to `capacitor.config.ts` to ensure hardware acceleration is properly configured:

```typescript
android: {
  webContentsDebuggingEnabled: true,
  allowMixedContent: true,
  useLegacyBridge: false,
  backgroundColor: '#1a2332',
  // Add this to disable force dark at config level
  overrideUserAgent: 'TopInTownPOS',
},
```

## After Implementation

After I make the code changes, you will need to:
1. Pull the latest code from GitHub
2. Run `npx cap sync`
3. Open `android/app/src/main/java/.../MainActivity.java` and add the WebView settings from Step 2 above (this is a native file that Lovable cannot edit)
4. Rebuild the APK

## Technical Details
- The `geometricPrecision` to `optimizeLegibility` fix is a one-line CSS change
- The native `setForceDark(FORCE_DARK_OFF)` is the single biggest fix for washed-out colors
- `setUseWideViewPort(true)` + `setLoadWithOverviewMode(true)` ensures the WebView renders at the tablet's native resolution instead of upscaling a mobile-sized render
