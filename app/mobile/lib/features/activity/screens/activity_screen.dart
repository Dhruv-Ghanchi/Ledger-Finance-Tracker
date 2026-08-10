import 'package:flutter/material.dart';
import '../../dashboard/tabs/daily_entries_tab.dart';
import '../../dashboard/tabs/debts_tab.dart';
import '../../../core/utils/fy.dart';
import '../../../core/widgets/luxury_sheet.dart';

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  String _typeFilter = 'all';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text(
            'Activity',
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(130),
            child: Column(
              children: [
                // Search & Filter Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: theme.cardColor,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: const Color(0xFFE2E2E5)),
                          ),
                          child: TextField(
                            controller: _searchController,
                            onChanged: (value) => setState(() => _searchQuery = value),
                            decoration: InputDecoration(
                              hintText: 'Search category or note...',
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF64646A)),
                              suffixIcon: _searchQuery.isEmpty
                                  ? null
                                  : IconButton(
                                      icon: const Icon(Icons.close, size: 18, color: Color(0xFF64646A)),
                                      onPressed: () {
                                        _searchController.clear();
                                        setState(() => _searchQuery = '');
                                      },
                                    ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Material(
                        color: theme.cardColor,
                        shape: const CircleBorder(side: BorderSide(color: Color(0xFFE2E2E5))),
                        child: InkWell(
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              backgroundColor: Colors.transparent,
                              builder: (context) => StatefulBuilder(
                                builder: (context, setStateSheet) => LuxuryBottomSheet(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      const LuxurySheetHeader(
                                        title: 'Filters',
                                        subtitle: 'Filter your transactions.',
                                      ),
                                      const SizedBox(height: 24),
                                      const Text('Transaction Type', style: TextStyle(fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 12),
                                      Wrap(
                                        spacing: 8,
                                        children: ['all', 'expense', 'income'].map((type) {
                                          final isSelected = _typeFilter == type;
                                          return ChoiceChip(
                                            label: Text(type.toUpperCase(), style: TextStyle(color: isSelected ? Colors.white : Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
                                            selected: isSelected,
                                            onSelected: (selected) {
                                              if (selected) {
                                                setStateSheet(() => _typeFilter = type);
                                                setState(() {});
                                              }
                                            },
                                            selectedColor: const Color(0xFF121316),
                                            backgroundColor: const Color(0xFFF4F4F5),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                                            showCheckmark: false,
                                          );
                                        }).toList(),
                                      ),
                                      const SizedBox(height: 16),
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton(
                                          onPressed: () => Navigator.pop(context),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF121316),
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(vertical: 16),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                          ),
                                          child: const Text('Apply Filters', style: TextStyle(fontWeight: FontWeight.bold)),
                                        ),
                                      )
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                          customBorder: const CircleBorder(),
                          child: const Padding(
                            padding: EdgeInsets.all(12),
                            child: Icon(Icons.tune, size: 20, color: Color(0xFF64646A)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Sliding Sub-Tabs
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF4F4F5),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: TabBar(
                      padding: const EdgeInsets.all(4),
                      indicatorSize: TabBarIndicatorSize.tab,
                      indicator: BoxDecoration(
                        color: const Color(0xFFFFFFFF),
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: const [BoxShadow(color: Color(0x0C000000), blurRadius: 8, offset: Offset(0, 2))],
                      ),
                      labelColor: const Color(0xFF18181B),
                      unselectedLabelColor: const Color(0xFF64646A),
                      splashFactory: NoSplash.splashFactory,
                      dividerColor: Colors.transparent,
                      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
                      tabs: const [
                        Tab(text: 'Transactions'),
                        Tab(text: 'IOUs & Debts'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        body: TabBarView(
          children: [
            DailyEntriesTab(fyStart: currentFYStart(), typeFilter: _typeFilter, searchQuery: _searchQuery),
            const DebtsTab(),
          ],
        ),
      ),
    );
  }
}


