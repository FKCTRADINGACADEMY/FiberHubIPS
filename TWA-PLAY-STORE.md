# FiberHub ISP — TWA / Play Store Setup

Hosting **GitHub Pages** pe rehti hai. Play Store pe sirf Android wrapper (TWA) jata hai.

## Package name
`com.fiberhub.isp`

## Step 1 — GitHub pe ye files upload
- `.well-known/assetlinks.json`
- updated `manifest.json`

Live URL example (apna sahi URL use karein):
`https://YOUR_USERNAME.github.io/YOUR_REPO/`

## Step 2 — PWABuilder
1. Browser: https://www.pwabuilder.com/
2. Apni **live site URL** paste karein → Start
3. **Package for stores** → **Android**
4. Options:
   - Package ID: `com.fiberhub.isp`
   - App name: FiberHub ISP
   - Hosting: your GitHub Pages URL
5. **Download** Android package (AAB)

## Step 3 — SHA-256 fingerprint
PWABuilder / keystore se **SHA-256** copy karein.

`assetlinks.json` mein ye line replace karein:
```
REPLACE_WITH_SHA256_FROM_PWABUILDER
```
Phir GitHub pe dubara upload + wait 1–2 min.

Check (URL apni site se):
`https://YOUR_SITE/.well-known/assetlinks.json`

## Step 4 — Play Console
1. https://play.google.com/console
2. Create app → FiberHub ISP
3. Upload **AAB**
4. Privacy Policy URL add karein (simple page GitHub pe bhi chalega)
5. Screenshots, description, content rating complete karein
6. Submit for review

## Important
- Website update = GitHub push (Play pe har baar naya upload zaroori nahi)
- TWA tabhi “verified” hota hai jab `assetlinks.json` sahi SHA-256 ke sath live ho
- Custom domain ho to assetlinks us domain pe bhi serve hona chahiye
