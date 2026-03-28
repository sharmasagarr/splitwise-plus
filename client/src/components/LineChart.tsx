import { LineChart } from "react-native-gifted-charts";
import { View, Text, StyleSheet } from "react-native";

// Format values with rupee and 1k/10k/1L
const formatRupee = (value: number) => {
if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
return `₹${value.toFixed(2)}`;
};

const PointerLabel = ({ items }: { items: any[] }) => {
  const item = items?.[0];
  if (!item) return null;

  return (
    <View style={styles.tooltipContainer}>
      <Text style={styles.tooltipLabel}>{item.label}</Text>
      <Text style={styles.tooltipValue}>{formatRupee(item.value)}</Text>
    </View>
  );
};

const renderPointerLabel = (items: any[]) => <PointerLabel items={items} />;

const LineChartComponent = ({ data, maxValue }: { data: any[]; maxValue: number }) => {

  // Calculate y-axis labels
  const noOfSections = 3;
  const step = maxValue / noOfSections;
  const yAxisLabelTexts = [];
  for (let i = 0; i <= noOfSections; i++) {
    yAxisLabelTexts.push(formatRupee(Math.round(step * i)));
  }

  return (
    <LineChart
      areaChart
      data={data}
      maxValue={maxValue}
      noOfSections={noOfSections}
      isAnimated
      animationDuration={1500}
      
      curved
      thickness={1.5}
      color="#2ED9FF"

      startFillColor="#2ED9FF"
      endFillColor="#2ED9FF"
      startOpacity={0.25}
      endOpacity={0.05}

      hideDataPoints={false}
      dataPointsColor="#2ED9FF"
      dataPointsRadius={4}

      pointerConfig={{
        pointerStripHeight: 160,
        pointerStripColor: "#2ED9FF",
        pointerStripWidth: 1,
        pointerStripUptoDataPoint: true,

        pointerColor: "#2ED9FF",
        radius: 5,

        activatePointersOnLongPress: false,

        pointerLabelWidth: 90,
        pointerLabelHeight: 48,

        shiftPointerLabelX: -20,
        shiftPointerLabelY: -65,

        autoAdjustPointerLabelPosition: true,

        pointerLabelComponent: renderPointerLabel,
      }}

      xAxisColor="#E5E7EB"
      yAxisColor="#E5E7EB"
      xAxisLabelTextStyle={styles.xAxisLabel}
      yAxisTextStyle={styles.yAxisLabel}

      rulesColor="#F3F4F6"

      initialSpacing={10}
      spacing={38}
      yAxisThickness={1}
      xAxisThickness={1}
      yAxisLabelTexts={yAxisLabelTexts}
      yAxisLabelWidth={35} 
    />
  );
};

const styles = StyleSheet.create({
  tooltipContainer: {
    width: 80,
    backgroundColor: "#1A1A2E",
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2ED9FF33",
  },
  tooltipLabel: {
    color: "#aaa",
    fontSize: 9,
  },
  tooltipValue: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  xAxisLabel: {
    color: "#9CA3AF",
    fontSize: 8,
  },
  yAxisLabel: {
    color: "#9CA3AF",
    fontSize: 8,
  },
});

export default LineChartComponent;
