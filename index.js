console.log("Bot file started...");

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

require("dotenv").config();
const TOKEN = process.env.TOKEN;

// ================== IDS ==================
const ACTIVATION_CHANNEL_ID = "1500163233900662854";
const ACTIVATION_LOG_CHANNEL_ID = "1500163934252961833";
const WARN_LOG_CHANNEL_ID = "1486488232890990704";
const RANK_LOG_CHANNEL_ID = "1500232337752068156";
const ARCHIVE_CATEGORY_ID = "1500237156961222827";

// ================== ROLES ==================
const ROLES = {
  "MTA: Head Admin": "1473459923064193246",
  "MTA: Lead Admin": "1473459924414758952",
  "MTA: Senior Admin": "1473459925375127702",
  "MTA: Adminstrator": "1473459926046212210",
  "MTA: Trial Admin": "1473459927665217740",

  "MTA: Support": "1473459932526280835",
  "MTA: Helper": "1473459933478653992",
  "ELV- S": "1473459934476894421",

  "Admin Team": "1473459929049202811",
  "Support Team": "1473459930789839049",

  "Warn 1#": "1473459936481775718",
  "Warn 2#": "1473459937513308313",
  "Warn 3#": "1473459938633322556"
};

const ADMIN_RANKS = [
  "MTA: Head Admin",
  "MTA: Lead Admin",
  "MTA: Senior Admin",
  "MTA: Adminstrator",
  "MTA: Trial Admin"
];

const SUPPORT_RANKS = [
  "MTA: Support",
  "MTA: Helper",
  "ELV- S"
];

const ALL_STAFF_ROLES = [
  ...ADMIN_RANKS,
  ...SUPPORT_RANKS,
  "Admin Team",
  "Support Team"
];

const WARN_ROLES = ["Warn 1#", "Warn 2#", "Warn 3#"];

const POINTS_FILE = "./points.json";
const WARNS_FILE = "./warns.json";

// ================== CLIENT ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const requests = new Map();

// ================== FUNCTIONS ==================
function loadJson(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function addPoints(userId, amount) {
  const data = loadJson(POINTS_FILE);
  data[userId] = (data[userId] || 0) + amount;
  if (data[userId] < 0) data[userId] = 0;
  saveJson(POINTS_FILE, data);
  return data[userId];
}

function getPoints(userId) {
  const data = loadJson(POINTS_FILE);
  return data[userId] || 0;
}

function isAdmin(obj) {
  return obj.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function safeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function applyStaffRank(member, rank) {
  const removeRoles = ALL_STAFF_ROLES.map(r => ROLES[r]).filter(Boolean);
  await member.roles.remove(removeRoles).catch(() => null);

  const addRoles = [ROLES[rank]];

  if (ADMIN_RANKS.includes(rank)) addRoles.push(ROLES["Admin Team"]);
  if (SUPPORT_RANKS.includes(rank)) addRoles.push(ROLES["Support Team"]);

  await member.roles.add(addRoles.filter(Boolean)).catch(() => null);
}

// ================== READY ==================
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const { REST, Routes } = require("discord.js");

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    {
      name: "warn",
      description: "تحذير إداري",
      options: [
        { name: "user", type: 6, required: true, description: "الشخص" },
        { name: "number", type: 4, required: true, description: "رقم التحذير" },
        { name: "reason", type: 3, required: true, description: "السبب" },
        { name: "evidence", type: 3, required: true, description: "الدليل" }
      ]
    },
    {
      name: "clearwarns",
      description: "حذف التحذيرات",
      options: [
        { name: "user", type: 6, required: true, description: "الشخص" },
        { name: "reason", type: 3, required: true, description: "السبب" }
      ]
    },
    {
      name: "rank",
      description: "تغيير رتبة",
      options: [
        { name: "user", type: 6, required: true, description: "الشخص" },
        { name: "rank", type: 3, required: true, description: "الرتبة" },
        { name: "reason", type: 3, required: true, description: "السبب" }
      ]
    },
    {
      name: "resign",
      description: "تسليم رتبة",
      options: [
        { name: "user", type: 6, required: true, description: "الإداري" },
        { name: "reason", type: 3, required: true, description: "السبب" },
        { name: "last_rank", type: 3, required: true, description: "رتبته الأخيرة" }
      ]
    }
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, "1407111299942584400"),
    { body: commands }
  );

  console.log("✅ Slash commands deployed");
});
  
  const channel = await client.channels.fetch(ACTIVATION_CHANNEL_ID).catch(() => null);
  if (!channel) return console.log("❌ ما لقيت روم التفعيل");

  const embed = new EmbedBuilder()
    .setTitle("لوحة التفعيل الإداري")
    .setDescription("اضغط على الزر لاختيار رتبتك وبدء التفعيل.")
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_activation")
      .setLabel("طلب تفعيل إداري")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
});

// ================== INTERACTIONS ==================
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    // دليل التحذير
    if (interaction.customId.startsWith("view_evidence_")) {
      const warnId = interaction.customId.replace("view_evidence_", "");
      const warns = loadJson(WARNS_FILE);
      const data = warns[warnId];

      if (!data) {
        return interaction.reply({ content: "الدليل غير موجود.", ephemeral: true });
      }

      const canView =
        interaction.user.id === data.userId ||
        interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

      if (!canView) {
        return interaction.reply({ content: "ما عندك صلاحية لعرض الدليل.", ephemeral: true });
      }

      return interaction.reply({
        content: `📎 **الدليل:**\n${data.evidence}`,
        ephemeral: true
      });
    }

    // إلغاء تحذير واحد
    if (interaction.customId.startsWith("cancel_warn_")) {
      if (!isAdmin(interaction)) {
        return interaction.reply({ content: "ما عندك صلاحية.", ephemeral: true });
      }

      const warnId = interaction.customId.replace("cancel_warn_", "");
      const warns = loadJson(WARNS_FILE);
      const data = warns[warnId];

      if (!data) {
        return interaction.reply({ content: "التحذير غير موجود.", ephemeral: true });
      }

      const member = await interaction.guild.members.fetch(data.userId).catch(() => null);

      if (member) {
        await member.roles.remove(ROLES[`Warn ${data.warnNumber}#`]).catch(() => null);
      }

      data.cancelled = true;
      data.cancelledBy = interaction.user.id;
      warns[warnId] = data;
      saveJson(WARNS_FILE, warns);

      const cancelEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setDescription(
          `~~تم إصدار تحذير إداري~~\n\n` +
          `~~الإداري: <@${data.userId}>~~\n` +
          `~~رقم التحذير: Warn ${data.warnNumber}#~~\n` +
          `~~السبب: ${data.reason}~~\n\n` +
          `✅ تم الإلغاء بواسطة: ${interaction.user}`
        )
        .setColor("Green");

      return interaction.update({
        embeds: [cancelEmbed],
        components: []
      });
    }
    // قبول / رفض التقرير
    if (
      interaction.customId.startsWith("approve_report_") ||
      interaction.customId.startsWith("reject_report_")
    ) {
      if (!isAdmin(interaction)) {
        return interaction.reply({ content: "ما عندك صلاحية.", ephemeral: true });
      }

      const parts = interaction.customId.split("_");
      const userId = parts[2];
      const reportId = parts[3];

      const reportMessage = await interaction.channel.messages.fetch(reportId).catch(() => null);

      await interaction.deferUpdate().catch(() => null);

      if (interaction.customId.startsWith("approve_report_")) {
        addPoints(userId, 2);
        if (reportMessage) await reportMessage.react("✅").catch(() => null);
        return interaction.message.delete().catch(() => null);
      }

      if (interaction.customId.startsWith("reject_report_")) {
        if (reportMessage) await reportMessage.react("❌").catch(() => null);
        return interaction.message.delete().catch(() => null);
      }
    }

    // بداية التفعيل
    if (interaction.customId === "start_activation") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("select_role")
        .setPlaceholder("اختر رتبتك")
        .addOptions([
          { label: "MTA: Head Admin", value: "MTA: Head Admin" },
          { label: "MTA: Lead Admin", value: "MTA: Lead Admin" },
          { label: "MTA: Senior Admin", value: "MTA: Senior Admin" },
          { label: "MTA: Adminstrator", value: "MTA: Adminstrator" },
          { label: "MTA: Trial Admin", value: "MTA: Trial Admin" },
          { label: "MTA: Support", value: "MTA: Support" },
          { label: "MTA: Helper", value: "MTA: Helper" },
          { label: "ELV- S", value: "ELV- S" }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      return interaction.reply({
        content: "اختر الرتبة:",
        components: [row],
        ephemeral: true
      });
    }

    // إرسال طلب التفعيل للوق
    if (interaction.customId.startsWith("submit_")) {
      const channelId = interaction.customId.replace("submit_", "");
      const data = requests.get(channelId);

      if (!data) {
        return interaction.reply({ content: "ما لقيت طلبك.", ephemeral: true });
      }

      if (interaction.user.id !== data.userId) {
        return interaction.reply({ content: "هذا الزر مو لك.", ephemeral: true });
      }

      const log = await client.channels.fetch(ACTIVATION_LOG_CHANNEL_ID).catch(() => null);
      if (!log) {
        return interaction.reply({ content: "ما قدرت ألقى روم اللوق.", ephemeral: true });
      }

      const requestEmbed = new EmbedBuilder()
        .setTitle("طلب تفعيل إداري جديد")
        .setColor("Yellow")
        .addFields(
          { name: "العضو", value: `<@${data.userId}>`, inline: true },
          { name: "الرتبة المطلوبة", value: data.roleName, inline: true },
          { name: "النموذج", value: data.formText || "بدون نص" }
        )
        .setTimestamp();

      if (data.imageUrl) requestEmbed.setImage(data.imageUrl);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${channelId}`)
          .setLabel("قبول")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_${channelId}`)
          .setLabel("رفض")
          .setStyle(ButtonStyle.Danger)
      );

      await log.send({
        content: "يوجد طلب تفعيل جديد:",
        embeds: [requestEmbed],
        components: [row]
      });

      return interaction.reply({
        content: "تم إرسال طلبك للإدارة.",
        ephemeral: true
      });
    }

    // قبول / رفض التفعيل
    if (interaction.customId.startsWith("accept_") || interaction.customId.startsWith("reject_")) {
      if (!isAdmin(interaction)) {
        return interaction.reply({ content: "ما عندك صلاحية.", ephemeral: true });
      }

      const channelId = interaction.customId.split("_")[1];
      const data = requests.get(channelId);

      if (!data) {
        return interaction.reply({ content: "الطلب انتهى أو غير موجود.", ephemeral: true });
      }

      const member = await interaction.guild.members.fetch(data.userId).catch(() => null);
      if (!member) {
        return interaction.reply({ content: "ما قدرت ألقى العضو.", ephemeral: true });
      }

      if (interaction.customId.startsWith("accept_")) {
        await applyStaffRank(member, data.roleName);

        const cleanUser = safeName(member.user.username);

        const category = await interaction.guild.channels.create({
          name: `${member.user.username} - ${data.roleName}`,
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            {
              id: member.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }
          ]
        });

        const chat = await interaction.guild.channels.create({
          name: cleanUser,
          type: ChannelType.GuildText,
          parent: category.id
        });

        const report = await interaction.guild.channels.create({
          name: `report-${cleanUser}`,
          type: ChannelType.GuildText,
          parent: category.id
        });

        const reportEmbed = new EmbedBuilder()
          .setTitle("نموذج التقارير")
          .setDescription(
            `${member}\n\n` +
            "```txt\n" +
            "اسمك :\n" +
            "رتبتك :\n" +
            "نوع التقرير :\n" +
            "شرح التقرير :\n" +
            "الدليل / الصورة :\n" +
            "```"
          )
          .setColor("Blue")
          .setTimestamp();

        await report.send({ content: `${member}`, embeds: [reportEmbed] });
        await chat.send({ content: `${member} هذا روم التواصل الخاص بك.` });

        await member.send("تم قبولك في الطاقم الإداري.").catch(() => null);

        requests.delete(channelId);

        return interaction.update({
          content: `✅ تم قبول ${member}`,
          embeds: interaction.message.embeds,
          components: []
        });
      }

      if (interaction.customId.startsWith("reject_")) {
        await member.send("تم رفض طلب التفعيل، يرجى إعادة التقديم.").catch(() => null);

        requests.delete(channelId);

        return interaction.update({
          content: `❌ تم رفض ${member}`,
          embeds: interaction.message.embeds,
          components: []
        });
      }
    }
  }

  // ================== SELECT MENU ==================
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId !== "select_role") return;

    const roleName = interaction.values[0];
    const member = interaction.member;
    const guild = interaction.guild;

    const alreadyOpen = guild.channels.cache.find(
      ch => ch.topic === `activation-${member.id}`
    );

    if (alreadyOpen) {
      return interaction.reply({
        content: `عندك روم تفعيل مفتوح بالفعل: ${alreadyOpen}`,
        ephemeral: true
      });
    }

    const channel = await guild.channels.create({
      name: `تفعيل-${member.user.username}`,
      type: ChannelType.GuildText,
      topic: `activation-${member.id}`,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: member.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        {
          id: client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    requests.set(channel.id, {
      userId: member.id,
      roleName,
      formText: null,
      imageUrl: null
    });

    const formEmbed = new EmbedBuilder()
      .setTitle("نموذج التفعيل")
      .setDescription(
        `الرتبة المختارة: **${roleName}**\n\n` +
        "اكتب بياناتك وارفق صورة، ثم اضغط زر **أتممت النموذج**.\n\n" +
        "```txt\n" +
        "اسم حسابك :\n" +
        "ايديك :\n" +
        "عدد ساعاتك الحالي مع ارفاق صورة :\n" +
        "من المسؤول عن قبولك :\n" +
        "```"
      )
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`submit_${channel.id}`)
        .setLabel("أتممت النموذج")
        .setStyle(ButtonStyle.Success)
    );

    await channel.send({
      content: `${member}`,
      embeds: [formEmbed],
      components: [row]
    });

    return interaction.reply({
      content: `تم فتح روم التفعيل الخاص بك: ${channel}`,
      ephemeral: true
    });
        }
  // ================== SLASH COMMANDS ==================
  if (interaction.isChatInputCommand()) {
    if (!isAdmin(interaction)) {
      return interaction.reply({ content: "ما عندك صلاحية.", ephemeral: true });
    }

    // /rank
    if (interaction.commandName === "rank") {
      const user = interaction.options.getUser("user");
      const rank = interaction.options.getString("rank");
      const reason = interaction.options.getString("reason");

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: "ما قدرت ألقى العضو.", ephemeral: true });
      }

      await applyStaffRank(member, rank);

      const log = await client.channels.fetch(RANK_LOG_CHANNEL_ID).catch(() => null);
      if (log) {
        const rankEmbed = new EmbedBuilder()
          .setTitle("تغيير رتبة إدارية")
          .setColor("Blue")
          .addFields(
            { name: "الشخص", value: `${member}`, inline: true },
            { name: "المسؤول", value: `${interaction.user}`, inline: true },
            { name: "الرتبة الجديدة", value: rank, inline: true },
            { name: "السبب", value: reason }
          )
          .setTimestamp();

        await log.send({ embeds: [rankEmbed] });
      }

      return interaction.reply({
        content: `✅ تم تغيير رتبة ${member} إلى **${rank}**`,
        ephemeral: true
      });
    }

    // /warn
    if (interaction.commandName === "warn") {
      const user = interaction.options.getUser("user");
      const warnNumber = interaction.options.getInteger("number");
      const reason = interaction.options.getString("reason");
      const evidence = interaction.options.getString("evidence");

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: "ما قدرت ألقى العضو.", ephemeral: true });
      }

      const warnRoleName = `Warn ${warnNumber}#`;
      const warnRoleId = ROLES[warnRoleName];

      await member.roles.add(warnRoleId).catch(() => null);

      const warnId = `${Date.now()}_${user.id}`;
      const warns = loadJson(WARNS_FILE);

      warns[warnId] = {
        warnId,
        userId: user.id,
        warnNumber,
        reason,
        evidence,
        by: interaction.user.id,
        cancelled: false
      };

      saveJson(WARNS_FILE, warns);

      const warnEmbed = new EmbedBuilder()
        .setTitle("تحذير إداري")
        .setDescription(
          `تم إصدار تحذير إداري\n\n` +
          `الإداري: ${member}\n` +
          `رقم التحذير: **${warnRoleName}**\n` +
          `السبب: **${reason}**\n` +
          `بواسطة: ${interaction.user}`
        )
        .setColor("Red")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`view_evidence_${warnId}`)
          .setLabel("عرض الدليل")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`cancel_warn_${warnId}`)
          .setLabel("إلغاء التحذير")
          .setStyle(ButtonStyle.Danger)
      );

      const warnLog = await client.channels.fetch(WARN_LOG_CHANNEL_ID).catch(() => null);

      if (warnLog) {
        await warnLog.send({
          embeds: [warnEmbed],
          components: [row]
        });
      }

      await member.send(`⚠️ تم إعطاؤك **${warnRoleName}**\nالسبب: ${reason}`).catch(() => null);

      return interaction.reply({
        content: `✅ تم إصدار ${warnRoleName} لـ ${member}`,
        ephemeral: true
      });
    }

    // /clearwarns
    if (interaction.commandName === "clearwarns") {
      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: "ما قدرت ألقى العضو.", ephemeral: true });
      }

      const warnRoleIds = WARN_ROLES.map(r => ROLES[r]).filter(Boolean);
      await member.roles.remove(warnRoleIds).catch(() => null);

      const warnLog = await client.channels.fetch(WARN_LOG_CHANNEL_ID).catch(() => null);
      if (warnLog) {
        const clearEmbed = new EmbedBuilder()
          .setTitle("إزالة جميع التحذيرات")
          .setColor("Green")
          .addFields(
            { name: "الشخص", value: `${member}`, inline: true },
            { name: "المسؤول", value: `${interaction.user}`, inline: true },
            { name: "السبب", value: reason }
          )
          .setTimestamp();

        await warnLog.send({ embeds: [clearEmbed] });
      }

      return interaction.reply({
        content: `✅ تم إزالة جميع التحذيرات من ${member}`,
        ephemeral: true
      });
    }

    // /resign
    if (interaction.commandName === "resign") {
      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      const lastRank = interaction.options.getString("last_rank");

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: "ما قدرت ألقى الإداري.", ephemeral: true });
      }

      const archiveCategory = await interaction.guild.channels.fetch(ARCHIVE_CATEGORY_ID).catch(() => null);
      if (!archiveCategory) {
        return interaction.reply({ content: "ما قدرت ألقى كاتجوري الأرشيف.", ephemeral: true });
      }

      const oldCategory = interaction.guild.channels.cache.find(
        ch =>
          ch.type === ChannelType.GuildCategory &&
          ch.name.includes(member.user.username)
      );

      if (!oldCategory) {
        return interaction.reply({ content: "ما لقيت كاتجوري الإداري.", ephemeral: true });
      }

      const staffChannels = interaction.guild.channels.cache.filter(
        ch => ch.parentId === oldCategory.id && ch.type === ChannelType.GuildText
      );

      for (const [, ch] of staffChannels) {
        await ch.setParent(ARCHIVE_CATEGORY_ID).catch(() => null);
        await ch.send({
          content:
            `📦 تم أرشفة هذا الروم\n\n` +
            `الإداري: ${user}\n` +
            `الرتبة الأخيرة: **${lastRank}**\n` +
            `السبب: **${reason}**\n` +
            `بواسطة: ${interaction.user}`
        }).catch(() => null);
      }

      await oldCategory.delete().catch(() => null);

      const rolesToRemove = [...ALL_STAFF_ROLES, ...WARN_ROLES]
        .map(r => ROLES[r])
        .filter(Boolean);

      await member.roles.remove(rolesToRemove).catch(() => null);
      await member.kick(`Resigned - ${reason}`).catch(() => null);

      const log = await client.channels.fetch(RANK_LOG_CHANNEL_ID).catch(() => null);
      if (log) {
        const resignEmbed = new EmbedBuilder()
          .setTitle("تسليم رتبة إدارية")
          .setColor("DarkRed")
          .addFields(
            { name: "الإداري", value: `${user}`, inline: true },
            { name: "المسؤول", value: `${interaction.user}`, inline: true },
            { name: "الرتبة الأخيرة", value: lastRank, inline: true },
            { name: "السبب", value: reason }
          )
          .setTimestamp();

        await log.send({ embeds: [resignEmbed] });
      }

      return interaction.reply({
        content: `✅ تم تسليم رتبة ${user} وأرشفة روماته.`,
        ephemeral: true
      });
    }
  }
});

// ================== MESSAGE CREATE ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // حفظ بيانات نموذج التفعيل
  const data = requests.get(message.channel.id);
  if (data && message.author.id === data.userId) {
    if (message.content) data.formText = message.content;
    if (message.attachments.first()) data.imageUrl = message.attachments.first().url;

    requests.set(message.channel.id, data);

    return message.reply("تم حفظ ردك، إذا انتهيت اضغط زر **أتممت النموذج**.");
  }

  const args = message.content.trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // أوامر النقاط
  if (command === "!addpoints") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("ما عندك صلاحية.");
    }

    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!user || isNaN(amount)) {
      return message.reply("الاستخدام: `!addpoints @user 5`");
    }

    await message.delete().catch(() => null);

    const total = addPoints(user.id, amount);
    return message.channel.send(`✅ تم إضافة **${amount}** نقاط لـ ${user}\nالمجموع الآن: **${total}**`);
  }

  if (command === "!removepoints") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("ما عندك صلاحية.");
    }

    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!user || isNaN(amount)) {
      return message.reply("الاستخدام: `!removepoints @user 5`");
    }

    await message.delete().catch(() => null);

    const total = addPoints(user.id, -amount);
    return message.channel.send(`✅ تم خصم **${amount}** نقاط من ${user}\nالمجموع الآن: **${total}**`);
  }

  if (command === "!points") {
    const user = message.mentions.users.first() || message.author;
    const total = getPoints(user.id);

    return message.reply(`📌 نقاط ${user}: **${total}**`);
  }

  if (command === "!top") {
    const pointsData = loadJson(POINTS_FILE);

    const top = Object.entries(pointsData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!top.length) return message.reply("ما فيه نقاط مسجلة.");

    const text = top
      .map(([userId, points], index) => `${index + 1}. <@${userId}> — **${points}** نقطة`)
      .join("\n");

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 توب النقاط")
          .setDescription(text)
          .setColor("Gold")
      ]
    });
  }

  // التقارير
  if (message.channel.name.startsWith("report-")) {
    if (message.content.length < 5 && !message.attachments.first()) return;

    const reportId = message.id;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_report_${message.author.id}_${reportId}`)
        .setLabel("قبول")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_report_${message.author.id}_${reportId}`)
        .setLabel("رفض")
        .setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({
      content: "تصحيح التقرير",
      components: [row]
    });

    return;
  }
});

// ================== LOGIN ==================
client.login(TOKEN)
  .then(() => console.log("📡 Login request sent"))
  .catch(err => console.log("❌ Login failed:", err.message));
