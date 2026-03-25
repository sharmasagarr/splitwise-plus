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
import Icon from '../components/Icon';
import { useImagePickerWithCrop } from '../components/ImagePickerModal';
import type { RootStackParamList } from '../navigations/RootStack';
import {
  uploadGroupImage,
  useCreateGroup,
  useJoinGroup,
  useSearchUsers,
} from '../services';

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
  const [groupDescription, setGroupDescription] = useState('');
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([]);
  const [hasToken, setHasToken] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleUploadGroupPhoto = async (uri: string) => {
    try {
      setUploadingImage(true);
      const json = await uploadGroupImage(uri);
      setGroupImageUrl(json.imageUrl || null);
      Alert.alert('Success', 'Group image uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload group image');
    } finally {
      setUploadingImage(false);
    }
  };

  const {
    handlePickImage,
    ImagePreviewModal,
  } = useImagePickerWithCrop({
    onImageSelected: handleUploadGroupPhoto,
    cropShape: 'square',
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
      variables: {
        name: groupName.trim(),
        description: groupDescription.trim() || null,
        imageUrl: groupImageUrl,
        memberEmails: emails,
      },
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
  const canSearch = searchQuery.trim().length >= 3;
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
            <AppText style={styles.label}>Group Image</AppText>
            <TouchableOpacity
              style={styles.imageCard}
              onPress={handlePickImage}
              activeOpacity={0.88}
              disabled={uploadingImage || creating}
            >
              {groupImageUrl ? (
                <Image source={{ uri: groupImageUrl }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="Photo" width={24} height={24} color="#4f46e5" />
                  <AppText style={styles.imagePlaceholderText}>
                    Add group image
                  </AppText>
                </View>
              )}

              <View style={styles.imageAction}>
                {uploadingImage ? (
                  <View style={styles.imageActionLoading}>
                    <ActivityIndicator size="small" color="#4f46e5" />
                    <AppText style={styles.imageActionText}>Uploading...</AppText>
                  </View>
                ) : (
                  <>
                    <Icon name="Pencil" width={14} height={14} color="#4f46e5" />
                    <AppText style={styles.imageActionText}>
                      {groupImageUrl ? 'Change image' : 'Upload image'}
                    </AppText>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <AppText style={styles.label}>Group Name</AppText>
            <AppTextInput
              style={styles.input}
              placeholder="e.g., Goa Trip 2026"
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor="#94a3b8"
            />

            <AppText style={styles.label}>Description</AppText>
            <AppTextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="What is this group for?"
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              maxLength={180}
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
            style={[
              styles.createBtn,
              (creating || uploadingImage) && styles.createBtnDisabled,
            ]}
            onPress={handleCreate}
            disabled={creating || uploadingImage}
            activeOpacity={0.9}
          >
            <AppText style={styles.createBtnText}>
              {uploadingImage
                ? 'Uploading image...'
                : creating
                ? 'Creating...'
                : 'Create Group'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
      {ImagePreviewModal}
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
  descriptionInput: {
    minHeight: 96,
  },
  imageCard: {
    marginTop: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 170,
    backgroundColor: '#e2e8f0',
  },
  imagePlaceholder: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#eef2ff',
  },
  imagePlaceholderText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '700',
  },
  imageAction: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  imageActionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageActionText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '700',
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
