# Night Player

Night Player is a basic react/electron app to stream Twitch VODs and YouTube videos with a persistant state. The video list and position played in each video can be saved to a firebase database for use across multiple devices or a local browser database. 

## Features 

- Drag and drop to add new videos to the player list.
- Hide duration of the video for watching spoiler free eSports.

## Getting Started: Hosted

Access GitHub pages to run in your browser.

## Getting Started: Self Hosted

Build the react application:

```
yarn build
```

Or build the electron application:

```
yarn package
```

## Database

### IndexedDB

Data is stored locally in your browser. No configuration is required.

### Firebase

Data can be stored online using Firebase as the database driver so that application data is persistant across multiple browsers and devices. 

Create a new Firebase application and configure Firestore. 

1. Copy the Firebase configuration variables in the application settings page.
2. Configure Firestore to allow anonymouse authentication.
3. Configure Firestore rules to require authentication.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

# Licence

This project is licensed under MIT.