// Firebase Configuration Template
// 
// FOR VERCEL DEPLOYMENT:
// This project uses environment variables for Firebase configuration.
// You do NOT need to create a firebase-config.js file.
//
// Instead, set these environment variables in your Vercel dashboard:
//
// 1. Go to your Vercel project dashboard
// 2. Navigate to Settings > Environment Variables
// 3. Add the following variables (use either NEXT_PUBLIC_ prefix or without):
//
//    FIREBASE_API_KEY=your_api_key_here
//    FIREBASE_AUTH_DOMAIN=your_auth_domain_here
//    FIREBASE_PROJECT_ID=your_project_id_here
//    FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
//    FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
//    FIREBASE_APP_ID=your_app_id_here
//    FIREBASE_DATABASE_URL=your_database_url_here
//
// OR use NEXT_PUBLIC_ prefix (works for both):
//
//    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
//    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
//    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
//    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
//    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
//    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
//    NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url_here
//
// IMPORTANT: databaseURL is REQUIRED for Realtime Database!
// To find your databaseURL:
// 1. Go to Firebase Console > Realtime Database
// 2. Look at the top of the page - you'll see your database URL
//    It looks like: https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app
//    OR for older databases: https://YOUR_PROJECT_ID.firebaseio.com
// 3. Copy the entire URL (including https://)
//
// To get your Firebase config values:
// 1. Go to Firebase Console (https://console.firebase.google.com/)
// 2. Select your project (or create a new one)
// 3. Go to Project Settings (gear icon)
// 4. Scroll down to "Your apps" section
// 5. Click on the web app icon (</>) or "Add app" if you haven't created one
// 6. Copy the config values
//
// IMPORTANT: Make sure to set up Realtime Database security rules to allow writes:
// - Go to Firebase Console > Realtime Database > Rules
// - Add a rule to allow writes to 'boxSerialNumbers' path
//   Example rule (for testing only - adjust for production):
//   {
//     "rules": {
//       "boxSerialNumbers": {
//         ".write": true,
//         ".read": true
//       }
//     }
//   }

const firebaseConfig = {
  apiKey: "AIzaSyCUNxHKkWEc-HQG6ibe8kEtaRFc1eRmRFQ",
  authDomain: "paxibox.firebaseapp.com",
  databaseURL: "https://paxibox-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "paxibox",
  storageBucket: "paxibox.firebasestorage.app",
  messagingSenderId: "994249307432",
  appId: "1:994249307432:web:2cf693e9bddc7f9c9ccc1d",
  measurementId: "G-ZBS33VQ541"
};