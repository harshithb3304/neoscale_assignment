import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Button, ListItem, Avatar } from 'react-native-elements';
import axios from 'axios';
import { supabase } from '../../config/supabase';
import { useSession } from './SessionContext';
import { Platform } from 'react-native';

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}



const API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api/friends' // ✅ Android Emulator
    : Platform.OS === 'ios'
    ? 'http://127.0.0.1:3000/api/friends' // ✅ iOS Simulator
    : 'http://localhost:3000/api/friends'; // ✅ Web (React Native for Web / Expo Web)



export const FriendsScreen = ({ navigation }: { navigation: any }) => {
  const { session, loading: sessionLoading } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      console.error("No active session found.");
      Alert.alert("Error", "You must be logged in to view friends.");
      navigation.navigate('SignIn' as never);
      return;
    }

    fetchFriends();
  }, [session]);

  const fetchFriends = async () => {
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });

      console.log('Fetched Friends:', response.data);
      setFriends(response.data.friends || []);
    } catch (error: any) {
      console.error('Error fetching friends:', error.response?.data || error);
      Alert.alert("Error", "Failed to fetch friends. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <ListItem bottomDivider>
      <Avatar
        rounded
        source={item.avatar_url ? { uri: item.avatar_url } : require('../../assets/favicon.png')}
      />
      <ListItem.Content>
        <ListItem.Title>{item.name}</ListItem.Title>
        <ListItem.Subtitle>{item.email}</ListItem.Subtitle>
      </ListItem.Content>
    </ListItem>
  );

  if (loading || sessionLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading friends...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {friends.length > 0 ? (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No friends found. Add some friends to get started!</Text>
        </View>
      )}
      <Button
        title="Go Back"
        onPress={() => navigation.goBack()}
        buttonStyle={styles.backButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#2089dc',
  },
});