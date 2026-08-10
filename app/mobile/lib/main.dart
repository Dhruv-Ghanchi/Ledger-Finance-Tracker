import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/providers/auth_provider.dart';
import 'core/providers/data_providers.dart';
import 'core/utils/premium.dart';
import 'features/settings/premium_upgrade_sheet.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(const ExpenseTrackerApp());
}

class ExpenseTrackerApp extends StatelessWidget {
  const ExpenseTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const ProviderScope(
      child: _Root(),
    );
  }
}

class _Root extends ConsumerStatefulWidget {
  const _Root();

  @override
  ConsumerState<_Root> createState() => _RootState();
}

class _RootState extends ConsumerState<_Root> {
  @override
  void initState() {
    super.initState();
    // Register the font families used via raw fontFamily strings so they
    // resolve on the very first frame instead of silently falling back.
    _preloadFonts();
  }

  Future<void> _preloadFonts() async {
    GoogleFonts.outfit(textStyle: const TextStyle(fontSize: 14));
    GoogleFonts.ibmPlexSans(textStyle: const TextStyle(fontSize: 14));
    GoogleFonts.jetBrainsMono(textStyle: const TextStyle(fontSize: 14));
  }

  void _maybeShowPremiumPrompt() {
    if (!mounted) return;
    final user = ref.read(authProvider).dbUser;
    if (hasPremiumAccess(user)) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const PremiumUpgradeSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Show a premium prompt whenever a Premium-only feature was attempted.
    ref.listen<int>(premiumRequiredProvider, (previous, next) {
      if (next != previous && next > 0) {
        _maybeShowPremiumPrompt();
      }
    });

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Ledger',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
