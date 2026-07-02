#!/usr/bin/env bash
# ============================================================
# 1C CRM API — Test cURL examples
# Usage: bash test-curl.sh
# Set HOST and CREDENTIALS below before running.
# ============================================================

HOST="http://192.168.1.10/accounting_uz"
BASE="$HOST/hs/crm/v1"

# Option A: Basic Auth
BASIC_AUTH=$(echo -n "crm_user:YourPassword2026!" | base64)
AUTH_HEADER="Authorization: Basic $BASIC_AUTH"

# Option B: Bearer Token (uncomment to use instead)
# AUTH_HEADER="Authorization: Bearer your-long-bearer-token-here"

echo "============================================================"
echo "TEST 1: GET /v1/clients — first page, search 'ООО'"
echo "============================================================"
curl -s -X GET \
  "$BASE/clients?page=1&limit=20&search=%D0%9E%D0%9E%D0%9E" \
  -H "$AUTH_HEADER" \
  -H "Accept: application/json" | python -m json.tool

echo ""
echo "============================================================"
echo "TEST 2: GET /v1/clients — incremental sync (updated after 2026-06-01)"
echo "============================================================"
curl -s -X GET \
  "$BASE/clients?updated_after=2026-06-01T00:00:00&limit=100" \
  -H "$AUTH_HEADER" \
  -H "Accept: application/json" | python -m json.tool

echo ""
echo "============================================================"
echo "TEST 3: GET /v1/contracts — active contracts for a client"
echo "Replace CLIENT_GUID with a real GUID from /v1/clients"
echo "============================================================"
CLIENT_GUID="00000000-0000-0000-0000-000000000000"
curl -s -X GET \
  "$BASE/contracts?client_id=$CLIENT_GUID&active_only=true&limit=10" \
  -H "$AUTH_HEADER" \
  -H "Accept: application/json" | python -m json.tool

echo ""
echo "============================================================"
echo "TEST 4: GET /v1/invoices — overdue invoices, date range"
echo "============================================================"
curl -s -X GET \
  "$BASE/invoices?date_from=2026-01-01&date_to=2026-06-30&limit=50" \
  -H "$AUTH_HEADER" \
  -H "Accept: application/json" | python -m json.tool

echo ""
echo "============================================================"
echo "TEST 5: GET /v1/payments — all payments for a client"
echo "============================================================"
curl -s -X GET \
  "$BASE/payments?client_id=$CLIENT_GUID&date_from=2026-01-01&limit=20" \
  -H "$AUTH_HEADER" \
  -H "Accept: application/json" | python -m json.tool

echo ""
echo "============================================================"
echo "TEST 6: GET /v1/debts — top debtors (sorted by debt desc)"
echo "============================================================"
curl -s -X GET \
  "$BASE/debts?limit=50&with_debt_only=true" \
  -H "$AUTH_HEADER" \
  -H "Accept: application/json" | python -m json.tool

echo ""
echo "============================================================"
echo "TEST 7: GET /v1/client-financial-summary/{client_id}"
echo "============================================================"
curl -s -X GET \
  "$BASE/client-financial-summary/$CLIENT_GUID" \
  -H "$AUTH_HEADER" \
  -H "Accept: application/json" | python -m json.tool

echo ""
echo "============================================================"
echo "TEST 8: 401 — missing credentials"
echo "============================================================"
curl -s -X GET "$BASE/clients" | python -m json.tool

echo ""
echo "============================================================"
echo "TEST 9: 404 — unknown client GUID"
echo "============================================================"
curl -s -X GET \
  "$BASE/client-financial-summary/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" \
  -H "$AUTH_HEADER" | python -m json.tool
