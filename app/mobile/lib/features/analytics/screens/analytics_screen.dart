import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/providers/workspace_provider.dart';
import '../../../core/providers/data_providers.dart';
import '../../../core/utils/fy.dart';
import '../../../core/widgets/state_views.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen> {
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  final nf = NumberFormat.currency(symbol: '₹', decimalDigits: 0, locale: 'en_IN');

  @override
  Widget build(BuildContext context) {
    final workspace = ref.watch(workspaceProvider);
    final isPersonal = workspace == WorkspaceScope.personal;
    final accentColor = isPersonal ? const Color(0xFF0F52BA) : const Color(0xFFF59E0B);
    final theme = Theme.of(context);
    final fyStart = currentFYStart(); // Currently hardcoded to active FY for simplicity

    final monthlyAsync = ref.watch(monthlySummaryProvider((year: _selectedYear, month: _selectedMonth)));
    final yearlyAsync = ref.watch(yearlySummaryProvider(fyStart));
    final debtsAsync = ref.watch(debtsProvider);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Analytics',
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
        actions: [
          // Month Selector
          InkWell(
            onTap: () {
              showModalBottomSheet(
                context: context,
                backgroundColor: Colors.transparent,
                builder: (context) => Container(
                  height: 350,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: Column(
                    children: [
                      const SizedBox(height: 16),
                      Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFE2E2E5), borderRadius: BorderRadius.circular(2))),
                      const SizedBox(height: 24),
                      const Text('Select Month', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      Expanded(
                        child: GridView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 2.5,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: 12,
                          itemBuilder: (context, index) {
                            final monthNum = index + 1;
                            final isSelected = monthNum == _selectedMonth;
                            return InkWell(
                              onTap: () {
                                setState(() => _selectedMonth = monthNum);
                                Navigator.pop(context);
                              },
                              child: Container(
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: isSelected ? const Color(0xFF121316) : const Color(0xFFF4F4F5),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  DateFormat('MMM').format(DateTime(2024, monthNum)),
                                  style: TextStyle(
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                    color: isSelected ? Colors.white : const Color(0xFF18181B),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
              child: Row(
                children: [
                  Text(
                    DateFormat('MMM').format(DateTime(2024, _selectedMonth)),
                    style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const Icon(Icons.arrow_drop_down, color: Color(0xFF64646A)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: monthlyAsync.when(
        loading: () => const LoadingView(),
        error: (err, stack) => ErrorView(
          message: 'Unable to connect to the backend. Please check your internet connection.',
          onRetry: () => ref.invalidate(monthlySummaryProvider),
        ),
        data: (monthly) {
          return yearlyAsync.when(
            loading: () => const LoadingView(),
            error: (err, stack) => ErrorView(
              message: 'Failed to load yearly trends.',
              onRetry: () => ref.invalidate(yearlySummaryProvider),
            ),
            data: (yearly) {
              return debtsAsync.when(
                loading: () => const LoadingView(),
                error: (err, stack) => ErrorView(
                  message: 'Failed to load debts.',
                  onRetry: () => ref.invalidate(debtsProvider),
                ),
                data: (debtsList) {
                  return _buildDashboard(context, monthly, yearly, debtsList, accentColor, isPersonal);
                },
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, Map<String, dynamic> monthly, Map<String, dynamic> yearly, List<dynamic> debtsList, Color accentColor, bool isPersonal) {
    // 1. Compute KPIs
    final totals = monthly['totals'] ?? {'income': 0, 'expense': 0, 'net': 0};
    final personal = monthly['personal'] ?? {'income': 0, 'expense': 0, 'net': 0};
    final business = monthly['business'] ?? {'income': 0, 'expense': 0, 'net': 0};

    final yearlyTotals = yearly['totals'] ?? {'total_income': 0, 'total_expense': 0, 'total_net': 0, 'personal_net': 0, 'business_net': 0};

    final pendingDebts = debtsList.where((d) => d['status'] == 'pending').toList();
    final totalToPay = pendingDebts.where((d) => d['type'] == 'to_pay').fold(0.0, (sum, item) => sum + (item['amount'] ?? 0.0));
    final totalToCollect = pendingDebts.where((d) => d['type'] == 'to_collect').fold(0.0, (sum, item) => sum + (item['amount'] ?? 0.0));

    // 2. Compute Bar Data (Monthly Income vs Expense)
    final rows = (yearly['rows'] as List<dynamic>?) ?? [];
    List<BarChartGroupData> barGroups = [];
    double maxBarValue = 0;
    
    for (int i = 0; i < rows.length; i++) {
      final r = rows[i];
      final inc = (r['total_income'] ?? 0).toDouble();
      final exp = (r['total_expense'] ?? 0).toDouble();
      if (inc > maxBarValue) maxBarValue = inc;
      if (exp > maxBarValue) maxBarValue = exp;
      
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(toY: inc, color: const Color(0xFF059669), width: 8, borderRadius: const BorderRadius.only(topLeft: Radius.circular(2), topRight: Radius.circular(2))),
            BarChartRodData(toY: exp, color: const Color(0xFFEF4444), width: 8, borderRadius: const BorderRadius.only(topLeft: Radius.circular(2), topRight: Radius.circular(2))),
          ],
        ),
      );
    }

    // 3. Compute Pie Data
    Map<String, double> catMap = {};
    void pushCat(Map<String, dynamic>? obj) {
      if (obj == null) return;
      obj.forEach((k, v) {
        final exp = (v['expense'] ?? 0).toDouble();
        if (exp > 0) catMap[k] = (catMap[k] ?? 0) + exp;
      });
    }
    pushCat(monthly['personal']?['by_category']);
    pushCat(monthly['business']?['by_category']);
    
    final sortedCats = catMap.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final topCats = sortedCats.take(8).toList();
    final pieColors = [const Color(0xFF0F52BA), const Color(0xFF059669), const Color(0xFFF59E0B), const Color(0xFFDC2626), const Color(0xFF7C3AED), const Color(0xFF0891B2), const Color(0xFFDB2777), const Color(0xFF65A30D)];
    
    List<PieChartSectionData> pieSections = [];
    for (int i = 0; i < topCats.length; i++) {
      pieSections.add(PieChartSectionData(
        color: pieColors[i % pieColors.length],
        value: topCats[i].value,
        title: '',
        radius: 35,
      ));
    }

    // 4. Compute Line Data (Net Trend)
    List<FlSpot> lineSpots = [];
    double minNet = 0;
    double maxNet = 0;
    for (int i = 0; i < rows.length; i++) {
      final net = (rows[i]['total_net'] ?? 0).toDouble();
      if (net < minNet) minNet = net;
      if (net > maxNet) maxNet = net;
      lineSpots.add(FlSpot(i.toDouble(), net));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 120),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // KPI Carousel
          SizedBox(
            height: 110,
            child: ListView(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              children: [
                _buildKpiCard('Total Income', totals['income'], 'Monthly', context),
                _buildKpiCard('Total Expense', totals['expense'], 'Monthly', context),
                _buildKpiCard('Net · Personal', personal['net'], 'FY: ${nf.format(yearlyTotals['personal_net'])}', context, tone: const Color(0xFF0F52BA)),
                _buildKpiCard('Net · Business', business['net'], 'FY: ${nf.format(yearlyTotals['business_net'])}', context, tone: const Color(0xFFF59E0B)),
                _buildKpiCard('To Collect', totalToCollect, 'Pending IOUs', context, tone: const Color(0xFF0F52BA)),
                _buildKpiCard('To Pay', totalToPay, 'Pending IOUs', context, tone: const Color(0xFFF59E0B)),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Bar Chart: Income vs Expense
          _buildChartContainer(
            title: 'Monthly Income vs Expense',
            subtitle: 'FY ${fyLabel(currentFYStart())}',
            height: 250,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: maxBarValue * 1.2,
                barTouchData: BarTouchData(enabled: false),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        if (value < 0 || value >= rows.length) return const SizedBox();
                        final m = rows[value.toInt()]['month'] as int;
                        final date = DateTime(2024, m);
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(DateFormat('MMM').format(date), style: const TextStyle(fontSize: 10, color: Color(0xFF71717A))),
                        );
                      },
                      reservedSize: 28,
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      getTitlesWidget: (value, meta) {
                        if (value == 0) return const SizedBox();
                        String t = value >= 100000 ? '${(value/100000).toStringAsFixed(0)}L' : value >= 1000 ? '${(value/1000).toStringAsFixed(0)}k' : value.toStringAsFixed(0);
                        return Text(t, style: const TextStyle(fontSize: 10, color: Color(0xFF71717A)));
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxBarValue / 4 > 0 ? maxBarValue / 4 : 1,
                  getDrawingHorizontalLine: (value) => const FlLine(color: Color(0xFFE4E4E7), strokeWidth: 1, dashArray: [4, 4]),
                ),
                borderData: FlBorderData(show: false),
                barGroups: barGroups,
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Pie Chart: Categories
          _buildChartContainer(
            title: 'Expense by Category',
            subtitle: '${DateFormat('MMMM').format(DateTime(2024, _selectedMonth))} $_selectedYear',
            height: topCats.isEmpty ? 100 : 350,
            child: topCats.isEmpty
                ? const Center(child: Text('No expenses this month', style: TextStyle(color: Colors.grey, fontSize: 13)))
                : Column(
                    children: [
                      SizedBox(
                        height: 180,
                        child: PieChart(
                          PieChartData(
                            sectionsSpace: 2,
                            centerSpaceRadius: 50,
                            sections: pieSections,
                            pieTouchData: PieTouchData(enabled: false),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      ...List.generate(topCats.length, (i) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: Row(
                            children: [
                              Container(width: 8, height: 8, decoration: BoxDecoration(color: pieColors[i % pieColors.length], borderRadius: BorderRadius.circular(2))),
                              const SizedBox(width: 8),
                              Expanded(child: Text(topCats[i].key, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
                              Text(nf.format(topCats[i].value), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()])),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
          ),
          const SizedBox(height: 24),

          // Spline Line Chart: Net Trend
          _buildChartContainer(
            title: 'Net Trend',
            subtitle: 'FY ${fyLabel(currentFYStart())}',
            height: 220,
            child: LineChart(
              LineChartData(
                lineTouchData: LineTouchData(enabled: false),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: ((maxNet - minNet) / 4) > 0 ? ((maxNet - minNet) / 4) : 1,
                  getDrawingHorizontalLine: (value) => const FlLine(color: Color(0xFFE4E4E7), strokeWidth: 1, dashArray: [4, 4]),
                ),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        if (value < 0 || value >= rows.length) return const SizedBox();
                        final m = rows[value.toInt()]['month'] as int;
                        final date = DateTime(2024, m);
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(DateFormat('MMM').format(date), style: const TextStyle(fontSize: 10, color: Color(0xFF71717A))),
                        );
                      },
                      reservedSize: 28,
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      getTitlesWidget: (value, meta) {
                        if (value == 0) return const SizedBox();
                        String t = value.abs() >= 100000 ? '${(value/100000).toStringAsFixed(0)}L' : value.abs() >= 1000 ? '${(value/1000).toStringAsFixed(0)}k' : value.toStringAsFixed(0);
                        if (value < 0) t = '-$t';
                        return Text(t, style: const TextStyle(fontSize: 10, color: Color(0xFF71717A)));
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: rows.isNotEmpty ? (rows.length - 1).toDouble() : 0,
                minY: minNet < 0 ? minNet * 1.2 : 0,
                maxY: maxNet > 0 ? maxNet * 1.2 : 0,
                lineBarsData: [
                  LineChartBarData(
                    spots: lineSpots,
                    isCurved: true,
                    color: const Color(0xFF09090B),
                    barWidth: 2,
                    isStrokeCapRound: true,
                    dotData: FlDotData(show: true, getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(radius: 3, color: const Color(0xFF09090B), strokeWidth: 0)),
                    belowBarData: BarAreaData(
                      show: true,
                      color: accentColor.withValues(alpha: 0.1),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String label, dynamic value, String sub, BuildContext context, {Color? tone}) {
    final valNum = (value is num) ? value : double.tryParse(value?.toString() ?? '0') ?? 0;
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E2E5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF71717A), letterSpacing: 0.5)),
          const Spacer(),
          Text(
            nf.format(valNum),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: tone ?? Theme.of(context).textTheme.bodyLarge?.color,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 4),
          Text(sub, style: const TextStyle(fontSize: 10, color: Color(0xFFA1A1AA), fontFamily: 'JetBrains Mono')),
        ],
      ),
    );
  }

  Widget _buildChartContainer({required String title, required String subtitle, required double height, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E2E5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF71717A), letterSpacing: 0.5)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 24),
          SizedBox(height: height, child: child),
        ],
      ),
    );
  }
}
