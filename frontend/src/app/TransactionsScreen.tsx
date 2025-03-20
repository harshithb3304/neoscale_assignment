import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal,Animated } from 'react-native';
import { Text, Button, Icon, CheckBox } from 'react-native-elements';
import axios from 'axios';
import supabase from '../utils/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

const API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api' // ✅ Android Emulator
    : Platform.OS === 'ios'
    ? 'http://127.0.0.1:3000/api' // ✅ iOS Simulator
    : 'http://localhost:3000/api'; // ✅ Web (React Native for Web / Expo Web)


interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Split {
  id: string;
  userId: string;
  amount: number;
  user: User;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  issplit: boolean;
  userId: string;
  user: User;
  createdAt?: string;
  updatedAt?: string;
  splits?: Split[];
  expanded?: boolean;
}

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
  fetchTransactions: () => void;
}


export const TransactionsScreen = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    issplit: null as boolean | null,
    startDate: null as Date | null,
    endDate: null as Date | null,
    minAmount: null as number | null,
    maxAmount: null as number | null,
  });
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isSplitModalVisible, setSplitModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filterAnimation] = useState(new Animated.Value(0));
  useEffect(() => {
    if (isFilterModalVisible) {
      Animated.timing(filterAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(filterAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isFilterModalVisible]);

  useEffect(() => {
    fetchCurrentUser();
    fetchTransactions();
  }, [filters]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: { user } } = await supabase.auth.getUser(session.access_token);
      if (!user) return;

      // Fetch the user's database ID
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.data && response.data.user) {
        setCurrentUserId(response.data.user.id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session found.");
        return;
      }

      const params = new URLSearchParams();
      if (filters.issplit !== null) params.append('issplit', filters.issplit.toString());
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.minAmount !== null) params.append('minAmount', filters.minAmount.toString());
      if (filters.maxAmount !== null) params.append('maxAmount', filters.maxAmount.toString());

      const response = await axios.get(`${API_URL}/transactions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Ensure the response is valid and contains an array of transactions
      if (Array.isArray(response.data.transactions)) {
        setTransactions(response.data.transactions);
      } else {
        console.error('Invalid transactions data:', response.data);
        setTransactions([]); // Fallback to an empty array
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error.response?.data || error);
      setTransactions([]); // Fallback to an empty array
    } finally {
      setLoading(false);
    }
  };


  const handleSplitTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setSplitModalVisible(true);
  };

  const handleExpandTransaction = (transaction: Transaction) => {
    if (transaction.issplit) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transaction.id ? { ...t, expanded: !t.expanded } : t
        )
      );
    }
  };

  const isOwnTransaction = (transaction: Transaction) => {
    return transaction.userId === currentUserId;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    // Check if item is defined and has required properties
    if (!item || typeof item !== 'object') {
      console.error('Invalid transaction item:', item);
      return null; // Skip rendering this item
    }

    const isOwner = isOwnTransaction(item);

    return (
      <TouchableOpacity onPress={() => handleExpandTransaction(item)} style={styles.card}>
        <View style={styles.transactionHeader}>
          <Text h4>{item.description || 'No Description'}</Text>
          <Text style={styles.amount}>₹{item.amount?.toFixed(2) || '0.00'}</Text>
        </View>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
        
        {!isOwner && (
          <View style={styles.sharedWith}>
            <Text style={styles.sharedText}>Shared by: {item.user?.name || item.user?.email || 'Unknown'}</Text>
          </View>
        )}
        
        {item.issplit ? (
          <View style={styles.splitStatus}>
            <Icon name="check" type="material" color="#4CAF50" size={16} />
            <Text style={styles.splitText}>Split</Text>
          </View>
        ) : (
          isOwner && (
            <Button
              title="Split"
              onPress={() => handleSplitTransaction(item)}
              buttonStyle={styles.splitButton}
              titleStyle={styles.splitButtonText}
            />
          )
        )}

        {item.issplit && item.expanded && (
          <View style={styles.splitDetails}>
            <Text style={styles.splitTitle}>Split Details:</Text>
            {item.splits?.map((split) => (
              <View key={split.id} style={styles.splitItem}>
                <Text style={styles.splitFriend}>
                  {split.user?.name || split.user?.email || 'Unknown User'}: ₹{split.amount?.toFixed(2) || '0.00'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading transactions...</Text>
      </View>
    );
  }
  const translateY = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <View style={styles.container}>
      {/* Filter Button */}
      <Button
        title="Filters"
        onPress={() => setFilterModalVisible(true)}
        buttonStyle={styles.filterButton}
        icon={<Icon name="filter-list" type="material" color="#fff" size={20} />}
      />

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View 
            style={[
              styles.filterModalContainer,
              { transform: [{ translateY: filterAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [600, 0],
              }) }] }
            ]}
          >
            <View style={styles.filterHeader}>
              <Text h4 style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity 
                onPress={() => setFilterModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" type="material" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent}>
              {/* Split Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Transaction Type</Text>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.issplit === true && styles.activeFilterOption
                  ]}
                  onPress={() => setFilters({ ...filters, issplit: filters.issplit === true ? null : true })}
                >
                  <Icon
                    name="call-split"
                    type="material"
                    color={filters.issplit === true ? "#fff" : "#666"}
                    size={20}
                  />
                  <Text style={[
                    styles.optionText,
                    filters.issplit === true && styles.activeOptionText
                  ]}>
                    Split Transactions
                  </Text>
                  {filters.issplit === true && (
                    <Icon
                      name="check"
                      type="material"
                      color="#fff"
                      size={20}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Date Range</Text>
                <View style={styles.dateRangeContainer}>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => {
                      setDatePickerMode('start');
                      setDatePickerVisibility(true);
                    }}
                  >
                    <Text style={styles.dateLabel}>From</Text>
                    <Text style={styles.dateValue}>
                      {filters.startDate ? filters.startDate.toLocaleDateString() : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.dateSeparator} />
                  
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => {
                      setDatePickerMode('end');
                      setDatePickerVisibility(true);
                    }}
                  >
                    <Text style={styles.dateLabel}>To</Text>
                    <Text style={styles.dateValue}>
                      {filters.endDate ? filters.endDate.toLocaleDateString() : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Amount Range</Text>
                <View style={styles.amountRangeContainer}>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.amountLabel}>Minimum</Text>
                    <TextInput
                      placeholder="₹0"
                      value={filters.minAmount?.toString() || ''}
                      onChangeText={(text) => {
                        const value = text.trim() === '' ? null : parseFloat(text);
                        setFilters({ ...filters, minAmount: value });
                      }}
                      style={styles.amountInput}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                  
                  <View style={styles.amountSeparator} />
                  
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.amountLabel}>Maximum</Text>
                    <TextInput
                      placeholder="No limit"
                      value={filters.maxAmount?.toString() || ''}
                      onChangeText={(text) => {
                        const value = text.trim() === '' ? null : parseFloat(text);
                        setFilters({ ...filters, maxAmount: value });
                      }}
                      style={styles.amountInput}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <Button
                title="Clear All"
                onPress={() => setFilters({
                  issplit: null,
                  startDate: null,
                  endDate: null,
                  minAmount: null,
                  maxAmount: null,
                })}
                buttonStyle={styles.clearButton}
                titleStyle={styles.clearButtonText}
                type="outline"
              />
              <Button
                title="Apply Filters"
                onPress={() => {
                  fetchTransactions();
                  setFilterModalVisible(false);
                }}
                buttonStyle={styles.applyButton}
                titleStyle={styles.applyButtonText}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* DateTimePicker */}
      {isDatePickerVisible && (
        <DateTimePicker
          value={datePickerMode === 'start' ? (filters.startDate || new Date()) : (filters.endDate || new Date())}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setDatePickerVisibility(false); // Hide the picker after selection
            if (selectedDate) {
              if (datePickerMode === 'start') {
                setFilters({ ...filters, startDate: selectedDate });
              } else {
                setFilters({ ...filters, endDate: selectedDate });
              }
            }
          }}
        />
      )}
      {/* Transactions List */}
      {transactions.length > 0 ? (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      )}

      {/* Split Modal */}
      {selectedTransaction && (
        <SplitTransactionModal
          visible={isSplitModalVisible}
          onClose={() => setSplitModalVisible(false)}
          transaction={selectedTransaction}
          fetchTransactions={fetchTransactions}
        />
      )}
    </View>
  );
};

const SplitTransactionModal = ({ visible, onClose, transaction, fetchTransactions }: SplitTransactionModalProps) => {
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

      // Access the `friends` property from the response data
      const friendsData = response.data.friends;

      // Ensure the `friends` property is an array
      if (Array.isArray(friendsData)) {
        setFriends(friendsData);
      } else {
        console.error('Invalid friends data:', friendsData);
        setFriends([]); // Fallback to an empty array
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]); // Fallback to an empty array
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
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

      // Call fetchTransactions to refresh the list
      fetchTransactions();
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
          <Text style={styles.amount}>Total: ₹{transaction.amount.toFixed(2)}</Text>
          
          {selectedFriends.length > 0 && (
            <Text style={styles.splitAmount}>
              Split Amount: ₹{splitAmount.toFixed(2)} each
            </Text>
          )}

          <ScrollView style={styles.friendsList}>
            {friends.map((friend) => (
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
              buttonStyle={styles.splitModalButton}
              titleStyle={styles.buttonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  filterContent: {
    flexGrow: 1,
  },
  filterSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
    color: '#333',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  activeFilterOption: {
    backgroundColor: '#2089dc',
  },
  optionText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  activeOptionText: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 16,
    color: '#333',
  },
  dateSeparator: {
    width: 10,
  },
  amountRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountInputContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  amountInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  amountSeparator: {
    width: 10,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    marginRight: 10,
    borderColor: '#2089dc',
    borderRadius: 10,
  },
  clearButtonText: {
    color: '#2089dc',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#2089dc',
    borderRadius: 10,
  },
  applyButtonText: {
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 10,
    marginBottom: 10,
    padding: 15,
    backgroundColor: 'white',
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2089dc',
  },
  date: {
    color: '#666',
    marginBottom: 10,
  },
  splitStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  splitText: {
    marginLeft: 5,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  splitButton: {
    backgroundColor: '#2089dc',
    borderRadius: 5,
    marginTop: 10,
  },
  splitButtonText: {
    fontSize: 14,
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
  filterButton: {
    backgroundColor: '#2089dc',
    borderRadius: 5,
    marginBottom: 10,
  },
  filterModal: {
    width: '90%',
    padding: 20,
    borderRadius: 10,
  },
  filterModalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOptionButton: {
    backgroundColor: '#2089dc',
    borderRadius: 5,
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dateRangeSeparator: {
    fontSize: 16,
    color: '#666',
  },
  clearFiltersButton: {
    backgroundColor: '#f44336',
    borderRadius: 5,
    marginTop: 10,
  },
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
  splitModalButton: {
    backgroundColor: '#2089dc',
    paddingHorizontal: 30,
  },
  buttonText: {
    fontSize: 16,
  },
  splitDetails: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  splitTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  splitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  splitFriend: {
    fontSize: 14,
    color: '#666',
  },
  sharedWith: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  sharedText: {
    color: '#888',
    fontStyle: 'italic',
  },
});