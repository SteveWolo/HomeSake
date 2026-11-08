# HomeSake mobile

The iPhone and Android preview opens the live HomeSake website inside the app. Use **Home**, **Client portal**, or **Staff**, then sign in with your existing HomeSake account. The website handles permissions and saves work to the same database. Off-site links open in the phone’s browser or appropriate app.

## Try it on your phone

Install Node.js LTS on your Mac and Expo Go on your phone. Open this folder in Terminal and run:

```sh
npm ci
npx expo start
```

Keep the phone and Mac on the same Wi-Fi. Scan the QR code with iPhone Camera or the scanner in Expo Go on Android. Follow any Expo sign-in prompt. HomeSake sign-in is separate.

## Test before distributing

Check public pages, client sign-in, staff sign-in, visit checkboxes, notes, photo capture and upload, report publishing, and checkout on both platforms. Use a test account and Stripe test mode for payments. Also check sign-out, the phone Back button, and retry after losing the connection.

Run `npm run typecheck` and `npm run verify:bundle` before building. The included EAS preview profile is for internal distribution. Use your organization’s Expo project and store accounts for signed builds. Set up iOS device registration or TestFlight, and Google Play internal testing, before production submission.
