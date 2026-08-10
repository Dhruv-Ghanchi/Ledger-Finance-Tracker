import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Which bottom-nav tab is active on [DashboardScreen] (0=Home, 1=Analytics,
/// 2=Activity, 3=More). Lifted out of local widget state so other screens
/// (e.g. Home's "See all" link) can switch tabs without a Navigator route.
final dashboardTabIndexProvider = StateProvider<int>((ref) => 0);
