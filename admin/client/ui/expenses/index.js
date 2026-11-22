import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const expenseListPages = () => import('/imports/ui/expenses/ExpenseListPages');
const expenseViewPage = () => import('/imports/ui/expenses/ExpenseViewPage');
const expenseAccountPages = () => import('/imports/ui/expenses/ExpenseAccountPages');

reactRoute('/expenses', 'expenses', lazyPage(expenseListPages, 'ExpensesPage'));
reactRoute('/expenses/confirm', 'expensesConfirm', lazyPage(expenseListPages, 'ConfirmQueuePage'));
reactRoute('/expenses/reimburse', 'expensesReimburse', lazyPage(expenseListPages, 'ReimburseQueuePage'));
reactRoute('/expense/:_id', 'expenseview', lazyPage(expenseViewPage, 'ExpenseViewPage'));
reactRoute('/expenses/accounts', 'expenseaccounts', lazyPage(expenseAccountPages, 'ExpenseAccountListPage'));
reactRoute('/expenses/accounts/add', 'addexpenseaccount', lazyPage(expenseAccountPages, 'ExpenseAccountEditPage'));
reactRoute('/expenseaccount/:_id', 'expenseaccountview', lazyPage(expenseAccountPages, 'ExpenseAccountEditPage'));
