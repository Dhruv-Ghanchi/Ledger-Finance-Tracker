import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/data_providers.dart';
import '../../../core/utils/app_fonts.dart';
import '../../../core/widgets/state_views.dart';
import '../../entries/add_debt_sheet.dart';
import '../../entries/settle_debt_sheet.dart';
import '../../../core/widgets/luxury_controls.dart';

class DebtsTab extends ConsumerStatefulWidget {
  const DebtsTab({super.key});

  @override
  ConsumerState<DebtsTab> createState() => _DebtsTabState();
}

class _DebtsTabState extends ConsumerState<DebtsTab> {
  int _segmentedIndex = 0; // 0 for To Collect, 1 for To Pay

  Future<void> _deleteDebt(int id) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.delete('/debts/$id');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('IOU deleted')));
      bumpDataRefresh(ref);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete')));
    }
  }

  void _showAddDebtSheet([Map<String, dynamic>? debt]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AddDebtSheet(editingDebt: debt),
    );
  }

  void _showSettleDebtSheet(Map<String, dynamic> debt) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SettleDebtSheet(debt: debt),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final debtsAsync = ref.watch(debtsProvider);
    final numberFormat = NumberFormat.currency(symbol: '₹', locale: 'en_IN', decimalDigits: 0);

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 96.0),
        child: FloatingActionButton.extended(
          onPressed: () => _showAddDebtSheet(),
          backgroundColor: const Color(0xFF121316),
          foregroundColor: Colors.white,
          icon: const Icon(Icons.add),
          label: const Text('Add IOU', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ),
      body: debtsAsync.when(
        data: (debts) {
          final pending = debts.where((d) => d['status'] == 'pending').toList();
          final toCollect = pending.where((d) => d['type'] == 'to_collect').toList();
          final toPay = pending.where((d) => d['type'] == 'to_pay').toList();

          final activeList = _segmentedIndex == 0 ? toCollect : toPay;

          return Column(
            children: [
              // Segmented Toggle
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: LuxurySegmentedToggle<int>(
                  value: _segmentedIndex,
                  items: [
                    LuxurySegmentItem(value: 0, label: 'To Collect', selectedColor: const Color(0xFF121316)),
                    LuxurySegmentItem(value: 1, label: 'To Pay', selectedColor: const Color(0xFFF59E0B)),
                  ],
                  onChanged: (val) => setState(() => _segmentedIndex = val),
                ),
              ),
              
              // List
              Expanded(
                child: activeList.isEmpty
                    ? Center(child: Text(_segmentedIndex == 0 ? 'No pending collections' : 'No pending payments', style: const TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 100),
                        itemCount: activeList.length,
                        itemBuilder: (context, index) {
                          return _buildDebtCard(activeList[index], _segmentedIndex == 0, numberFormat);
                        },
                      ),
              ),
            ],
          );
        },
        loading: () => const LoadingView(),
        error: (err, stack) => ErrorView(
          message: apiErrorMessage(err),
          onRetry: () => ref.invalidate(debtsProvider),
        ),
      ),
    );
  }

  Widget _buildDebtCard(Map<String, dynamic> debt, bool isCollect, NumberFormat nf) {
    final theme = Theme.of(context);
    final amtColor = isCollect ? const Color(0xFF059669) : const Color(0xFFDC2626);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E2E5)),
        boxShadow: const [BoxShadow(color: Color(0x05000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: amtColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(isCollect ? Icons.arrow_downward : Icons.arrow_upward, color: amtColor, size: 16),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    debt['person_name'],
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Text(
                '${isCollect ? '+' : '-'}${nf.format(debt['amount'])}',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: amtColor,
                  fontWeight: FontWeight.bold,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFFF4F4F5), borderRadius: BorderRadius.circular(4)),
                child: Text(
                  'Expected: ${DateFormat('dd MMM yyyy').format(DateTime.parse(debt['expected_date']))}',
                  style: const TextStyle(fontSize: 10, color: Color(0xFF64646A), fontWeight: FontWeight.bold),
                ),
              ),
              if (debt['note'] != null && debt['note'].toString().isNotEmpty) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    debt['note'],
                    style: const TextStyle(fontSize: 11, color: Color(0xFFA1A1AA)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFF4F4F5)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => _deleteDebt(debt['id']),
                    icon: const Icon(Icons.delete_outline, size: 20, color: Color(0xFFA1A1AA)),
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(4),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => _showAddDebtSheet(debt),
                    icon: const Icon(Icons.edit_outlined, size: 20, color: Color(0xFFA1A1AA)),
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(4),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: () => _showSettleDebtSheet(debt),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF121316),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                ),
                child: const Text('Settle Debt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          )
        ],
      ),
    );
  }
}
