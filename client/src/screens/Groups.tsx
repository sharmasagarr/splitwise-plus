import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_GROUPS, GET_MY_INVITES, RESPOND_TO_INVITE } from '../graphql';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const Groups = () => {
  const navigation = useNavigation<NavProp>();

  const { data, loading, refetch } = useQuery<any>(GET_GROUPS, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: invitesData,
    loading: loadingInvites,
    refetch: refetchInvites,
  } = useQuery<any>(GET_MY_INVITES, {
    fetchPolicy: 'cache-and-network',
  });

  const [respondToInvite] = useMutation<any>(RESPOND_TO_INVITE, {
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
          <Text style={styles.addButtonText}>+ New</Text>
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

  const listHeader = (
    <View>
      {invites.length > 0 && (
        <View style={styles.invitesSection}>
          <Text style={styles.invitesSectionTitle}>
            Pending Invitations ({invites.length})
          </Text>
          {invites.map((invite: any) => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteGroupName}>
                  {invite.group?.name || 'Unknown Group'}
                </Text>
                <Text style={styles.inviteMembers}>
                  {invite.group?.members?.length || 0} members
                </Text>
              </View>
              <View style={styles.inviteActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptInvite(invite.id)}
                >
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleRejectInvite(invite.id)}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {groups.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            You are not part of any groups yet.
          </Text>
          <Text style={styles.emptySubText}>
            Create one to get started splitting expenses!
          </Text>
        </View>
      )}
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
        contentContainerStyle={styles.listContainer}
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
              <Text style={styles.groupIconText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.groupInfoContainer}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupInfo}>
                {item.members.length} members
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#475569',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  listContainer: { padding: 16 },
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
  groupIconText: { fontSize: 20, fontWeight: 'bold', color: '#667eea' },
  groupInfoContainer: { flex: 1 },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  groupInfo: { color: '#64748b', fontSize: 14 },
  chevron: { fontSize: 24, color: '#cbd5e1', fontWeight: '300' },
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
    fontWeight: '700',
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
  inviteGroupName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  inviteMembers: { fontSize: 12, color: '#64748b', marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
});
