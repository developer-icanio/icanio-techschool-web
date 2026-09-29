import { Resend } from "resend";
import { SITE_URL } from "@/lib/generateSchema";

// Constructed lazily inside sendBroadcast() rather than at module scope —
// Next.js evaluates API route modules during the build's "collect page
// data" step, and the Resend SDK throws synchronously if the API key is
// missing, which would fail the whole build if RESEND_API_KEY isn't set
// at that exact moment rather than just failing the one request at runtime.

// Resend batch-send caps at 100 recipients per API call, so a broadcast
// to a larger list has to be chunked into multiple calls rather than one
// giant request.
const BATCH_SIZE = 100;

export interface BroadcastResult {
  sent: number;
  failed: number;
}

// Hardcoded rather than an env var/admin setting — Leo asked specifically
// for these two addresses for order fulfillment alerts, and they're reused
// below for the new-user-registration alert (same "who gets pinged about
// site activity" list). Move to a real settings UI if the recipient list
// needs to change without a code edit.
const ADMIN_NOTIFICATION_RECIPIENTS = ["leodanielraja@gmail.com", "julietpreena@gmail.com"];

export interface OrderNotificationItem {
  productName: string;
  options: Record<string, string> | null;
  sku: string | null;
  quantity: number;
  lineTotal: string;
}

export interface OrderNotificationDetails {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  addressText: string;
  subtotal: string;
  shippingFee: string;
  discountAmount: string;
  total: string;
  items: OrderNotificationItem[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Fire-and-forget from markOrderPaid() — a failed notification email
// should never roll back or block a real payment being recorded, so this
// swallows its own errors (logged, not thrown) rather than propagating.
export async function sendOrderNotification(order: OrderNotificationDetails): Promise<void> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL!;

    const itemsHtml = order.items
      .map((item) => {
        const optionsText = item.options
          ? Object.values(item.options).filter(Boolean).join(" / ")
          : "";
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(item.productName)}${optionsText ? ` <span style="color:#888;">(${escapeHtml(optionsText)})</span>` : ""}${item.sku ? `<br/><span style="font-size:11px;color:#aaa;">SKU: ${escapeHtml(item.sku)}</span>` : ""}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">₹${item.lineTotal}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#0f172a;">New order ${escapeHtml(order.orderNumber)}</h2>
        <p style="color:#475569;">A new order has been paid and is ready to fulfill.</p>

        <h3 style="color:#0f172a;margin-top:24px;">Customer</h3>
        <p style="color:#334155;margin:4px 0;">
          ${escapeHtml(order.customerName)}<br/>
          ${escapeHtml(order.customerPhone)}${order.customerEmail ? `<br/>${escapeHtml(order.customerEmail)}` : ""}
        </p>

        <h3 style="color:#0f172a;margin-top:24px;">Delivery address</h3>
        <p style="color:#334155;margin:4px 0;white-space:pre-wrap;">${escapeHtml(order.addressText)}</p>

        <h3 style="color:#0f172a;margin-top:24px;">Items</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;text-align:left;">Item</th>
              <th style="padding:8px 12px;text-align:center;">Qty</th>
              <th style="padding:8px 12px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <table style="width:100%;margin-top:12px;font-size:14px;color:#334155;">
          <tr><td>Subtotal</td><td style="text-align:right;">₹${order.subtotal}</td></tr>
          ${Number(order.discountAmount) > 0 ? `<tr><td>Discount</td><td style="text-align:right;">-₹${order.discountAmount}</td></tr>` : ""}
          <tr><td>Shipping</td><td style="text-align:right;">${Number(order.shippingFee) > 0 ? `₹${order.shippingFee}` : "FREE"}</td></tr>
          <tr style="font-weight:bold;"><td>Total</td><td style="text-align:right;">₹${order.total}</td></tr>
        </table>

        <p style="margin-top:32px;">
          <a href="${SITE_URL}/admin/orders" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">
            View in admin
          </a>
        </p>
      </div>
    `;

    await resend.batch.send(
      ADMIN_NOTIFICATION_RECIPIENTS.map((to) => ({
        from,
        to,
        subject: `New order ${order.orderNumber} - ₹${order.total}`,
        html,
      }))
    );
  } catch (error) {
    console.error("Failed to send order notification email:", error);
  }
}

function orderItemRows(items: OrderNotificationItem[]): string {
  return items
    .map((item) => {
      const opts = item.options ? Object.values(item.options).filter(Boolean).join(" / ") : "";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(item.productName)}${opts ? ` <span style="color:#888;">(${escapeHtml(opts)})</span>` : ""}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">₹${item.lineTotal}</td>
      </tr>`;
    })
    .join("");
}

// Sent to the customer (not the admin) once payment is confirmed - the
// buyer-facing counterpart to sendOrderNotification(). Same fire-and-forget
// contract: a Resend failure never blocks the order being recorded.
export async function sendOrderConfirmation(order: OrderNotificationDetails): Promise<void> {
  if (!order.customerEmail) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL!;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155;">
        <h2 style="color:#0f172a;">Thank you for your order, ${escapeHtml(order.customerName.split(" ")[0] || "there")}!</h2>
        <p>We've received order <strong>${escapeHtml(order.orderNumber)}</strong> and it's now being prepared.
          You'll hear from us again when it ships. Delivery is typically ~3 days in Tamil Nadu and a little
          longer elsewhere.</p>

        <h3 style="color:#0f172a;margin-top:24px;">Your order</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;">Item</th>
            <th style="padding:8px 12px;text-align:center;">Qty</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr></thead>
          <tbody>${orderItemRows(order.items)}</tbody>
        </table>
        <table style="width:100%;margin-top:12px;font-size:14px;">
          <tr><td>Subtotal</td><td style="text-align:right;">₹${order.subtotal}</td></tr>
          ${Number(order.discountAmount) > 0 ? `<tr><td>Discount</td><td style="text-align:right;">-₹${order.discountAmount}</td></tr>` : ""}
          <tr><td>Shipping</td><td style="text-align:right;">${Number(order.shippingFee) > 0 ? `₹${order.shippingFee}` : "FREE"}</td></tr>
          <tr style="font-weight:bold;"><td>Total paid</td><td style="text-align:right;">₹${order.total}</td></tr>
        </table>

        <h3 style="color:#0f172a;margin-top:24px;">Delivering to</h3>
        <p style="white-space:pre-wrap;">${escapeHtml(order.addressText)}</p>

        <p style="margin-top:28px;font-size:13px;color:#64748b;">
          Questions? Reply to this email or message us on WhatsApp at +91 96006 56964.
        </p>
      </div>
    `;

    await resend.emails.send({
      from,
      to: order.customerEmail,
      subject: `Order confirmed - ${order.orderNumber}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
}

// Sent by the daily abandoned-cart cron to a "pending" order (checkout
// started, payment never completed) that has an email and hasn't been
// reminded yet.
export async function sendAbandonedCartReminder(details: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: string;
  items: OrderNotificationItem[];
  firstOrderCode: string | null;
}): Promise<void> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL!;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155;">
        <h2 style="color:#0f172a;">You left something in your cart</h2>
        <p>Hi ${escapeHtml(details.customerName.split(" ")[0] || "there")}, your LAMBLILY picks are still saved.
          Finish checking out whenever you're ready.</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;">Item</th>
            <th style="padding:8px 12px;text-align:center;">Qty</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr></thead>
          <tbody>${orderItemRows(details.items)}</tbody>
        </table>
        <p style="text-align:right;font-weight:bold;margin-top:8px;">Cart total: ₹${details.total}</p>

        ${
          details.firstOrderCode
            ? `<p style="margin-top:20px;background:#fef9c3;padding:12px 16px;border-radius:8px;">
                 First order? Use code <strong>${escapeHtml(details.firstOrderCode)}</strong> at checkout.
               </p>`
            : ""
        }

        <p style="margin-top:28px;">
          <a href="${SITE_URL}/cart" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Return to your cart
          </a>
        </p>
        <p style="margin-top:24px;font-size:13px;color:#64748b;">
          Need help? Message us on WhatsApp at +91 96006 56964.
        </p>
      </div>
    `;

    await resend.emails.send({
      from,
      to: details.customerEmail,
      subject: "Your LAMBLILY cart is waiting",
      html,
    });
  } catch (error) {
    console.error("Failed to send abandoned cart reminder:", error);
  }
}

// Sent by the daily back-in-stock cron when a variant a shopper asked
// about is available again. Same fire-and-forget contract as the others.
export async function sendBackInStockEmail(details: {
  email: string;
  productName: string;
  productSlug: string;
  optionLabel: string;
}): Promise<void> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL!;
    const url = `${SITE_URL}/shop/${details.productSlug}`;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155;">
        <h2 style="color:#0f172a;">It&rsquo;s back in stock</h2>
        <p><strong>${escapeHtml(details.productName)}</strong>${
          details.optionLabel
            ? ` <span style="color:#888;">(${escapeHtml(details.optionLabel)})</span>`
            : ""
        } is available again. Stock on our made-to-order pieces can move quickly, so grab yours while it&rsquo;s here.</p>

        <p style="margin-top:28px;">
          <a href="${url}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
            View the product
          </a>
        </p>
        <p style="margin-top:24px;font-size:13px;color:#64748b;">
          You asked to be notified about this item on lamblily.com. This is a one-time alert.
        </p>
      </div>
    `;

    await resend.emails.send({
      from,
      to: details.email,
      subject: `Back in stock: ${details.productName}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send back-in-stock email:", error);
  }
}

// Same "new user registration" alert the old WordPress site sent, now
// fired from both sign-up paths: email/password (app/api/register/route.ts)
// and a first-time Google sign-in (auth.ts's signIn callback). Fire-and-
// forget - a failed notification should never block someone creating an
// account.
export async function sendNewUserRegistrationEmail(details: {
  email: string;
  name: string | null;
  provider: "password" | "google";
}): Promise<void> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL!;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155;">
        <h2 style="color:#0f172a;">New user registration</h2>
        <p>New user registration on your site LAMBLILY:</p>
        <p style="margin:4px 0;"><strong>Username:</strong> ${escapeHtml(details.email)}</p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${escapeHtml(details.email)}</p>
        ${details.name ? `<p style="margin:4px 0;"><strong>Name:</strong> ${escapeHtml(details.name)}</p>` : ""}
        <p style="margin:4px 0;"><strong>Signed up via:</strong> ${details.provider === "google" ? "Google" : "Email &amp; password"}</p>
      </div>
    `;

    await resend.batch.send(
      ADMIN_NOTIFICATION_RECIPIENTS.map((to) => ({
        from,
        to,
        subject: "[LAMBLILY] New User Registration",
        html,
      }))
    );
  } catch (error) {
    console.error("Failed to send new-user-registration email:", error);
  }
}

export async function sendBroadcast(
  recipients: { email: string; unsubscribeToken: string }[],
  subject: string,
  bodyHtml: string
): Promise<BroadcastResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL!;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const { error } = await resend.batch.send(
      batch.map((r) => ({
        from,
        to: r.email,
        subject,
        html: `${bodyHtml}<p style="margin-top:32px;font-size:12px;color:#888;">You're receiving this because you subscribed at lamblily.com. <a href="${SITE_URL}/unsubscribe?token=${r.unsubscribeToken}">Unsubscribe</a></p>`,
      }))
    );

    if (error) {
      failed += batch.length;
    } else {
      sent += batch.length;
    }
  }

  return { sent, failed };
}
