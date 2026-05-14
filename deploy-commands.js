const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
require("dotenv").config();

const commands = [
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
  new SlashCommandBuilder().setName("clearwarns").setDescription("مسح التحذيرات").addUserOption(o => o.setName("user").setRequired(true)).addStringOption(o => o.setName("reason").setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("✅ تم تحديث أوامر السلاش.");
  } catch (error) {
    console.error(error);
  }
})();
