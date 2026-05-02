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

// السيرفر
const GUILD_ID = "1407111299942584400";

// الرومات
const ACTIVATION_CHANNEL_ID = "1500163233900662854";
const LOG_CHANNEL_ID = "1500163934252961833";

// الرتب
const ROLES = {
  "MTA: Head Admin": "1473459923064193246",
  "MTA: Lead Admin": "1473459924414758952",
  "MTA: Senior Admin": "1473459925375127702",
  "MTA: Adminstrator": "1473459926046212210",
  "MTA: Trial Admin": "1473459927665217740",
  "Admin Team": "1473459929049202811",
  "MTA: Support": "1473459932526280835",
  "MTA: Helper": "1473459933478653992",
  "Support Team": "1473459930789839049",
  "ELV- S": "1473459934476894421"
};

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

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {

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
          { label: "Admin Team", value: "Admin Team" },
          { label: "MTA: Support", value: "MTA: Support" },
          { label: "MTA: Helper", value: "MTA: Helper" },
          { label: "Support Team", value: "Support Team" },
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

      if (!data) {
        return interaction.reply({ content: "ما لقيت طلبك.", ephemeral: true });
      }

      if (interaction.user.id !== data.userId) {
        return interaction.reply({ content: "هذا الزر مو لك.", ephemeral: true });
      }

      if (!data.formText && !data.imageUrl) {
        return interaction.reply({
          content: "لازم ترسل النموذج أو الصورة أولًا قبل الضغط على الزر.",
          ephemeral: true
        });
      }

      const log = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (!log) {
        return interaction.reply({ content: "ما قدرت ألقى روم اللوق.", ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle("طلب تفعيل إداري جديد")
        .setColor("Yellow")
        .addFields(
          { name: "العضو", value: `<@${data.userId}>`, inline: true },
          { name: "الرتبة المطلوبة", value: data.roleName, inline: true },
          { name: "النموذج", value: data.formText || "بدون نص" }
        )
        .setTimestamp();

      if (data.imageUrl) {
        embed.setImage(data.imageUrl);
      }

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
        setTimeout(() => {
          tempChannel.delete().catch(() => null);
        }, 3000);
      }

      return;
    }

    if (interaction.customId.startsWith("accept_") || interaction.customId.startsWith("reject_")) {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
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
        const roleId = ROLES[data.roleName];

        await member.roles.add(roleId).catch(() => null);
        await member.send("West Roleplay يرحب بك في طاقم الاداري").catch(() => null);

        await interaction.update({
          content: `✅ تم قبول طلب ${member}`,
          embeds: interaction.message.embeds,
          components: []
        });
      }

      if (interaction.customId.startsWith("reject_")) {
        await member.send("يبدو ان هناك خطأ في اثناء تفعيلك يرجى اعادة التفعيل").catch(() => null);

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
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
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
          "انسخ النموذج، عبّه، أرفق الصورة، ثم اضغط زر **أتممت النموذج**.\n\n" +
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
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const data = requests.get(message.channel.id);
  if (!data) return;
  if (message.author.id !== data.userId) return;

  if (message.content) {
    data.formText = message.content;
  }

  if (message.attachments.first()) {
    data.imageUrl = message.attachments.first().url;
  }

  requests.set(message.channel.id, data);

  await message.reply("تم حفظ ردك، إذا انتهيت اضغط زر **أتممت النموذج**.");
});

client.login(TOKEN);
