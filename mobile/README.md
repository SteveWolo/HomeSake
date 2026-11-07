# HomeSake mobile

This first test build opens with native sign-in, then shows upcoming visits for clients or today's schedule for staff. It reads from the same HomeSake database as the website. The full portal opens in your phone's browser, where you may need to sign in separately.

## Open the test app on your phone

1. Install Node.js LTS on your computer and Expo Go on your phone.
2. In Terminal, open the `mobile` folder of this project.
3. Run these commands.

   ```sh
   npm ci
   cp .env.example .env
   npx expo start
   ```

4. Put your computer and phone on the same Wi-Fi. On iPhone, open Camera and scan the QR code. On Android, scan from inside Expo Go. Follow the Expo sign-in prompt if shown.
5. Sign in with your existing HomeSake account to see your visits.

This version keeps the sign-in session in memory. You may need to sign in again when restarting the app. The example environment file contains the website's public client key. Keep service-role keys out of the app.

## Checks

Run `npm run typecheck` and `npm run verify:bundle` to check TypeScript and bundle both phone platforms.
