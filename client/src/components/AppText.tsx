import React from "react";
import { Text, TextProps, StyleSheet, TextStyle } from "react-native";

type AppTextProps = TextProps;

const FONT_MAP: Record<string, string> = {
  "normal-normal": "GoogleSans-Regular",
  "normal-italic": "GoogleSans-Italic",
  "500-normal": "GoogleSans-Medium",
  "500-italic": "GoogleSans-MediumItalic",
  "600-normal": "GoogleSans-SemiBold",
  "600-italic": "GoogleSans-SemiBoldItalic",
  "700-normal": "GoogleSans-Bold",
  "700-italic": "GoogleSans-BoldItalic",
  "bold-normal": "GoogleSans-Bold",
  "bold-italic": "GoogleSans-BoldItalic",
};

const normalizeWeight = (weight?: TextStyle["fontWeight"]) => {
  if (!weight) return "normal";
  if (weight === "bold") return "700";
  if (weight === "normal") return "normal";
  return weight;
};

const normalizeStyle = (style?: TextStyle["fontStyle"]) => {
  return style ?? "normal";
};

const flattenTextStyle = (style: TextProps["style"]): TextStyle => {
  if (!style) return {};
  if (!Array.isArray(style)) return (style as TextStyle) || {};
  return style.reduce<TextStyle>((acc, curr) => Object.assign(acc, curr), {});
};

export default function AppText(props: AppTextProps) {
  const { style, ...rest } = props;

  const flat = flattenTextStyle(style);
  const weight = normalizeWeight(flat.fontWeight);
  const fontStyle = normalizeStyle(flat.fontStyle);

  const key = `${weight}-${fontStyle}`;
  const mappedFontFamily = FONT_MAP[key] ?? "GoogleSans-Regular";

  // Remove fontWeight/fontStyle so React Native doesn’t try to apply them
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fontWeight, fontStyle: _fs, fontFamily: _ff, ...restFlat } = flat;

  return (
    <Text
      {...rest}
      style={[
        styles.text,
        restFlat,
        { fontFamily: mappedFontFamily },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "GoogleSans-Regular",
    includeFontPadding: false,
  },
});
