const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1500155146217459722";
const GUILD_ID = "1407111299942584400";

const commands = [
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("تغيير رتبة إداري")
    .addUserOption(option =>
      option.setName("user").setDescription("الشخص").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("rank").setDescription("الرتبة الجديدة").setRequired(true)
        .addChoices(
          { name: "MTA: Head Admin", value: "MTA: Head Admin" },
          { name: "MTA: Lead Admin", value: "MTA: Lead Admin" },
          { name: "MTA: Senior Admin", value: "MTA: Senior Admin" },
          { name: "MTA: Adminstrator", value: "MTA: Adminstrator" },
          { name: "MTA: Trial Admin", value: "MTA: Trial Admin" },
          { name: "MTA: Support", value: "MTA: Support" },
          { name: "MTA: Helper", value: "MTA: Helper" },
          { name: "ELV- S", value: "ELV- S" }
        )
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("السبب").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("إعطاء تحذير إداري")
    .addUserOption(option =>
      option.setName("user").setDescription("الشخص").setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("number").setDescription("رقم التحذير").setRequired(true)
        .addChoices(
          { name: "Warn 1#", value: 1 },
          { name: "Warn 2#", value: 2 },
          { name: "Warn 3#", value: 3 }
        )
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("السبب").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("evidence").setDescription("الدليل").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("إزالة جميع التحذيرات")
    .addUserOption(option =>
      option.setName("user").setDescription("الشخص").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("السبب").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("resign")
    .setDescription("تسليم رتبة إداري وأرشفة روماته")
    .addUserOption(option =>
      option.setName("user").setDescription("الإداري").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("سبب التسليم").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("last_rank").setDescription("رتبته الأخيرة").setRequired(true)
        .addChoices(
          { name: "MTA: Head Admin", value: "MTA: Head Admin" },
          { name: "MTA: Lead Admin", value: "MTA: Lead Admin" },
          { name: "MTA: Senior Admin", value: "MTA: Senior Admin" },
          { name: "MTA: Adminstrator", value: "MTA: Adminstrator" },
          { name: "MTA: Trial Admin", value: "MTA: Trial Admin" },
          { name: "MTA: Support", value: "MTA: Support" },
          { name: "MTA: Helper", value: "MTA: Helper" },
          { name: "ELV- S", value: "ELV- S" }
        )
    )
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

rest.put(
  Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
  { body: commands }
).then(() => {
  console.log("✅ Slash commands deployed");
}).catch(console.error);
