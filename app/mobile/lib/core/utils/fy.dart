import 'package:intl/intl.dart';

/// Indian Financial Year helpers (Apr -> Mar).
const List<String> monthLabelsShort = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const List<String> monthLabelsLong = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

int currentFYStart([DateTime? date]) {
  final d = date ?? DateTime.now();
  return d.month >= 4 ? d.year : d.year - 1;
}

String fyLabel(int fyStart) {
  final next = (fyStart + 1).toString().padLeft(4, '0').substring(2);
  return 'FY $fyStart-$next';
}

/// Given [fyStart], return 12 (year, month) pairs in FY order (Apr..Mar).
List<({int year, int month})> fyMonths(int fyStart) {
  final months = <({int year, int month})>[];
  for (var i = 0; i < 12; i++) {
    final m = ((3 + i) % 12) + 1;
    final y = i < 9 ? fyStart : fyStart + 1;
    months.add((year: y, month: m));
  }
  return months;
}

/// A recent list of FY start years, newest first.
List<int> recentFYs([int count = 5]) {
  final cur = currentFYStart();
  return List.generate(count, (i) => cur - (count - 1 - i)).reversed.toList();
}

String monthYearLabel(int year, int month) =>
    '${monthLabelsLong[month - 1]} $year';

String shortDate(String iso) {
  try {
    final d = DateTime.parse(iso);
    return DateFormat('dd MMM yyyy').format(d);
  } catch (_) {
    return iso;
  }
}
