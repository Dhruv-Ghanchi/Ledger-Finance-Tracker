import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
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

class ImportSheet extends ConsumerStatefulWidget {
  const ImportSheet({super.key});

  @override
  ConsumerState<ImportSheet> createState() => _ImportSheetState();
}

class _ImportSheetState extends ConsumerState<ImportSheet> {
  static const _allowed = ['jpg', 'jpeg', 'png', 'pdf', 'csv', 'xls', 'xlsx', 'webp'];
  static const int _maxSizeBytes = 10 * 1024 * 1024;

  bool _loading = false;
  bool _submitting = false;
  String? _fileName;
  Uint8List? _fileBytes;
  List<Map<String, dynamic>> _drafts = [];

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: _allowed,
        withData: true,
      );
      if (result == null || result.files.isEmpty) return;

      final file = result.files.single;
      if (file.size > _maxSizeBytes) {
        if (mounted) showInfoSnackbar(context, 'File is too large. Maximum size is 10MB.');
        return;
      }
      final bytes = file.bytes;
      if (bytes == null) return;

      setState(() {
        _fileName = file.name;
        _fileBytes = bytes;
        _drafts = [];
      });
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Could not open the file picker. Please try again.');
    }
  }

  Future<void> _extract() async {
    final bytes = _fileBytes;
    if (bytes == null || _fileName == null) {
      if (mounted) showInfoSnackbar(context, 'Choose a file first');
      return;
    }

    setState(() => _loading = true);
    try {
      final dio = ref.read(apiClientProvider);
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: _fileName),
      });
      final res = await dio.post('/entries/import/preview', data: formData);
      final data = res.data as List<dynamic>;

      setState(() {
        _drafts = data.map((e) {
          final m = Map<String, dynamic>.from(e as Map);
          m['_category'] = m['category'] ?? 'Other';
          return m;
        }).toList();
      });

      if (data.isEmpty) {
        if (mounted) showInfoSnackbar(context, 'No valid transactions found in the file.');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        if (mounted) Navigator.pop(context);
        requirePremium(ref);
        return;
      }
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Failed to parse file. Ensure it is readable and try again.');
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Failed to parse file. Ensure it is readable and try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickDate(int index) async {
    final current = DateTime.tryParse(_drafts[index]['date'] ?? '') ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() {
        _drafts[index]['date'] = picked.toIso8601String().split('T').first;
      });
    }
  }

  Future<void> _confirm() async {
    for (int i = 0; i < _drafts.length; i++) {
      final e = _drafts[i];
      final category = (e['_category'] as String?)?.trim();
      final amount = (e['amount'] as num?)?.toDouble() ?? double.tryParse(e['amount'].toString()) ?? 0;
      if (category == null || category.isEmpty || amount <= 0) {
        if (mounted) showInfoSnackbar(context, 'Entry ${i + 1} is missing a category or amount.');
        return;
      }
      e['category'] = category;
      e['amount'] = amount;
    }

    setState(() => _submitting = true);
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/entries/import/confirm', data: {'entries': _drafts});
      final inserted = res.data['inserted_count'] ?? 0;
      bumpDataRefresh(ref);
      if (mounted) {
        showSuccessSnackbar(context, 'Successfully imported $inserted entries!');
        Navigator.pop(context, true);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        if (mounted) Navigator.pop(context);
        requirePremium(ref);
        return;
      }
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Import failed. Please try again.');
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Import failed. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isFreeUser = !hasPremiumAccess(ref.watch(authProvider).dbUser);
    final categoriesAsync = ref.watch(categoriesProvider);

    return LuxuryBottomSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const LuxurySheetHeader(
            title: 'Import Data',
            subtitle: 'Upload receipts or statements for AI processing.',
          ),
          const SizedBox(height: 24),

          if (_drafts.isEmpty) ...[
            GestureDetector(
              onTap: _pickFile,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
                decoration: BoxDecoration(
                  color: const Color(0xFFF4F4F5),
                  border: Border.all(color: _fileName != null ? const Color(0xFF121316) : const Color(0xFFE2E2E5)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (_fileName == null) ...[
                      const Icon(Icons.cloud_upload_outlined, color: Color(0xFF121316), size: 36),
                    ],
                    const SizedBox(height: 16),
                    Text(
                      _fileName ?? 'Tap to browse files',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF121316)),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    const Text('Supports JPG, PNG, PDF, CSV, XLS, WEBP', style: TextStyle(fontSize: 12, color: Color(0xFFA1A1AA))),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            LuxuryPrimaryButton(
              onPressed: (_loading || _fileBytes == null) ? null : _extract,
              isBusy: _loading,
              text: 'Extract Data with AI',
            ),
            
            if (isFreeUser) ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.star, size: 16, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 8),
                  const Text(
                    'Import & OCR is a Premium feature.',
                    style: TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ],
              ),
            ],
          ] else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Review ${_drafts.length} entr${_drafts.length == 1 ? 'y' : 'ies'}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF121316)),
                ),
                TextButton(
                  onPressed: () => setState(() {
                    _drafts = [];
                    _fileBytes = null;
                    _fileName = null;
                  }),
                  child: const Text('Cancel & Restart', style: TextStyle(color: Color(0xFFDC2626))),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ..._drafts.asMap().entries.map((e) {
              final index = e.key;
              final entry = e.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
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
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: entry['type'] == 'income' ? const Color(0xFF10B981).withValues(alpha: 0.1) : const Color(0xFFEF4444).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        (entry['type'] ?? 'expense').toString().toUpperCase(),
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: entry['type'] == 'income' ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Amount', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
                              const SizedBox(height: 8),
                              TextFormField(
                                initialValue: (entry['amount'] as num).toString(),
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontFeatures: [FontFeature.tabularFigures()]),
                                decoration: InputDecoration(
                                  prefixText: '₹ ',
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                                ),
                                onChanged: (v) => entry['amount'] = double.tryParse(v) ?? 0,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Date', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: () => _pickDate(index),
                                child: Container(
                                  height: 48,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFE2E2E5)),
                                  ),
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    shortDate(entry['date'] ?? ''),
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, fontFeatures: [FontFeature.tabularFigures()]),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('Scope', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _ScopeChoiceButton(
                            label: 'Personal',
                            selected: (entry['scope'] ?? 'personal') == 'personal',
                            color: const Color(0xFF0F52BA),
                            onTap: () => setState(() => entry['scope'] = 'personal'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _ScopeChoiceButton(
                            label: 'Business',
                            selected: entry['scope'] == 'business',
                            color: const Color(0xFF059669),
                            onTap: () => setState(() => entry['scope'] = 'business'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('Category', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    categoriesAsync.when(
                      data: (cats) {
                        final Set<String> seen = {};
                        final filtered = cats.where((c) {
                          if (c['type'] != (entry['type'] ?? 'expense')) return false;
                          if (isFreeUser && c['is_preset'] != true) return false;
                          if (seen.contains(c['name'])) return false;
                          seen.add(c['name']);
                          return true;
                        }).toList()
                          ..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));

                        return DropdownButtonFormField<String>(
                          initialValue: entry['_category'],
                          isExpanded: true,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                          ),
                          items: filtered.map((c) => DropdownMenuItem<String>(
                            value: c['name'],
                            child: Text(c['name'], style: const TextStyle(fontWeight: FontWeight.w600)),
                          )).toList(),
                          onChanged: (v) {
                            if (v != null) setState(() => entry['_category'] = v);
                          },
                        );
                      },
                      loading: () => const LinearProgressIndicator(),
                      error: (err, stack) => Text('Error loading categories: $err'),
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 24),
            
            LuxuryPrimaryButton(
              onPressed: _submitting || _drafts.isEmpty ? null : _confirm,
              isBusy: _submitting,
              text: 'Confirm & Save ${_drafts.length} Entries',
              backgroundColor: const Color(0xFF10B981),
            ),
          ],
        ],
      ),
    );
  }
}

class _ScopeChoiceButton extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _ScopeChoiceButton({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? color : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? color : const Color(0xFFE2E2E5)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 13,
            color: selected ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}
