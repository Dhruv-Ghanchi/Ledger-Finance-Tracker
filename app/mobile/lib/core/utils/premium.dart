/// Premium-access rules. Mirrors backend `subscriptions/checker.py`
/// and web `lib/premium.js`.
bool hasPremiumAccess(Map<String, dynamic>? user) {
  if (user == null) return false;
  final plan = user['plan'];

  if (plan == 'lifetime' || plan == 'lifetimefree') return true;

  if (plan == 'trial') {
    final end = user['trial_end'];
    if (end != null) {
      final dt = DateTime.tryParse(end.toString());
      if (dt != null && dt.isAfter(DateTime.now())) return true;
    }
  }

  if (user['subscription_status'] == 'active') {
    final exp = user['subscription_expiry'];
    if (exp != null) {
      final dt = DateTime.tryParse(exp.toString());
      if (dt != null && dt.isAfter(DateTime.now())) return true;
    }
  }

  return false;
}

String planLabel(Map<String, dynamic>? user) {
  if (user == null) return 'FREE';
  final plan = user['plan']?.toString() ?? 'free';
  if (plan == 'lifetime' || plan == 'lifetimefree') return 'LIFETIME';
  if (plan == 'trial' && hasPremiumAccess(user)) return 'TRIAL';
  if (plan == 'monthly' || plan == 'yearly') return plan.toUpperCase();
  return 'FREE';
}

/// True for paid or lifetime plans (monthly, yearly, lifetime, lifetimefree).
bool isPaidPlan(Map<String, dynamic>? user) {
  if (user == null) return false;
  const paid = ['monthly', 'yearly', 'lifetime', 'lifetimefree'];
  return paid.contains(user['plan']);
}

/// True when the user has premium access via an active trial (not paid).
bool isTrialActive(Map<String, dynamic>? user) {
  return hasPremiumAccess(user) && !isPaidPlan(user);
}

/// Days left on an active trial (0 if none/expired). Use alongside
/// [isTrialActive] to decide whether this is meaningful to show.
int trialDaysRemaining(Map<String, dynamic>? user) {
  if (user == null) return 0;
  final end = user['trial_end'];
  if (end == null) return 0;
  final dt = DateTime.tryParse(end.toString());
  if (dt == null) return 0;
  final days = dt.difference(DateTime.now()).inDays;
  return days > 0 ? days + 1 : 0;
}

/// The effective expiry date for the user's current access, if any.
String planExpiry(Map<String, dynamic>? user) {
  if (user == null) return 'Never';
  final plan = user['plan'];
  if (plan == 'lifetime' || plan == 'lifetimefree') return 'Lifetime';

  final expiry = user['subscription_expiry'] ?? user['trial_end'];
  if (expiry == null) return 'Never';
  final dt = DateTime.tryParse(expiry.toString());
  if (dt == null) return 'Never';
  return '${dt.day}/${dt.month}/${dt.year}';
}
