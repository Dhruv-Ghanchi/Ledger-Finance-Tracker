import 'package:intl/intl.dart';

/// Indian INR formatting with compact (L/Cr) support, mirroring the web app.
///
/// Non-compact values drop trailing zeros (`₹1,23,456` not `₹1,23,456.00`),
/// matching `formatINR` in the web frontend (min 0 / max 2 fraction digits).
String formatINR(num? value, {bool compact = false, bool sign = false, int decimals = 2}) {
  final rupees = (value ?? 0).toDouble();
  final abs = rupees.abs();
  final prefix = sign && rupees > 0 ? '+' : rupees < 0 ? '-' : '';

  if (compact) {
    if (abs >= 10000000) {
      return '$prefix₹${(abs / 10000000).toStringAsFixed(2)} Cr';
    }
    if (abs >= 100000) {
      return '$prefix₹${(abs / 100000).toStringAsFixed(2)} L';
    }
    if (abs >= 1000) {
      return '$prefix₹${(abs / 1000).toStringAsFixed(1)}K';
    }
  }

  final pattern = decimals == 0
      ? '#,##,##0'
      : decimals == 1
          ? '#,##,##0.0'
          : '#,##,##0.##';
  final nf = NumberFormat(pattern, 'en_IN');
  return '$prefix₹${nf.format(abs)}';
}

String shortDate(String iso) {
  try {
    return DateFormat('dd MMM yyyy').format(DateTime.parse(iso));
  } catch (_) {
    return iso;
  }
}
