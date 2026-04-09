import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { getDbPool } from '../config/db.js';
import { walletRepository } from '../repositories/walletRepository.js';
import { expertRepository } from '../repositories/expertRepository.js';

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.status = 403;
  }
}

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const MIN_CHAT_WALLET_BALANCE = 100;

const razorpay = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function computeDurationSeconds(startedAt, endedAt) {
  const start = new Date(startedAt || 0).getTime();
  const end = new Date(endedAt || Date.now()).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

async function resolveSessionRatePerMinute(session) {
  const sessionRate = Number(session?.expert?.pricePerMinute || 0);
  if (Number.isFinite(sessionRate) && sessionRate > 0) {
    return sessionRate;
  }

  const expert = await expertRepository.findById(session.expertId);
  const expertRate = Number(expert?.pricePerMinute || 0);
  return Number.isFinite(expertRate) && expertRate > 0 ? expertRate : 0;
}

async function buildSessionChargePreview(session, endedAt = Date.now()) {
  const durationSeconds = computeDurationSeconds(session.startedAt, endedAt);
  const billableMinutes = durationSeconds > 0 ? Math.max(1, Math.ceil(durationSeconds / 60)) : 0;
  const ratePerMinute = toMoney(await resolveSessionRatePerMinute(session));
  const amountDue = toMoney(billableMinutes * ratePerMinute);

  return {
    durationSeconds,
    billableMinutes,
    ratePerMinute,
    amountDue
  };
}

async function getWalletBalance(userId, connection = null) {
  const wallet = await walletRepository.getWalletByUserId(userId, connection);
  return Number(wallet?.balance || 0);
}

export const walletService = {
  getClientConfig() {
    return {
      keyId: RAZORPAY_KEY_ID || '',
      enabled: Boolean(razorpay)
    };
  },

  getMinimumChatWalletBalance() {
    return MIN_CHAT_WALLET_BALANCE;
  },

  async getSessionChatBudget(session, connection = null) {
    const studentUserId = Number(session?.doubt?.requesterUserId || 0);
    const balance = await getWalletBalance(studentUserId, connection);
    const preview = await buildSessionChargePreview(session, Date.now());

    return {
      studentUserId,
      balance,
      minimumBalance: MIN_CHAT_WALLET_BALANCE,
      ...preview
    };
  },

  async getWalletOverview(actor) {
    const userId = Number(actor?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ForbiddenError('Forbidden');
    }

    const wallet = await walletRepository.ensureWallet(userId);
    const transactions = await walletRepository.listWalletTransactions(userId, 30);

    return {
      wallet,
      transactions
    };
  },

  async createTopupOrder(amount, actor) {
    if (!razorpay) {
      throw new BadRequestError('Razorpay test mode is not configured');
    }

    const userId = Number(actor?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ForbiddenError('Forbidden');
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new BadRequestError('amount must be greater than 0');
    }

    const finalAmount = toMoney(numericAmount);
    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      receipt: `wallet_${userId}_${Date.now()}`,
      notes: {
        userId: String(userId),
        purpose: 'wallet_topup'
      }
    });

    await walletRepository.createPaymentOrder({
      userId,
      provider: 'razorpay',
      providerOrderId: order.id,
      amount: finalAmount,
      currency: 'INR'
    });

    return {
      keyId: RAZORPAY_KEY_ID,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    };
  },

  async verifyTopupPayment(input, actor) {
    const userId = Number(actor?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ForbiddenError('Forbidden');
    }

    const razorpayOrderId = String(input?.razorpayOrderId || '').trim();
    const razorpayPaymentId = String(input?.razorpayPaymentId || '').trim();
    const razorpaySignature = String(input?.razorpaySignature || '').trim();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestError('razorpayOrderId, razorpayPaymentId and razorpaySignature are required');
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new BadRequestError('Invalid payment signature');
    }

    const paymentOrder = await walletRepository.getPaymentOrderByProviderOrderId(razorpayOrderId);
    if (!paymentOrder) {
      throw new BadRequestError('Payment order not found');
    }

    if (Number(paymentOrder.user_id) !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    if (String(paymentOrder.status) === 'paid') {
      return this.getWalletOverview(actor);
    }

    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await walletRepository.ensureWallet(userId, connection);
      await walletRepository.creditWallet(connection, userId, Number(paymentOrder.amount));

      const walletTxn = await walletRepository.addWalletTransaction(connection, {
        userId,
        type: 'credit',
        amount: Number(paymentOrder.amount),
        referenceType: 'topup',
        referenceId: razorpayOrderId,
        status: 'success',
        notes: 'Wallet top-up via Razorpay test mode'
      });

      await walletRepository.markPaymentOrderPaid(connection, {
        providerOrderId: razorpayOrderId,
        providerPaymentId: razorpayPaymentId,
        walletTransactionId: walletTxn?.id || null
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return this.getWalletOverview(actor);
  },

  async settleSessionCharge(session) {
    if (!session?.id) {
      throw new BadRequestError('session is required');
    }

    const studentUserId = Number(session?.doubt?.requesterUserId || 0);
    const expertUserId = Number(session?.expert?.userId || 0);

    if (!Number.isInteger(studentUserId) || studentUserId <= 0) {
      return {
        sessionId: session.id,
        status: 'failed',
        amountDue: 0,
        amountCharged: 0,
        notes: 'Student account missing for billing'
      };
    }

    if (!Number.isInteger(expertUserId) || expertUserId <= 0) {
      return {
        sessionId: session.id,
        status: 'failed',
        amountDue: 0,
        amountCharged: 0,
        notes: 'Expert account missing for billing'
      };
    }

    const {
      durationSeconds,
      billableMinutes,
      ratePerMinute,
      amountDue
    } = await buildSessionChargePreview(session, session.endedAt || Date.now());
    const existing = await walletRepository.getSessionBillingBySessionId(session.id);

    if (
      existing
      && Number(existing.amountDue || 0) === amountDue
      && Number(existing.amountCharged || 0) === amountDue
      && String(existing.status || '').toLowerCase() === 'paid'
      && Number(existing.studentWalletTxnId || 0) > 0
      && Number(existing.expertWalletTxnId || 0) > 0
    ) {
      return existing;
    }

    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await walletRepository.ensureWallet(studentUserId, connection);
      await walletRepository.ensureWallet(expertUserId, connection);

      const studentBalance = await getWalletBalance(studentUserId, connection);

      let status = 'paid';
      let amountCharged = Math.min(amountDue, studentBalance);
      let studentTxn = null;
      let expertTxn = null;

      if (amountCharged > 0) {
        const debited = await walletRepository.debitWallet(connection, studentUserId, amountCharged);

        if (!debited) {
          status = 'insufficient_balance';
          amountCharged = 0;
        } else {
          await walletRepository.creditWallet(connection, expertUserId, amountCharged);

          studentTxn = await walletRepository.addWalletTransaction(connection, {
            userId: studentUserId,
            type: 'debit',
            amount: amountCharged,
            referenceType: 'session',
            referenceId: String(session.id),
            status: 'success',
            notes: `Session charge for #${session.id}`
          });

          expertTxn = await walletRepository.addWalletTransaction(connection, {
            userId: expertUserId,
            type: 'credit',
            amount: amountCharged,
            referenceType: 'session',
            referenceId: String(session.id),
            status: 'success',
            notes: `Session earning for #${session.id}`
          });
        }
      }

      if (amountCharged < amountDue) {
        status = 'insufficient_balance';
      }

      const billingPayload = {
        sessionId: session.id,
        studentUserId,
        expertUserId,
        durationSeconds,
        billableMinutes,
        ratePerMinute,
        amountDue,
        amountCharged,
        status,
        studentWalletTxnId: studentTxn?.id || null,
        expertWalletTxnId: expertTxn?.id || null,
        notes: status === 'insufficient_balance'
          ? 'Wallet balance is insufficient. Please top up wallet to continue.'
          : 'Wallet billing completed successfully'
      };

      const updatedBilling = existing
        ? await walletRepository.updateSessionBillingBySessionId(connection, billingPayload)
        : await walletRepository.createSessionBilling(connection, billingPayload);

      await connection.commit();
      return updatedBilling;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getSessionBillingForUser(session, actor) {
    const userId = Number(actor?.id || 0);
    let sessionBilling = await walletRepository.getSessionBillingBySessionId(session.id);

    if (String(session?.status || '').toLowerCase() === 'completed' && (!sessionBilling || Number(sessionBilling.amountDue || 0) <= 0)) {
      sessionBilling = await this.settleSessionCharge(session);
    }

    if (!sessionBilling) return null;

    if (Number(sessionBilling.studentUserId) !== userId && Number(sessionBilling.expertUserId) !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    return sessionBilling;
  },

  async listMyBillings(actor) {
    const userId = Number(actor?.id || 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ForbiddenError('Forbidden');
    }

    return walletRepository.listSessionBillingsForUser(userId, 50);
  }
};
