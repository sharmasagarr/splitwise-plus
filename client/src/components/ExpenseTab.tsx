
import React from 'react';
import { ScrollView, View, TouchableWithoutFeedback, TouchableOpacity, ActivityIndicator, Image, Keyboard } from 'react-native';
import AppText from './AppText';
import AppTextInput from './AppTextInput';
import Icon from './Icon';

interface ExpenseTabProps {
styles: any;
showGroupDropdown: boolean;
setShowGroupDropdown: (show: boolean) => void;
loadingGroups: boolean;
groups: any[];
filteredGroups: any[];
selectedGroupId: string;
setSelectedGroupId: (id: string) => void;
groupQuery: string;
setGroupQuery: (query: string) => void;
handleGroupQueryChange: (text: string) => void;
handleSelectGroup: (group: any) => void;
description: string;
setDescription: (desc: string) => void;
amount: string;
setAmount: (amt: string) => void;
billUri: string | null;
setBillUri: (uri: string | null) => void;
openBillPicker: () => void;
creating: boolean;
uploadingBill: boolean;
handleCreate: () => void;
}

const ExpenseTab: React.FC<ExpenseTabProps> = ({
styles,
showGroupDropdown,
setShowGroupDropdown,
loadingGroups,
groups,
filteredGroups,
selectedGroupId,
groupQuery,
handleGroupQueryChange,
handleSelectGroup,
description,
setDescription,
amount,
setAmount,
billUri,
setBillUri,
openBillPicker,
creating,
uploadingBill,
handleCreate,
}) => (
<ScrollView
    contentContainerStyle={styles.scroll}
    keyboardShouldPersistTaps="handled"
    onScrollBeginDrag={() => {
    setShowGroupDropdown(false);
    Keyboard.dismiss();
    }}
>
    <TouchableWithoutFeedback onPress={() => {
    setShowGroupDropdown(false);
    Keyboard.dismiss();
    }}>
    <View style={styles.tabContentWrapper}>
        <AppText style={styles.label}>Select Group</AppText>

        {/* Invisible backdrop to catch clicks outside the dropdown */}
        {showGroupDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowGroupDropdown(false)}>
            <View style={styles.dropdownBackdrop} />
        </TouchableWithoutFeedback>
        )}

        <View style={styles.dropdownInputWrapper}>
        <AppTextInput
            style={styles.dropdownInput}
            value={groupQuery}
            onChangeText={handleGroupQueryChange}
            onFocus={() => {
            if (!loadingGroups && groups.length > 0) {
                setShowGroupDropdown(true);
            }
            }}
            placeholder={
            loadingGroups
                ? 'Loading groups...'
                : groups.length > 0
                ? 'Search group'
                : 'No groups available'
            }
            editable={!loadingGroups && groups.length > 0}
            placeholderTextColor="#94a3b8"
        />

        {loadingGroups ? (
            <View style={styles.dropdownRightIcon}>
            <ActivityIndicator size="small" color="#667eea" />
            </View>
        ) : (
            <View style={styles.dropdownRightIcon}>
            <Icon name="DownArrow" width={16} height={16} color="#64748b" />
            </View>
        )}

        {!loadingGroups && showGroupDropdown && groups.length > 0 && (
            <View style={styles.groupDropdownList}>
            {filteredGroups.length > 0 ? (
                <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={styles.groupDropdownScroll}
                >
                {filteredGroups.map((group: any) => {
                    const isSelected = selectedGroupId === group.id;
                    return (
                    <TouchableOpacity
                        key={group.id}
                        style={[
                        styles.groupOption,
                        isSelected && styles.groupOptionSelected,
                        ]}
                        onPress={() => handleSelectGroup(group)}
                    >
                        <AppText
                        style={[
                            styles.groupOptionText,
                            isSelected && styles.groupOptionTextSelected,
                        ]}
                        >
                        {group.name}
                        </AppText>
                    </TouchableOpacity>
                    );
                })}
                </ScrollView>
            ) : (
                <AppText style={styles.noGroupFoundText}>No group found</AppText>
            )}
            </View>
        )}
        </View>

        {!loadingGroups && groups.length === 0 && (
        <AppText style={styles.errorText}>
            You need to join a group first.
        </AppText>
        )}

        <AppText style={styles.label}>Description</AppText>
        <AppTextInput
        style={styles.input}
        placeholder="What was this for? (e.g. Dinner)"
        value={description}
        onChangeText={setDescription}
        onFocus={() => setShowGroupDropdown(false)}
        placeholderTextColor="#999"
        />

        <AppText style={styles.label}>Amount</AppText>
        <AppTextInput
        style={styles.input}
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        onFocus={() => setShowGroupDropdown(false)}
        keyboardType="numeric"
        placeholderTextColor="#999"
        />

        <AppText style={styles.label}>Bill Attachment (Optional)</AppText>
        {billUri ? (
        <View style={styles.billPreviewContainer}>
            <Image source={{ uri: billUri }} style={styles.billPreviewImage} />
            <View style={styles.billPreviewActions}>
            <TouchableOpacity
                style={styles.billActionBtn}
                onPress={openBillPicker}
                disabled={creating || uploadingBill}
            >
                <AppText style={styles.billActionText}>Change</AppText>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.billActionBtn, styles.billRemoveBtn]}
                onPress={() => setBillUri(null)}
                disabled={creating || uploadingBill}
            >
                <AppText style={styles.billRemoveText}>Remove</AppText>
            </TouchableOpacity>
            </View>
        </View>
        ) : (
        <TouchableOpacity
            style={styles.billUploadBtn}
            onPress={openBillPicker}
            disabled={creating || uploadingBill}
        >
            <AppText style={styles.billUploadBtnText}>Upload Bill</AppText>
        </TouchableOpacity>
        )}

        <TouchableOpacity
        style={[
            styles.submitBtn,
            (!selectedGroupId || creating || uploadingBill) &&
            styles.submitBtnDisabled,
        ]}
        onPress={handleCreate}
        disabled={!selectedGroupId || creating || uploadingBill}
        >
        {creating || uploadingBill ? (
            <View style={styles.submitLoadingRow}>
            <ActivityIndicator size="small" color="#fff" />
            <AppText style={styles.submitBtnText}>
                {uploadingBill ? 'Uploading bill...' : 'Saving...'}
            </AppText>
            </View>
        ) : (
            <AppText style={styles.submitBtnText}>Save Expense</AppText>
        )}
        </TouchableOpacity>
    </View>
    </TouchableWithoutFeedback>
</ScrollView>
);

export default ExpenseTab;