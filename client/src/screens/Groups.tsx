import React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AppText from '../components/AppText';
import { useGetGroups, useGetMyInvites, useRespondToInvite } from '../services';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';
import Icon from '../components/Icon';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const Groups = () => {
  const navigation = useNavigation<NavProp>();

  const { data, loading, refetch } = useGetGroups();

  const {
    data: invitesData,
    loading: loadingInvites,
    refetch: refetchInvites,
  } = useGetMyInvites();

  const [respondToInvite] = useRespondToInvite({
    onCompleted: () => {
      refetchInvites();
      refetch();
      Alert.alert('Success', 'Invitation updated!');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const handleAcceptInvite = (inviteId: string) => {
    respondToInvite({ variables: { inviteId, accept: true } });
  };

  const handleRejectInvite = (inviteId: string) => {
    Alert.alert(
      'Reject Invite',
      'Are you sure you want to reject this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () =>
            respondToInvite({ variables: { inviteId, accept: false } }),
        },
      ],
    );
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Icon name="PlusSquare" width={16} height={16} color="#ffffff" />
          <AppText style={styles.addButtonText}>New</AppText>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  const groups = data?.getGroups || [];
  const invites = invitesData?.getMyInvites || [];

  const listHeader =
    invites.length > 0 ? (
      <View style={styles.invitesSection}>
        <AppText style={styles.invitesSectionTitle}>
          Pending Invitations ({invites.length})
        </AppText>
        {invites.map((invite: any) => (
          <View key={invite.id} style={styles.inviteCard}>
            <View style={styles.inviteInfo}>
              <AppText style={styles.inviteGroupName}>
                {invite.group?.name || 'Unknown Group'}
              </AppText>
              <AppText style={styles.inviteMembers}>
                {invite.group?.members?.length || 0} members
              </AppText>
            </View>
            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAcceptInvite(invite.id)}
              >
                <AppText style={styles.acceptBtnText}>Accept</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleRejectInvite(invite.id)}
              >
                <AppText style={styles.rejectBtnText}>Reject</AppText>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    ) : null;

  const emptyState = (
    <View style={styles.emptyContainer}>
      <AppText style={styles.emptyText}>You are not part of any groups yet.</AppText>
      <AppText style={styles.emptySubText}>
        Create one to get started splitting expenses!
      </AppText>
      <TouchableOpacity
        style={styles.emptyCtaButton}
        onPress={() => navigation.navigate('CreateGroup')}
        activeOpacity={0.85}
      >
        <Icon name="PlusSquare" width={16} height={16} color="#ffffff" />
        <AppText style={styles.emptyCtaText}>Create New Group</AppText>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item: any) => item.id}
        refreshing={loading || loadingInvites}
        onRefresh={() => {
          refetch();
          refetchInvites();
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        contentContainerStyle={[
          styles.listContainer,
          groups.length === 0 && invites.length === 0 && styles.emptyListContainer,
        ]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupCard}
            onPress={() =>
              navigation.navigate('GroupDetail', {
                groupId: item.id,
                groupName: item.name,
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.groupIconContainer}>
              <AppText style={styles.groupIconText}>
                {item.name.charAt(0).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.groupInfoContainer}>
              <AppText style={styles.groupName}>{item.name}</AppText>
              <AppText style={styles.groupInfo}>
                {item.members.length} members
              </AppText>
            </View>
            <AppText style={styles.chevron}>›</AppText>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default Groups;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: { color: '#fff', fontSize: 13 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#475569',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: { color: '#94a3b8', fontSize: 10, textAlign: 'center' },
  listContainer: { padding: 16 },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyCtaButton: {
    marginTop: 18,
    backgroundColor: '#667eea',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 12,
  },
  groupCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupIconText: { color: '#667eea' },
  groupInfoContainer: { flex: 1 },
  groupName: {
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 4,
  },
  groupInfo: { color: '#64748b', fontSize: 11 },
  chevron: { fontSize: 24, color: '#cbd5e1', },
  invitesSection: {
    marginBottom: 20,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  invitesSectionTitle: {
    fontSize: 16,
    color: '#92400e',
    marginBottom: 12,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  inviteInfo: { flex: 1 },
  inviteGroupName: { fontSize: 15, color: '#1e293b' },
  inviteMembers: { fontSize: 12, color: '#64748b', marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: { color: '#fff', fontSize: 13 },
  rejectBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: { color: '#dc2626', fontSize: 13 },
});
