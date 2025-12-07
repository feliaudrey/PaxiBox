# PaxiBox

A simple web application for scanning barcodes and inputting box serial numbers, with Firebase integration.

## Features

- **Barcode Scanner**: Scan barcodes using your device camera
- **Manual Input**: Enter tracking numbers and recipient information manually
- **Serial Number Form**: Simple form to input box serial numbers (connected to Firebase Realtime Database)

## Deployment to Vercel

### Prerequisites

1. A Firebase project with Realtime Database enabled
2. A Vercel account

### Setup Instructions

#### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Realtime Database:
   - Go to Realtime Database
   - Click "Create database"
   - Choose your location
   - Start in test mode (or configure security rules)
4. Get your Firebase configuration:
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps" section
   - Click the web app icon (</>) or "Add app"
   - Copy the config values

#### 2. Configure Realtime Database Security Rules

Go to Realtime Database > Rules and add:

```json
{
  "rules": {
    "boxSerialNumbers": {
      ".write": true,
      ".read": true
    }
  }
}
```

**Note:** The above rules allow anyone to read/write. For production, implement proper authentication and security rules.

#### 3. Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel:
   - Go to Project Settings > Environment Variables
   - Add the following variables:

```
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_auth_domain_here
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
FIREBASE_APP_ID=your_app_id_here
FIREBASE_DATABASE_URL=your_database_url_here
```

**Important:** `FIREBASE_DATABASE_URL` is REQUIRED for Realtime Database!

To find your databaseURL:
1. Go to Firebase Console → Realtime Database
2. Look at the top of the page - you'll see your database URL
3. It looks like: `https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app`
   - OR for older databases: `https://YOUR_PROJECT_ID.firebaseio.com`
4. Copy the entire URL (including `https://`)

4. Deploy!

### Pages

- `/` - Main page with barcode scanner and manual input
- `/serial` - Serial number input form (connects to Firebase)

### Environment Variables

The following environment variables are required for Firebase Realtime Database integration:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_DATABASE_URL` ⚠️ **REQUIRED for Realtime Database**

You can also use the `NEXT_PUBLIC_` prefix for any of these variables.

## Local Development

For local development, you can create a `.env.local` file (not committed to git) with your Firebase config, or modify the API route to use a local config file.

## Project Structure

```
PaxiBox/
├── api/
│   └── firebase-config.js    # Vercel serverless function for Firebase config
├── css/
│   └── styles.css            # Main stylesheet
├── js/
│   └── app.js                # Main application logic
├── index.html                # Main page with scanner
├── serial.html               # Serial number input form
├── vercel.json               # Vercel configuration
└── README.md                 # This file
```

