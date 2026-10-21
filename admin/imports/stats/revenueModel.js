import {
  monthlySeries, yearlyGrowth, rollingTwelve, yearOverYear, forecast, excludedSummary,
} from './revenueSeries';

/**
 * Everything the revenue page shows, from the payments and the memberships
 * they pay for: worked out on the server, so the page gets the figures
 * rather than every payment.
 */
export const revenueModel = (payments, membershipsById, today = new Date()) => {
  const monthly = monthlySeries(payments, membershipsById);
  return {
    today,
    monthly,
    rolling: rollingTwelve(monthly),
    yearly: yearlyGrowth(monthly, today),
    yoy: yearOverYear(monthly, today),
    forecast: forecast({ monthly, today, payments, membershipsById }),
    excluded: excludedSummary(payments, membershipsById),
  };
};
