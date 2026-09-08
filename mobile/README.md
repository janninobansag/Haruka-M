# Haruka Mobile

Native Expo/React Native companion app for Haruka.

## Run it

1. Copy `.env.example` to `.env`.
2. For an Android emulator, retain `http://10.0.2.2:5000/api`.
3. For a physical phone, replace that value with your computer's LAN IPv4 address, such as `http://192.168.1.25:5000/api`. The phone and computer must use the same Wi-Fi network.
4. Run `npm install`, then `npm run start` inside this `mobile` folder.
5. Scan the Expo QR code with Expo Go, or press `a` to use an Android emulator.

## Current scope

- Movie and series discovery rails from the Haruka API.
- Title detail sheet and official TMDB/YouTube trailer links.
- Native sign-up and sign-in with the same account-approval rules as the website.
- Secure 30-day mobile session storage using Expo SecureStore.
- My List add/remove actions and Recently Explored updates for signed-in mobile users.
- Native Haruka branding.

Mobile tokens are stored only in Expo SecureStore; the app never stores a password locally. Signed-in admins and super admins can use the mobile Admin Studio, with the same server-enforced role restrictions as the web version.
