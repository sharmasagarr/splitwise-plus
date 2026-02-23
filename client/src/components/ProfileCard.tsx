import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { User } from '../types/graphql';

interface ProfileCardProps extends Pick<User, 'name' | 'email' | 'imageUrl'> {
  groupsCount?: number;
  amountOwe?: string;
  amountOwed?: string;
}

const formatAmount = (str: string) => {
  const raw = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(raw) || 0;
  if (num < 1000) return `₹${Math.round(num)}`;
  if (num < 100000) return `₹${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (num < 10000000)
    return `₹${(num / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  return `₹${(num / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
};

const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  email,
  imageUrl,
  groupsCount = 0,
  amountOwe = '₹0',
  amountOwed = '₹0',
}) => {
  // Function to get initials from name
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names.at(-1)!.charAt(0)).toUpperCase();
  };

  // Function to generate a color based on name (consistent for same person)
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

  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);

  return (
    <View style={styles.card}>
      {/* Profile Image with Fallback */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.profileImage}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[styles.avatarContainer, { backgroundColor: avatarColor }]}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}

      {/* User Info */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>

        <Text style={styles.email} numberOfLines={1}>
          {email}
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{groupsCount}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>

          <View style={styles.statSeparator} />

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.oweAmount]}>
              {formatAmount(amountOwe)}
            </Text>
            <Text style={styles.statLabel}>Owe</Text>
          </View>

          <View style={styles.statSeparator} />

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.owedAmount]}>
              {formatAmount(amountOwed)}
            </Text>
            <Text style={styles.statLabel}>Owed</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'GoogleSans-Regular',
    fontSize: 18,
    color: '#1e293b',
  },
  email: {
    fontFamily: 'GoogleSans-Regular',
    fontSize: 10,
    color: '#64748b',
    marginTop: -12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontFamily: 'GoogleSans-Regular',
    fontSize: 17,
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
    fontFamily: 'GoogleSans-Regular',
    fontSize: 11,
    color: '#64748b',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: -10,
  },
  statSeparator: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
});

export default ProfileCard;
