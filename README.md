PlateVote
Project Overview:
PlateVote is a mobile application to solve the "where to eat" dilemma. Users create a session, invite friends via a code, and everyone swipes on restaurant options. The app tallies the votes and picks the winner.
Core features include: 
- Real time lobby
- Live vote
- Smart results with tie break
- Google Places restaurant suggestions

Tech Stack: 
Frontend - React Native Expo with Typescript
Backend - Supabase (postgreSQL + Realtime)
Navigation - Expo router
API - Google Places (for restaurant recommendations)

What to Do to Run: 
- Install Node.js
- Install Expo Go app on your IOS or Android device for testing on hardware

1) Installation
First, if you haven't, clone repo and install dependencies through following commands:

git clone https://github.com/JoelMoyal/CMPE131-Group9-.git
cd platevote
npm install

2) Environment Setup
Copy the example env file and fill in your keys:

cp .env.example .env

Then add your Supabase and Google Places API keys to the .env file:
- EXPO_PUBLIC_SUPABASE_URL (from your Supabase project settings)
- EXPO_PUBLIC_SUPABASE_ANON_KEY (from your Supabase project settings)
- EXPO_PUBLIC_GOOGLE_PLACES_API_KEY (optional - without it the app uses sample restaurant data)

3) Run Expo dev server using following command:

npx expo start

Expo handles all the compiling automatically so no extra build step is needed.

4) View app:
- Scan the QR code displayed on the terminal using the Expo Go App (Android) or Camera (iOS)
- Emulator (press a for android or i for iOS)

Demo Video:
https://drive.google.com/file/d/10q-bHxj3UJJpxz8QvWm-cwJXsx2lMK4r/view
