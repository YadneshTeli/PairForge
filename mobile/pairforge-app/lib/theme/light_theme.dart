import 'package:flutter/material.dart';

import '../core/constants/colors.dart';

final lightTheme = ThemeData(
  useMaterial3: true,
  fontFamily: 'Inter',
  colorScheme: const ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.primary,
    onPrimary: Colors.white,
    primaryContainer: AppColors.rose100,
    onPrimaryContainer: AppColors.ink,
    secondary: AppColors.secondary,
    onSecondary: AppColors.ink,
    tertiary: AppColors.cta,
    onTertiary: Colors.white,
    error: AppColors.primaryDeep,
    onError: Colors.white,
    surface: Colors.white,
    onSurface: AppColors.ink,
    outline: AppColors.lineStrong,
  ),
  scaffoldBackgroundColor: AppColors.paper,
  appBarTheme: const AppBarTheme(
    centerTitle: false,
    elevation: 0,
    scrolledUnderElevation: 0,
    backgroundColor: AppColors.paper,
    foregroundColor: AppColors.ink,
    titleTextStyle: TextStyle(
      fontFamily: 'Inter',
      color: AppColors.ink,
      fontSize: 20,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.4,
    ),
  ),
  cardTheme: CardThemeData(
    elevation: 0,
    color: Colors.white,
    margin: EdgeInsets.zero,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: const BorderSide(color: AppColors.line),
    ),
  ),
  chipTheme: const ChipThemeData(
    backgroundColor: AppColors.rose100,
    selectedColor: AppColors.primary,
    disabledColor: AppColors.rose100,
    labelStyle: TextStyle(color: AppColors.muted, fontWeight: FontWeight.w700, fontSize: 12),
    secondaryLabelStyle: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12),
    checkmarkColor: Colors.white,
    side: BorderSide.none,
    shape: StadiumBorder(),
    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
  ),
  inputDecorationTheme: const InputDecorationTheme(
    filled: true,
    fillColor: Colors.white,
    labelStyle: TextStyle(color: AppColors.ink, fontWeight: FontWeight.w700),
    floatingLabelStyle: TextStyle(color: AppColors.ink, fontWeight: FontWeight.w700),
    hintStyle: TextStyle(color: AppColors.muted),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(14)),
      borderSide: BorderSide(color: AppColors.lineStrong),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(14)),
      borderSide: BorderSide(color: AppColors.lineStrong),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(14)),
      borderSide: BorderSide(color: AppColors.cta, width: 2),
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      minimumSize: const Size.fromHeight(48),
      textStyle: const TextStyle(fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.ink,
      minimumSize: const Size.fromHeight(48),
      side: const BorderSide(color: AppColors.lineStrong),
      textStyle: const TextStyle(fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: AppColors.cta,
      textStyle: const TextStyle(fontWeight: FontWeight.w700),
    ),
  ),
  dialogTheme: const DialogThemeData(
    backgroundColor: Colors.white,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(24))),
  ),
  sliderTheme: const SliderThemeData(
    activeTrackColor: AppColors.primary,
    thumbColor: AppColors.primary,
    inactiveTrackColor: AppColors.rose100,
  ),
  progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppColors.primary),
  dividerTheme: const DividerThemeData(color: AppColors.line),
  textTheme: const TextTheme(
    headlineMedium: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.6, color: AppColors.ink),
    headlineSmall: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.4, color: AppColors.ink),
    titleLarge: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.3, color: AppColors.ink),
    titleMedium: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink),
    bodyMedium: TextStyle(color: AppColors.ink, height: 1.45),
    bodySmall: TextStyle(color: AppColors.muted, height: 1.4),
  ),
);
