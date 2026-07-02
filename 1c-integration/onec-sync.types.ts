// 1C → Selxozmash CRM sync types
// Used by src/lib/integrations/onec/

export type InvoiceStatus = "PENDING" | "PARTIAL" | "OVERDUE" | "PAID";
export type RiskScore     = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ContractStatus = "active" | "expired";

export interface OneCClient {
  id:           string;       // GUID from 1C (used as externalId in Prisma)
  company_name: string;
  short_name:   string;
  inn:          string;
  kpp:          string | null;
  phone:        string | null;
  address:      string | null;
  created_at:   string;       // ISO 8601
  updated_at:   string;
}

export interface OneCContract {
  contract_id:        string;
  client_id:          string;
  contract_number:    string;
  contract_type:      string;
  start_date:         string;
  end_date:           string | null;
  currency:           string;
  status:             ContractStatus;
}

export interface OneCInvoice {
  invoice_id:        string;
  invoice_number:    string;
  client_id:         string;
  contract_id:       string | null;
  amount:            number;
  vat_amount:        number;
  paid_amount:       number;  // always 0 from 1C — use debt_summary for true balance
  remaining_balance: number;
  issue_date:        string;
  due_date:          string | null;
  overdue_days:      number;
  status:            InvoiceStatus;
}

export interface OneCPayment {
  payment_id:     string;
  client_id:      string;
  contract_id:    string | null;
  amount:         number;
  payment_date:   string;
  bank_reference: string | null;
  purpose:        string | null;
}

export interface OneCDebt {
  client_id:            string;
  client_name:          string;
  inn:                  string;
  total_invoice_amount: number;
  total_paid_amount:    number;
  total_remaining_debt: number;
  overdue_debt:         number;
  overdue_days:         number;
  oldest_due_date:      string | null;
  risk_score:           RiskScore;
}

export interface OneCFinancialSummary {
  client: {
    id:    string;
    name:  string;
    inn:   string;
    phone: string | null;
  };
  contracts:    OneCContract[];
  invoices:     OneCInvoice[];
  payments:     OneCPayment[];
  debt_summary: {
    total_invoiced: number;
    total_paid:     number;
    total_debt:     number;
    overdue_amount: number;
    overdue_days:   number;
  };
  risk_score: RiskScore;
}

// API envelope shapes
export interface OneCListResponse<T> {
  success:    boolean;
  data:       T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface OneCSingleResponse<T> {
  success: boolean;
  data:    T;
}

export interface OneCErrorResponse {
  success: false;
  error:   string;
}
