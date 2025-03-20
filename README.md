# Project Setup Guide

# Assumptions Made During Implementation

## 1️⃣ Authentication Assumptions
- **Only Google OAuth is supported** – No other authentication methods (e.g., email/password, Apple Sign-In).
- **Users must be signed in to access any feature** – No guest mode or anonymous access.
- **Supabase manages authentication** – No custom authentication logic; all users exist in `auth.users`.

---

## 2️⃣ Backend Assumptions
- **Users can only view their own transactions** – No ability to see other users' transactions unless they are part of a split transaction.
- **Friend relationships are mutual** – If `User A` adds `User B` as a friend, `User B` automatically sees `User A` as a friend.
- **Splitting a transaction is irreversible** – Once a transaction is marked as "Split," it cannot be undone.
- **Transactions are split equally** – No custom split ratios (e.g., 60-40, custom amounts).

---

## 3️⃣ Database Assumptions
- **User data is stored in a separate table (`User`) linked to `auth.users`** – Instead of relying solely on Supabase’s auth system.
- **Transactions and splits are stored separately** – The `Split` table references `Transaction` and `User`.
- **A user must be in the `Friend` table to split transactions with another user** – Prevents splitting with random users.

---

## 4️⃣ Frontend Assumptions
- **Transactions list is read-only** – Users cannot add or delete transactions, only split them.
- **Transactions are fetched in real-time** – The app does not cache transactions locally.
- **Minimal UI customization** – The UI follows standard React Native components with basic styling (no animations or advanced UI features).
- **Transactions are displayed in chronological order** – Sorted by date (newest first).

---


## Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Android Studio](https://developer.android.com/studio)
- [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)

## Table of Contents
1. [Frontend Setup (Expo + React Native)](#1-frontend-setup-expo--react-native)
2. [Backend Setup (Next.js + Prisma)](#2-backend-setup-nextjs--prisma)
3. [Database Setup (Supabase)](#3-database-setup)
4. [Supabase Configuration](#4-supabase-configuration)
5. [Google Authentication Setup](#5-google-authentication-setup)
6. [Testing the Complete Setup](#6-testing-the-complete-setup)
7. [Troubleshooting](#7-troubleshooting)

## 1. Frontend Setup (Expo + React Native)

### Step 1: Clone the Repository
```sh
git clone https://github.com/harshithb3304/neoscale_assignment.git
cd your-repo/frontend
```

### Step 2: Install Dependencies
```sh
npm install  # or yarn install
```

### Step 3: Setup Environment Variables
Create a `.env` file in the frontend directory and add the following variables:
```env
EXPO_PUBLIC_SUPABASE_URL="Your_Supabase_URL"
EXPO_PUBLIC_SUPABASE_ANON_KEY="Your_Supabase_ANON_KEY"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="Your_Google_Web_Client_ID"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET="Your_Google_Web_Client_Secret"
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="Your_Google_Android_Client_ID"
```

Refer to sections 4 and 5 below for instructions on obtaining these values.

### Step 4: Start the Expo Development Server
```sh
npm run start  # or expo start
```

This will launch the Metro bundler. You can run the app on:
- Webview (Browser): Press `w`

### Step 5: Run on Android
```sh
npm run android
```

This builds a local Android app that you can install on your device or run in your emulator. Note that some features may not be available in the web view, so using an Android device/emulator is recommended.

## 2. Backend Setup (Next.js + Prisma)

### Step 1: Navigate to Backend Directory
```sh
cd ../server # or cd ../backend
```

### Step 2: Install Dependencies
```sh
npm install  # or yarn install
```

### Step 3: Setup Environment Variables
Create a `.env` file in the backend directory and add the following:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_db
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

For Supabase values, see section 4 below.

### Step 4: Setup Database
Make sure to set up authentication in Supabase (section 5) before running the SQL commands provided in section 3.

### Step 5: Generate Prisma Client
```sh
npx prisma generate
```

### Step 6: Run Database Migrations
```sh
npx prisma migrate dev --name init
```

### Step 7: Seed the Database (if needed)
```sh
npx prisma db seed
```

Note: To use the seed command, make sure you have a `prisma/seed.ts` or `prisma/seed.js` file and add a `"prisma": { "seed": "ts-node prisma/seed.ts" }` entry to your `package.json` file or `"prisma": { "seed": "tsx prisma/seed.ts" }`

### Step 8: Start the Next.js Server
```sh
npm run dev  # or yarn dev
```

The backend will start on http://localhost:3000.

## 3. Database Setup

### Using Supabase Cloud
1. Sign up at [Supabase](https://supabase.com/)
2. Create a new project
3. Set up authentication first (see section 5)
4. Once the project is created, go to the SQL Editor
5. Create a new query and paste the following SQL commands:

```sql
-- Create the User table in the public schema
CREATE TABLE public."User" (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to auth.users
  email         TEXT,
  name          TEXT,
  googleid      TEXT UNIQUE,
  avatar_url    TEXT,
  updated_at    TIMESTAMP WITH TIME ZONE,
  "createdAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on the User table
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the User table
CREATE POLICY "Public User profiles are viewable by everyone." ON public."User"
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public."User"
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile." ON public."User"
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Create the Transaction table
CREATE TABLE public."Transaction" (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount        FLOAT NOT NULL,
  description   TEXT NOT NULL,
  date          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  userId        UUID NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  isSplit       BOOLEAN DEFAULT FALSE,
  "createdAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on the Transaction table
ALTER TABLE public."Transaction" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the Transaction table
CREATE POLICY "Users can view their own transactions." ON public."Transaction"
  FOR SELECT USING ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can insert their own transactions." ON public."Transaction"
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can update their own transactions." ON public."Transaction"
  FOR UPDATE USING ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can delete their own transactions." ON public."Transaction"
  FOR DELETE USING ((SELECT auth.uid()) = userId);

-- Create the Split table
CREATE TABLE public."Split" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  transactionId UUID NOT NULL REFERENCES public."Transaction"(id) ON DELETE CASCADE,
  userId        UUID NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  amount        FLOAT NOT NULL,
  "createdAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (transactionId, userId)
);

-- Enable Row Level Security (RLS) on the Split table
ALTER TABLE public."Split" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the Split table
CREATE POLICY "Users can view their own splits." ON public."Split"
  FOR SELECT USING ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can insert their own splits." ON public."Split"
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can update their own splits." ON public."Split"
  FOR UPDATE USING ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can delete their own splits." ON public."Split"
  FOR DELETE USING ((SELECT auth.uid()) = userId);

-- Create the Friend table
CREATE TABLE public."Friend" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  userId        UUID NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  friendId      UUID NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "createdAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (userId, friendId)
);

-- Enable Row Level Security (RLS) on the Friend table
ALTER TABLE public."Friend" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the Friend table
CREATE POLICY "Users can view their own friends." ON public."Friend"
  FOR SELECT USING ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can insert their own friends." ON public."Friend"
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can update their own friends." ON public."Friend"
  FOR UPDATE USING ((SELECT auth.uid()) = userId);

CREATE POLICY "Users can delete their own friends." ON public."Friend"
  FOR DELETE USING ((SELECT auth.uid()) = userId);

-- Create trigger to automatically create User entry on auth signup
CREATE FUNCTION public.handle_new_user() RETURNS TRIGGER
SET search_path = '' AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

6. Click "Run" to execute the SQL commands

## 4. Supabase Configuration

### Step 1: Get Supabase URL and Anon Key
1. Navigate to your Supabase project dashboard
2. Click on the Settings icon (gear) in the left sidebar
3. Select "API" from the menu
4. Under "Project API keys" section, you'll find:
   - **Project URL**: This is your `SUPABASE_URL`
   - **anon public**: This is your `SUPABASE_ANON_KEY`
5. Copy these values to both frontend and backend `.env` files

## 5. Google Authentication Setup

### Step 1: Create Google OAuth Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Select "Web application" as the application type
6. Add a name for your web client
7. Under "Authorized JavaScript origins", add:
   - `http://localhost:3000` (for development)
   - `https://your-production-domain.com` (for production)
8. Under "Authorized redirect URIs", add:
   - `http://localhost:3000/auth/callback/google` (for development)
   - `https://your-production-domain.com/auth/callback/google` (for production)
   - `https://your-supabase-project-ref.supabase.co/auth/v1/callback`
9. Click "Create"
10. Note down the **Client ID** (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) and **Client Secret** (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET`)

### Step 2: Create Android OAuth Client ID
1. In the Google Cloud Console, go to "APIs & Services" → "Credentials" 
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Android" as the application type
4. Add a name for your Android client
5. Enter your Android app's package name
6. For SHA-1 certificate fingerprint, use the command appropriate for your operating system:

   **On macOS/Linux:**
   ```sh
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

   **On Windows:**
   ```sh
   keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
   ```

   If you're using a custom keystore location, adjust the path accordingly.

7. Copy the SHA-1 fingerprint and paste it in the form
8. Click "Create"
9. Note down the **Client ID** (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`)

### Step 3: Configure Google Auth in Supabase
1. In your Supabase dashboard, go to "Authentication" → "Providers"
2. Find "Google" in the list and click on it
3. Toggle the "Enable" switch to ON
4. Enter the **Client ID** and **Client Secret** from Step 1
5. For Redirect URL, use the one shown in the Supabase dashboard
6. In the "Additional Client IDs" field, add the Android Client ID and Web Client ID as a comma-separated list (CSV format)
7. Save the configuration

## 6. Testing the Complete Setup

After setting up both frontend and backend:

1. Run the backend:
   ```sh
   cd backend
   npm run dev
   ```

2. Run the frontend:
   ```sh
   cd frontend
   npm run android  # For Android
   # OR
   npm run start    # For web/expo development
   ```

3. Verify API endpoints using http://localhost:3000/api

4. Check the database connection using Prisma Studio:
   ```sh
   cd backend
   npx prisma studio
   ```
   This opens a web interface at http://localhost:5555 where you can browse your database.

5. Test the authentication flow by trying to sign in with Google in your app

## 7. Troubleshooting

### Expo Issues
- If Expo fails to start, try clearing the cache:
  ```sh
  expo r -c  # or npx expo start --clear
  ```

- For Android build issues:
  ```sh
  cd android && ./gradlew clean && cd .. && npm run android
  ```

### Supabase Connection Issues
- Verify your Supabase URL and Anon Key are correct
- Check that your Supabase project is not paused
- Ensure your IP is not blocked by Supabase

### Google Authentication Issues
- Verify all redirect URIs are correctly configured
- Make sure the Google Cloud project has the "Google Identity" API enabled
- Check the console logs for detailed error messages

### Database Migration Issues
- If migrations fail, check Prisma's error messages
- You might need to reset the database:
  ```sh
  npx prisma migrate reset
  ```

### Prisma Issues
- If you encounter schema changes or errors:
  ```sh
  npx prisma generate  # Regenerate Prisma client
  ```
- To check your database structure:
  ```sh
  npx prisma db pull  # Pull current database schema
  ```

### General Debugging
- Check the terminal output for both frontend and backend
- Use browser developer tools to inspect network requests
- Verify environment variables are properly loaded

For additional help, refer to the documentation of the respective technologies:
- [Expo Documentation](https://docs.expo.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [ReactNative Environment Setup](https://reactnative.dev/docs/environment-setup)

## 8. Key Images and Screenshots 


### 🔹 **Homepage**
![Homepage](./assets/Homepage.png)

### 🔹 **Landing Page**
![Landing Page](./assets/landingpage.png)

### 🔹 **Friends Screen**
![Friends Screen](./assets/FriendsScreen.png)

### 🔹 **Transaction List**
![Transactions](./assets/Transactions.png)

### 🔹 **Split Transaction Modal**
![Split Modal](./assets/SplitModal.png)

### 🔹 **Filter Transactions**
![Filter Transactions](./assets/Filter.png)

### 🔹 **Database Schema**
![Database Schema](./assets/Schema.png)

---
