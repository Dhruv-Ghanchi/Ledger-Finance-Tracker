import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/network/api_client.dart';
import '../../core/widgets/luxury_sheet.dart';
import '../../core/widgets/luxury_controls.dart';
import '../../core/utils/snackbar_utils.dart';

class ExportSheet extends ConsumerStatefulWidget {
  final int fyStart;
  const ExportSheet({super.key, required this.fyStart});

  @override
  ConsumerState<ExportSheet> createState() => _ExportSheetState();
}

class _ExportSheetState extends ConsumerState<ExportSheet> {
  String _format = 'xlsx';
  String _scope = 'all';
  String _datePreset = 'fy';
  String _delivery = 'download';
  String _email = '';
  bool _busy = false;

  final List<Map<String, String>> _presets = [
    {'value': 'fy', 'label': 'Full FY'},
    {'value': 'thisMonth', 'label': 'This Month'},
    {'value': 'lastMonth', 'label': 'Last Month'},
    {'value': 'last7', 'label': 'Last 7 Days'},
    {'value': 'last30', 'label': 'Last 30 Days'},
    {'value': 'thisYear', 'label': 'This Year'},
  ];

  Map<String, String> _getDateRange() {
    final now = DateTime.now();
    switch (_datePreset) {
      case 'thisMonth':
        return {
          'start': DateFormat('yyyy-MM-dd').format(DateTime(now.year, now.month, 1)),
          'end': DateFormat('yyyy-MM-dd').format(DateTime(now.year, now.month + 1, 0)),
        };
      case 'lastMonth':
        final lm = DateTime(now.year, now.month - 1, 1);
        return {
          'start': DateFormat('yyyy-MM-dd').format(lm),
          'end': DateFormat('yyyy-MM-dd').format(DateTime(lm.year, lm.month + 1, 0)),
        };
      case 'last7':
        return {
          'start': DateFormat('yyyy-MM-dd').format(now.subtract(const Duration(days: 6))),
          'end': DateFormat('yyyy-MM-dd').format(now),
        };
      case 'last30':
        return {
          'start': DateFormat('yyyy-MM-dd').format(now.subtract(const Duration(days: 29))),
          'end': DateFormat('yyyy-MM-dd').format(now),
        };
      case 'thisYear':
        return {
          'start': '${now.year}-01-01',
          'end': '${now.year}-12-31',
        };
      case 'fy':
      default:
        return {
          'start': '${widget.fyStart}-04-01',
          'end': '${widget.fyStart + 1}-03-31',
        };
    }
  }

  Map<String, dynamic> _queryParams(Map<String, String> range) {
    final params = <String, dynamic>{
      'start_date': range['start'],
      'end_date': range['end'],
    };
    if (_scope != 'all') params['scope'] = _scope;
    return params;
  }

  Future<void> _handleDownload() async {
    setState(() => _busy = true);
    try {
      final dio = ref.read(apiClientProvider);
      final range = _getDateRange();
      final res = await dio.get(
        '/export/$_format',
        queryParameters: _queryParams(range),
        options: Options(responseType: ResponseType.bytes),
      );

      final bytes = res.data as List<int>;
      final dir = await getTemporaryDirectory();
      final scopeLabel = _scope != 'all' ? '_$_scope' : '';
      final dateLabel = '${range['start']}_to_${range['end']}';
      final file = File('${dir.path}/finance_export${scopeLabel}_$dateLabel.$_format');
      await file.writeAsBytes(bytes, flush: true);

      if (!mounted) return;
      await SharePlus.instance.share(ShareParams(
        files: [XFile(file.path, mimeType: _format == 'pdf' ? 'application/pdf' : 'application/octet-stream')],
        subject: 'Ledger Finance Export',
      ));
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Export failed');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _handleEmail() async {
    if (_email.trim().isEmpty || !_email.contains('@')) {
      showInfoSnackbar(context, 'Enter a valid email address');
      return;
    }

    setState(() => _busy = true);
    try {
      final dio = ref.read(apiClientProvider);
      final range = _getDateRange();
      final params = _queryParams(range);
      params['email'] = _email.trim();

      await dio.get('/export/email/$_format', queryParameters: params);

      if (mounted) {
        showSuccessSnackbar(context, 'Report emailed to ${_email.trim()}');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Export failed');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return LuxuryBottomSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LuxurySheetHeader(
            title: 'Export Data',
            subtitle: 'Generate and download financial reports.',
          ),
          const SizedBox(height: 24),

          const Text('Format', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          LuxurySegmentedToggle<String>(
            value: _format,
            items: [
              LuxurySegmentItem(value: 'xlsx', label: 'Excel', selectedColor: const Color(0xFF121316)),
              LuxurySegmentItem(value: 'csv', label: 'CSV', selectedColor: const Color(0xFF121316)),
              LuxurySegmentItem(value: 'pdf', label: 'PDF', selectedColor: const Color(0xFF121316)),
            ],
            onChanged: (val) => setState(() => _format = val),
          ),
          const SizedBox(height: 24),

          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Workspace', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          backgroundColor: Colors.transparent,
                          builder: (ctx) => LuxuryBottomSheet(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const LuxurySheetHeader(title: 'Workspace', subtitle: 'Select scope for export'),
                                const SizedBox(height: 16),
                                ...[
                                  {'val': 'all', 'label': 'All'},
                                  {'val': 'personal', 'label': 'Personal'},
                                  {'val': 'business', 'label': 'Business'}
                                ].map((item) => InkWell(
                                  onTap: () {
                                    setState(() => _scope = item['val']!);
                                    Navigator.pop(ctx);
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE2E2E5)))),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(item['label']!, style: TextStyle(fontWeight: _scope == item['val'] ? FontWeight.bold : FontWeight.w500, color: _scope == item['val'] ? const Color(0xFF121316) : const Color(0xFF64646A))),
                                        if (_scope == item['val']) const Icon(Icons.check, size: 20, color: Color(0xFF121316)),
                                      ],
                                    ),
                                  ),
                                )),
                              ],
                            ),
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E2E5)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(_scope == 'all' ? 'All' : _scope == 'personal' ? 'Personal' : 'Business', style: const TextStyle(fontSize: 14)),
                            const Icon(Icons.arrow_drop_down, color: Color(0xFF64646A)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Date Range', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          backgroundColor: Colors.transparent,
                          builder: (ctx) => LuxuryBottomSheet(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const LuxurySheetHeader(title: 'Date Range', subtitle: 'Select time period'),
                                const SizedBox(height: 16),
                                ..._presets.map((p) => InkWell(
                                  onTap: () {
                                    setState(() => _datePreset = p['value']!);
                                    Navigator.pop(ctx);
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE2E2E5)))),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(p['label']!, style: TextStyle(fontWeight: _datePreset == p['value'] ? FontWeight.bold : FontWeight.w500, color: _datePreset == p['value'] ? const Color(0xFF121316) : const Color(0xFF64646A))),
                                        if (_datePreset == p['value']) const Icon(Icons.check, size: 20, color: Color(0xFF121316)),
                                      ],
                                    ),
                                  ),
                                )),
                              ],
                            ),
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E2E5)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(child: Text(_presets.firstWhere((p) => p['value'] == _datePreset)['label']!, style: const TextStyle(fontSize: 14), overflow: TextOverflow.ellipsis)),
                            const Icon(Icons.arrow_drop_down, color: Color(0xFF64646A)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          const Text('Delivery Method', style: TextStyle(fontSize: 12, color: Color(0xFF64646A), fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          LuxurySegmentedToggle<String>(
            value: _delivery,
            items: [
              LuxurySegmentItem(value: 'download', label: 'Download/Share', selectedColor: const Color(0xFF121316)),
              LuxurySegmentItem(value: 'email', label: 'Email', selectedColor: const Color(0xFF121316)),
            ],
            onChanged: (val) => setState(() => _delivery = val),
          ),
          const SizedBox(height: 16),

          if (_delivery == 'email') ...[
            TextField(
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                hintText: 'Email address',
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
              ),
              onChanged: (v) => _email = v,
            ),
            const SizedBox(height: 24),
          ],

          LuxuryPrimaryButton(
            onPressed: _delivery == 'email' ? _handleEmail : _handleDownload,
            isBusy: _busy,
            text: _delivery == 'email' ? 'Send Email Report' : 'Generate & Download',
          ),
        ],
      ),
    );
  }
}
