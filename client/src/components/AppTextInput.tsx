import { TextInput, TextInputProps, StyleSheet } from 'react-native';

export default function AppTextInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={props.placeholderTextColor ?? '#999'}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: "GoogleSans-Regular",
    includeFontPadding: false,
  },
});
