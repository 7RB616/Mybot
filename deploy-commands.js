const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
require("dotenv").config();

// مصفوفة الأوامر الشاملة المصححة بالكامل
const commands = [
  // 1. أوامرك القديمة المعتمدة في نظامك
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
    .setDescription("تغيير رتبة إداري")
    .addUserOption(opt => opt.setName("user").setDescription("الإداري المستهدف").setRequired(true))
    .addStringOption(opt => opt.setName("rank").setDescription("اسم الرتبة الجديدة").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("سبب تغيير الرتبة").setRequired(true)),

  new SlashCommandBuilder().setName("setup-activation").setDescription("لوحة بدء التفعيل للإداريين الجدد"),
  new SlashCommandBuilder().setName("setup-request").setDescription("لوحة تقديم الطلبات"),
  
  new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("مسح التحذيرات السابقة عن إداري")
    .addUserOption(o => o.setName("user").setDescription("الإداري المستهدف").setRequired(true)) // تم تصحيح الوصف هنا ⚠️
    .addStringOption(o => o.setName("reason").setDescription("سبب مسح التحذيرات").setRequired(true)), // تم تصحيح الوصف هنا ⚠️

  // 2. ⭐️ أوامر نظام النقاط الجديد المتطور ⭐️
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
    .addIntegerOption(option => option.setName('amount').setDescription('عدد النقاط المراد التعامل معها').setRequired(true))
].map(command => command.toJSON());

// تهيئة أداة الـ REST
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("⏳ جاري رفع وتحديث الأوامر في سيرفرات ديسكورد...");
    
    // رفع الأوامر لسيرفر الإدارة
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, "1493304316906176563"), 
      { body: commands }
    );
    
    // رفع الأوامر للسيرفر الرئيسي
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, "1489798320762130452"), 
      { body: commands }
    );
    
    console.log("=================================");
    console.log("✅ تم تحديث ورفع كافة الأوامر بنجاح في السيرفرين!");
    console.log("=================================");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء رفع الأوامر:");
    console.error(error);
  }
})();
