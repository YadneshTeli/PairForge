import 'package:flutter/material.dart';

import '../core/constants/colors.dart';

final darkTheme = ThemeData(
  useMaterial3: true,
  fontFamily: 'Inter',
  brightness: Brightness.dark,
  colorScheme: const ColorScheme(
    brightness: Brightness.dark,
    primary: AppColors.secondary,
    onPrimary: AppColors.darkPaper,
    primaryContainer: AppColors.primaryDeep,
    onPrimaryContainer: AppColors.darkInk,
    secondary: AppColors.primary,
    onSecondary: Colors.white,
    tertiary: AppColors.cta,
    onTertiary: Colors.white,
    error: AppColors.secondary,
    onError: AppColors.darkPaper,
    surface: AppColors.darkSurface,
    onSurface: AppColors.darkInk,
    outline: AppColors.primaryDeep,
  ),
  scaffoldBackgroundColor: AppColors.darkPaper,
  appBarTheme: const AppBarTheme(
    centerTitle: false,
    elevation: 0,
    scrolledUnderElevation: 0,
    backgroundColor: AppColors.darkPaper,
    foregroundColor: AppColors.darkInk,
  ),
  cardTheme: CardThemeData(
    elevation: 0,
    color: AppColors.darkSurface,
    margin: EdgeInsets.zero,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: const BorderSide(color: AppColors.primaryDeep),
    ),
  ),
  chipTheme: const ChipThemeData(
    backgroundColor: AppColors.primaryDeep,
    selectedColor: AppColors.secondary,
    labelStyle: TextStyle(color: AppColors.darkInk, fontWeight: FontWeight.w700, fontSize: 12),
    secondaryLabelStyle: TextStyle(color: AppColors.darkPaper, fontWeight: FontWeight.w700, fontSize: 12),
    checkmarkColor: AppColors.darkPaper,
    side: BorderSide.none,
    shape: StadiumBorder(),
  ),
  inputDecorationTheme: const InputDecorationTheme(
    filled: true,
    fillColor: AppColors.darkSurface,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(14)),
      borderSide: BorderSide(color: AppColors.primaryDeep),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(14)),
      borderSide: BorderSide(color: AppColors.primaryDeep),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(14)),
      borderSide: BorderSide(color: AppColors.cta, width: 2),
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: AppColors.secondary,
      foregroundColor: AppColors.darkPaper,
      minimumSize: const Size.fromHeight(48),
      textStyle: const TextStyle(fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.darkInk,
      minimumSize: const Size.fromHeight(48),
      side: const BorderSide(color: AppColors.primaryDeep),
      textStyle: const TextStyle(fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(foregroundColor: AppColors.cta, textStyle: const TextStyle(fontWeight: FontWeight.w700)),
  ),
  dialogTheme: const DialogThemeData(
    backgroundColor: AppColors.darkSurface,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(24))),
  ),
  progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppColors.secondary),
);
