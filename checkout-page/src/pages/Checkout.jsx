import { useEffect, useState } from "react";

export default function Checkout() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");

  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState(null);
  const [vpa, setVpa] = useState("");
  const [card, setCard] = useState({
    number: "",
    expiry_month: "",
    expiry_year: "",
    cvv: "",
    holder_name: ""
  });

  const [processing, setProcessing] = useState(false);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  const [location, setLocation] = useState(null);

  // 🔹 Fetch order details
  useEffect(() => {
    fetch(`http://localhost:8000/api/v1/orders/${orderId}/public`, {
      headers: {
        "X-Api-Key": "key_test_abc123",
        "X-Api-Secret": "secret_test_xyz789"
      }
    })
      .then(res => res.json())
      .then(setOrder);
  }, [orderId]);

  // 🔹 Create payment
  const pay = () => {
  setProcessing(true);
  setError(null);

  if (!navigator.geolocation) {
    setProcessing(false);
    setError("Location is not supported by this browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      const paymentLocation = {
        latitude,
        longitude,
        accuracy
      };

      setLocation(paymentLocation);

      const body =
        method === "upi"
          ? {
              order_id: orderId,
              method: "upi",
              vpa,
              latitude,
              longitude,
              location_accuracy: accuracy
            }
          : {
              order_id: orderId,
              method: "card",
              card,
              latitude,
              longitude,
              location_accuracy: accuracy
            };

      fetch("http://localhost:8000/api/v1/payments/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      })
        .then(res => res.json())
        .then(data => {
          setPayment(data);
          pollPayment(data.id);
        })
        .catch(err => {
          console.error("Payment error:", err);
          setProcessing(false);
          setError("Payment request failed.");
        });
    },
    (error) => {
      console.error("Location error:", error);
      setProcessing(false);
      setError(
        "Location permission is required to complete this payment."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
};

  // 🔹 Poll payment status
const pollPayment = (paymentId) => {
  // ✅ FIX 3: Guard against undefined / null paymentId
  if (!paymentId) {
    console.warn("pollPayment called without paymentId");
    return;
  }

  const interval = setInterval(() => {
    fetch(`http://localhost:8000/api/v1/payments/${paymentId}`, {
      headers: {
        "X-Api-Key": "key_test_abc123",
        "X-Api-Secret": "secret_test_xyz789"
      }
    })
      .then(res => res.json())
      .then(p => {
        if (p.status === "success" || p.status === "failed") {
          clearInterval(interval);
          setProcessing(false);
          setPayment(p);
          if (p.status === "failed") setError(p.error_description);
        }
      })
      .catch(err => {
        console.error("Polling error:", err);
      });
  }, 2000);
};


  if (!order) return <div>Loading order...</div>;

  return (
    <div data-test-id="checkout-container">
      {/* Order Summary */}
      <div data-test-id="order-summary">
        <h2>Complete Payment</h2>
        <div>
          <span>Amount: </span>
          <span data-test-id="order-amount">₹{order.amount / 100}</span>
        </div>
        <div>
          <span>Order ID: </span>
          <span data-test-id="order-id">{order.id}</span>
        </div>
      </div>

      {/* Payment Methods */}
      <div data-test-id="payment-methods">
        <button data-test-id="method-upi" onClick={() => setMethod("upi")}>
          UPI
        </button>
        <button data-test-id="method-card" onClick={() => setMethod("card")}>
          Card
        </button>
      </div>

      {/* UPI Form */}
      {method === "upi" && (
        <form data-test-id="upi-form" onSubmit={e => e.preventDefault()}>
          <input
            data-test-id="vpa-input"
            placeholder="username@bank"
            value={vpa}
            onChange={e => setVpa(e.target.value)}
          />
          <button data-test-id="pay-button" onClick={pay}>
            Pay ₹{order.amount / 100}
          </button>
        </form>
      )}

      {/* Card Form */}
      {method === "card" && (
        <form data-test-id="card-form" onSubmit={e => e.preventDefault()}>
          <input data-test-id="card-number-input"
            placeholder="Card Number"
            onChange={e => setCard({ ...card, number: e.target.value })}
          />
          <input data-test-id="expiry-input"
            placeholder="MM"
            onChange={e => setCard({ ...card, expiry_month: e.target.value })}
          />
          <input data-test-id="cvv-input"
            placeholder="CVV"
            onChange={e => setCard({ ...card, cvv: e.target.value })}
          />
          <input data-test-id="cardholder-name-input"
            placeholder="Name on Card"
            onChange={e => setCard({ ...card, holder_name: e.target.value })}
          />
          <button data-test-id="pay-button" onClick={pay}>
            Pay ₹{order.amount / 100}
          </button>
        </form>
      )}

      {/* Processing */}
      {processing && (
        <div data-test-id="processing-state">
          <span data-test-id="processing-message">
            Processing payment...
          </span>
        </div>
      )}

      {/* Success */}
      {payment && payment.status === "success" && (
        <div data-test-id="success-state">
          <h2>Payment Successful!</h2>
          <span data-test-id="payment-id">{payment.id}</span>
        </div>
      )}

      {/* Error */}
      {payment && payment.status === "failed" && (
        <div data-test-id="error-state">
          <h2>Payment Failed</h2>
          <span data-test-id="error-message">{error}</span>
        </div>
      )}
    </div>
  );
}
