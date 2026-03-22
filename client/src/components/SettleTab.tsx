
import React from 'react';
import { ScrollView, View, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import AppText from './AppText';

interface SettleTabProps {
    styles: any;
    loadingBalances: boolean;
    totalOwe: number;
    oweList: any[];
    navigation: any;
}

const SettleTab: React.FC<SettleTabProps> = ({
    styles,
    loadingBalances,
    totalOwe,
    oweList,
    navigation,
}) => (
    <ScrollView contentContainerStyle={styles.scroll}>
        {/* Summary card */}
        <View style={styles.settleCard}>
            <AppText style={styles.settleCardTitle}>You Owe</AppText>
            {loadingBalances ? (
                <ActivityIndicator size="small" color="#dc2626" />
            ) : (
                <AppText style={styles.settleCardAmount}>
                    ₹{totalOwe.toFixed(2)}
                </AppText>
            )}
        </View>

        {loadingBalances ? (
            <View style={styles.balanceLoaderContainer}>
                <ActivityIndicator size="small" color="#667eea" />
                <AppText style={styles.balanceLoaderText}>
                    Loading balances...
                </AppText>
            </View>
        ) : oweList.length === 0 ? (
            <View style={styles.emptyState}>
                <AppText style={styles.emptyIcon}>🎉</AppText>
                <AppText style={styles.emptyTitle}>All Settled!</AppText>
                <AppText style={styles.emptySubtitle}>
                    You don't owe anyone right now.
                </AppText>
            </View>
        ) : (
            <>
                <AppText style={styles.label}>Select who to pay</AppText>
                <FlatList
                    data={oweList}
                    keyExtractor={(item: any) => item.userId}
                    scrollEnabled={false}
                    renderItem={({ item }: any) => (
                        <TouchableOpacity
                            style={[styles.userCard]}
                            onPress={() =>
                                navigation.navigate('SettleUserShares', {
                                    toUserId: item.userId,
                                    toUserName: item.userName,
                                    totalAmount: item.amount,
                                })
                            }
                        >
                            <View style={styles.userAvatar}>
                                <AppText style={styles.userAvatarText}>
                                    {item.userName?.charAt(0).toUpperCase() || '?'}
                                </AppText>
                            </View>
                            <View style={styles.userInfo}>
                                <AppText style={styles.userName}>{item.userName}</AppText>
                                <AppText style={styles.userAmount}>
                                    ₹{item.amount.toFixed(2)}
                                </AppText>
                            </View>
                            <AppText style={styles.shareDetailsCta}>View</AppText>
                        </TouchableOpacity>
                    )}
                />
            </>
        )}
    </ScrollView>
);

export default SettleTab;