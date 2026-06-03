/**
 * Shared check-email lookup for customer, service provider, and vendor.
 */

export function normalizeLoginEmail(email) {
  if (email == null || String(email).trim() === "") return "";
  return String(email).trim().toLowerCase();
}

const PROFILE_SQL = {
  customer: `SELECT customerid AS id, firstname, lastname, mobileno, emailid
             FROM customer WHERE LOWER(TRIM(emailid)) = $1 LIMIT 1`,
  sp: `SELECT serviceproviderid AS id, firstname, lastname, mobileno, emailid
       FROM serviceprovider WHERE LOWER(TRIM(emailid)) = $1 LIMIT 1`,
  vendor: `SELECT vendorid AS id, companyname AS firstname, NULL::text AS lastname,
                  phoneno::text AS mobileno, emailid
           FROM vendor WHERE LOWER(TRIM(emailid)) = $1 LIMIT 1`,
};

function profilePayload(row, userRole, extra = {}) {
  if (!row) return null;
  return {
    exists: true,
    id: Number(row.id),
    user_role: userRole,
    firstname: row.firstname ?? null,
    lastname: row.lastname ?? null,
    mobileno: row.mobileno != null ? String(row.mobileno) : null,
    emailid: row.emailid ?? null,
    ...extra,
  };
}

export async function lookupUserByEmail(pool, rawEmail) {
  const email = normalizeLoginEmail(rawEmail);
  if (!email) {
    return { error: "Email query parameter is required", status: 400 };
  }

  const [customerRes, spRes, vendorRes] = await Promise.all([
    pool.query(PROFILE_SQL.customer, [email]),
    pool.query(PROFILE_SQL.sp, [email]),
    pool.query(PROFILE_SQL.vendor, [email]),
  ]);

  const customer = customerRes.rows[0] ?? null;
  const sp = spRes.rows[0] ?? null;
  const vendor = vendorRes.rows[0] ?? null;

  if (customer && sp) {
    return {
      body: profilePayload(customer, "CUSTOMER", {
        service_provider_id: Number(sp.id),
        dual_role: true,
      }),
    };
  }
  if (customer) {
    return { body: profilePayload(customer, "CUSTOMER") };
  }
  if (sp) {
    return {
      body: profilePayload(sp, "SERVICE_PROVIDER", {
        service_provider_id: Number(sp.id),
      }),
    };
  }
  if (vendor) {
    return { body: profilePayload(vendor, "VENDOR") };
  }

  return { body: { exists: false } };
}
