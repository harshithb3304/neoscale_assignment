import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-elements';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../config/supabase';

WebBrowser.maybeCompleteAuthSession();

export const SignInScreen = () => {
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'email profile',
          skipBrowserRedirect: false,
          redirectTo: 'exp://127.0.0.1:8081'
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        await WebBrowser.openAuthSessionAsync(
          data.url,
          'localhost:8081'
        );
      }
    } catch (error) {
      console.error('Sign-in error:', error || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>SplitEase</Text>
      <Text style={styles.welcomeText}>Effortless Expense Sharing</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />
      ) : (
        <Button
          title="Sign in with Google"
          onPress={handleSignIn}
          buttonStyle={styles.googleButton}
          icon={{ name: 'google', type: 'font-awesome', color: 'white', size: 20 }}
          iconContainerStyle={styles.iconContainer}
          disabled={loading}
        />
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
    backgroundColor: '#4285F4',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginRight: 10,
  },
  loader: {
    marginTop: 20,
  },
});
