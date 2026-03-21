# SetPoint Android Release Troubleshooting Guide

Use this guide if the GitHub Actions build for the Android APK fails.

## Common Issues and Fixes

### 1. `invalid source release: 21`
**Cause:** The Android project requires JDK 21, but the GitHub runner is using an older version (e.g., JDK 17).
**Fix:** Update `.github/workflows/android.yml`:
```yaml
- name: Set up JDK 21
  uses: actions/setup-java@v4
  with:
    java-version: '21'
    distribution: 'temurin'
```

### 2. `The Capacitor CLI requires NodeJS >=22.0.0`
**Cause:** Capacitor v8+ requires Node.js 22 or higher.
**Fix:** Update `.github/workflows/android.yml`:
```yaml
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
```

### 3. `./gradlew: Permission denied` (Exit Code 126)
**Cause:** The `gradlew` script in the `android/` folder lost its executable permission in the git repository.
**Fix:** Run the following command from your local terminal and commit:
```bash
git update-index --chmod=+x android/gradlew
git commit -m "fix: restore gradlew execution permissions"
git push origin main
```

### 4. Deprecation Warnings (Node 20)
**Cause:** GitHub is deprecating Node 20 runners.
**Fix:** Add this environment variable to the top of your job in `.github/workflows/android.yml`:
```yaml
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

### 5. Logo / Icon Updates
If you change the `setpoint_logo.svg` in the root:
1. Copy it to `assets/logo.svg`.
2. Run: `npx @capacitor/assets generate`.
3. Commit the changes in the `android/app/src/main/res/` folder to update the app icon and splash screen.

## Deployment Flow
1. **Web:** `npm run build` then `firebase deploy`.
2. **Android:** `git push origin main` triggers the GitHub Action to build and create a release.
