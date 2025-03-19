import React, { useEffect, useState } from 'react';
import { View, Modal, StyleSheet, ScrollView } from 'react-native';
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
  transaction: {
    id: string;
    amount: number;
    description: string;
  };
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const SplitTransactionModal = ({ visible, onClose, transaction }: SplitTransactionModalProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await axios.get(`${API_URL}/friends`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSplitTransaction = async () => {
    if (selectedFriends.length === 0) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await axios.post(
        `${API_URL}/transactions/split`,
        {
          transactionId: transaction.id,
          friendIds: selectedFriends,
        },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      onClose();
    } catch (error) {
      console.error('Error splitting transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const splitAmount = transaction.amount / (selectedFriends.length + 1);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text h4 style={styles.title}>Split Transaction</Text>
          <Text style={styles.description}>{transaction.description}</Text>
          <Text style={styles.amount}>Total: ${transaction.amount.toFixed(2)}</Text>
          
          {selectedFriends.length > 0 && (
            <Text style={styles.splitAmount}>
              Split Amount: ${splitAmount.toFixed(2)} each
            </Text>
          )}

          <ScrollView style={styles.friendsList}>
            {friends.map(friend => (
              <CheckBox
                key={friend.id}
                title={friend.name || friend.email}
                checked={selectedFriends.includes(friend.id)}
                onPress={() => toggleFriendSelection(friend.id)}
                containerStyle={styles.checkboxContainer}
              />
            ))}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={onClose}
              buttonStyle={styles.cancelButton}
              titleStyle={styles.buttonText}
            />
            <Button
              title={loading ? "Splitting..." : "Split"}
              onPress={handleSplitTransaction}
              disabled={selectedFriends.length === 0 || loading}
              buttonStyle={styles.splitButton}
              titleStyle={styles.buttonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  title: {
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    marginBottom: 10,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2089dc',
    marginBottom: 10,
  },
  splitAmount: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 15,
  },
  friendsList: {
    maxHeight: 300,
  },
  checkboxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#999',
    paddingHorizontal: 30,
  },
  splitButton: {
    backgroundColor: '#2089dc',
    paddingHorizontal: 30,
  },
  buttonText: {
    fontSize: 16,
  },
});
