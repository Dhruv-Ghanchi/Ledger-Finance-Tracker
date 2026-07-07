// Indian Financial Year helpers (Apr -> Mar)

export function currentFYStart(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  return m >= 4 ? y : y - 1;
}

export function fyLabel(fyStart) {
  const next = String(fyStart + 1).slice(-2);
  return `FY ${fyStart}-${next}`;
}

// Given fyStart, return array of 12 month objects in FY order (Apr..Mar)
export function fyMonths(fyStart) {
  const arr = [];
  for (let i = 0; i < 12; i++) {
    const m = ((3 + i) % 12) + 1;
    const y = i < 9 ? fyStart : fyStart + 1;
    arr.push({ year: y, month: m });
  }
  return arr;
}

// list of recent FYs for selector
export function recentFYs(count = 5) {
  const cur = currentFYStart();
  return Array.from({ length: count }, (_, i) => cur - (count - 1 - i)).sort((a, b) => b - a);
}