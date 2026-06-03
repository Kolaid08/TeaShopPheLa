import { Router } from 'express';
import authRouter from '../modules/auth/auth.router';
import drinksRouter from '../modules/drinks/drinks.router';
import sizesRouter from '../modules/sizes/sizes.router';
import drinkSizesRouter from '../modules/drinkSizes/drinkSizes.router';
import recipesRouter from '../modules/recipes/recipes.router';
import ingredientsRouter from '../modules/ingredients/ingredients.router';
import unitsRouter from '../modules/units/units.router';
import suppliersRouter from '../modules/suppliers/suppliers.router';
import ingredientReceiptsRouter from '../modules/ingredientReceipts/ingredientReceipts.router';
import customersRouter from '../modules/customers/customers.router';
import ordersRouter from '../modules/orders/orders.router';
import shopTablesRouter from '../modules/shopTables/shopTables.router';
import employeesRouter from '../modules/employees/employees.router';
import rolesRouter from '../modules/roles/roles.router';
import salaryRouter from '../modules/salary/salary.router';
import shiftsRouter from '../modules/shifts/shifts.router';
import shiftLogsRouter from '../modules/shiftLogs/shiftLogs.router';
import dashboardRouter from '../modules/dashboard/dashboard.router';

const router = Router();

// v1 Root healthcheck
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', version: 'v1' });
});

// Mounted REST modules under /api/v1/
router.use('/auth', authRouter);
router.use('/drinks', drinksRouter);
router.use('/sizes', sizesRouter);
router.use('/drink-sizes', drinkSizesRouter);
router.use('/recipes', recipesRouter);
router.use('/ingredients', ingredientsRouter);
router.use('/units', unitsRouter);
router.use('/suppliers', suppliersRouter);
router.use('/ingredient-receipts', ingredientReceiptsRouter);
router.use('/customers', customersRouter);
router.use('/orders', ordersRouter);
router.use('/shop-tables', shopTablesRouter);
router.use('/employees', employeesRouter);
router.use('/roles', rolesRouter);
router.use('/salary', salaryRouter);
router.use('/shifts', shiftsRouter);
router.use('/shift-logs', shiftLogsRouter);
router.use('/dashboard', dashboardRouter);

export default router;
