"""
Telegram bot — /start handler
Foydalanuvchi https://t.me/bozor_sayt_bot?start=USER_UUID bosib kelganda
profiles jadvalini yangilaydi:
  - telegram_id
  - telegram_chat_id
  - telegram_connected = true
"""

import asyncio
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import Message
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

bot = Bot(token=os.getenv("BOT_TOKEN"))
dp  = Dispatcher()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY"),
)


@dp.message(CommandStart())
async def cmd_start(message: Message):
    """
    /start <USER_UUID>
    Profil sahifasidagi "Telegram botni ulash" tugmasi shu UUID ni yuboradi.
    """
    args = message.text.split(maxsplit=1)
    user_uuid = args[1].strip() if len(args) > 1 else None

    tg_id      = str(message.from_user.id)
    tg_chat_id = str(message.chat.id)
    full_name  = message.from_user.full_name or ""

    if not user_uuid:
        # UUID yo'q — oddiy /start
        await message.answer(
            "👋 Salom! Bu Bozor.uz buyurtma bot.\n\n"
            "Botni ulash uchun sayt profilingizga o'ting va "
            "\"Telegram botni ulash\" tugmasini bosing."
        )
        return

    # UUID format tekshirish (oddiy)
    if len(user_uuid) < 30:
        await message.answer("❌ Noto'g'ri havola. Saytdan qayta urinib ko'ring.")
        return

    # profiles jadvalini yangilash
    try:
        result = (
            supabase.table("profiles")
            .update({
                "telegram_id":        tg_id,
                "telegram_chat_id":   tg_chat_id,
                "telegram_connected": True,
            })
            .eq("id", user_uuid)
            .execute()
        )

        if result.data:
            profile = result.data[0]
            name = profile.get("full_name") or full_name or "Foydalanuvchi"

            await message.answer(
                f"✅ <b>Telegram muvaffaqiyatli ulandi!</b>\n\n"
                f"👤 {name}\n\n"
                f"Endi buyurtmalaringiz holati haqida xabarnomalar olasiz.\n"
                f"Saytga qaytib buyurtma berishingiz mumkin! 🛍️",
                parse_mode="HTML",
            )
        else:
            # UUID topilmadi
            await message.answer(
                "❌ Hisob topilmadi. Saytdan qayta ro'yxatdan o'ting."
            )

    except Exception as e:
        print(f"[Bot] profiles yangilashda xatolik: {e}")
        await message.answer(
            "❌ Xatolik yuz berdi. Keyinroq qayta urinib ko'ring."
        )


async def main():
    print("[Bot] Ishga tushmoqda...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
