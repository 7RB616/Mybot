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
const GUILD_ID = "1407111299942584400";

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

const STAFF_RANKS = [...ADMIN_RANKS, ...SUPPORT_RANKS];
const ALL_STAFF_ROLES = [...STAFF_RANKS, "Admin Team", "Support Team"];
const WARN_ROLES = ["Warn 1#", "Warn 2#", "Warn 3#"];

// ================== FILES ==================
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

function safeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function isValidForm(text) {
  if (!text) return false;

  const requiredFields = [
    "اسم حسابك",
    "ايديك",
    "عدد ساعاتك الحالي",
    "من المسؤول عن قبولك"
  ];

  for (const field of requiredFields) {
    const regex = new RegExp(`${field}\\s*:\\s*(.+)`, "i");
    const match = text.match(regex);

    if (!match || !match[1] || match[1].trim().length < 2) {
      return false;
    }
  }

  return true;
}

function isAdmin(interactionOrMessage) {
  return interactionOrMessage.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

async function applyStaffRank(member, rank) {
  const rolesToRemove = ALL_STAFF_ROLES.map(r => ROLES[r]).filter(Boolean);
  await member.roles.remove(rolesToRemove).catch(() => null);

  const rolesToAdd = [ROLES[rank]];

  if (ADMIN_RANKS.includes(rank)) {
    rolesToAdd.push(ROLES["Admin Team"]);
  }

  if (SUPPORT_RANKS.includes(rank)) {
    rolesToAdd.push(ROLES["Support Team"]);
  }

  await member.roles.add(rolesToAdd.filter(Boolean)).catch(() => null);
}

// ================== READY ==================
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

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

  await channel.send({ embeds: [embed], components: [row] });
});

// ================== INTERACTIONS ==================
client.on("interactionCreate", async (interaction) => {

  // ================== BUTTONS ==================
  if (interaction.isButton()) {

    if (interaction.customId.startsWith("view_evidence_")) {
      const warnId = interaction.customId.replace("view_evidence_", "");
      const warns = loadJson(WARNS_FILE);
      const data = warns[warnId];

      if (!data) return interaction.reply({ content: "الدليل غير موجود.", ephemeral: true });

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

    if (interaction.customId.startsWith("cancel_warn_")) {
      if (!isAdmin(interaction)) {
        return interaction.reply({ content: "ما عندك صلاحية.", ephemeral: true });
      }

      const warnId = interaction.customId.replace("cancel_warn_", "");
      const warns = loadJson(WARNS_FILE);
      const data = warns[warnId];

      if (!data) return interaction.reply({ content: "التحذير غير موجود.", ephemeral: true });

      const member = await interaction.guild.members.fetch(data.userId).catch(() => null);

      if (member) {
        await member.roles.remove(ROLES[`Warn ${data.warnNumber}#`]).catch(() => null);
      }

      data.cancelled = true;
      data.cancelledBy = interaction.user.id;
      warns[warnId] = data;
      saveJson(WARNS_FILE, warns);

      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setDescription(
          `~~تم إصدار تحذير إداري~~\n\n` +
          `~~الإداري: <@${data.userId}>~~\n` +
          `~~رقم التحذير: Warn ${data.warnNumber}#~~\n` +
          `~~السبب: ${data.reason}~~\n\n` +
          `✅ تم الإلغاء بواسطة: ${interaction.user}`
        )
        .setColor("Green");

      return interaction.update({
        embeds: [embed],
        components: []
      });
    }

    if (
      interaction.customId.startsWith("approve_report_") ||
      interaction.customId.startsWith("reject_report_")
    ) {
      if (!isAdmin(interaction)) {
        return interaction.reply({ content: "ما عندك صلاحية.", ephemeral: true });
      }

      const parts = interaction.customId.split("_");
      const userId = parts[2];

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) return interaction.reply({ content: "ما قدرت ألقى الإداري.", ephemeral: true });

      if (interaction.customId.startsWith("approve_report_")) {
        const total = addPoints(userId, 2);

        await member.send(
          `✅ تم قبول تقريرك وإضافة **2** نقاط.\nمجموع نقاطك الآن: **${total}**`
        ).catch(() => null);

        return interaction.update({
          content: `✅ تم قبول التقرير بواسطة ${interaction.user}\nتم إضافة **2** نقاط لـ ${member}`,
          embeds: interaction.message.embeds,
          components: []
        });
      }

      if (interaction.customId.startsWith("reject_report_")) {
        await member.send("❌ تم رفض تقريرك من قبل المسؤول.").catch(() => null);

        return interaction.update({
          content: `❌ تم رفض التقرير بواسطة ${interaction.user}`,
          embeds: interaction.message.embeds,
          components: []
        });
      }
    }

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

    if (interaction.customId.startsWith("submit_form_")) {
      const channelId = interaction.customId.replace("submit_form_", "");
      const data = requests.get(channelId);

      if (!data) return interaction.reply({ content: "ما لقيت طلبك.", ephemeral: true });
      if (interaction.user.id !== data.userId) return interaction.reply({ content: "هذا الزر مو لك.", ephemeral: true });

      if (!isValidForm(data.formText)) {
        return interaction.reply({
          content:
            "لازم تعبي النموذج كامل بنفس الصيغة:\n```txt\nاسم حسابك :\nايديك :\nعدد ساعاتك الحالي مع ارفاق صورة :\nمن المسؤول عن قبولك :\n```",
          ephemeral: true
        });
      }

      if (!data.imageUrl) {
        return interaction.reply({ content: "لازم ترفق صورة ساعاتك.", ephemeral: true });
      }

      const log = await client.channels.fetch(ACTIVATION_LOG_CHANNEL_ID).catch(() => null);
      if (!log) return interaction.reply({ content: "ما قدرت ألقى روم اللوق.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("طلب تفعيل إداري جديد")
        .setColor("Yellow")
        .addFields(
          { name: "العضو", value: `<@${data.userId}>`, inline: true },
          { name: "الرتبة المطلوبة", value: data.roleName, inline: true },
          { name: "النموذج", value: data.formText }
        )
        .setImage(data.imageUrl)
        .setTimestamp();

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
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: "تم إرسال طلبك للإدارة، سيتم حذف الروم الآن.",
        ephemeral: true
      });

      const tempChannel = interaction.guild.channels.cache.get(channelId);
      if (tempChannel) {
        setTimeout(() => tempChannel.delete().catch(() => null), 3000);
      }

      return;
    }

    if (interaction.customId.startsWith("accept_") || interaction.customId.startsWith("reject_")) {
      if (!isAdmin(interaction)) {
        return interaction.reply({ content: "ما عندك صلاحية.", ephemeral: true });
      }

      const channelId = interaction.customId.split("_")[1];
      const data = requests.get(channelId);

      if (!data) return interaction.reply({ content: "الطلب انتهى أو غير موجود.", ephemeral: true });

      const member = await interaction.guild.members.fetch(data.userId).catch(() => null);
      if (!member) return interaction.reply({ content: "ما قدرت ألقى العضو.", ephemeral: true });

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

        const communicationChannel = await interaction.guild.channels.create({
          name: cleanUser,
          type: ChannelType.GuildText,
          parent: category.id
        });

        const reportChannel = await interaction.guild.channels.create({
          name: `report-${cleanUser}`,
          type: ChannelType.GuildText,
          parent: category.id
        });

        const reportEmbed = new EmbedBuilder()
          .setTitle("نموذج التقارير")
          .setDescription(
            `${member}\n\n` +
            "استخدم النموذج التالي للتقارير:\n\n" +
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

        await reportChannel.send({
          content: `${member}`,
          embeds: [reportEmbed]
        });

        await communicationChannel.send({
          content: `${member} هذا روم التواصل الخاص بك.`
        });

        await member.send("Eleven Roleplay يرحب بك في طاقم الإداري").catch(() => null);

        await interaction.update({
          content: `✅ تم قبول طلب ${member}\nتم إنشاء الكاتجوري والرومات الخاصة به.`,
          embeds: interaction.message.embeds,
          components: []
        });
      }

      if (interaction.customId.startsWith("reject_")) {
        await member.send("يبدو أن هناك خطأ في أثناء تفعيلك، يرجى إعادة التفعيل.").catch(() => null);

        await interaction.update({
          content: `❌ تم رفض طلب ${member}`,
          embeds: interaction.message.embeds,
          components: []
        });
      }

      requests.delete(channelId);
      return;
    }
  }

  // ================== SELECT MENU ==================
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId !== "select_role") return;

    const roleName = interaction.values[0];
    const member = interaction.member;
    const guild = interaction.guild;

    const alreadyOpen = guild.channels.cache.find(
      (ch) => ch.topic === `activation-${member.id}`
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
      channelId: channel.id,
      formText: null,
      imageUrl: null
    });

    const embed = new EmbedBuilder()
      .setTitle("نموذج التفعيل")
      .setDescription(
        `الرتبة المختارة: **${roleName}**\n\n` +
        "لازم تعبي النموذج كامل وترفق صورة ساعاتك، بعدها اضغط زر **أتممت النموذج**.\n\n" +
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
        .setCustomId(`submit_form_${channel.id}`)
        .setLabel("أتممت النموذج")
        .setStyle(ButtonStyle.Success)
    );

    await channel.send({
      content: `${member}`,
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: `تم فتح روم التفعيل الخاص بك: ${channel}`,
      ephemeral: true
    });
  }

  // ================== SLASH COMMANDS ==================
  if (interaction.isChatInputCommand()) {
    if (!isAdmin(interaction)) {
      return interaction.reply({ content: "ما عندك صلاحية.", ephemeral: true });
    }

    if (interaction.commandName === "rank") {
      const user = interaction.options.getUser("user");
      const rank = interaction.options.getString("rank");
      const reason = interaction.options.getString("reason");

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: "ما قدرت ألقى العضو.", ephemeral: true });

      await applyStaffRank(member, rank);

      const log = await client.channels.fetch(RANK_LOG_CHANNEL_ID).catch(() => null);

      if (log) {
        const embed = new EmbedBuilder()
          .setTitle("تغيير رتبة إدارية")
          .setColor("Blue")
          .addFields(
            { name: "الشخص", value: `${member}`, inline: true },
            { name: "المسؤول", value: `${interaction.user}`, inline: true },
            { name: "الرتبة الجديدة", value: rank, inline: true },
            { name: "السبب", value: reason }
          )
          .setTimestamp();

        await log.send({ embeds: [embed] });
      }

      return interaction.reply({
        content: `✅ تم تغيير رتبة ${member} إلى **${rank}**`,
        ephemeral: true
      });
    }

    if (interaction.commandName === "warn") {
      const user = interaction.options.getUser("user");
      const warnNumber = interaction.options.getInteger("number");
      const reason = interaction.options.getString("reason");
      const evidence = interaction.options.getString("evidence");

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: "ما قدرت ألقى العضو.", ephemeral: true });

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

      const embed = new EmbedBuilder()
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
    .setCustomId(`approve_report_${message.author.id}_${reportId}`)
    .setLabel("قبول التقرير")
    .setStyle(ButtonStyle.Success),

  new ButtonBuilder()
    .setCustomId(`reject_report_${message.author.id}_${reportId}`)
    .setLabel("رفض التقرير")
    .setStyle(ButtonStyle.Danger)
);

await message.channel.send({
  content: "تصحيح التقرير:",
  embeds: [embed],
  components: [row]
});

return message.reply("تم إرسال تقريرك للتصحيح في نفس الروم.");
}
});

// ================== LOGIN ==================
client.login(TOKEN)
  .then(() => console.log("📡 Login request sent"))
  .catch(err => console.log("❌ Login failed:", err.message));
