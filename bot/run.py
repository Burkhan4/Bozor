"""
FastAPI + Telegram bot — birgalikda ishga tushirish
"""
import asyncio
import threading
import uvicorn
from bot import dp, bot


def run_fastapi():
    """FastAPI serverni alohida thread da ishga tushirish"""
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)


async def run_bot():
    """Telegram bot polling"""
    print("[Bot] Polling boshlandi...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    # FastAPI ni thread da ishga tushirish
    api_thread = threading.Thread(target=run_fastapi, daemon=True)
    api_thread.start()
    print("[API] FastAPI http://localhost:8000 da ishga tushdi")

    # Bot ni async loop da ishga tushirish
    asyncio.run(run_bot())
