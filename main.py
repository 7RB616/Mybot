import discord
from discord.ext import commands
import asyncio
import random
import os  # جلب مكتبة النظام لقراءة المتغيرات من Railway

# إعداد الصلاحيات
intents = discord.Intents.default()
intents.members = True  
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

# قراءة الآيدي والتوكن من بيئة تشغيل Railway (آمن 100% ولا يظهر في قيت هوب)
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))
BOT_TOKEN = os.getenv("BOT_TOKEN")

@bot.event
async def on_ready():
    print(f'🤖 البوت يعمل بنجاح باسم: {bot.user}')

@bot.command()
async def broadcast(ctx, *, message: str = None):
    # التأكد من هوية الآدمن
    if ctx.author.id != ADMIN_ID:
        return await ctx.send("❌ هذا الأمر مخصص لصاحب البوت فقط!")

    if message is None:
        return await ctx.send("❓ يرجى كتابة الرسالة بعد الأمر. مثال: `!broadcast نص الرسالة`")

    guild = ctx.guild
    await ctx.send(f"⏳ جاري بدء البرودكاست الآمن لأعضاء **{guild.name}**...")

    success_count = 0
    fail_count = 0

    async for member in guild.fetch_members(limit=None):
        if member.bot or member.id == ctx.author.id:
            continue

        try:
            await member.send(message)
            success_count += 1
            print(f"✅ تم الإرسال إلى: {member.name}")

            # الحماية من الباند (وقت عشوائي واستراحات)
            await asyncio.sleep(random.uniform(2.5, 4.5))

            if success_count % 10 == 0:
                print("💤 استراحة 15 ثانية لتصفير الـ Rate Limit...")
                await asyncio.sleep(15)

        except discord.Forbidden:
            fail_count += 1
        except discord.HTTPException as e:
            fail_count += 1
            await asyncio.sleep(10)

    await ctx.send(
        f"🏁 **اكتمل البرودكاست!**\n"
        f"• ناجح: `{success_count}`\n"
        f"• فاشل (خاص مغلق): `{fail_count}`"
    )

# تشغيل البوت بالتوكن الآمن
if BOT_TOKEN:
    bot.run(BOT_TOKEN)
else:
    print("❌ خطأ: لم يتم العثور على BOT_TOKEN في متغيرات Railway!")
