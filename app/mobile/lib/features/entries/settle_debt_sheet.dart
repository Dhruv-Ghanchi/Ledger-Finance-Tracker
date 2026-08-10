import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/data_providers.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/premium.dart';
import '../../core/widgets/luxury_sheet.dart';
import '../../core/widgets/luxury_controls.dart';
import '../../core/utils/snackbar_utils.dart';

class SettleDebtSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic> debt;

  const SettleDebtSheet({super.key, required this.debt});

  @override
  ConsumerState<SettleDebtSheet> createState() => _SettleDebtSheetState();
}

class _SettleDebtSheetState extends ConsumerState<SettleDebtSheet> {
  String _scope = 'personal';
  String? _category;
  bool isBusy = false;
  bool _generateEntry = true;

  bool get _isCollect => widget.debt['type'] == 'to_collect';

  Future<void> _settle() async {
    if (_generateEntry && _category == null) {
      showInfoSnackbar(context, 'Please select a category for the ledger entry.');
      return;
    }

    setState(() => isBusy = true);
    try {
      final dio = ref.read(apiClientProvider);

      await dio.post('/debts/${widget.debt['id']}/settle', data: {
        'generate_entry': _generateEntry,
        if (_generateEntry) 'category': _category,
        if (_generateEntry) 'scope': _scope,
      });

      bumpDataRefresh(ref);
      if (mounted) {
        showSuccessSnackbar(context, _generateEntry ? 'IOU settled. Entry created.' : 'IOU marked as settled.');
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Failed to settle IOU');
    } finally {
      if (mounted) setState(() => isBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final amtColor = _isCollect ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final isFreeUser = !hasPremiumAccess(ref.read(authProvider).dbUser);

    return LuxuryBottomSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LuxurySheetHeader(
            title: 'Settle IOU',
            subtitle: 'Mark this debt as settled.',
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: amtColor.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: Icon(Icons.check_circle_outline, color: amtColor, size: 24),
            ),
          ),
          const SizedBox(height: 24),
          
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E2E5)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Amount', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      formatINR(widget.debt['amount']),
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: amtColor, fontFeatures: const [FontFeature.tabularFigures()]),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('Person', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      widget.debt['person_name'],
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF121316)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          InkWell(
            onTap: () => setState(() => _generateEntry = !_generateEntry),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: _generateEntry ? const Color(0xFFEFF6FF) : const Color(0xFFF4F4F5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _generateEntry ? const Color(0xFF0F52BA).withValues(alpha: 0.3) : const Color(0xFFE2E2E5)),
              ),
              child: Row(
                children: [
                  Icon(_generateEntry ? Icons.check_box : Icons.check_box_outline_blank, color: _generateEntry ? const Color(0xFF0F52BA) : const Color(0xFF64646A), size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _isCollect ? 'Generate matching Income entry' : 'Generate matching Expense entry',
                      style: TextStyle(fontWeight: FontWeight.bold, color: _generateEntry ? const Color(0xFF0F52BA) : const Color(0xFF64646A)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          if (_generateEntry) ...[
            const Text('Workspace', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            LuxurySegmentedToggle<String>(
              value: _scope,
              items: [
                LuxurySegmentItem(value: 'personal', label: 'Personal', selectedColor: const Color(0xFF0F52BA)),
                LuxurySegmentItem(value: 'business', label: 'Business', selectedColor: const Color(0xFFF59E0B)),
              ],
              onChanged: (val) => setState(() => _scope = val),
            ),
            const SizedBox(height: 24),

            const Text('Category', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            categoriesAsync.when(
              data: (cats) {
                final neededType = _isCollect ? 'income' : 'expense';
                final Set<String> seen = {};
                final filtered = cats.where((c) {
                  if (c['type'] != neededType) return false;
                  if (isFreeUser && c['is_preset'] != true) return false;
                  if (seen.contains(c['name'])) return false;
                  seen.add(c['name']);
                  return true;
                }).toList()
                  ..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));

                return DropdownButtonFormField<String>(
                  initialValue: _category,
                  hint: const Text('Select category...'),
                  isExpanded: true,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                  ),
                  items: filtered.map((c) => DropdownMenuItem<String>(
                    value: c['name'],
                    child: Text(c['name'], style: const TextStyle(fontWeight: FontWeight.w600)),
                  )).toList(),
                  onChanged: (v) => setState(() => _category = v),
                );
              },
              loading: () => const LinearProgressIndicator(),
              error: (err, stack) => Text('Error: $err'),
            ),
            const SizedBox(height: 32),
          ],

          LuxuryPrimaryButton(
            onPressed: _settle,
            isBusy: isBusy,
            text: 'Confirm Settlement',
          ),
        ],
      ),
    );
  }
}
