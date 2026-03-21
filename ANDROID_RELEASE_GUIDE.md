# Android Build and GitHub Release Setup Guide

This document outlines the configuration and steps required to automatically build the Android APK and publish it to GitHub Releases whenever changes are pushed to the `main` branch.

## 1. Overview
The project uses **Capacitor** to wrap the web application into a native Android project. The automation is handled by **GitHub Actions**, which performs the following:
1. Environment setup (Node.js & Java 21).
2. Web build generation (`npm run build`).
3. Synchronization with Capacitor (`npx cap sync android`).
4. Native Android build via Gradle.
5. Automated release management using the GitHub CLI (`gh`).

## 2. GitHub Actions Configuration
The primary workflow is defined in [`.github/workflows/android_build.yml`](.github/workflows/android_build.yml).

### Key Execution Steps:
#### A. Environment Setup
- **Java 21 (Zulu Distribution):** Required for modern Android Gradle builds.
- **Node.js 20:** Used for dependency installation and Vite build steps.

#### B. Permission Handling (Windows-to-Linux Compatibility)
One of the most common issues when building on Linux (GitHub's runners) from a project developed on Windows is the line-ending format (CRLF vs LF) of the `gradlew` script.
- **Fix Applied:** We used `dos2unix` to convert `android/gradlew` to LF format and granted execution permissions using `chmod +x`.

#### C. Build Strategy
The workflow executes:
```bash
npx cap sync android
cd android && ./gradlew assembleDebug
```
This generates a debug APK located at `android/app/build/outputs/apk/debug/`.

#### D. Automated GitHub Release
Instead of keeping old builds, the workflow is configured to maintain a "Latest" release:
1. Deletes the existing `latest` release.
2. Deletes the `latest` tag.
3. Creates a new release tagged `latest` and uploads the newly built APK.

## 3. Mandatory Repository Settings
For this automation to work successfully, the following settings were verified/applied:

### A. Workflow Permissions
GitHub Actions must have permission to create releases.
1. Go to **Settings > Actions > General**.
2. Under **Workflow permissions**, ensure **Read and write permissions** is selected.
3. Alternatively, the workflow file explicitly defines these permissions:
   ```yaml
   permissions:
     actions: write
     contents: write
   ```

### B. Secrets
While the workflow uses the built-in `${{ secrets.GITHUB_TOKEN }}`, no manual secrets are required for the standard build unless signing a production (release) APK is intended.

## 4. Troubleshooting Build Failures
- **Gradle Permissions:** If the build fails with `Permission denied` on `gradlew`, ensure the `chmod +x` step is correctly targeting the file.
- **Java Version:** Ensure `java-version: '21'` is used; older versions (like 8 or 11) will fail with modern Gradle/Capacitor setups.
- **Node Modules:** `npm install` must run before `npx cap sync` to ensure the Capacitor CLI and platform-specific dependencies are available.

## 5. Moving to Production Releases
The current setup generates a **Debug APK**. To generate a signed **Production (Release) APK**, you would:
1. Generate a keystore file locally.
2. Add the keystore as a secret in GitHub.
3. Update the Gradle build step in `android_build.yml` to use `assembleRelease`.
4. Configure signing in the `android/app/build.gradle` file using environment variables provided by GitHub Actions.

---
*Created on 2026-03-21 to document the CI/CD pipeline for the SetPoint project.*
