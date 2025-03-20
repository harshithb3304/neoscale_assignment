import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Modal } from 'react-native';
import { Text, Button, CheckBox } from 'react-native-elements';
import axios from 'axios';
import { supabase } from '../../config/supabase';

interface Friend {
  id: string;
  name: string;
  email: string;
}

interface SplitTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: { id: string; amount: number; description: string };
  fetchTransactions: () => void;
}

const API_URL = 'http://localhost:3000/api';

const SplitTransactionModal = ({ visible, onClose, transaction, fetchTransactions }: SplitTransactionModalProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.modalContent}>
          <Text h4>Split Transaction</Text>
          <Text>{transaction.description}</Text>
          <ScrollView>
            {friends.map((friend) => (
              <CheckBox
                key={friend.id}
                title={friend.name || friend.email}
                checked={selectedFriends.includes(friend.id)}
                onPress={() => setSelectedFriends((prev) =>
                  prev.includes(friend.id) ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]
                )}
              />
            ))}
          </ScrollView>
          <Button title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%' },
});

export default SplitTransactionModal;
