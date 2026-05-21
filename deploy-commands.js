const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
require("dotenv").config();

const commands = [
  // ==================== 🛠️ الأوامر الإدارية القديمة ====================
  new SlashCommandBuilder()
    .setName("resign")
    .setDescription("أرشفة رومات إداري وتسجيل استقالته")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName("user").setDescription("الإداري المستهدف").setRequired(true))
    .addStringOption(opt => opt.setName("last_rank").setDescription("آخر رتبة للإداري").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("السبب").setRequired(true)),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("إعطاء تحذير إداري")
    .addUserOption(opt => opt.setName("user").setDescription("الإداري المستهدف").setRequired(true))
    .addIntegerOption(opt => opt.setName("number").setDescription("رقم التحذير (1-3)").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("سبب التحذير").setRequired(true))
    .addStringOption(opt => opt.setName("evidence").setDescription("الدليل والبرهان").setRequired(true)),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("تغير رتبة إداري")
    .addUserOption(opt => opt.setName("user").setDescription("الإداري المستهدف").setRequired(true))
    .addStringOption(opt => opt.setName("rank").setDescription("اسم الرتبة الجديدة").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("سبب تغيير الرتبة").setRequired(true)),

  new SlashCommandBuilder().setName("setup-activation").setDescription("لوحة بدء التفعيل للإداريين الجدد"),
  new SlashCommandBuilder().setName("setup-request").setDescription("لوحة تقديم الطلبات"),
  new SlashCommandBuilder().setName("setup-ticket-panel").setDescription("إرسال لوحة فتح التذاكر للاعبين 🎫"),
  
  new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("مسح التحذيرات السابقة عن إداري")
    .addUserOption(o => o.setName("user").setDescription("الإداري المستهدف").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("سبب مسح التحذيرات").setRequired(true)),

  // ==================== 📊 أوامر نظام النقاط والتفاعل ====================
  new SlashCommandBuilder()
    .setName('points')
    .setDescription('📊 لعرض نقاطك الإدارية الحالية وإحصائيات تفاعلك.')
    .addUserOption(option => option.setName('user').setDescription('الإداري المراد عرض نقاطه (اختياري)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('top-staff')
    .setDescription('🏆 عرض قائمة أفضل 10 إداريين تفاعلاً بالسيرفر قبل الافتتاح.'),

  new SlashCommandBuilder()
    .setName('manage-points')
    .setDescription('⚙️ تعديل نقاط إداري يدويًا (للإدارة العليا فقط)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName('user').setDescription('الإداري المراد تعديل نقاطه').setRequired(true))
    .addStringOption(option => 
        option.setName('action')
            .setDescription('نوع الإجراء (إضافة/سحب/تعيين)')
            .setRequired(true)
            .addChoices(
                { name: 'إضافة نقاط', value: 'add' },
                { name: 'سحب نقاط', value: 'remove' },
                { name: 'تعيين رقم محدد', value: 'set' }
            ))
    .addIntegerOption(option => option.setName('amount').setDescription('عدد النقاط المراد التعامل معها').setRequired(true)),

  // ==================== 🎫 حزمة أوامر التذاكر الجديدة باختصاراتها المعتمدة ====================
  new SlashCommandBuilder()
    .setName("let")
    .setDescription("⏳ وضع التذكرة في وضع الخمول وتحديد توقيت تلقائي لإغلاقها")
    .addIntegerOption(opt => opt.setName("minutes").setDescription("عدد الدقائق قبل الإغلاق التلقائي").setRequired(true)),

  new SlashCommandBuilder()
    .setName("rename")
    .setDescription("✏️ تغيير اسم روم التذكرة الحالي")
    .addStringOption(opt => opt.setName("name").setDescription("الاسم الجديد للروم").setRequired(true)),

  new SlashCommandBuilder()
    .setName("tr")
    .setDescription("⚙️ نقل التذكرة إلى أحد الأقسام المعتمدة")
    .addStringOption(opt => opt.setName("category").setDescription("القسم المطلوب النقل إليه").setRequired(true)
      .addChoices(
        { name: "قسم التقديمات (Staff application)", value: "staff_app" },
        { name: "قسم مشاكل الديسكورد (Discord problems)", value: "discord_prob" },
        { name: "تقديم المبرمجين (Developer Application)", value: "dev_app" },
        { name: "قسم اعتراض على عقوبة (Objection)", value: "objection" }
      )),

  new SlashCommandBuilder()
    .setName("dr")
    .setDescription("✋ ترك التذكرة الحالية وإعادتها للاستلام العام"),

  new SlashCommandBuilder()
    .setName("cr")
    .setDescription("🔒 إغلاق التذكرة الحالية نهائياً وبدء نظام تقييم اللاعب بالنجوم"),

  new SlashCommandBuilder()
    .setName("activity")
    .setDescription("📊 رؤية إحصائيات التذاكر الخاصة بي ومتوسط التقييم الحاصل عليه")
    .addUserOption(opt => opt.setName("user").setDescription("الإداري المستهدف (اختياري)").setRequired(false))

].map(command => command.toJSON());

// ربط التوكن والـ Client ID من ملف الـ .env
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("⏳ جاري رفع وتحديث الأوامر المدمجة كاملة بسيرفرات ديسكورد...");
    
    // رفع الأوامر لسيرفر الإدارة وسيرفر التذاكر
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, "1493304316906176563"), { body: commands });
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, "1363170758662291456"), { body: commands });
    
    console.log("=================================");
    console.log("✅ تم بنجاح رفع وتحديث كافة الأوامر بالاختصارات الجديدة!");
    console.log("=================================");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء رفع الأوامر:", error);
  }
})();
