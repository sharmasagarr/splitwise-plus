import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logoutUser, setUser } from '../store/authSlice';
import { UPDATE_PROFILE } from '../graphql/mutations';
import { GET_GROUPS, GET_MY_BALANCES } from '../graphql/queries';
import AppTextInput from '../components/AppTextInput';
import type { User } from '../types/graphql';

const Profile: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);

  const dispatch = useAppDispatch();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editImageUrl, setEditImageUrl] = useState(user?.imageUrl || '');
  const [updateProfile, { loading: updating }] =
    useMutation<any>(UPDATE_PROFILE);

  const { data: groupsData } = useQuery<any>(GET_GROUPS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: balancesData } = useQuery<any>(GET_MY_BALANCES, {
    fetchPolicy: 'cache-and-network',
  });

  const groups = groupsData?.getGroups || [];
  const totalOwe = balancesData?.getMyBalances?.totalOwe || 0;
  const totalOwed = balancesData?.getMyBalances?.totalOwed || 0;

  const handleSaveProfile = async () => {
    const nameRegex = /^[a-zA-Z '-]{2,50}$/;
    if (!nameRegex.test(editName.trim())) {
      Alert.alert(
        'Invalid Name',
        'Only letters, spaces, hyphens, and apostrophes are allowed (2-50 chars).',
      );
      return;
    }

    try {
      const { data } = await updateProfile({
        variables: {
          name: editName.trim(),
          phone: editPhone.trim(),
          imageUrl: editImageUrl.trim(),
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

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
        },
      },
    ]);
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

    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
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
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  const initials = getInitials(user.name);
  const avatarColor = getAvatarColor(user.name);
  const memberSince = getMemberSince(user);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Cover Section */}
          <View style={styles.coverImage} />

          {/* Profile Image with Fallback */}
          <View style={styles.profileImageContainer}>
            {user.imageUrl ? (
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
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>

          {/* Profile Content */}
          <View style={styles.content}>
            {isEditing ? (
              <View style={styles.editContainer}>
                <AppTextInput
                  placeholder="Name"
                  value={editName}
                  onChangeText={setEditName}
                  style={styles.input}
                />
                <AppTextInput
                  placeholder="Phone"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  style={styles.input}
                />
                <AppTextInput
                  placeholder="Profile Picture URL"
                  value={editImageUrl}
                  onChangeText={setEditImageUrl}
                  style={styles.input}
                />
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSaveProfile}
                    disabled={updating}
                  >
                    <Text style={styles.primaryButtonText}>
                      {updating ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setIsEditing(false);
                      setEditName(user?.name || '');
                      setEditPhone(user?.phone || '');
                      setEditImageUrl(user?.imageUrl || '');
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.title}>Splitwise+ User</Text>
                <Text style={styles.bio}>
                  Managing expenses smartly with friends and family. Making
                  every split fair and transparent.
                </Text>
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{groups.length}</Text>
                <Text style={styles.statLabel}>Groups</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.oweAmount]}>
                  {`₹${totalOwe.toFixed(0)}`}
                </Text>
                <Text style={styles.statLabel}>You Owe</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.owedAmount]}>
                  {`₹${totalOwed.toFixed(0)}`}
                </Text>
                <Text style={styles.statLabel}>Owed to You</Text>
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>📧 Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>

              {user.phone && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>📱 Phone</Text>
                  <Text style={styles.infoValue}>{user.phone}</Text>
                </View>
              )}

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>📅 Member Since</Text>
                <Text style={styles.infoValue}>{memberSince}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Splitwise+ v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            © {new Date().getFullYear()} All rights reserved
          </Text>
        </View>
      </ScrollView>
    </View>
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
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  coverImage: {
    height: 100,
    width: '100%',
    backgroundColor: '#667eea',
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
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  editContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
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
    fontSize: 20,
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
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 16,
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
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    alignItems: 'center',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '700',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
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
});

export default Profile;
