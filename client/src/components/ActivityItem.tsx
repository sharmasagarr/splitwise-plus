import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { useNavigation } from "@react-navigation/native";

type User = {
  id: string;
  name: string;
};

type Share = {
  user: User;
  shareAmount: number;
  status: "owed" | "settled" | string;
};

type ActivityItemProps = {
  item: {
    id: string;
    note: string;
    totalAmount: number;
    createdAt: string | number;
    createdBy: User;
    shares: Share[];
  };
  currentUser: User;
  onSettle: (payerId: string, amount: number) => void;
};

const getDayWithSuffix = (day: number) => {
  if (day > 3 && day < 21) return `${day}th`;
  const rem = day % 10;
  if (rem === 1) return `${day}st`;
  if (rem === 2) return `${day}nd`;
  if (rem === 3) return `${day}rd`;
  return `${day}th`;
};

const formatActivityDate = (timestamp: string | number) => {
  const d = new Date(Number(timestamp));
  const day = getDayWithSuffix(d.getDate());
  const month = d.toLocaleString("en-GB", { month: "short" }); // Mar
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`; // 20th Mar, 2026
};

const formatAmountTwoDecimals = (value: number) => {
  if (Number.isNaN(value)) return "0";

  const fixed = value.toFixed(2);      // "123.00" / "123.40"
  if (fixed.endsWith(".00")) {
    return fixed.slice(0, -3);        // "123"
  }
  if (fixed.endsWith("0")) {
    return fixed.slice(0, -1);        // "123.4" from "123.40"
  }
  return fixed;                       // "123.45"
};


const ActivityItem: React.FC<ActivityItemProps> = ({
  item,
  currentUser,
  onSettle,
}) => {
  const navigation = useNavigation<any>();

  const myShare = item.shares?.find((s) => s.user?.id === currentUser.id);
  const payer = item.createdBy;
  const isPayer = payer.id === currentUser.id;

  const description = isPayer
    ? `You paid ₹${formatAmountTwoDecimals(item.totalAmount)} for ${item.note}`
    : `${payer.name} paid ₹${formatAmountTwoDecimals(item.totalAmount)} for ${item.note}`;

  const owedAmount = myShare?.shareAmount || 0;
  const owedText = isPayer
    ? `You are owed ₹${formatAmountTwoDecimals(item.totalAmount - owedAmount)}`
    : `Your share ₹${formatAmountTwoDecimals(owedAmount)}`;

  const dateText = formatActivityDate(item.createdAt);

  const handlePress = () => {
    navigation.navigate("ExpenseDetail", { expenseId: item.id });
  };

  const handleSettle = () => {
    onSettle(payer.id, owedAmount);
  };

  return (
    <TouchableOpacity style={styles.activityCard} onPress={handlePress}>
      <View style={styles.activityLeft}>
        <View style={styles.activityHeaderRow}>
          <AppText style={styles.activityDesc} numberOfLines={1}>
            {description}
          </AppText>
        </View>

        <View style={styles.activityMetaRow}>
          <AppText style={styles.activityDate}>{dateText}</AppText>
          <View style={styles.dotSeparator} />
          <AppText
            style={[
              styles.activityOwed,
              isPayer ? styles.activityOwedGreen : styles.activityOwedRed,
            ]}
          >
            {owedText}
          </AppText>
        </View>
      </View>

      {!isPayer && myShare?.status === "owed" && (
        <TouchableOpacity style={styles.settleBtn} onPress={handleSettle}>
          <AppText style={styles.settleText}>Settle</AppText>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default ActivityItem;

const styles = StyleSheet.create({
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    marginBottom: 10,
    gap: 8,
    elevation: 1,
  },
  activityLeft: {
    flex: 1,
  },
  activityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  activityDesc: {
    flex: 1,
    fontSize: 12,
    color: "#020202",
    fontWeight: "400",
  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  activityDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#4B5563",
    marginHorizontal: 6,
  },
  activityOwed: {
    fontSize: 11,
    fontWeight: "400",
  },
  activityOwedGreen: {
    color: "#0aac45",
  },
  activityOwedRed: {
    color: "#F97373",
  },
  settleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  settleText: {
    fontSize: 11,
    color: "#ffffff",
  },
});
