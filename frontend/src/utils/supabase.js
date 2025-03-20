import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,  // ✅ Use AsyncStorage for session persistence
    autoRefreshToken: true, // ✅ Refresh token automatically
    persistSession: true,   // ✅ Persist the session even after app restart
    detectSessionInUrl: false, // ✅ Avoid URL detection for mobile apps
  },
});

export default supabase;
