import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Alert, Image, TouchableOpacity, Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import supabase from '../utils/supabase';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Define the navigation types
type RootStackParamList = {
  SignIn: undefined;
  HomeScreen: { user: any }; // Replace `any` with the actual user type
};

type SignInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;

export const SignInScreen = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // Replace with your Web Client ID from Google Console
      });
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      if (Platform.OS === 'web') {
        // Web OAuth flow
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin, // Redirect to the current page after sign-in
          },
        });

        if (error) throw error;

        if (data?.url) {
          await WebBrowser.openAuthSessionAsync(data.url, window.location.origin);
        }
      } else {
        // Mobile OAuth flow
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        console.log('Google Sign-In Success:', userInfo);

        const idToken = userInfo.data?.idToken; // Ensure this is the correct property
        if (idToken) {
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });

          if (error) throw error;

          //console.log('Signed in with Supabase successfully', data);
          //navigation.replace('HomeScreen', { user: data.user });
        } else {
          throw new Error('No ID token returned');
        }
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      handleSignInError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInError = (error: any) => {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      Alert.alert('Sign In Cancelled', 'User cancelled the login flow.');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      Alert.alert('Sign In In Progress', 'Sign in is already in progress.');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert('Play Services Error', 'Google Play services not available or outdated.');
    } else {
      Alert.alert('Error', error.message || 'Sign-in failed.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>SplitEase</Text>
      <Text style={styles.welcomeText}>Effortless Expense Sharing</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />
      ) : (
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Image source={require('../../assets/google.png')} style={styles.googleIcon} />
          <Text style={styles.googleText}>Sign in with Google</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2089dc',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  googleButton: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  loader: {
    marginTop: 20,
  },
});