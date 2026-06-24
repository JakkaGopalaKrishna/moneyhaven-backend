/**
 * Calculate the current balance.
 * For Phase 4, we only use opening balance since transactions aren't implemented.
 */
const calculateCurrentBalance = (openingBalance, totalIncome = 0, totalExpenses = 0) => {
  return openingBalance + totalIncome - totalExpenses;
};

/**
 * Calculate total savings.
 * Savings = Total Income - Total Expenses
 */
const calculateSavings = (totalIncome = 0, totalExpenses = 0) => {
  return totalIncome - totalExpenses;
};

/**
 * Calculate Financial Health Score.
 * 100 if no transactions. Will be dynamic later.
 */
const calculateFinancialHealth = () => {
  return 100;
};

module.exports = {
  calculateCurrentBalance,
  calculateSavings,
  calculateFinancialHealth,
};
