import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';

const AppTextInput = forwardRef<TextInput, TextInputProps>((props, ref) => {
  return (
    <TextInput
      ref={ref}
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={props.placeholderTextColor ?? '#999'}
    />
  );
});

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;

const styles = StyleSheet.create({
  input: {
    fontFamily: "GoogleSans-Regular",
    includeFontPadding: false,
  },
});
