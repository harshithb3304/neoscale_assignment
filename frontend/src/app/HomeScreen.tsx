import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image, TextInput, TouchableOpacity } from 'react-native';
import { Button, Avatar, Icon } from 'react-native-elements';
import { supabase } from '../../config/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigation } from '@react-navigation/native';

export const HomeScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setName(user?.user_metadata?.full_name || '');
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Error signing out:', error.message);
    }
  };

  const handleNameChange = async () => {
    try {
      const { error } = await supabase.auth.updateUser({ data: { name } });
      if (error) throw error;
      setEditing(false);
    } catch (error: any) {
      console.error('Error updating name:', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Avatar
        rounded
        size="large"
        source={user?.user_metadata?.picture ? { uri: user.user_metadata.picture } : require('../../assets/favicon.png')}
        containerStyle={styles.avatar}
      />
      <View style={styles.nameContainer}>
        {editing ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            onBlur={handleNameChange}
            autoFocus
          />
        ) : (
          <Text style={styles.name} onPress={() => setEditing(true)}>{name || 'Tap to set name'}</Text>
        )}
        {!editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Icon name="edit" type="material" size={20} color="#2089dc" style={styles.editIcon} />
          </TouchableOpacity>
        )}
      </View>
      <Button
        title="View Transactions"
        onPress={() => navigation.navigate('Transactions' as never)}
        containerStyle={styles.buttonContainer}
        buttonStyle={styles.buttonPrimary}
      />
      <Button
        title="View Friends"
        onPress={() => navigation.navigate('Friends' as never)}
        containerStyle={styles.buttonContainer}
        buttonStyle={styles.buttonSecondary}
      />
      <Button
        title="Sign Out"
        onPress={handleSignOut}
        containerStyle={styles.buttonContainer}
        buttonStyle={styles.buttonDanger}
      />
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
  avatar: {
    marginBottom: 15,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  input: {
    fontSize: 18,
    padding: 5,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    width: '80%',
    textAlign: 'center',
  },
  editIcon: {
    marginLeft: 5,
  },
  buttonContainer: {
    width: '80%',
    marginTop: 10,
  },
  buttonPrimary: {
    backgroundColor: '#2089dc',
  },
  buttonSecondary: {
    backgroundColor: '#2ecc71',
  },
  buttonDanger: {
    backgroundColor: '#e74c3c',
  },
});
