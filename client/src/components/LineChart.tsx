import { LineChart } from "react-native-gifted-charts";

 const LineChartComponent = ({data, maxValue}: {data: any[], maxValue: number}) => {
    return (
        <LineChart
            areaChart
            data={data}
            maxValue={maxValue}
            startFillColor="rgb(46, 217, 255)"
            startOpacity={0.8}
            endFillColor="rgb(203, 241, 250)"
            endOpacity={0.3}
            curved
        />
    );
};

export default LineChartComponent;