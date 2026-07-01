/**
 * Telegram Bot FastAPI integratsiyasi
 * Base URL: http://localhost:8000
 */

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

interface TelegramResponse {
  success: boolean;
  message?: string;
}

/**
 * Yangi buyurtma yaratilganda xabarnoma yuborish
 * POST /send-order-message?order_id={id}
 */
export async function sendOrderCreatedNotification(orderId: number): Promise<void> {
  try {
    const res = await fetch(
      `${FASTAPI_BASE}/send-order-message?order_id=${orderId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data: TelegramResponse = await res.json().catch(() => ({ success: false }));

    if (!res.ok || !data.success) {
      // Xato bo'lsa ham buyurtmani bekor qilmaymiz — faqat log
      console.error(
        `[Telegram] Buyurtma #${orderId} uchun xabarnoma yuborilmadi:`,
        data.message || `HTTP ${res.status}`
      );
    } else {
      console.log(`[Telegram] Buyurtma #${orderId} uchun xabarnoma yuborildi ✓`);
    }
  } catch (err) {
    // Network xato — buyurtmaga ta'sir qilmaydi
    console.error(`[Telegram] Network xato (buyurtma #${orderId}):`, err);
  }
}

/**
 * Buyurtma admin tomonidan tasdiqlanganda xabarnoma yuborish
 * POST /send-order-approved?order_id={id}
 */
export async function sendOrderApprovedNotification(orderId: number): Promise<void> {
  try {
    const res = await fetch(
      `${FASTAPI_BASE}/send-order-approved?order_id=${orderId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data: TelegramResponse = await res.json().catch(() => ({ success: false }));

    if (!res.ok || !data.success) {
      console.error(
        `[Telegram] Tasdiqlash xabarnomasi yuborilmadi (buyurtma #${orderId}):`,
        data.message || `HTTP ${res.status}`
      );
    } else {
      console.log(`[Telegram] Tasdiqlash xabarnomasi yuborildi (buyurtma #${orderId}) ✓`);
    }
  } catch (err) {
    console.error(`[Telegram] Network xato (tasdiqlash #${orderId}):`, err);
  }
}
