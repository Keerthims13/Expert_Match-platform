import { getDbPool } from '../config/db.js';

function mapWalletRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    balance: Number(row.balance || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTransactionRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount || 0),
    referenceType: row.reference_type || null,
    referenceId: row.reference_id || null,
    status: row.status,
    notes: row.notes || null,
    createdAt: row.created_at
  };
}

function mapBillingRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    studentUserId: row.student_user_id,
    expertUserId: row.expert_user_id,
    durationSeconds: Number(row.duration_seconds || 0),
    billableMinutes: Number(row.billable_minutes || 0),
    ratePerMinute: Number(row.rate_per_minute || 0),
    amountDue: Number(row.amount_due || 0),
    amountCharged: Number(row.amount_charged || 0),
    status: row.status,
    studentWalletTxnId: row.student_wallet_txn_id || null,
    expertWalletTxnId: row.expert_wallet_txn_id || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const walletRepository = {
  async ensureWallet(userId, connection = null) {
    const db = connection || getDbPool();
    await db.query(
      `
        INSERT INTO wallets (user_id, balance)
        VALUES (?, 0)
        ON DUPLICATE KEY UPDATE user_id = user_id
      `,
      [Number(userId)]
    );

    const [rows] = await db.query('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [Number(userId)]);
    return rows.length ? mapWalletRow(rows[0]) : null;
  },

  async getWalletByUserId(userId, connection = null) {
    const db = connection || getDbPool();
    const [rows] = await db.query('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [Number(userId)]);
    return rows.length ? mapWalletRow(rows[0]) : null;
  },

  async creditWallet(connection, userId, amount) {
    await connection.query(
      `
        UPDATE wallets
        SET balance = balance + ?
        WHERE user_id = ?
      `,
      [Number(amount), Number(userId)]
    );

    const [rows] = await connection.query('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [Number(userId)]);
    return rows.length ? mapWalletRow(rows[0]) : null;
  },

  async debitWallet(connection, userId, amount) {
    const [result] = await connection.query(
      `
        UPDATE wallets
        SET balance = balance - ?
        WHERE user_id = ?
          AND balance >= ?
      `,
      [Number(amount), Number(userId), Number(amount)]
    );

    return result.affectedRows > 0;
  },

  async addWalletTransaction(connection, payload) {
    const [result] = await connection.query(
      `
        INSERT INTO wallet_transactions (user_id, type, amount, reference_type, reference_id, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(payload.userId),
        payload.type,
        Number(payload.amount),
        payload.referenceType || null,
        payload.referenceId || null,
        payload.status || 'success',
        payload.notes || null
      ]
    );

    const [rows] = await connection.query('SELECT * FROM wallet_transactions WHERE id = ? LIMIT 1', [result.insertId]);
    return rows.length ? mapTransactionRow(rows[0]) : null;
  },

  async listWalletTransactions(userId, limit = 50) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT *
        FROM wallet_transactions
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      [Number(userId), Number(limit)]
    );

    return rows.map(mapTransactionRow);
  },

  async createPaymentOrder(payload) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        INSERT INTO payment_orders (user_id, provider, provider_order_id, amount, currency, status)
        VALUES (?, ?, ?, ?, ?, 'created')
      `,
      [
        Number(payload.userId),
        payload.provider,
        payload.providerOrderId,
        Number(payload.amount),
        payload.currency || 'INR'
      ]
    );

    const [rows] = await pool.query('SELECT * FROM payment_orders WHERE id = ? LIMIT 1', [result.insertId]);
    return rows[0] || null;
  },

  async getPaymentOrderByProviderOrderId(providerOrderId) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      'SELECT * FROM payment_orders WHERE provider_order_id = ? LIMIT 1',
      [providerOrderId]
    );
    return rows[0] || null;
  },

  async markPaymentOrderPaid(connection, payload) {
    await connection.query(
      `
        UPDATE payment_orders
        SET status = 'paid',
            provider_payment_id = ?,
            wallet_transaction_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE provider_order_id = ?
      `,
      [payload.providerPaymentId, payload.walletTransactionId || null, payload.providerOrderId]
    );
  },

  async getSessionBillingBySessionId(sessionId) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      'SELECT * FROM session_billings WHERE session_id = ? LIMIT 1',
      [Number(sessionId)]
    );
    return rows.length ? mapBillingRow(rows[0]) : null;
  },

  async createSessionBilling(connection, payload) {
    const [result] = await connection.query(
      `
        INSERT INTO session_billings (
          session_id,
          student_user_id,
          expert_user_id,
          duration_seconds,
          billable_minutes,
          rate_per_minute,
          amount_due,
          amount_charged,
          status,
          student_wallet_txn_id,
          expert_wallet_txn_id,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(payload.sessionId),
        Number(payload.studentUserId),
        Number(payload.expertUserId),
        Number(payload.durationSeconds || 0),
        Number(payload.billableMinutes || 0),
        Number(payload.ratePerMinute || 0),
        Number(payload.amountDue || 0),
        Number(payload.amountCharged || 0),
        payload.status,
        payload.studentWalletTxnId || null,
        payload.expertWalletTxnId || null,
        payload.notes || null
      ]
    );

    const [rows] = await connection.query('SELECT * FROM session_billings WHERE id = ? LIMIT 1', [result.insertId]);
    return rows.length ? mapBillingRow(rows[0]) : null;
  },

  async updateSessionBillingBySessionId(connection, payload) {
    await connection.query(
      `
        UPDATE session_billings
        SET student_user_id = ?,
            expert_user_id = ?,
            duration_seconds = ?,
            billable_minutes = ?,
            rate_per_minute = ?,
            amount_due = ?,
            amount_charged = ?,
            status = ?,
            student_wallet_txn_id = ?,
            expert_wallet_txn_id = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE session_id = ?
      `,
      [
        Number(payload.studentUserId),
        Number(payload.expertUserId),
        Number(payload.durationSeconds || 0),
        Number(payload.billableMinutes || 0),
        Number(payload.ratePerMinute || 0),
        Number(payload.amountDue || 0),
        Number(payload.amountCharged || 0),
        payload.status,
        payload.studentWalletTxnId || null,
        payload.expertWalletTxnId || null,
        payload.notes || null,
        Number(payload.sessionId)
      ]
    );

    const [rows] = await connection.query('SELECT * FROM session_billings WHERE session_id = ? LIMIT 1', [Number(payload.sessionId)]);
    return rows.length ? mapBillingRow(rows[0]) : null;
  },

  async listSessionBillingsForUser(userId, limit = 50) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT *
        FROM session_billings
        WHERE student_user_id = ? OR expert_user_id = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      [Number(userId), Number(userId), Number(limit)]
    );

    return rows.map(mapBillingRow);
  }
};
