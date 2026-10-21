import { reactRoute } from '../../react/reactRoute';
import { ExpensesPage, ConfirmQueuePage, ReimburseQueuePage } from '/imports/ui/expenses/ExpenseListPages';
import { ExpenseViewPage } from '/imports/ui/expenses/ExpenseViewPage';
import { ExpenseAccountListPage, ExpenseAccountEditPage } from '/imports/ui/expenses/ExpenseAccountPages';

reactRoute('/expenses', 'expenses', ExpensesPage);
reactRoute('/expenses/confirm', 'expensesConfirm', ConfirmQueuePage);
reactRoute('/expenses/reimburse', 'expensesReimburse', ReimburseQueuePage);
reactRoute('/expense/:_id', 'expenseview', ExpenseViewPage);
reactRoute('/expenses/accounts', 'expenseaccounts', ExpenseAccountListPage);
reactRoute('/expenses/accounts/add', 'addexpenseaccount', ExpenseAccountEditPage);
reactRoute('/expenseaccount/:_id', 'expenseaccountview', ExpenseAccountEditPage);
