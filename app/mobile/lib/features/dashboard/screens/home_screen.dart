import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/providers/workspace_provider.dart';
import '../../../core/providers/data_providers.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/dashboard_tab_provider.dart';
import '../../../core/utils/fy.dart';
import '../../../core/utils/premium.dart';
import '../widgets/action_choice_sheet.dart';
import '../../chat/ai_chat_sheet.dart';
import '../../../core/widgets/state_views.dart';
import '../../settings/profile_settings_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _isObscured = false;
  late int _selectedYear;
  late int _selectedMonth;

  @override
  void initState() {
    super.initState();
    _selectedYear = DateTime.now().year;
    _selectedMonth = DateTime.now().month;
  }

  void _prevMonth() {
    setState(() {
      if (_selectedMonth == 1) {
        _selectedMonth = 12;
        _selectedYear--;
      } else {
        _selectedMonth--;
      }
    });
  }

  void _nextMonth() {
    setState(() {
      if (_selectedMonth == 12) {
        _selectedMonth = 1;
        _selectedYear++;
      } else {
        _selectedMonth++;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workspace = ref.watch(workspaceProvider);
    final isPersonal = workspace == WorkspaceScope.personal;
    
    final fyStart = currentFYStart();
    final monthlyAsync = ref.watch(monthlySummaryProvider((year: _selectedYear, month: _selectedMonth)));
    final entriesAsync = ref.watch(entriesProvider(fyStart));
    final nf = NumberFormat.currency(symbol: '₹', locale: 'en_IN', decimalDigits: 0);

    final authState = ref.watch(authProvider);
    final dbUser = authState.dbUser;
    final firebaseUser = authState.firebaseUser;
    final onPaidPlan = isPaidPlan(dbUser);
    final onTrial = isTrialActive(dbUser);
    final trialDays = trialDaysRemaining(dbUser);
    final String trialStatusText;
    if (onPaidPlan) {
      trialStatusText = planLabel(dbUser) == 'LIFETIME'
          ? 'Lifetime access'
          : 'Active — renews ${planExpiry(dbUser)}';
    } else if (onTrial) {
      trialStatusText = trialDays > 0
          ? '$trialDays day${trialDays == 1 ? '' : 's'} remaining on trial'
          : 'Trial ending today';
    } else {
      trialStatusText = 'Trial ended — upgrade to keep premium features';
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leadingWidth: 64,
        leading: Padding(
          padding: const EdgeInsets.only(left: 16.0),
          child: Center(
            child: InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileSettingsScreen()),
                );
              },
              borderRadius: BorderRadius.circular(999),
              child: _buildHeaderAvatar(dbUser, firebaseUser),
            ),
          ),
        ),
        title: Center(
          child: InkWell(
            onTap: () {
              ref.read(workspaceProvider.notifier).state = isPersonal ? WorkspaceScope.business : WorkspaceScope.personal;
            },
            borderRadius: BorderRadius.circular(999),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isPersonal ? const Color(0xFF0F52BA).withValues(alpha: 0.1) : const Color(0xFFF59E0B).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: isPersonal ? const Color(0xFF0F52BA) : const Color(0xFFF59E0B),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isPersonal ? 'Personal' : 'Business',
                    style: TextStyle(
                      color: isPersonal ? const Color(0xFF0F52BA) : const Color(0xFFF59E0B),
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(Icons.keyboard_arrow_down, size: 16, color: isPersonal ? const Color(0xFF0F52BA) : const Color(0xFFF59E0B)),
                ],
              ),
            ),
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Center(
              child: InkWell(
                onTap: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (ctx) => const AiChatSheet(),
                  );
                },
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: const Color(0xFFE2E2E5)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome, size: 14, color: Color(0xFF7C3AED)),
                      SizedBox(width: 4),
                      Text('KOIN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F0F10))),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: monthlyAsync.when(
        data: (monthly) {
          final workspaceData = monthly[isPersonal ? 'personal' : 'business'] ?? {'income': 0, 'expense': 0, 'net': 0};
          final net = workspaceData['net'] as num;
          final isPositive = net >= 0;

          return ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            children: [
              // 1. Total Balance
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const RadialGradient(
                    center: Alignment.topLeft,
                    radius: 2.0,
                    colors: [Color(0xFFFFFFFF), Color(0xFFF3F4F6)],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isPersonal ? const Color(0xFF0F52BA).withValues(alpha: 0.3) : const Color(0xFFF59E0B).withValues(alpha: 0.3), 
                    width: 1
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: isPersonal ? const Color(0xFF0F52BA).withValues(alpha: 0.15) : const Color(0xFFF59E0B).withValues(alpha: 0.15), 
                      blurRadius: 24, 
                      offset: const Offset(0, 8)
                    )
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Net Balance', style: theme.textTheme.titleMedium?.copyWith(color: const Color(0xFF64646A))),
                        InkWell(
                          onTap: () => setState(() => _isObscured = !_isObscured),
                          child: Icon(_isObscured ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF64646A), size: 20),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRect(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 350),
                        layoutBuilder: (Widget? currentChild, List<Widget> previousChildren) {
                          return Stack(
                            alignment: Alignment.centerLeft,
                            children: <Widget>[
                              ...previousChildren,
                              if (currentChild != null) currentChild,
                            ],
                          );
                        },
                        transitionBuilder: (Widget child, Animation<double> animation) {
                          return SlideTransition(
                            position: Tween<Offset>(begin: const Offset(0.0, 0.5), end: Offset.zero).animate(animation),
                            child: FadeTransition(opacity: animation, child: child),
                          );
                        },
                        child: Text(
                          _isObscured ? nf.format(net).replaceAll(RegExp(r'\d'), '•') : nf.format(net),
                          key: ValueKey<String>('net_${net}_$_isObscured'),
                          style: theme.textTheme.headlineLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF0F0F10),
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(999)),
                          child: Row(
                            children: [
                              const Icon(Icons.arrow_upward, color: Color(0xFF10B981), size: 14),
                              const SizedBox(width: 4),
                              Text(_isObscured ? nf.format(workspaceData['income']).replaceAll(RegExp(r'\d'), '•') : nf.format(workspaceData['income']), style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w600, fontSize: 12, fontFeatures: [FontFeature.tabularFigures()])),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFDC2626).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(999)),
                          child: Row(
                            children: [
                              const Icon(Icons.arrow_downward, color: Color(0xFFDC2626), size: 14),
                              const SizedBox(width: 4),
                              Text(_isObscured ? nf.format(workspaceData['expense']).replaceAll(RegExp(r'\d'), '•') : nf.format(workspaceData['expense']), style: const TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w600, fontSize: 12, fontFeatures: [FontFeature.tabularFigures()])),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // 2. Month Selector Placeholder
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(DateFormat('MMMM yyyy').format(DateTime(_selectedYear, _selectedMonth)), style: theme.textTheme.titleMedium),
                  Row(
                    children: [
                      IconButton(icon: const Icon(Icons.chevron_left), onPressed: _prevMonth),
                      IconButton(icon: const Icon(Icons.chevron_right), onPressed: _nextMonth),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              
              // 4. Trial Status
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.3)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Icon(Icons.workspace_premium, color: theme.colorScheme.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Ledger Premium', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                          Text(trialStatusText, style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // 5. Recent Transactions
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Recent Transactions', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => ref.read(dashboardTabIndexProvider.notifier).state = 2,
                    child: const Text('See all'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              
              entriesAsync.when(
                data: (entries) {
                  final filtered = entries.where((e) => e['scope'] == workspace.id).toList();
                  filtered.sort((a, b) => DateTime.parse(b['date']).compareTo(DateTime.parse(a['date'])));
                  final recent = filtered.take(5).toList();
                  
                  if (recent.isEmpty) {
                    return const Center(child: Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Text('No recent transactions.'),
                    ));
                  }
                  
                  return Column(
                    children: recent.map((e) {
                      final isIncome = e['type'] == 'income';
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: theme.colorScheme.surfaceContainerHighest,
                          child: Text(e['category'].substring(0, 1).toUpperCase()),
                        ),
                        title: Text(e['category']),
                        subtitle: Text(e['note'] ?? ''),
                        trailing: Text(
                          '${isIncome ? '+' : '-'}${nf.format(e['amount'])}',
                          style: TextStyle(
                            color: isIncome ? Colors.green : Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
                loading: () => const LoadingView(),
                error: (err, stack) => ErrorView(
                  message: 'Could not fetch recent transactions.',
                  onRetry: () => ref.invalidate(entriesProvider),
                ),
              ),
              const SizedBox(height: 100), // padding for bottom nav
            ],
          );
        },
        loading: () => const LoadingView(),
        error: (err, stack) => ErrorView(
          message: 'Unable to connect to the backend. Please check your internet connection.',
          onRetry: () => ref.invalidate(monthlySummaryProvider),
        ),
      ),
    );
  }

  /// Header avatar: the user's photo if we have one, else their initial,
  /// else a generic fallback icon.
  Widget _buildHeaderAvatar(Map<String, dynamic>? dbUser, dynamic firebaseUser) {
    final photo = (dbUser?['profile_picture'] as String?)?.trim();
    final fallbackPhoto = firebaseUser?.photoURL as String?;
    final picture = (photo != null && photo.isNotEmpty) ? photo : fallbackPhoto;

    ImageProvider? image;
    if (picture != null && picture.isNotEmpty) {
      if (picture.startsWith('data:image')) {
        try {
          final base64Str = picture.substring(picture.indexOf(',') + 1);
          image = MemoryImage(base64Decode(base64Str));
        } catch (_) {
          image = null;
        }
      } else if (picture.startsWith('http')) {
        image = NetworkImage(picture);
      }
    }

    final name = (dbUser?['name'] as String?)?.trim().isNotEmpty == true
        ? dbUser!['name'] as String
        : (firebaseUser?.displayName as String?)?.trim();
    final email = (dbUser?['email'] as String?) ?? (firebaseUser?.email as String?);
    final initial = (name != null && name.isNotEmpty)
        ? name[0].toUpperCase()
        : (email != null && email.isNotEmpty ? email[0].toUpperCase() : null);

    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE2E2E5), width: 2),
        color: const Color(0xFFEFF3FB),
        image: image != null ? DecorationImage(image: image, fit: BoxFit.cover) : null,
      ),
      alignment: Alignment.center,
      child: image == null
          ? Text(
              initial ?? '',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F52BA)),
            )
          : null,
    );
  }


}
