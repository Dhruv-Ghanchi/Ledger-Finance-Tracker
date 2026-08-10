import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/utils/app_fonts.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

class PremiumUpgradeSheet extends ConsumerStatefulWidget {
  const PremiumUpgradeSheet({super.key});

  @override
  ConsumerState<PremiumUpgradeSheet> createState() => _PremiumUpgradeSheetState();
}

class _PremiumUpgradeSheetState extends ConsumerState<PremiumUpgradeSheet> {
  String? _loadingPlan;
  late Razorpay _razorpay;

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  @override
  void dispose() {
    super.dispose();
    _razorpay.clear(); 
  }

  Future<void> _handleUpgrade(String planType) async {
    setState(() => _loadingPlan = planType);
    try {
      final dio = ref.read(apiClientProvider);
      
      // 1. Initiate Subscription on backend
      final res = await dio.post('/payments/subscribe', data: {'plan': planType});
      final subId = res.data['subscription_id'];
      
      // 2. Open Razorpay Checkout
      final user = ref.read(authProvider).firebaseUser;
      
      var options = {
        'key': AppConfig.razorpayKeyId,
        'subscription_id': subId,
        'name': 'Ledger AI',
        'description': 'Ledger Premium $planType Subscription',
        'prefill': {
          'contact': '',
          'email': user?.email ?? ''
        },
      };
      
      _razorpay.open(options);

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not initiate payment. Try again.')));
        setState(() => _loadingPlan = null);
      }
    }
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/users/sync');
      await ref.read(authProvider.notifier).syncWithBackend();

      if (mounted) {
        setState(() => _loadingPlan = null);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscription activated successfully!')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingPlan = null);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment succeeded but failed to sync user. Please restart app.')));
        Navigator.pop(context);
      }
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (mounted) {
      setState(() => _loadingPlan = null);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Payment failed: ${response.message ?? 'Unknown error'}')));
    }
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (mounted) {
      setState(() => _loadingPlan = null);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('External Wallet Selected: ${response.walletName}')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [theme.colorScheme.primary.withValues(alpha: 0.1), Colors.transparent],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              border: Border(bottom: BorderSide(color: theme.dividerColor)),
            ),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(Icons.star, color: theme.colorScheme.primary, size: 32),
                ),
                const SizedBox(height: 16),
                Text('Unlock Ledger Premium', style: theme.textTheme.headlineSmall?.copyWith(fontFamily: AppFonts.display, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  'Upgrade to Ledger Premium to unlock all our powerful smart features.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
                ),
              ],
            ),
          ),

          // Features
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildFeature(Icons.bolt, Colors.blue, 'Ledger AI', 'Chat to log', theme),
                _buildFeature(Icons.document_scanner, Colors.green, 'Smart Scanner', 'Extract data', theme),
                _buildFeature(Icons.picture_as_pdf, Colors.orange, 'PDF Reports', 'Official invoices', theme),
              ],
            ),
          ),

          // Pricing Buttons
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _loadingPlan != null ? null : () => _handleUpgrade('monthly'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      side: BorderSide(color: theme.dividerColor, width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _loadingPlan == 'monthly'
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : Column(
                            children: [
                              Text('Monthly', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text('₹49/month', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                            ],
                          ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Stack(
                    clipBehavior: Clip.none,
                    alignment: Alignment.topRight,
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _loadingPlan != null ? null : () => _handleUpgrade('yearly'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.05),
                            side: BorderSide(color: theme.colorScheme.primary, width: 2),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _loadingPlan == 'yearly'
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                              : Column(
                                  children: [
                                    Text('Yearly', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                                    const SizedBox(height: 4),
                                    Text('₹499/year', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary.withValues(alpha: 0.8))),
                                  ],
                                ),
                        ),
                      ),
                      Positioned(
                        top: -10,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text('BEST VALUE', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildFeature(IconData icon, Color color, String title, String sub, ThemeData theme) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 8),
        Text(title, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(sub, style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey, fontSize: 10)),
      ],
    );
  }
}
