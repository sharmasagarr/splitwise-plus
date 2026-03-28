import React, { useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AppText from '../components/AppText';
import { useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logoutUser, setUser } from '../store/authSlice';
import {
  useUpdateProfile,
  useGetGroupsForProfile,
  useGetBalancesForProfile,
  uploadProfilePicture,
  useCheckUsernameAvailability
} from '../services';
import AppTextInput from '../components/AppTextInput';
import { useImagePickerWithCrop } from '../components/ImagePickerModal';
import type { User } from '../types/graphql';
import Icon from '../components/Icon';
import AppModal from '../components/Modal';

const Profile: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);

  const dispatch = useAppDispatch();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editUpiId, setEditUpiId] = useState(user?.upiId || '');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [updateProfile, { loading: updating }] = useUpdateProfile();
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);

  const [checkUsernameAvailability] = useCheckUsernameAvailability();

  const { data: groupsData } = useGetGroupsForProfile();
  const { data: balancesData } = useGetBalancesForProfile();

  const groups = groupsData?.getGroups || [];
  const totalOwe = balancesData?.getMyBalances?.totalOwe || 0;
  const totalOwed = balancesData?.getMyBalances?.totalOwed || 0;

  const handleSaveProfile = async () => {
    const nameRegex = /^[a-zA-Z '-]{2,50}$/;
    const username = editUsername.trim().toLowerCase();
    const usernameRegex = /^(?!.*\.\.)(?!.*\.$)[a-z0-9](?:[a-z0-9._]{0,28}[a-z0-9])?$/;

    if (!nameRegex.test(editName.trim())) {
      Alert.alert(
        'Invalid Name',
        'Only letters, spaces, hyphens, and apostrophes are allowed (2-50 chars).',
      );
      return;
    }

    if (!usernameRegex.test(username)) {
      Alert.alert(
        'Invalid Username',
        'Use 1-30 lowercase letters, numbers, periods, and underscores. Periods cannot be consecutive or at the end.',
      );
      return;
    }

    if (usernameStatus === 'checking') {
      Alert.alert('Please wait', 'Still checking username availability...');
      return;
    }
    if (usernameStatus === 'taken') {
      Alert.alert('Username Taken', usernameSuggestion
        ? `That username is taken. Try "${usernameSuggestion}" instead.`
        : 'That username is already taken. Please choose another.');
      return;
    }
    if (usernameStatus === 'invalid') {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
      return;
    }

    if (editBio.trim().length > 160) {
      Alert.alert('Invalid Bio', 'Bio cannot exceed 160 characters.');
      return;
    }

    try {
      const { data } = await updateProfile({
        variables: {
          name: editName.trim(),
          username,
          bio: editBio.trim() || null,
          phone: editPhone.trim(),
          upiId: editUpiId.trim() || null,
        },
      });
      if (data?.updateProfile) {
        dispatch(setUser(data.updateProfile));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleUploadProfilePictureDirect = useCallback(
    async (imageUri: string) => {
      try {
        setUploadingPicture(true);

        console.log('🚀 Starting profile picture upload');

        const json = await uploadProfilePicture(imageUri);

        console.log('✅ Upload successful:', json);

        if (json.user) {
          dispatch(setUser(json.user));
        }

        Alert.alert('Success', 'Profile picture updated successfully!');
      } catch (error: any) {
        console.error('❌ Upload error:', error.message);
        Alert.alert('Upload Error', error.message || 'Failed to upload profile picture');
      } finally {
        setUploadingPicture(false);
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (!isEditing) return;

    const trimmed = editUsername.trim().toLowerCase();
    const currentUsername = user?.username?.trim().toLowerCase() || '';

    // Reset when cleared
    if (!trimmed) {
      setUsernameStatus('idle');
      setUsernameSuggestion(null);
      return;
    }

    if (trimmed === currentUsername) {
      setUsernameStatus('available');
      setUsernameSuggestion(null);
      return;
    }

    // Instant local validation — no DB hit
    if (trimmed.length < 3) {
      setUsernameStatus('invalid');
      setUsernameSuggestion(null);
      return;
    }

    setUsernameStatus('checking');
    setUsernameSuggestion(null);

    const timer = setTimeout(async () => {
      try {
        const { data } = await checkUsernameAvailability({
          variables: { username: trimmed },
        });
        const result = data?.checkUsernameAvailability;
        if (result?.available) {
          setUsernameStatus('available');
          setUsernameSuggestion(null);
        } else {
          setUsernameStatus('taken');
          setUsernameSuggestion(result?.suggestion || null);
        }
      } catch (err) {
        console.error('❌ Username check failed:', err);
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [editUsername, isEditing, checkUsernameAvailability, user?.username]);


  const {
    handlePickImage: openProfileImagePicker,
    ImagePreviewModal: ProfileImagePreviewModal,
  } = useImagePickerWithCrop({
    onImageSelected: handleUploadProfilePictureDirect,
    cropShape: 'circle',
  });

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Function to get initials from name
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 0) return '?';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();

    const lastName = names.at(-1);
    if (!lastName || lastName.length === 0)
      return names[0].charAt(0).toUpperCase();

    return (names[0].charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  // Function to generate a color based on name
  const getAvatarColor = (fullName: string) => {
    const colors = [
      '#667eea',
      '#764ba2',
      '#f56565',
      '#ed8936',
      '#48bb78',
      '#38b2ac',
      '#4299e1',
      '#9f7aea',
      '#ed64a6',
      '#805ad5',
    ];
    const index =
      fullName
        .split('')
        .reduce((acc, char) => acc + (char.codePointAt(0) || 0), 0) %
      colors.length;
    return colors[index];
  };

  // Format date to readable string
  const formatDate = (dateInput?: string | number | Date) => {
    if (!dateInput) return 'Not available';

    let normalized: string | number | Date;

    // Handle numeric strings like "1765796069085"
    if (typeof dateInput === 'string' && /^\d+$/.test(dateInput)) {
      const num = Number(dateInput);
      normalized = num < 1e12 ? num * 1000 : num; // seconds → ms
    } else if (typeof dateInput === 'number') {
      normalized = dateInput < 1e12 ? dateInput * 1000 : dateInput;
    } else {
      normalized = dateInput; // Date object
    }

    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    const day = date.getDate();
    const suffix = ['th', 'st', 'nd', 'rd'][
      day % 10 > 3 ? 0 : (day % 100) - (day % 10) !== 10 ? day % 10 : 0
    ];

    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();

    return `${day}${suffix} ${monthName}, ${year}`;
  };

  // Calculate member since date (if user has createdAt, otherwise use fallback)
  const getMemberSince = (userData: User | null) => {
    if (userData?.createdAt) {
      return formatDate(userData.createdAt);
    }

    // Fallback: If no createdAt, assume user joined recently
    return formatDate(new Date());
  };

  // If user data is loading or not available
  if (!user) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <AppText style={styles.loadingText}>Loading profile...</AppText>
        </View>
      </View>
    );
  }

  const initials = getInitials(user.name);
  const avatarColor = getAvatarColor(user.name);
  const memberSince = getMemberSince(user);

  return (
    <>
      <View style={styles.container}>
        <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Cover Section */}
          <Image 
            source={require('../../assets/images/cover-image.png')}
            style={styles.coverImage}
            // resizeMode="cover"
          />

          {/* Profile Image with Fallback + Edit Button */}
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={openProfileImagePicker}
            activeOpacity={0.7}
            disabled={uploadingPicture}
          >
            {uploadingPicture ? (
              <View style={[styles.avatarContainer, styles.uploadingAvatar]}>
                <ActivityIndicator size="large" color="#667eea" />
              </View>
            ) : user.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: avatarColor },
                ]}
              >
                <AppText style={styles.avatarText}>{initials}</AppText>
              </View>
            )}
            {/* Pencil Icon Overlay - Only show in edit mode */}
            {isEditing && !uploadingPicture && (
              <View style={styles.editIconOverlay}>
                <Icon name="Pencil" width={16} height={16} />
              </View>
            )}
          </TouchableOpacity>

          {/* Profile Content */}
          <View style={styles.content}>
            {isEditing ? (
              <View style={styles.editContainer}>
                <View style={styles.inputWrapper}>
                  <AppText style={styles.inputLabel}>Name</AppText>
                  <AppTextInput
                    placeholder="John Doe"
                    value={editName}
                    onChangeText={setEditName}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <AppText style={styles.inputLabel}>@username</AppText>
                  <View style={styles.usernameInputRow}>
                    <AppTextInput
                      placeholder="johndoe"
                      value={editUsername}
                      onChangeText={text => setEditUsername(text.toLowerCase())}
                      style={[
                        styles.input,
                        styles.usernameInput,
                        usernameStatus === 'available' && styles.inputBorderGreen,
                        usernameStatus === 'taken' && styles.inputBorderRed,
                        usernameStatus === 'invalid' && styles.inputBorderRed,
                      ]}
                      autoCapitalize="none"
                    />
                    <View style={styles.usernameStatusIcon}>
                      {usernameStatus === 'checking' && (
                        <ActivityIndicator size="small" color="#667eea" />
                      )}
                      {usernameStatus === 'available' && (
                        <Icon name="CheckCircle" width={18} height={18} color="#16a34a" />
                      )}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                        <Icon name="CrossCircle" width={18} height={18} color="#dc2626" />
                      )}
                    </View>
                  </View>

                  {/* Status text below input */}
                  {usernameStatus === 'invalid' && (
                    <AppText style={styles.usernameHintRed}>
                      Minimum 3 characters required
                    </AppText>
                  )}
                  {usernameStatus === 'available' && (
                    <AppText style={styles.usernameHintGreen}>
                      ✓ Username is available
                    </AppText>
                  )}
                  {usernameStatus === 'taken' && (
                    <AppText style={styles.usernameHintRed}>
                      ✗ Username is taken
                      {usernameSuggestion ? (
                        <AppText
                          style={styles.usernameSuggestion}
                          onPress={() => {
                            setEditUsername(usernameSuggestion);
                          }}
                        >
                          {`  Try "${usernameSuggestion}"`}
                        </AppText>
                      ) : null}
                    </AppText>
                  )}
                </View>


                <View style={styles.inputWrapper}>
                  <AppText style={styles.inputLabel}>Bio</AppText>
                  <AppTextInput
                    placeholder="A short bio"
                    value={editBio}
                    onChangeText={setEditBio}
                    style={[styles.input, styles.bioInput]}
                    multiline
                    maxLength={160}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <AppText style={styles.inputLabel}>Phone</AppText>
                  <AppTextInput
                    placeholder="+1 234 567 8900"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <AppText style={styles.inputLabel}>UPI ID</AppText>
                  <AppTextInput
                    placeholder="name@upi"
                    value={editUpiId}
                    onChangeText={setEditUpiId}
                    style={styles.input}
                  />
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSaveProfile}
                    disabled={updating}
                  >
                    <AppText style={styles.primaryButtonText}>
                      {updating ? 'Saving...' : 'Save'}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setIsEditing(false);
                      setEditName(user?.name || '');
                      setEditUsername(user?.username || '');
                      setEditBio(user?.bio || '');
                      setEditPhone(user?.phone || '');
                      setEditUpiId(user?.upiId || '');
                      setUsernameStatus('idle');
                      setUsernameSuggestion(null);
                    }}
                  >
                    <AppText style={styles.secondaryButtonText}>Cancel</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <AppText style={styles.name}>{user.name}</AppText>
                <AppText style={styles.title}>
                  {user.username ? `@${user.username}` : 'Splitwise+ User'}
                </AppText>
                <AppText style={styles.bio}>
                  {user.bio ||
                    'Managing expenses smartly with friends and family.'}
                </AppText>
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.editButton}
                >
                  <AppText style={styles.editButtonText}>Edit Profile</AppText>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <AppText style={styles.statNumber}>{groups.length}</AppText>
                <AppText style={styles.statLabel}>Groups</AppText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <AppText style={[styles.statNumber, styles.oweAmount]}>
                  {`₹${totalOwe.toFixed(0)}`}
                </AppText>
                <AppText style={styles.statLabel}>Owe</AppText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <AppText style={[styles.statNumber, styles.owedAmount]}>
                  {`₹${totalOwed.toFixed(0)}`}
                </AppText>
                <AppText style={styles.statLabel}>Owed</AppText>
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <View style={styles.infoLabel}>
                  <Icon name="Email" width={12} height={12} style={styles.infoIcon} />
                  <AppText style={styles.infoLabelText}>Email</AppText>
                </View>
                <AppText style={styles.infoValue}>{user.email}</AppText>
              </View>

              {user.phone && (
                <View style={styles.infoItem}>
                  <View style={styles.infoLabel}>
                  <Icon name="Phone" width={14} height={14} style={styles.infoIcon} />
                  <AppText style={styles.infoLabelText}>Phone</AppText>
                </View>
                  <AppText style={styles.infoValue}>{user.phone}</AppText>
                </View>
              )}

              {user.upiId && (
                <View style={styles.infoItem}>
                  <View style={styles.infoLabel}>
                  <Icon name="Wallet" width={14} height={14} style={styles.infoIcon} />
                  <AppText style={styles.infoLabelText}>UPI ID</AppText>
                </View>
                  <AppText style={styles.infoValue}>{user.upiId}</AppText>
                </View>
              )}

                <View style={[styles.infoItem, styles.infoItemLast]}>
                <View style={styles.infoLabel}>
                  <Icon name="Calender" width={14} height={14} style={styles.infoIcon} />
                  <AppText style={styles.infoLabelText}>Member Since</AppText>
                </View>
                <AppText style={styles.infoValue}>{memberSince}</AppText>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <AppText style={styles.logoutText}>Logout</AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <AppText style={styles.footerText}>SplitwisePlus v1.0.0</AppText>
          <AppText style={styles.footerSubtext}>
            © {new Date().getFullYear()} All rights reserved
          </AppText>
        </View>
      </ScrollView>
      {ProfileImagePreviewModal}
      <AppModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Logout"
        description="Are you sure you want to logout?"
        secondaryButton={{
          text: 'Cancel',
          onPress: () => setShowLogoutModal(false),
        }}
        primaryButton={{
          text: 'Logout',
          variant: 'danger',
          onPress: () => {
            setShowLogoutModal(false);
            dispatch(logoutUser());
          },
        }}
      />
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    justifyContent: 'center',
    margin: 'auto',
    marginTop: 10,
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  coverImage: {
    height: 100,
    width: '100%',
    backgroundColor: '#667eea',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginTop: -60,
    borderWidth: 4,
    borderColor: '#ffffff',
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d3d3d3',
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingAvatar: {
    backgroundColor: '#e2e8f0',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  editContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 20,
    position: 'relative',
    marginTop: 8,
  },
  inputLabel: {
    position: 'absolute',
    top: -9,
    left: 12,
    zIndex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 4,
    fontSize: 11,
    color: '#475569',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#ffffff',
    fontSize: 15,
  },
  bioInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  usernameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
  },
  usernameStatusIcon: {
    position: 'absolute',
    right: 14,
  },
  inputBorderGreen: {
    borderColor: '#16a34a',
  },
  inputBorderRed: {
    borderColor: '#dc2626',
  },
  usernameHintGreen: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '400',
    marginTop: 5,
    marginLeft: 4,
  },
  usernameHintRed: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '400',
    marginTop: 5,
    marginLeft: 4,
  },
  usernameSuggestion: {
    fontSize: 10,
    color: '#667eea',
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  editButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginBottom: 20,
  },
  editButtonText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
  },
  bio: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 2,
  },
  oweAmount: {
    color: '#ef4444',
  },
  owedAmount: {
    color: '#10b981',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    alignItems: 'center',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  infoSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoItemLast:{
    borderBottomWidth: 0
  },
  infoIcon: {
    marginRight: 6,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  infoLabelText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'left',
  },
  userId: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  additionalSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    fontWeight: '600',
  },
  menuArrow: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#94a3b8',
  },
  // Utility styles for loading and auth states
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  authContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  authIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadPictureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadPictureBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  uploadPictureBtnIcon: {
    fontSize: 16,
  },
  uploadPictureBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default Profile;
