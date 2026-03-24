import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  username?: string | null;
  imageUrl?: string | null;
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

  useEffect(() => {
    if (hasToken) {
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      searchUsers({ variables: { query: trimmed } });
    }, 350);

    return () => clearTimeout(timer);
  }, [hasToken, searchQuery, searchUsers]);

  const selectedIds = useMemo(
    () => new Set(selectedMembers.map(member => member.id)),
    [selectedMembers],
  );

  const searchResults: UserResult[] = useMemo(() => {
    const users = searchData?.searchUsers || [];

    return users.filter((user: UserResult) => !selectedIds.has(user.id));
  }, [searchData?.searchUsers, selectedIds]);

  const handleSelectUser = (user: UserResult) => {
    setSelectedMembers(prev =>
      prev.some(member => member.id === user.id) ? prev : [...prev, user],
    );
    setSearchQuery('');
  };

  const handleRemoveUser = (userId: string) => {
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

  const toggleLabel = hasToken
    ? 'Create a new group instead'
    : 'Have an invite token instead?';
  const canSearch = searchQuery.trim().length >= 2;
  const getUserMeta = (user: UserResult) =>
    user.username ? `@${user.username}` : user.email;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
              placeholder="Search by username or email"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {selectedMembers.length > 0 ? (
              <View style={styles.section}>
                <AppText style={styles.sectionTitle}>
                  Selected ({selectedMembers.length})
                </AppText>
                <View style={styles.selectedList}>
                  {selectedMembers.map(member => (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.resultCard, styles.selectedCard]}
                      onPress={() => handleRemoveUser(member.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.userInfoRow}>
                        {member.imageUrl ? (
                          <Image
                            source={{ uri: member.imageUrl }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <AppText style={styles.avatarText}>
                              {member.name.charAt(0).toUpperCase()}
                            </AppText>
                          </View>
                        )}
                        <View style={styles.userTextWrap}>
                          <AppText style={styles.name}>{member.name}</AppText>
                          <AppText style={styles.username}>
                            {getUserMeta(member)}
                          </AppText>
                        </View>
                      </View>
                      <View style={[styles.checkbox, styles.checkboxChecked]}>
                        <View style={styles.checkboxInner} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Found users</AppText>

              {!canSearch ? (
                <AppText style={styles.helperText}>
                  Type at least 2 characters to search.
                </AppText>
              ) : null}

              {canSearch && searching ? (
                <View style={styles.searchState}>
                  <ActivityIndicator size="small" color="#4f46e5" />
                  <AppText style={styles.searchStateText}>Searching...</AppText>
                </View>
              ) : null}

              {canSearch && !searching && searchResults.length === 0 ? (
                <AppText style={styles.helperText}>
                  No additional users found for this search.
                </AppText>
              ) : null}

              {canSearch && !searching && searchResults.length > 0 ? (
                <View style={styles.resultsList}>
                  {searchResults.map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.resultCard}
                      onPress={() => handleSelectUser(user)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.userInfoRow}>
                        {user.imageUrl ? (
                          <Image
                            source={{ uri: user.imageUrl }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <AppText style={styles.avatarText}>
                              {user.name.charAt(0).toUpperCase()}
                            </AppText>
                          </View>
                        )}
                        <View style={styles.userTextWrap}>
                          <AppText style={styles.name}>{user.name}</AppText>
                          <AppText style={styles.username}>
                            {getUserMeta(user)}
                          </AppText>
                        </View>
                      </View>
                      <View style={styles.checkbox} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
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
            activeOpacity={0.9}
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
            activeOpacity={0.9}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 136,
  },
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
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#1e293b',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#94a3b8',
  },
  searchState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchStateText: {
    color: '#64748b',
    fontSize: 13,
  },
  selectedList: {
    gap: 10,
  },
  resultsList: {
    gap: 10,
  },
  selectedCard: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    backgroundColor: '#e2e8f0',
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
  },
  userTextWrap: {
    flex: 1,
  },
  name: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  username: {
    color: '#0a5aca',
    fontSize: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  tokenSection: {
    marginTop: 0,
  },
  tokenHint: {
    marginTop: 10,
    fontSize: 10,
    lineHeight: 19,
    color: '#64748b',
  },
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
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
