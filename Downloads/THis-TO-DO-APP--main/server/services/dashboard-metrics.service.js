let dashboardStatsMismatchTotal = 0;

export const incrementDashboardStatsMismatch = () => {
  dashboardStatsMismatchTotal += 1;
  return dashboardStatsMismatchTotal;
};

export const getDashboardMetricsSnapshot = () => ({
  dashboardStatsMismatchTotal,
});
