import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import AppText from './AppText';
import AppTextInput from './AppTextInput';
import { useSearchUsers } from '../services';

export type InviteSearchUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  imageUrl?: string | null;
};

type InviteSheetProps = {
  visible: boolean;
  onClose: () => void;
  onInviteUsers: (users: InviteSearchUser[]) => void;
  inviting: boolean;
  groupName?: string | null;
  excludedUserIds?: string[];
};

export default function InviteSheet({
  visible,
  onClose,
  onInviteUsers,
  inviting,
  excludedUserIds = [],
}: InviteSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['76%'], []);
  const [query, setQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<InviteSearchUser[]>([]);
  const [searchUsers, { data: searchData, loading: searching }] =
    useSearchUsers();

  const selectedIds = useMemo(
    () => new Set(selectedUsers.map(user => user.id)),
    [selectedUsers],
  );

  const searchResults: InviteSearchUser[] = useMemo(() => {
    const users = searchData?.searchUsers || [];
    const excludedIds = new Set(excludedUserIds);

    return users.filter(
      (user: InviteSearchUser) =>
        !excludedIds.has(user.id) && !selectedIds.has(user.id),
    );
  }, [excludedUserIds, searchData?.searchUsers, selectedIds]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    [],
  );

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      return;
    }

    bottomSheetRef.current?.dismiss();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSelectedUsers([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      searchUsers({ variables: { query: trimmed } });
    }, 350);

    return () => clearTimeout(timer);
  }, [query, searchUsers, visible]);

  const handleSelectUser = (user: InviteSearchUser) => {
    setSelectedUsers(prev =>
      prev.some(selected => selected.id === user.id) ? prev : [...prev, user],
    );
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  const canSearch = query.trim().length >= 3;
  const getUserMeta = (user: InviteSearchUser) =>
    user.username ? `@${user.username}` : user.email;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      animateOnMount
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onDismiss={onClose}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppText style={styles.title}>Invite Members</AppText>
        <AppText style={styles.subtitle}>
          Search by username or email
        </AppText>

        <AppTextInput
          style={styles.input}
          placeholder="Enter username or email"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#94a3b8"
        />

        {selectedUsers.length > 0 ? (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>
              Selected ({selectedUsers.length})
            </AppText>
            <View style={styles.selectedList}>
              {selectedUsers.map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.resultCard, styles.selectedCard]}
                  onPress={() => handleRemoveUser(user.id)}
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
                  <View style={[styles.checkbox, styles.checkboxChecked]}>
                    <AppText style={styles.checkboxInner}>✓</AppText>
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
              Type at least 3 characters to search.
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

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={onClose}
            disabled={inviting}
            activeOpacity={0.85}
          >
            <AppText style={styles.secondaryBtnText}>Cancel</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.primaryBtn,
              selectedUsers.length === 0 && styles.primaryBtnDisabled,
            ]}
            onPress={() => onInviteUsers(selectedUsers)}
            disabled={inviting || selectedUsers.length === 0}
            activeOpacity={0.9}
          >
            <AppText style={styles.primaryBtnText}>
              {inviting
                ? 'Sending...'
                : selectedUsers.length > 1
                ? `Invite ${selectedUsers.length} users`
                : 'Send Invite'}
            </AppText>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetHandle: {
    backgroundColor: '#cbd5e1',
    width: 44,
    height: 5,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    color: '#0f172a',
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
    fontSize: 12,
    color: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },
  actionBtn: {
    minWidth: 110,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
  },
  primaryBtn: {
    backgroundColor: '#4f46e5',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  secondaryBtnText: {
    color: '#475569',
    fontWeight: '700',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
