import { useEffect, useMemo, useState } from 'react';
import {
  createTopupOrder,
  fetchMyBillings,
  fetchMyWallet,
  fetchWalletConfig,
  verifyTopupPayment
} from '../services/walletApi.js';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function WalletPage({ currentUser }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [billings, setBillings] = useState([]);
  const [config, setConfig] = useState({ keyId: '', enabled: false });
  const [topupAmount, setTopupAmount] = useState('100');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refreshAll() {
    const [walletData, billingData, cfg] = await Promise.all([
      fetchMyWallet(),
      fetchMyBillings(),
      fetchWalletConfig()
    ]);

    setWallet(walletData.wallet);
    setTransactions(walletData.transactions || []);
    setBillings(billingData || []);
    setConfig(cfg || { keyId: '', enabled: false });
  }

  useEffect(() => {
    let active = true;

    refreshAll()
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const hasBalance = useMemo(() => Number(wallet?.balance || 0), [wallet?.balance]);

  async function onTopup() {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const amount = Number(topupAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load Razorpay checkout');
      }

      if (!config?.enabled || !config?.keyId) {
        throw new Error('Razorpay test mode not configured on server');
      }

      const orderPayload = await createTopupOrder(amount);

      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: config.keyId,
          amount: orderPayload.order.amount,
          currency: orderPayload.order.currency,
          name: 'ExpertMatch Wallet',
          description: 'Wallet top-up (Test Mode)',
          order_id: orderPayload.order.id,
          handler: async (response) => {
            try {
              await verifyTopupPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });
              resolve();
            } catch (verifyError) {
              reject(verifyError);
            }
          },
          prefill: {
            name: currentUser?.fullName || 'Student',
            email: currentUser?.email || ''
          },
          theme: {
            color: '#0b63f6'
          },
          modal: {
            ondismiss: () => reject(new Error('Payment popup closed'))
          }
        });

        razorpay.open();
      });

      await refreshAll();
      setSuccess('Wallet top-up successful (test mode).');
    } catch (topupError) {
      setError(topupError.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="page-card wallet-layout">
      <div className="wallet-top">
        <p className="label">💰 Wallet</p>
        <h1>Balance & Billing</h1>
        <p className="subtitle">Manage your funds, view transaction history, and track session costs.</p>
      </div>

      <div className="wallet-summary">
        <div className="wallet-balance-box">
          <p className="label">💵 Available Balance</p>
          <strong>₹ {hasBalance.toFixed(2)}</strong>
          <p className="subtitle" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>Ready to use</p>
        </div>

        <div className="wallet-topup-box">
          <label>
            <span style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 700 }}>➕ Add Money</span>
            <input
              type="number"
              min="1"
              step="1"
              value={topupAmount}
              onChange={(event) => setTopupAmount(event.target.value)}
              placeholder="Enter amount in ₹"
            />
          </label>
          <button type="button" className="primary-btn" onClick={onTopup} disabled={processing}>
            {processing ? 'Processing...' : '💳 Add via Razorpay'}
          </button>
          {!config?.enabled ? <p className="muted">ℹ️ Razorpay test mode is not configured yet.</p> : null}
        </div>
      </div>

      {error ? <p className="error-box">{error}</p> : null}
      {success ? <p className="success-box">{success}</p> : null}

      <div className="wallet-grid">
        <div>
          <p className="label">📊 Wallet Transactions</p>
          <div className="wallet-list">
            {transactions.length ? transactions.map((txn) => (
              <div key={txn.id} className="wallet-row">
                <div>
                  <strong style={{ color: txn.type === 'credit' ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {txn.type === 'credit' ? '✓ +' : '✗ −'} ₹ {Number(txn.amount || 0).toFixed(2)}
                  </strong>
                  <p className="muted">{txn.referenceType || 'wallet'} #{txn.referenceId || txn.id}</p>
                </div>
                <span className="mini-id">{txn.type === 'credit' ? '📥' : '📤'}</span>
              </div>
            )) : <p className="muted">ℹ️ No wallet transactions yet.</p>}
          </div>
        </div>

        <div>
          <p className="label">🎯 Session Billings</p>
          <div className="wallet-list">
            {billings.length ? billings.map((bill) => (
              <div key={bill.id} className="wallet-row">
                <div>
                  <strong>Session #{bill.sessionId}</strong>
                  <p className="muted">
                    {bill.billableMinutes} min × ₹{Number(bill.ratePerMinute || 0).toFixed(2)}/min = <strong>₹{Number(bill.amountDue || 0).toFixed(2)}</strong>
                  </p>
                </div>
                <span className={`mini-id ${bill.status === 'paid' ? 'status-badge-paid' : ''}`}>{bill.status}</span>
              </div>
            )) : <p className="muted">ℹ️ No session billings yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

export default WalletPage;
