import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/data_providers.dart';
import '../../core/providers/workspace_provider.dart';
import '../../core/widgets/luxury_sheet.dart';
import '../../core/widgets/luxury_controls.dart';
import '../../core/utils/snackbar_utils.dart';

class AddEntrySheet extends ConsumerStatefulWidget {
  final Map<String, dynamic>? editingEntry;

  const AddEntrySheet({super.key, this.editingEntry});

  @override
  ConsumerState<AddEntrySheet> createState() => _AddEntrySheetState();
}

class _AddEntrySheetState extends ConsumerState<AddEntrySheet> {
  late String scope;
  late String type;
  final amountController = TextEditingController();
  final noteController = TextEditingController();
  DateTime selectedDate = DateTime.now();
  String? selectedCategory;
  bool isBusy = false;

  @override
  void initState() {
    super.initState();
    if (widget.editingEntry != null) {
      scope = widget.editingEntry!['scope'];
      type = widget.editingEntry!['type'];
      amountController.text = widget.editingEntry!['amount'].toString();
      noteController.text = widget.editingEntry!['note'] ?? '';
      selectedDate = DateTime.parse(widget.editingEntry!['date']);
      selectedCategory = widget.editingEntry!['category'];
    } else {
      final globalScope = ref.read(workspaceProvider);
      scope = globalScope == WorkspaceScope.business ? 'business' : 'personal';
      type = 'expense';
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
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
    if (selectedCategory == null) {
      showApiErrorSnackbar(context, null, fallback: 'Choose a category');
      return;
    }

    setState(() => isBusy = true);
    try {
      final dio = ref.read(apiClientProvider);
      final payload = {
        'date': selectedDate.toIso8601String().split('T').first,
        'amount': amount,
        'type': type,
        'scope': scope,
        'category': selectedCategory,
        'note': noteController.text,
      };

      if (widget.editingEntry != null) {
        await dio.put('/entries/${widget.editingEntry!['id']}', data: payload);
        if (mounted) showSuccessSnackbar(context, 'Entry updated');
      } else {
        await dio.post('/entries', data: payload);
        if (mounted) showSuccessSnackbar(context, 'Entry added');
      }
      
      bumpDataRefresh(ref);
      
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Failed to save entry');
    } finally {
      if (mounted) setState(() => isBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final typeAccentColor = type == 'income' ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return LuxuryBottomSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LuxurySheetHeader(
            title: widget.editingEntry != null ? 'Edit Entry' : 'New Entry',
            subtitle: 'Log a new transaction.',
          ),
          const SizedBox(height: 24),

          LuxurySegmentedToggle<String>(
            value: scope,
            items: [
              LuxurySegmentItem(value: 'personal', label: 'Personal', selectedColor: const Color(0xFF121316)),
              LuxurySegmentItem(value: 'business', label: 'Business', selectedColor: const Color(0xFFF59E0B)),
            ],
            onChanged: (val) => setState(() => scope = val),
          ),
          const SizedBox(height: 16),
          
          LuxurySegmentedToggle<String>(
            value: type,
            items: [
              LuxurySegmentItem(value: 'expense', label: 'Expense', selectedColor: const Color(0xFFEF4444)),
              LuxurySegmentItem(value: 'income', label: 'Income', selectedColor: const Color(0xFF10B981)),
            ],
            onChanged: (val) => setState(() => type = val),
          ),
          const SizedBox(height: 24),

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
                    const Text('Date', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
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
                            Text(
                              DateFormat('dd MMM yyyy').format(selectedDate),
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, fontFeatures: [FontFeature.tabularFigures()]),
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

          const Text('Category', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E2E5)),
            ),
            child: categoriesAsync.when(
              data: (cats) {
                final filtered = cats.where((c) => c['type'] == type && c['scope'] == scope).toList();
                return DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: selectedCategory,
                    hint: const Text('Select a category'),
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF64646A)),
                    items: filtered.map((c) {
                      return DropdownMenuItem<String>(
                        value: c['name'],
                        child: Text(c['name'], style: const TextStyle(fontWeight: FontWeight.w600)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() => selectedCategory = val);
                    },
                  ),
                );
              },
              loading: () => const Padding(padding: EdgeInsets.all(12), child: Text('Loading categories...')),
              error: (_, __) => const Padding(padding: EdgeInsets.all(12), child: Text('Error loading categories')),
            ),
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
                  text: widget.editingEntry != null ? 'Update Entry' : 'Add Entry',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
