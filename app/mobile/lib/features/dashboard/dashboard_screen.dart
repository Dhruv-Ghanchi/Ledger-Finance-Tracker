import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'screens/home_screen.dart';
import '../analytics/screens/analytics_screen.dart';
import '../activity/screens/activity_screen.dart';
import '../more/screens/more_hub_screen.dart';
import 'widgets/action_choice_sheet.dart';
import '../../core/providers/dashboard_tab_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(dashboardTabIndexProvider);

    return Scaffold(
      extendBody: true, // Content scrolls under the floating nav bar
      body: _buildBody(currentIndex),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(32),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
              child: Container(
                height: 72,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.88),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: const Color(0xFFE2E2E5), width: 1),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildTab(context, ref, Icons.home_outlined, Icons.home, 'Home', 0, currentIndex),
                    _buildTab(context, ref, Icons.analytics_outlined, Icons.analytics, 'Analytics', 1, currentIndex),
                    _buildCenterButton(context),
                    _buildTab(context, ref, Icons.list_alt_outlined, Icons.list_alt, 'Activity', 2, currentIndex),
                    _buildTab(context, ref, Icons.more_horiz_outlined, Icons.more_horiz, 'More', 3, currentIndex),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCenterButton(BuildContext context) {
    return GestureDetector(
      onTap: () {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (ctx) => const ActionChoiceSheet(),
        );
      },
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: const Color(0xFF18181B),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF18181B).withValues(alpha: 0.2),
              blurRadius: 16,
              offset: const Offset(0, 8),
            )
          ]
        ),
        child: const Icon(Icons.add, color: Color(0xFFFAFAFA), size: 28),
      ),
    );
  }

  Widget _buildTab(BuildContext context, WidgetRef ref, IconData unselected, IconData selected, String label, int index, int currentIndex) {
    final isSelected = currentIndex == index;
    final theme = Theme.of(context);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => ref.read(dashboardTabIndexProvider.notifier).state = index,
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isSelected ? selected : unselected,
              color: isSelected ? theme.colorScheme.primary : const Color(0xFF64646A),
              size: 26,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: isSelected ? theme.colorScheme.primary : const Color(0xFF64646A),
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(int currentIndex) {
    switch (currentIndex) {
      case 0:
        return const HomeScreen();
      case 1:
        return const AnalyticsScreen();
      case 2:
        return const ActivityScreen();
      case 3:
        return const MoreHubScreen();
      default:
        return const HomeScreen();
    }
  }
}
