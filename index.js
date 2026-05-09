const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

/* =========================
   CONFIG
========================= */



const PREFIX = "!";

const AUTO_ROLE_ID = "1502221688450977912";

const MENTION_CHANNELS = [
  "CHANNEL_ID_1",
  "CHANNEL_ID_2",
  "CHANNEL_ID_3"
];

const DELETE_AFTER = 5000;

/* =========================
   CLIENT
========================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* =========================
   TEMPVOICE DATA
========================= */

const tempChannels = new Map();

/* =========================
   READY
========================= */

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =========================
   FUNCTIONS
========================= */

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function getVoice(interaction) {
  const channel = interaction.member.voice.channel;

  if (!channel) return null;

  if (!tempChannels.has(channel.id)) return null;

  return channel;
}

function isOwner(interaction, channel) {
  const data = tempChannels.get(channel.id);

  return (
    data &&
    data.ownerId === interaction.user.id
  );
}

/* =========================
   MEMBER JOIN
========================= */

client.on("guildMemberAdd", async (member) => {

  const role =
    member.guild.roles.cache.get(AUTO_ROLE_ID);

  if (role) {
    await member.roles.add(role).catch(() => {});
  }

  for (const channelId of MENTION_CHANNELS) {

    const channel =
      member.guild.channels.cache.get(channelId);

    if (!channel) continue;

    const msg =
      await channel.send(`${member}`);

    setTimeout(() => {
      msg.delete().catch(() => {});
    }, DELETE_AFTER);
  }
});

/* =========================
   MESSAGE COMMANDS
========================= */

client.on("messageCreate", async (message) => {

  if (message.author.bot || !message.guild) return;

  const args =
    message.content.trim().split(/ +/);

  const cmd =
    args.shift().toLowerCase();

  /* =========================
     SETUP TEMPVOICE
  ========================= */

  if (cmd === `${PREFIX}setup-tempvoice`) {

    if (!isAdmin(message.member)) {
      return message.reply("❌ للإدارة فقط.");
    }

    const category =
      await message.guild.channels.create({
        name: "🔊 TEMP VOICE",
        type: ChannelType.GuildCategory
      });

    await message.guild.channels.create({
      name: "➕ Join To Create",
      type: ChannelType.GuildVoice,
      parent: category.id
    });

    const embed = new EmbedBuilder()
      .setColor("#ffffff")
      .setTitle("TempVoice Interface")
      .setDescription(
        "لوحة التحكم بالرومات الصوتية المؤقتة."
      );

    const row1 =
      new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId("tv_name")
          .setLabel("Name")
          .setEmoji("🔤")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("tv_limit")
          .setLabel("Limit")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("tv_lock")
          .setLabel("Lock")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("tv_unlock")
          .setLabel("Unlock")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Secondary)
      );

    const row2 =
      new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId("tv_hide")
          .setLabel("Invisible")
          .setEmoji("🙈")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("tv_show")
          .setLabel("Visible")
          .setEmoji("👁️")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("tv_claim")
          .setLabel("Claim")
          .setEmoji("👑")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("tv_delete")
          .setLabel("Delete")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger)
      );

    await message.channel.send({
      embeds: [embed],
      components: [row1, row2]
    });

    return message.reply(
      "✅ تم إنشاء نظام TempVoice."
    );
  }

  /* =========================
     CLEAR
  ========================= */

  if (cmd === `${PREFIX}clear`) {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return message.reply("❌ ما عندك صلاحية.");
    }

    const amount = parseInt(args[0]);

    if (!amount || amount < 1 || amount > 100) {
      return message.reply(
        "❌ اكتب رقم من 1 إلى 100."
      );
    }

    await message.channel.bulkDelete(amount, true);

    const msg =
      await message.channel.send(
        `✅ تم حذف ${amount} رسالة.`
      );

    setTimeout(() => {
      msg.delete().catch(() => {});
    }, 3000);
  }

  /* =========================
     LOCK / UNLOCK
  ========================= */

  if (cmd === `${PREFIX}lock`) {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return message.reply("❌ ما عندك صلاحية.");
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    return message.reply("🔒 تم قفل الشات.");
  }

  if (cmd === `${PREFIX}unlock`) {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return message.reply("❌ ما عندك صلاحية.");
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: true
      }
    );

    return message.reply("🔓 تم فتح الشات.");
  }

  /* =========================
     REPEAT
  ========================= */

  if (cmd === `${PREFIX}repeat`) {

    if (!isAdmin(message.member)) {
      return message.reply("❌ للإدارة فقط.");
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply("❌ منشن الروم.");
    }

    args.shift();

    const text = args.join(" ");

    const files =
      message.attachments.map(att => att.url);

    if (!text && files.length === 0) {
      return message.reply(
        "❌ اكتب رسالة أو ارفق صورة."
      );
    }

    await channel.send({
      content: text || null,
      files
    });

    return message.reply("✅ تم الإرسال.");
  }

  /* =========================
     EMBED
  ========================= */

  if (cmd === `${PREFIX}embed`) {

    if (!isAdmin(message.member)) {
      return message.reply("❌ للإدارة فقط.");
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply("❌ منشن الروم.");
    }

    args.shift();

    const text = args.join(" ");

    const image =
      message.attachments.first()?.url;

    if (!text && !image) {
      return message.reply(
        "❌ اكتب نص أو ارفق صورة."
      );
    }

    const embed = new EmbedBuilder()
      .setColor("#ffffff")
      .setDescription(text || "‎");

    if (image) {
      embed.setImage(image);
    }

    await channel.send({
      embeds: [embed]
    });

    return message.reply(
      "✅ تم إرسال الإيمبد."
    );
  }
});

/* =========================
   TEMPVOICE CREATE / DELETE
========================= */

client.on(
  "voiceStateUpdate",
  async (oldState, newState) => {

    if (
      newState.channel &&
      newState.channel.name ===
      "➕ Join To Create"
    ) {

      const voice =
        await newState.guild.channels.create({
          name:
            `${newState.member.user.username}'s Voice`,
          type: ChannelType.GuildVoice,
          parent: newState.channel.parentId
        });

      tempChannels.set(voice.id, {
        ownerId: newState.member.id
      });

      await newState.member.voice.setChannel(
        voice
      );
    }

    if (
      oldState.channel &&
      tempChannels.has(oldState.channel.id) &&
      oldState.channel.members.size === 0
    ) {

      tempChannels.delete(oldState.channel.id);

      await oldState.channel.delete().catch(() => {});
    }
  }
);

/* =========================
   INTERACTIONS
========================= */

client.on(
  "interactionCreate",
  async (interaction) => {

    if (interaction.isButton()) {

      const channel =
        getVoice(interaction);

      if (!channel) {
        return interaction.reply({
          content:
            "❌ ادخل رومك المؤقت.",
          ephemeral: true
        });
      }

      if (
        interaction.customId !==
        "tv_claim" &&
        !isOwner(interaction, channel)
      ) {
        return interaction.reply({
          content:
            "❌ لست مالك الروم.",
          ephemeral: true
        });
      }

      /* LOCK */

      if (
        interaction.customId ===
        "tv_lock"
      ) {

        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            Connect: false
          }
        );

        return interaction.reply({
          content:
            "🔒 تم قفل الروم.",
          ephemeral: true
        });
      }

      /* UNLOCK */

      if (
        interaction.customId ===
        "tv_unlock"
      ) {

        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            Connect: true
          }
        );

        return interaction.reply({
          content:
            "🔓 تم فتح الروم.",
          ephemeral: true
        });
      }

      /* HIDE */

      if (
        interaction.customId ===
        "tv_hide"
      ) {

        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            ViewChannel: false
          }
        );

        return interaction.reply({
          content:
            "🙈 تم إخفاء الروم.",
          ephemeral: true
        });
      }

      /* SHOW */

      if (
        interaction.customId ===
        "tv_show"
      ) {

        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            ViewChannel: true
          }
        );

        return interaction.reply({
          content:
            "👁️ تم إظهار الروم.",
          ephemeral: true
        });
      }

      /* DELETE */

      if (
        interaction.customId ===
        "tv_delete"
      ) {

        tempChannels.delete(channel.id);

        await channel.delete().catch(() => {});

        return interaction.reply({
          content:
            "🗑️ تم حذف الروم.",
          ephemeral: true
        }).catch(() => {});
      }

      /* CLAIM */

      if (
        interaction.customId ===
        "tv_claim"
      ) {

        const data =
          tempChannels.get(channel.id);

        data.ownerId =
          interaction.user.id;

        tempChannels.set(
          channel.id,
          data
        );

        return interaction.reply({
          content:
            "👑 أصبحت مالك الروم.",
          ephemeral: true
        });
      }

      /* NAME */

      if (
        interaction.customId ===
        "tv_name"
      ) {

        const modal =
          new ModalBuilder()
            .setCustomId(
              "modal_name"
            )
            .setTitle(
              "Change Name"
            );

        const input =
          new TextInputBuilder()
            .setCustomId("name")
            .setLabel(
              "Voice Name"
            )
            .setStyle(
              TextInputStyle.Short
            );

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            input
          )
        );

        return interaction.showModal(
          modal
        );
      }

      /* LIMIT */

      if (
        interaction.customId ===
        "tv_limit"
      ) {

        const modal =
          new ModalBuilder()
            .setCustomId(
              "modal_limit"
            )
            .setTitle(
              "Change Limit"
            );

        const input =
          new TextInputBuilder()
            .setCustomId(
              "limit"
            )
            .setLabel(
              "Voice Limit"
            )
            .setStyle(
              TextInputStyle.Short
            );

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            input
          )
        );

        return interaction.showModal(
          modal
        );
      }
    }

    /* =========================
       MODALS
    ========================= */

    if (interaction.isModalSubmit()) {

      const channel =
        getVoice(interaction);

      if (!channel) {
        return interaction.reply({
          content:
            "❌ ادخل رومك المؤقت.",
          ephemeral: true
        });
      }

      if (
        !isOwner(
          interaction,
          channel
        )
      ) {
        return interaction.reply({
          content:
            "❌ لست مالك الروم.",
          ephemeral: true
        });
      }

      /* NAME */

      if (
        interaction.customId ===
        "modal_name"
      ) {

        const name =
          interaction.fields.getTextInputValue(
            "name"
          );

        await channel.setName(name);

        return interaction.reply({
          content:
            "✅ تم تغيير الاسم.",
          ephemeral: true
        });
      }

      /* LIMIT */

      if (
        interaction.customId ===
        "modal_limit"
      ) {

        const limit =
          parseInt(
            interaction.fields.getTextInputValue(
              "limit"
            )
          );

        if (
          isNaN(limit) ||
          limit < 0 ||
          limit > 99
        ) {
          return interaction.reply({
            content:
              "❌ رقم من 0 إلى 99.",
            ephemeral: true
          });
        }

        await channel.setUserLimit(
          limit
        );

        return interaction.reply({
          content:
            "✅ تم تغيير الحد.",
          ephemeral: true
        });
      }
    }
  }
);

const TOKEN = process.env.TOKEN;
