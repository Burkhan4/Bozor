from fastapi import FastAPI, HTTPException
from supabase import create_client
from dotenv import load_dotenv
from aiogram import Bot
from fastapi.middleware.cors import CORSMiddleware
import os

load_dotenv()

app = FastAPI(title="Bozor Telegram Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY"),
)

bot = Bot(token=os.getenv("BOT_TOKEN"))


# ─────────────────────────────────────────
# Helper: order ma'lumotlarini olish
# ─────────────────────────────────────────
def get_order_with_details(order_id: int):
    """
    orders + order_items + products + profile
    """
    # Order
    order_res = supabase.table("orders").select("*").eq("id", order_id).single().execute()
    if not order_res.data:
        return None, None, None

    order = order_res.data

    # Order items
    items_res = (
        supabase.table("order_items")
        .select("*")
        .eq("order_id", order_id)
        .execute()
    )
    items = items_res.data or []

    # Product names
    product_ids = [str(i["product_id"]) for i in items]
    products_map = {}
    if product_ids:
        prods_res = (
            supabase.table("products")
            .select("id, name, price")
            .in_("id", product_ids)
            .execute()
        )
        for p in (prods_res.data or []):
            products_map[str(p["id"])] = p

    # Profile (telegram_chat_id)
    profile_res = (
        supabase.table("profiles")
        .select("full_name, phone, telegram_chat_id, telegram_connected")
        .eq("id", order["user_id"])
        .single()
        .execute()
    )
    profile = profile_res.data

    return order, items, products_map, profile


def format_price(amount) -> str:
    """Narxni formatlash: 1000000 → 1 000 000 so'm"""
    try:
        parts = []
        s = str(int(float(amount)))
        while len(s) > 3:
            parts.append(s[-3:])
            s = s[:-3]
        parts.append(s)
        return " ".join(reversed(parts)) + " so'm"
    except Exception:
        return f"{amount} so'm"


# ─────────────────────────────────────────
# POST /send-order-message
# Yangi buyurtma yaratilganda foydalanuvchiga xabar yuborish
# ─────────────────────────────────────────
@app.post("/send-order-message")
async def send_order_message(order_id: int):
    result = get_order_with_details(order_id)
    if result[0] is None:
        return {"success": False, "message": "Buyurtma topilmadi"}

    order, items, products_map, profile = result

    # Telegram ulanganligini tekshirish
    tg_connected = profile.get("telegram_connected") if profile else False
    if not tg_connected or tg_connected in ("false", "0", False):
        return {"success": False, "message": "Telegram ulanmagan"}

    chat_id = profile.get("telegram_chat_id") if profile else None
    if not chat_id:
        return {"success": False, "message": "Telegram chat_id topilmadi"}

    # Xabar matni
    full_name = profile.get("full_name") or "Foydalanuvchi"
    phone     = profile.get("phone") or "—"
    total     = format_price(order.get("total_price", 0))

    lines = [
        "🛍️ <b>Yangi buyurtma qabul qilindi!</b>",
        "",
        f"📋 <b>Buyurtma #{order_id}</b>",
        f"👤 {full_name}",
        f"📞 {phone}",
        "",
        "📦 <b>Mahsulotlar:</b>",
    ]

    for item in items:
        prod = products_map.get(str(item["product_id"]))
        name = prod["name"] if prod else f"#{item['product_id']}"
        qty  = item.get("quantity", 1)
        price = format_price(item.get("price", 0))
        lines.append(f"  • {name} × {qty} = {price}")

    lines += [
        "",
        f"💰 <b>Jami: {total}</b>",
        "",
        "⏳ <b>Status: Kutilmoqda</b>",
        "",
        "✅ Tez orada administrator ko'rib chiqadi.",
    ]

    text = "\n".join(lines)

    try:
        await bot.send_message(chat_id=int(chat_id), text=text, parse_mode="HTML")
        return {"success": True, "message": "Xabar yuborildi"}
    except Exception as e:
        return {"success": False, "message": f"Xabar yuborishda xatolik: {str(e)}"}


# ─────────────────────────────────────────
# POST /send-order-approved
# Admin buyurtmani tasdiqlaganda foydalanuvchiga xabar yuborish
# ─────────────────────────────────────────
@app.post("/send-order-approved")
async def send_order_approved(order_id: int):
    result = get_order_with_details(order_id)
    if result[0] is None:
        return {"success": False, "message": "Buyurtma topilmadi"}

    order, items, products_map, profile = result

    tg_connected = profile.get("telegram_connected") if profile else False
    if not tg_connected or tg_connected in ("false", "0", False):
        return {"success": False, "message": "Telegram ulanmagan"}

    chat_id = profile.get("telegram_chat_id") if profile else None
    if not chat_id:
        return {"success": False, "message": "Telegram chat_id topilmadi"}

    full_name = profile.get("full_name") or "Foydalanuvchi"
    total     = format_price(order.get("total_price", 0))

    lines = [
        "✅ <b>Buyurtmangiz tasdiqlandi!</b>",
        "",
        f"📋 <b>Buyurtma #{order_id}</b>",
        f"👤 {full_name}",
        "",
        "📦 <b>Mahsulotlar:</b>",
    ]

    for item in items:
        prod = products_map.get(str(item["product_id"]))
        name = prod["name"] if prod else f"#{item['product_id']}"
        qty  = item.get("quantity", 1)
        price = format_price(item.get("price", 0))
        lines.append(f"  • {name} × {qty} = {price}")

    lines += [
        "",
        f"💰 <b>Jami: {total}</b>",
        "",
        "🎉 Buyurtmangiz tasdiqlandi va tez orada yetkazib beriladi!",
        "📞 Muammo bo'lsa bizga murojaat qiling.",
    ]

    text = "\n".join(lines)

    try:
        await bot.send_message(chat_id=int(chat_id), text=text, parse_mode="HTML")
        return {"success": True, "message": "Tasdiqlash xabari yuborildi"}
    except Exception as e:
        return {"success": False, "message": f"Xabar yuborishda xatolik: {str(e)}"}


# ─────────────────────────────────────────
# GET /health — server ishlayaptimi tekshirish
# ─────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "Bozor Telegram Bot API"}
