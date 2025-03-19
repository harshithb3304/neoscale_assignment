import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignInScreen } from './src/app/SignInScreen';
import { HomeScreen } from './src/app/HomeScreen';
import { TransactionsScreen } from './src/app/TransactionsScreen';
import { FriendsScreen } from './src/app/FriendsScreen'; // ✅ Import FriendsScreen
import { supabase } from './config/supabase';
import { Session } from '@supabase/supabase-js';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    console.log('Initializing auth state...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
    });

    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
    });
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!session ? (
          <Stack.Screen 
            name="SignIn" 
            component={SignInScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{
                title: 'Your Transactions',
                headerStyle: {
                  backgroundColor: '#2089dc',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="Friends"
              component={FriendsScreen} // ✅ Add FriendsScreen
              options={{
                title: 'Your Friends',
                headerStyle: {
                  backgroundColor: '#2ecc71',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
