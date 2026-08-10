import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/data_providers.dart';
import '../../core/widgets/luxury_sheet.dart';
import '../../core/widgets/luxury_controls.dart';
import '../../core/utils/snackbar_utils.dart';

class AddDebtSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic>? editingDebt;

  const AddDebtSheet({super.key, this.editingDebt});

  @override
  ConsumerState<AddDebtSheet> createState() => _AddDebtSheetState();
}

class _AddDebtSheetState extends ConsumerState<AddDebtSheet> {
  late String type;
  final personController = TextEditingController();
  final amountController = TextEditingController();
  final noteController = TextEditingController();
  DateTime selectedDate = DateTime.now();
  bool isBusy = false;

  @override
  void initState() {
    super.initState();
    if (widget.editingDebt != null) {
      type = widget.editingDebt!['type'];
      personController.text = widget.editingDebt!['person_name'];
      amountController.text = widget.editingDebt!['amount'].toString();
      noteController.text = widget.editingDebt!['note'] ?? '';
      selectedDate = DateTime.parse(widget.editingDebt!['expected_date']);
    } else {
      type = 'to_collect';
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
    );
    if (picked != null) {
      setState(() => selectedDate = picked);
    }
  }

  Future<void> _save() async {
    final amount = double.tryParse(amountController.text);
    if (amount == null || amount <= 0) {
      showApiErrorSnackbar(context, null, fallback: 'Enter a valid amount');
      return;
    }
    if (personController.text.trim().isEmpty) {
      showApiErrorSnackbar(context, null, fallback: 'Enter person name');
      return;
    }

    setState(() => isBusy = true);
    try {
      final dio = ref.read(apiClientProvider);
      final payload = {
        'person_name': personController.text.trim(),
        'type': type,
        'amount': amount,
        'expected_date': selectedDate.toIso8601String().split('T').first,
        'note': noteController.text,
      };

      if (widget.editingDebt != null) {
        await dio.put('/debts/${widget.editingDebt!['id']}', data: payload);
        if (mounted) showSuccessSnackbar(context, 'IOU updated');
      } else {
        await dio.post('/debts', data: payload);
        if (mounted) showSuccessSnackbar(context, 'IOU added');
      }
      
      bumpDataRefresh(ref);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Failed to save IOU');
    } finally {
      if (mounted) setState(() => isBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final typeAccentColor = type == 'to_collect' ? const Color(0xFF0F52BA) : const Color(0xFFF59E0B);

    return LuxuryBottomSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LuxurySheetHeader(
            title: widget.editingDebt != null ? 'Edit IOU' : 'New IOU',
            subtitle: 'Log money you owe or are owed.',
          ),
          const SizedBox(height: 24),
          
          LuxurySegmentedToggle<String>(
            value: type,
            items: [
              LuxurySegmentItem(value: 'to_collect', label: 'To Collect', selectedColor: const Color(0xFF121316)),
              LuxurySegmentItem(value: 'to_pay', label: 'To Pay', selectedColor: const Color(0xFFF59E0B)),
            ],
            onChanged: (val) => setState(() => type = val),
          ),
          const SizedBox(height: 24),

          const Text('Person or Entity', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextField(
            controller: personController,
            decoration: InputDecoration(
              hintText: 'Who owes you / you owe?',
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              Expanded(
                flex: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Amount', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: typeAccentColor, fontFeatures: const [FontFeature.tabularFigures()]),
                      decoration: InputDecoration(
                        prefixText: '₹ ',
                        prefixStyle: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: typeAccentColor),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: typeAccentColor, width: 2)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Expected Date', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: _selectDate,
                      child: Container(
                        height: 64, // Matches TextField height
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E2E5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 16, color: Color(0xFF64646A)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                DateFormat('dd MMM yyyy').format(selectedDate),
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, fontFeatures: [FontFeature.tabularFigures()]),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          const Text('Note (Optional)', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextField(
            controller: noteController,
            decoration: InputDecoration(
              hintText: 'Add a note...',
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
            ),
          ),
          const SizedBox(height: 32),

          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: const BorderSide(color: Color(0xFFE2E2E5)),
                  ),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF18181B), fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: LuxuryPrimaryButton(
                  onPressed: _save,
                  isBusy: isBusy,
                  text: widget.editingDebt != null ? 'Update IOU' : 'Add IOU',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
