-- Roles, HR (employees, attendance, piecework, payroll) and expenses.

-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('MONTHLY', 'DAILY', 'PIECE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'FIRED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'SICK', 'VACATION', 'DAY_OFF');

-- CreateEnum
CREATE TYPE "PayAdjustmentType" AS ENUM ('BONUS', 'PENALTY', 'ADVANCE');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "department" TEXT,
    "payType" "PayType" NOT NULL DEFAULT 'MONTHLY',
    "baseSalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dailyRate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "hireDate" DATE NOT NULL,
    "fireDate" DATE,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "checkIn" TEXT,
    "checkOut" TEXT,
    "note" TEXT,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piece_rates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'dona',
    "price" DECIMAL(14,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piece_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piece_works" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "pieceRateId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "piece_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_adjustments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "type" "PayAdjustmentType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pay_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "workingDays" INTEGER NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payType" "PayType" NOT NULL,
    "workedDays" DECIMAL(5,1) NOT NULL,
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "pieceAmount" DECIMAL(14,2) NOT NULL,
    "bonus" DECIMAL(14,2) NOT NULL,
    "penalty" DECIMAL(14,2) NOT NULL,
    "advance" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "paymentMethod" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE INDEX "employees_department_idx" ON "employees"("department");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employeeId_date_key" ON "attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "piece_works_employeeId_date_idx" ON "piece_works"("employeeId", "date");

-- CreateIndex
CREATE INDEX "piece_works_date_idx" ON "piece_works"("date");

-- CreateIndex
CREATE INDEX "pay_adjustments_month_idx" ON "pay_adjustments"("month");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_month_key" ON "payrolls"("month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_items_payrollId_employeeId_key" ON "payroll_items"("payrollId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_works" ADD CONSTRAINT "piece_works_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_works" ADD CONSTRAINT "piece_works_pieceRateId_fkey" FOREIGN KEY ("pieceRateId") REFERENCES "piece_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_adjustments" ADD CONSTRAINT "pay_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Roles ───────────────────────────────────────────────────────────────────
INSERT INTO "roles" ("id", "name", "displayName", "description", "createdAt", "updatedAt") VALUES
  ('role_foreman',    'FOREMAN',    'Ish boshqaruvchi',   'Xodimlar, davomat, ishbay ishlar', NOW(), NOW()),
  ('role_accountant', 'ACCOUNTANT', 'Buxgalter',          'Oylik, xarajatlar, savdo va qarzlar', NOW(), NOW()),
  ('role_warehouse',  'WAREHOUSE',  'Ombor nazoratchisi', 'Ombor: kirim, chiqim, qoldiq', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- ── Default expense categories ──────────────────────────────────────────────
INSERT INTO "expense_categories" ("id", "name", "color") VALUES
  ('expcat_utilities', 'Kommunal (svet, gaz, suv)', '#f59e0b'),
  ('expcat_rent',      'Ijara',                     '#8b5cf6'),
  ('expcat_transport', 'Transport va yoqilg''i',    '#06b6d4'),
  ('expcat_repair',    'Ta''mirlash va ehtiyot qism', '#ef4444'),
  ('expcat_tax',       'Soliqlar',                  '#64748b'),
  ('expcat_office',    'Ofis va xo''jalik',         '#10b981'),
  ('expcat_other',     'Boshqa',                    '#94a3b8')
ON CONFLICT ("name") DO NOTHING;
