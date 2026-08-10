import 'package:flutter_test/flutter_test.dart';
import 'package:ledger_mobile/core/utils/formatters.dart';
import 'package:ledger_mobile/core/utils/fy.dart';
import 'package:ledger_mobile/core/utils/premium.dart';

void main() {
  group('formatINR', () {
    test('formats Indian style with lakh grouping', () {
      expect(formatINR(1234567), '₹12,34,567');
      expect(formatINR(1234.5), '₹1,234.5');
      expect(formatINR(0), '₹0');
      expect(formatINR(-5000), '-₹5,000');
    });

    test('compact mode uses K / L / Cr', () {
      expect(formatINR(5000, compact: true), '₹5.0K');
      expect(formatINR(123456, compact: true), '₹1.23 L');
      expect(formatINR(12345678, compact: true), '₹1.23 Cr');
    });

    test('sign prefix only on positive values', () {
      expect(formatINR(100, sign: true), '+₹100');
      expect(formatINR(-100, sign: true), '-₹100');
      expect(formatINR(0, sign: true), '₹0');
    });
  });

  group('financial year helpers', () {
    test('currentFYStart uses April as the boundary', () {
      expect(currentFYStart(DateTime(2026, 3, 31)), 2025);
      expect(currentFYStart(DateTime(2026, 4, 1)), 2026);
      expect(currentFYStart(DateTime(2026, 12, 1)), 2026);
    });

    test('fyLabel is two-digit suffix', () {
      expect(fyLabel(2025), 'FY 2025-26');
    });

    test('fyMonths returns Apr..Mar in order', () {
      final months = fyMonths(2025);
      expect(months.length, 12);
      expect(months.first.month, 4);
      expect(months.first.year, 2025);
      expect(months.last.month, 3);
      expect(months.last.year, 2026);
    });

    test('recentFYs returns newest first', () {
      final fys = recentFYs(3);
      expect(fys.length, 3);
      expect(fys[0] > fys[1], true);
      expect(fys[1] > fys[2], true);
    });
  });

  group('premium helpers', () {
    test('lifetime plans never expire', () {
      expect(hasPremiumAccess({'plan': 'lifetime'}), true);
      expect(hasPremiumAccess({'plan': 'lifetimefree'}), true);
    });

    test('active trial grants access until trial_end', () {
      final future = DateTime.now().add(const Duration(days: 10)).toIso8601String();
      expect(hasPremiumAccess({'plan': 'trial', 'trial_end': future}), true);
      final past = DateTime.now().subtract(const Duration(days: 10)).toIso8601String();
      expect(hasPremiumAccess({'plan': 'trial', 'trial_end': past}), false);
    });

    test('free and null users have no access', () {
      expect(hasPremiumAccess(null), false);
      expect(hasPremiumAccess({'plan': 'free'}), false);
    });

    test('paid plan detection', () {
      expect(isPaidPlan({'plan': 'yearly'}), true);
      expect(isPaidPlan({'plan': 'lifetimefree'}), true);
      expect(isPaidPlan({'plan': 'trial'}), false);
    });
  });
}
