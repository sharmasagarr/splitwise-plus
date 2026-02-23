import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation, useLazyQuery } from '@apollo/client/react';
import { CREATE_GROUP, SEARCH_USERS } from '../graphql';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupsStackParamList } from '../navigations/GroupsStack';

type Props = NativeStackScreenProps<GroupsStackParamList, 'CreateGroup'>;

type UserResult = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
};

const CreateGroup: React.FC<Props> = ({ navigation }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([]);

  const [searchUsers, { data: searchData, loading: searching }] =
    useLazyQuery<any>(SEARCH_USERS);

  const [createGroup, { loading: creating }] = useMutation<any>(CREATE_GROUP, {
    onCompleted: () => {
      Alert.alert('Success', 'Group created successfully!');
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.trim().length >= 2) {
        searchUsers({ variables: { query: text.trim() } });
      }
    },
    [searchUsers],
  );

  const addMember = (user: UserResult) => {
    if (selectedMembers.find(m => m.id === user.id)) return;
    setSelectedMembers(prev => [...prev, user]);
    setSearchQuery('');
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== userId));
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Validation Error', 'Group name cannot be empty');
      return;
    }
    const emails = selectedMembers.map(m => m.email);
    createGroup({
      variables: { name: groupName.trim(), memberEmails: emails },
    });
  };

  const searchResults = (searchData?.searchUsers || []).filter(
    (u: UserResult) => !selectedMembers.find(m => m.id === u.id),
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Goa Trip 2026"
          value={groupName}
          onChangeText={setGroupName}
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Add Members</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by email..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {searching && (
          <ActivityIndicator
            size="small"
            color="#667eea"
            style={styles.searchingIndicator}
          />
        )}

        {searchQuery.length >= 2 && searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((user: UserResult) => (
              <TouchableOpacity
                key={user.id}
                style={styles.searchResultItem}
                onPress={() => addMember(user)}
              >
                <View style={styles.resultAvatar}>
                  <Text style={styles.resultAvatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{user.name}</Text>
                  <Text style={styles.resultEmail}>{user.email}</Text>
                </View>
                <Text style={styles.addIcon}>+</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {searchQuery.length >= 2 &&
          searchResults.length === 0 &&
          !searching && <Text style={styles.noResults}>No users found</Text>}

        {selectedMembers.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>
              Selected ({selectedMembers.length})
            </Text>
            <View style={styles.chipsContainer}>
              {selectedMembers.map(member => (
                <View key={member.id} style={styles.chip}>
                  <Text style={styles.chipText}>{member.name}</Text>
                  <TouchableOpacity onPress={() => removeMember(member.id)}>
                    <Text style={styles.chipRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, creating && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={creating}
        >
          <Text style={styles.createBtnText}>
            {creating ? 'Creating...' : 'Create Group'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreateGroup;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 100 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1e293b',
  },
  searchingIndicator: { marginTop: 12 },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultAvatarText: { fontSize: 16, fontWeight: '700', color: '#667eea' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  resultEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addIcon: { fontSize: 22, color: '#667eea', fontWeight: '700' },
  noResults: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chipsSection: { marginTop: 24 },
  chipsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipText: { fontSize: 14, color: '#3730a3', fontWeight: '600' },
  chipRemove: { fontSize: 14, color: '#6366f1', fontWeight: '700' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  createBtn: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
