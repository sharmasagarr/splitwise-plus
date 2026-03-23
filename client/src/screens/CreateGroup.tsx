import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppText from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import type { RootStackParamList } from '../navigations/RootStack';
import { useCreateGroup, useJoinGroup, useSearchUsers } from '../services';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>;

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
  const [hasToken, setHasToken] = useState(false);
  const [inviteToken, setInviteToken] = useState('');

  const [searchUsers, { data: searchData, loading: searching }] =
    useSearchUsers();

  const [createGroup, { loading: creating }] = useCreateGroup({
    onCompleted: () => {
      Alert.alert('Success', 'Group created successfully!');
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const [joinGroup, { loading: joining }] = useJoinGroup({
    onCompleted: () => {
      Alert.alert('Success', 'Successfully joined the group!');
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
    if (selectedMembers.find(member => member.id === user.id)) {
      return;
    }

    setSelectedMembers(prev => [...prev, user]);
    setSearchQuery('');
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(member => member.id !== userId));
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Validation Error', 'Group name cannot be empty');
      return;
    }

    const emails = selectedMembers.map(member => member.email);
    createGroup({
      variables: { name: groupName.trim(), memberEmails: emails },
    });
  };

  const handleJoin = () => {
    if (!inviteToken.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid invite token');
      return;
    }

    joinGroup({
      variables: { token: inviteToken.trim() },
    });
  };

  const searchResults = (searchData?.searchUsers || []).filter(
    (user: UserResult) =>
      !selectedMembers.find(member => member.id === user.id),
  );
  const toggleLabel = hasToken
    ? 'Create a new group instead'
    : 'Have an invite token instead?';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {!hasToken ? (
          <>
            <AppText style={styles.label}>Group Name</AppText>
            <AppTextInput
              style={styles.input}
              placeholder="e.g., Goa Trip 2026"
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor="#94a3b8"
            />

            <AppText style={styles.label}>Add Members</AppText>
            <AppTextInput
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
                      <AppText style={styles.resultAvatarText}>
                        {user.name.charAt(0).toUpperCase()}
                      </AppText>
                    </View>
                    <View style={styles.resultInfo}>
                      <AppText style={styles.resultName}>{user.name}</AppText>
                      <AppText style={styles.resultEmail}>{user.email}</AppText>
                    </View>
                    <AppText style={styles.addIcon}>+</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {searchQuery.length >= 2 &&
              searchResults.length === 0 &&
              !searching && (
                <AppText style={styles.noResults}>No users found</AppText>
              )}

            {selectedMembers.length > 0 && (
              <View style={styles.chipsSection}>
                <AppText style={styles.chipsLabel}>
                  Selected ({selectedMembers.length})
                </AppText>
                <View style={styles.chipsContainer}>
                  {selectedMembers.map(member => (
                    <View key={member.id} style={styles.chip}>
                      <AppText style={styles.chipText}>{member.name}</AppText>
                      <TouchableOpacity
                        onPress={() => removeMember(member.id)}
                      >
                        <AppText style={styles.chipRemove}>x</AppText>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.tokenSection}>
            <AppText style={styles.label}>Invite Token</AppText>
            <AppTextInput
              style={styles.input}
              placeholder="Paste your token here..."
              value={inviteToken}
              onChangeText={setInviteToken}
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppText style={styles.tokenHint}>
              Ask the group admin to share the invite token with you.
            </AppText>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerToggleRow}>
          <AppText style={styles.footerToggleLabel}>{toggleLabel}</AppText>
          <Switch
            value={hasToken}
            onValueChange={setHasToken}
            trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
            thumbColor={hasToken ? '#4f46e5' : '#fff'}
            ios_backgroundColor="#cbd5e1"
          />
        </View>
        {hasToken ? (
          <TouchableOpacity
            style={[styles.createBtn, joining && styles.createBtnDisabled]}
            onPress={handleJoin}
            disabled={joining}
          >
            <AppText style={styles.createBtnText}>
              {joining ? 'Joining...' : 'Join Group'}
            </AppText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.createBtn, creating && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={creating}
          >
            <AppText style={styles.createBtnText}>
              {creating ? 'Creating...' : 'Create Group'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreateGroup;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  footerToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  footerToggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginRight: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
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
  tokenSection: { marginTop: 0 },
  tokenHint: {
    marginTop: 10,
    fontSize: 10,
    lineHeight: 19,
    color: '#64748b',
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
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
