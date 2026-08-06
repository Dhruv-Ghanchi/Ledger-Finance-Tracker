// Single source of truth for premium access on the frontend.
// Mirrors backend/app/subscriptions/checker.py::has_premium_access.
export function hasPremiumAccess(dbUser) {
  if (!dbUser) return false;

  const plan = dbUser.plan;
  // Lifetime plans never expire.
  if (plan === "lifetime" || plan === "lifetimefree") return true;

  // Active trial grants full premium access until trial_end.
  if (plan === "trial" && dbUser.trial_end) {
    return new Date(dbUser.trial_end).getTime() > Date.now();
  }

  // Paid subscription.
  if (dbUser.subscription_status === "active" && dbUser.subscription_expiry) {
    return new Date(dbUser.subscription_expiry).getTime() > Date.now();
  }

  return false;
}

export function isPaidPlan(dbUser) {
  if (!dbUser) return false;
  return ["monthly", "yearly", "lifetime", "lifetimefree"].includes(dbUser.plan);
}

export function isTrialActive(dbUser) {
  return hasPremiumAccess(dbUser) && !isPaidPlan(dbUser);
}
