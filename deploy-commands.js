const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
require("dotenv").config();

const commands = [
  // أوامرك القديمة الأساسية
  new SlashCommandBuilder()
    .setName("resign")
    .setDescription("أرشفة رومات إداري وتسجيل استقالته")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName("user").setDescription("الإداري").setRequired(true))
    .addStringOption(opt => opt.setName("last_rank").setDescription("آخر رتبة").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("السبب").setRequired(true)),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("إعطاء تحذير إداري")
    .addUserOption(opt => opt.setName("user").setDescription("الإداري").setRequired(true))
    .addIntegerOption(opt => opt.setName("number").setDescription("رقم التحذير").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("السبب").setRequired(true))
    .addStringOption(opt => opt.setName("evidence").setDescription("الدليل").setRequired(true)),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("تغيير رتبة إداري")
    .addUserOption(opt => opt.setName("user").setDescription("الإداري").setRequired(true))
    .addStringOption(opt => opt.setName("rank").setDescription("الرتبة").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("السبب").setRequired(true)),

  new SlashCommandBuilder().setName("setup-activation").setDescription("لوحة التفعيل"),
  new SlashCommandBuilder().setName("setup-request").setDescription("لوحة الطلبات"),
  new SlashCommandBuilder().setName("clearwarns").setDescription("مسح التحذيرات").addUserOption(o => o.setName("user").setRequired(true)).addStringOption(o => o.setName("reason").setRequired(true)),

  // ⭐️ إضافات أوامر نظام النقاط الجديد المتطور ⭐️
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
            .setDescription('نوع الإجراء')
            .setRequired(true)
            .addChoices(
                { name: 'إضافة نقاط', value: 'add' },
                { name: 'سحب نقاط', value: 'remove' },
                { name: 'تعيين رقم محدد', value: 'set' }
            ))
    .addIntegerOption(option => option.setName('amount').setDescription('عدد النقاط').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("⏳ جاري تحديث أوامر السلاش في السيرفرات...");
    
    // تسجيل الأوامر في سيرفر الإدارة
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, "1493304316906176563"), { body: commands });
    
    // تسجيل الأوامر في السيرفر الرئيسي
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, "1489798320762130452"), { body: commands });
    
    console.log("✅ تم تحديث أوامر السلاش بنجاح في السيرفرين.");
  } catch (error) {
    console.error(error);
  }
})();
