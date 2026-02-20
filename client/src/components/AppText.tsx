import { Text, TextProps, StyleSheet } from 'react-native';

export default function AppText(props: TextProps) {
  return <Text {...props} style={[styles.text, props.style]} />;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "GoogleSans-Regular",
    includeFontPadding: false,
  },
});
