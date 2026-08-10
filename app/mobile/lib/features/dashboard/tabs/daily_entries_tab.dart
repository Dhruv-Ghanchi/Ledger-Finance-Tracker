import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/data_providers.dart';
import '../../../core/utils/app_fonts.dart';
import '../../../core/widgets/state_views.dart';
import '../../entries/add_entry_sheet.dart';

class DailyEntriesTab extends ConsumerStatefulWidget {
  final int fyStart;
  final String typeFilter; // 'all', 'expense', 'income'
  final String searchQuery;

  const DailyEntriesTab({super.key, required this.fyStart, this.typeFilter = 'all', this.searchQuery = ''});

  @override
  ConsumerState<DailyEntriesTab> createState() => _DailyEntriesTabState();
}

class _DailyEntriesTabState extends ConsumerState<DailyEntriesTab> {
  Future<void> _deleteEntry(int id) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.delete('/entries/$id');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transaction deleted')));
      bumpDataRefresh(ref);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete')));
    }
  }

  void _editEntry(Map<String, dynamic> entry) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AddEntrySheet(editingEntry: entry),
    );
  }

  @override
  Widget build(BuildContext context) {
    final entriesAsync = ref.watch(entriesProvider(widget.fyStart));
    final theme = Theme.of(context);
    final numberFormat = NumberFormat.currency(symbol: '₹', locale: 'en_IN', decimalDigits: 0);

    return entriesAsync.when(
      data: (allEntries) {
        // Apply Filters
        var entries = allEntries;
        if (widget.typeFilter != 'all') {
          entries = entries.where((e) => e['type'] == widget.typeFilter).toList();
        }
        final query = widget.searchQuery.trim().toLowerCase();
        if (query.isNotEmpty) {
          entries = entries.where((e) {
            final category = (e['category'] ?? '').toString().toLowerCase();
            final note = (e['note'] ?? '').toString().toLowerCase();
            return category.contains(query) || note.contains(query);
          }).toList();
        }

        if (entries.isEmpty) {
          return const Padding(
            padding: EdgeInsets.all(32.0),
            child: Center(child: Text('No transactions match the selected filters.')),
          );
        }

        // Group entries chronologically
        final today = DateTime.now();
        final yesterday = today.subtract(const Duration(days: 1));
        
        final List<Map<String, dynamic>> todayEntries = [];
        final List<Map<String, dynamic>> yesterdayEntries = [];
        final List<Map<String, dynamic>> earlierEntries = [];

        for (var e in entries) {
          final date = DateTime.parse(e['date']);
          if (date.year == today.year && date.month == today.month && date.day == today.day) {
            todayEntries.add(e);
          } else if (date.year == yesterday.year && date.month == yesterday.month && date.day == yesterday.day) {
            yesterdayEntries.add(e);
          } else {
            earlierEntries.add(e);
          }
        }

        todayEntries.sort((a, b) => DateTime.parse(b['date']).compareTo(DateTime.parse(a['date'])));
        yesterdayEntries.sort((a, b) => DateTime.parse(b['date']).compareTo(DateTime.parse(a['date'])));
        earlierEntries.sort((a, b) => DateTime.parse(b['date']).compareTo(DateTime.parse(a['date'])));

        return ListView(
          padding: const EdgeInsets.only(bottom: 120, top: 16),
          children: [
            if (todayEntries.isNotEmpty) ...[
              _buildGroupHeader('Today', theme),
              ...todayEntries.map((e) => _buildEntryItem(e, theme, numberFormat)),
            ],
            if (yesterdayEntries.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildGroupHeader('Yesterday', theme),
              ...yesterdayEntries.map((e) => _buildEntryItem(e, theme, numberFormat)),
            ],
            if (earlierEntries.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildGroupHeader('Earlier this month', theme),
              ...earlierEntries.map((e) => _buildEntryItem(e, theme, numberFormat)),
            ],
          ],
        );
      },
      loading: () => const LoadingView(),
      error: (err, stack) => ErrorView(
        message: apiErrorMessage(err),
        onRetry: () => ref.invalidate(entriesProvider),
      ),
    );
  }

  Widget _buildGroupHeader(String title, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Text(
        title,
        style: theme.textTheme.titleSmall?.copyWith(color: const Color(0xFF64646A), fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildEntryItem(Map<String, dynamic> e, ThemeData theme, NumberFormat numberFormat) {
    final isIncome = e['type'] == 'income';
    final isPersonal = e['scope'] == 'personal';

    return Dismissible(
      key: Key(e['id'].toString()),
      background: Container(
        color: Colors.blue,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 20),
        child: const Icon(Icons.edit, color: Colors.white),
      ),
      secondaryBackground: Container(
        color: Colors.red,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          _editEntry(e);
          return false; // Don't dismiss, just trigger edit
        }
        return await showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Delete this transaction?'),
            content: Text('${e['category']} · ₹${e['amount']}'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                child: const Text('Delete'),
              ),
            ],
          ),
        );
      },
      onDismissed: (direction) {
        if (direction == DismissDirection.endToStart) {
          _deleteEntry(e['id']);
        }
      },
      child: InkWell(
        onTap: () => _editEntry(e),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xFFF4F4F5))),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isPersonal ? const Color(0xFF0F52BA).withValues(alpha: 0.1) : const Color(0xFFF59E0B).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isIncome ? Icons.arrow_downward : Icons.arrow_upward,
                  color: isPersonal ? const Color(0xFF0F52BA) : const Color(0xFFF59E0B),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      e['category'],
                      style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (e['note'] != null && e['note'].toString().isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(e['note'], style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFFA1A1AA)), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${isIncome ? '+' : '-'}${numberFormat.format(e['amount'])}',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: isIncome ? Colors.green.shade600 : theme.colorScheme.onSurface,
                      fontWeight: FontWeight.bold,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    DateFormat('dd MMM yyyy').format(DateTime.parse(e['date'])),
                    style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFFA1A1AA)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
