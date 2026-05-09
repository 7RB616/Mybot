const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

require("dotenv").config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CHANNELS = {
  activation: "1502685193201389700",
  activationLog: "1502675972820828292",
  warnLog: "1502685588535640195",
  supportRequest: "1502697610509549810",
  adminRequests: "1502697779410108639"
};

const TEAM_ROLES = {
  highStaff: "1493305553429205183",
  adminTeam: "1493306105240092782",
  supportTeam: "1493306515862458368"
};

const WARN_ROLES = {
  1: "1493310248746745936",
  2: "1493310287905034362",
  3: "1493310315910140046"
};

const STAFF_ROLES = {
  "Executive Management": "1493304989794435212",
  "Conductor Management": "1493305170854019207",
  "Head Management": "1493305291087937676",
  "Senior Management": "1493305338718584883",
  "Novice Management": "1493305383534596238",
  "- Admin Manager": "1493307310540324885",
  "- Support Manager": "1493307361467568190",
  "Executive Administrator": "1493305632768393226",
  "Supervisor Administrator": "1493305853183262740",
  "Senior Administrator": "1493305967993946244",
  "Novice Administrator": "1493306037200093296",
  "Support": "1493306309355901068",
  "Senior Support": "1493306398547902525",
  "Novice Support": "1493306470199070720"
};

const activeApplications = new Set();
const requestData = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const commands = [
  new SlashCommandBuilder()
    .setName("setup-activation")
    .setDescription("Send activation panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("setup-request")
    .setDescription("Send support request panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a staff member")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to warn")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Warning reason")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("evidence")
        .setDescription("Evidence link")
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Slash commands registered.");
}

client.once("ready", async () => {
  console.log(`${client.user.tag} Ready`);
  await registerCommands();
});

function isHighStaff(member) {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.roles.cache.has(TEAM_ROLES.highStaff) ||
    member.roles.cache.has(TEAM_ROLES.adminTeam)
  );
}

function isSupport(member) {
  return (
    member.roles.cache.has(TEAM_ROLES.supportTeam) ||
    member.roles.cache.has(TEAM_ROLES.highStaff) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

function getTeamRole(rankName) {
  const supportRanks = ["Support", "Senior Support", "Novice Support"];

  const adminRanks = [
    "Executive Administrator",
    "Supervisor Administrator",
    "Senior Administrator",
    "Novice Administrator"
  ];

  const highRanks = [
    "Executive Management",
    "Conductor Management",
    "Head Management",
    "Senior Management",
    "Novice Management",
    "- Admin Manager",
    "- Support Manager"
  ];

  if (supportRanks.includes(rankName)) return TEAM_ROLES.supportTeam;
  if (adminRanks.includes(rankName)) return TEAM_ROLES.adminTeam;
  if (highRanks.includes(rankName)) return TEAM_ROLES.highStaff;

  return null;
}

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-request") {
        const channel = interaction.guild.channels.cache.get(CHANNELS.supportRequest);

        if (!channel) {
          return interaction.reply({
            content: "Support request channel not found.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("Support Request")
          .setDescription(
            [
              "- Evidence must be submitted as a link.",
              "- Make sure to check the complaint date.",
              "- Do not use complaints for personal interests.",
              "- Any complaint with evidence older than 24 hours will be rejected."
            ].join("\n")
          )
          .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("open_support_request")
            .setLabel("Submit Request")
            .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [row] });

        return interaction.reply({
          content: "Support request panel sent.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "setup-activation") {
        const channel = interaction.guild.channels.cache.get(CHANNELS.activation);

        if (!channel) {
          return interaction.reply({
            content: "Activation channel not found.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("Staff Activation Panel")
          .setDescription("يرجى كتابة المعلومات بشكل صحيح لضمان قبول التفعيل")
          .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("open_activation")
            .setLabel("Start Activation")
            .setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [embed], components: [row] });

        return interaction.reply({
          content: "Activation panel sent.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "warn") {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const evidence = interaction.options.getString("evidence") || "No evidence provided.";

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
          return interaction.reply({
            content: "Member not found.",
            ephemeral: true
          });
        }

        let warnLevel = 1;

        if (member.roles.cache.has(WARN_ROLES[2])) warnLevel = 3;
        else if (member.roles.cache.has(WARN_ROLES[1])) warnLevel = 2;

        await member.roles.add(WARN_ROLES[warnLevel]);

        const warnLog = interaction.guild.channels.cache.get(CHANNELS.warnLog);

        if (!warnLog) {
          return interaction.reply({
            content: "Warn log channel not found.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`Staff Warning #${warnLevel}`)
          .setColor("Red")
          .addFields(
            { name: "User", value: `<@${user.id}>`, inline: true },
            { name: "By", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Reason", value: reason },
            { name: "Evidence", value: evidence }
          )
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`remove_warn_${user.id}_${warnLevel}`)
            .setLabel("Remove Warning")
            .setStyle(ButtonStyle.Danger)
        );

        await warnLog.send({ embeds: [embed], components: [row] });

        await user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`You Received Warning #${warnLevel}`)
              .setDescription(`Reason: ${reason}`)
              .setColor("Red")
          ]
        }).catch(() => {});

        return interaction.reply({
          content: `Warning #${warnLevel} has been issued to ${user}.`,
          ephemeral: true
        });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "open_activation") {
        if (activeApplications.has(interaction.user.id)) {
          return interaction.reply({
            content: "You already have an active activation request.",
            ephemeral: true
          });
        }

        activeApplications.add(interaction.user.id);

        const category = interaction.channel.parent;

        const channel = await interaction.guild.channels.create({
          name: `activation-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: category?.id || null,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            },
            {
              id: TEAM_ROLES.highStaff,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }
          ]
        });

        const embed = new EmbedBuilder()
          .setTitle("Activation Request")
          .setDescription("Choose your rank, then fill the form.")
          .setColor("Blue");

        const select = new StringSelectMenuBuilder()
          .setCustomId("select_activation_rank")
          .setPlaceholder("اختر رتبتك")
          .addOptions(
            Object.keys(STAFF_ROLES).map(name => ({
              label: name,
              value: name
            }))
          );

        await channel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(select)]
        });

        return interaction.reply({
          content: `Activation room created: ${channel}`,
          ephemeral: true
        });
      }

      if (interaction.customId === "open_support_request") {
        if (!isSupport(interaction.member)) {
          return interaction.reply({
            content: "You don't have permission to submit requests.",
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId("support_request_modal")
          .setTitle("Support Request");

        const complainantId = new TextInputBuilder()
          .setCustomId("complainant_id")
          .setLabel("ايدي المشتكي")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const violatorId = new TextInputBuilder()
          .setCustomId("violator_id")
          .setLabel("ايدي المخالف")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const violatedRules = new TextInputBuilder()
          .setCustomId("violated_rules")
          .setLabel("القوانين المخالفة")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const evidenceLink = new TextInputBuilder()
          .setCustomId("evidence_link")
          .setLabel("رابط الدليل")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(complainantId),
          new ActionRowBuilder().addComponents(violatorId),
          new ActionRowBuilder().addComponents(violatedRules),
          new ActionRowBuilder().addComponents(evidenceLink)
        );

        return interaction.showModal(modal);
      }

      if (interaction.customId.startsWith("claim_request_")) {
        if (!isHighStaff(interaction.member)) {
          return interaction.reply({
            content: "You don't have permission.",
            ephemeral: true
          });
        }

        const messageId = interaction.customId.replace("claim_request_", "");
        const data = requestData.get(messageId);

        if (!data) {
          return interaction.reply({
            content: "Request data not found.",
            ephemeral: true
          });
        }

        data.claimedBy = interaction.user.id;
        requestData.set(messageId, data);

        const oldEmbed = interaction.message.embeds[0];

        const newEmbed = EmbedBuilder.from(oldEmbed)
          .setColor("Yellow")
          .setDescription(`تم الاستلام من قبل <@${interaction.user.id}>`);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`solve_request_${messageId}`)
            .setLabel("تم الحل")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`unsolve_request_${messageId}`)
            .setLabel("لم يتم الحل")
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.update({
          content: `تم الاستلام من قبل <@${interaction.user.id}>`,
          embeds: [newEmbed],
          components: [row]
        });
      }

      if (interaction.customId.startsWith("solve_request_")) {
        if (!isHighStaff(interaction.member)) {
          return interaction.reply({
            content: "You don't have permission.",
            ephemeral: true
          });
        }

        const messageId = interaction.customId.replace("solve_request_", "");
        const data = requestData.get(messageId);

        if (!data) {
          return interaction.reply({
            content: "Request data not found.",
            ephemeral: true
          });
        }

        const oldEmbed = interaction.message.embeds[0];

        const newEmbed = EmbedBuilder.from(oldEmbed)
          .setColor("Green")
          .setDescription(`تم حل الشكوى من قبل <@${interaction.user.id}>`);

        const supportUser = await client.users.fetch(data.supportId).catch(() => null);

        if (supportUser) {
          await supportUser.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("تم حل الشكوى")
                .setDescription(`تم حل الشكوى الخاصة بك من قبل <@${interaction.user.id}>.`)
                .setColor("Green")
            ]
          }).catch(() => {});
        }

        requestData.delete(messageId);

        return interaction.update({
          content: `تم حل الشكوى من قبل <@${interaction.user.id}> | Support: <@${data.supportId}>`,
          embeds: [newEmbed],
          components: []
        });
      }

      if (interaction.customId.startsWith("unsolve_request_")) {
        if (!isHighStaff(interaction.member)) {
          return interaction.reply({
            content: "You don't have permission.",
            ephemeral: true
          });
        }

        const messageId = interaction.customId.replace("unsolve_request_", "");

        const modal = new ModalBuilder()
          .setCustomId(`unsolve_request_modal_${messageId}`)
          .setTitle("سبب عدم الحل");

        const reason = new TextInputBuilder()
          .setCustomId("unsolve_reason")
          .setLabel("اكتب سبب عدم حل الشكوى")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reason));

        return interaction.showModal(modal);
      }

      if (interaction.customId.startsWith("accept_activation_")) {
        if (!isHighStaff(interaction.member)) {
          return interaction.reply({
            content: "You don't have permission.",
            ephemeral: true
          });
        }

        const parts = interaction.customId.split("_");
        const userId = parts[2];
        const roleId = parts[3];
        const teamRoleId = parts[4];

        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!member) {
          return interaction.reply({
            content: "Member not found.",
            ephemeral: true
          });
        }

        const mainRole = interaction.guild.roles.cache.get(roleId);
        const teamRole = teamRoleId !== "none" ? interaction.guild.roles.cache.get(teamRoleId) : null;

        if (!mainRole) {
          return interaction.reply({
            content: "Main role not found.",
            ephemeral: true
          });
        }

        try {
          await member.roles.add(mainRole);
          if (teamRole) await member.roles.add(teamRole);

          const staffCategory = await interaction.guild.channels.create({
            name: `${member.user.username} Staff`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
              {
                id: member.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              },
              {
                id: TEAM_ROLES.highStaff,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              }
            ]
          });

          await interaction.guild.channels.create({
            name: `${member.user.username}-communication`,
            type: ChannelType.GuildText,
            parent: staffCategory.id
          });

          await interaction.guild.channels.create({
            name: `${member.user.username}-report`,
            type: ChannelType.GuildText,
            parent: staffCategory.id
          });
        } catch (err) {
          console.log("ROLE OR CHANNEL ERROR:", err);

          return interaction.reply({
            content: "I can't complete this action. Check bot role position and permissions.",
            ephemeral: true
          });
        }

        await member.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("Staff Activation Accepted")
              .setDescription("You have been accepted into the staff team.")
              .setColor("Green")
          ]
        }).catch(() => {});

        activeApplications.delete(userId);

        const oldEmbed = interaction.message.embeds[0];

        const newEmbed = EmbedBuilder.from(oldEmbed)
          .setColor("Green")
          .setTitle("Activation Request Accepted")
          .addFields(
            { name: "Status", value: "Accepted", inline: true },
            { name: "Accepted By", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Applicant", value: `<@${userId}>`, inline: true }
          );

        return interaction.update({
          content: `Accepted by <@${interaction.user.id}> | Applicant: <@${userId}>`,
          embeds: [newEmbed],
          components: []
        });
      }

      if (interaction.customId.startsWith("deny_activation_")) {
        if (!isHighStaff(interaction.member)) {
          return interaction.reply({
            content: "You don't have permission.",
            ephemeral: true
          });
        }

        const userId = interaction.customId.split("_")[2];

        const modal = new ModalBuilder()
          .setCustomId(`deny_modal_${userId}_${interaction.message.id}`)
          .setTitle("Deny Activation");

        const reason = new TextInputBuilder()
          .setCustomId("deny_reason")
          .setLabel("Deny reason")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reason));

        return interaction.showModal(modal);
      }

      if (interaction.customId.startsWith("remove_warn_")) {
        if (!isHighStaff(interaction.member)) {
          return interaction.reply({
            content: "You are not allowed to remove warnings.",
            ephemeral: true
          });
        }

        const parts = interaction.customId.split("_");
        const userId = parts[2];
        const warnLevel = parts[3];

        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!member) {
          return interaction.reply({
            content: "Member not found.",
            ephemeral: true
          });
        }

        await member.roles.remove(WARN_ROLES[warnLevel]).catch(() => {});

        return interaction.update({
          content: `Warning #${warnLevel} removed by <@${interaction.user.id}>.`,
          embeds: interaction.message.embeds,
          components: []
        });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "select_activation_rank") {
        const selectedRank = interaction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`activation_modal_${selectedRank}`)
          .setTitle("نموذج التفعيل");

        const accountName = new TextInputBuilder()
          .setCustomId("account_name")
          .setLabel("اسم الحساب داخل اللعبة")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const gameId = new TextInputBuilder()
          .setCustomId("game_id")
          .setLabel("الايدي داخل اللعبة")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const hours = new TextInputBuilder()
          .setCustomId("hours")
          .setLabel("الساعات + الدليل")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const acceptedBy = new TextInputBuilder()
          .setCustomId("accepted_by")
          .setLabel("من قام بقبولك؟")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(accountName),
          new ActionRowBuilder().addComponents(gameId),
          new ActionRowBuilder().addComponents(hours),
          new ActionRowBuilder().addComponents(acceptedBy)
        );

        return interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "support_request_modal") {
        const complainantId = interaction.fields.getTextInputValue("complainant_id");
        const violatorId = interaction.fields.getTextInputValue("violator_id");
        const violatedRules = interaction.fields.getTextInputValue("violated_rules");
        const evidenceLink = interaction.fields.getTextInputValue("evidence_link");

        const adminChannel = interaction.guild.channels.cache.get(CHANNELS.adminRequests);

        if (!adminChannel) {
          return interaction.reply({
            content: "Admin requests channel not found.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("New Support Request")
          .setColor("Red")
          .addFields(
            { name: "Support", value: `<@${interaction.user.id}>`, inline: true },
            { name: "ايدي المشتكي", value: complainantId },
            { name: "ايدي المخالف", value: violatorId },
            { name: "القوانين المخالفة", value: violatedRules },
            { name: "رابط الدليل", value: evidenceLink }
          )
          .setTimestamp();

        const sent = await adminChannel.send({
          content: `New request from <@${interaction.user.id}>`,
          embeds: [embed]
        });

        requestData.set(sent.id, {
          supportId: interaction.user.id,
          complainantId,
          violatorId,
          violatedRules,
          evidenceLink,
          claimedBy: null
        });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_request_${sent.id}`)
            .setLabel("استلام")
            .setStyle(ButtonStyle.Primary)
        );

        await sent.edit({ components: [row] });

        return interaction.reply({
          content: "تم رفع الريكويست للإدارة.",
          ephemeral: true
        });
      }

      if (interaction.customId.startsWith("unsolve_request_modal_")) {
        const messageId = interaction.customId.replace("unsolve_request_modal_", "");
        const reason = interaction.fields.getTextInputValue("unsolve_reason");
        const data = requestData.get(messageId);

        if (!data) {
          return interaction.reply({
            content: "Request data not found.",
            ephemeral: true
          });
        }

        const supportUser = await client.users.fetch(data.supportId).catch(() => null);

        if (supportUser) {
          await supportUser.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("لم يتم حل الشكوى")
                .setDescription(`لم يتم حل الشكوى من قبل <@${interaction.user.id}>.\n\nالسبب:\n${reason}`)
                .setColor("Red")
            ]
          }).catch(() => {});
        }

        const adminChannel = interaction.guild.channels.cache.get(CHANNELS.adminRequests);
        const msg = await adminChannel.messages.fetch(messageId).catch(() => null);

        if (msg) {
          const oldEmbed = msg.embeds[0];

          const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor("Red")
            .setDescription(`لم يتم حل الشكوى من قبل <@${interaction.user.id}>\n\nالسبب:\n${reason}`);

          await msg.edit({
            content: `لم يتم حل الشكوى من قبل <@${interaction.user.id}> | Support: <@${data.supportId}>`,
            embeds: [newEmbed],
            components: []
          });
        }

        requestData.delete(messageId);

        return interaction.reply({
          content: "تم إرسال سبب عدم الحل للسبورت.",
          ephemeral: true
        });
      }

      if (interaction.customId.startsWith("activation_modal_")) {
        const rankName = interaction.customId.replace("activation_modal_", "");
        const roleId = STAFF_ROLES[rankName];
        const teamRoleId = getTeamRole(rankName) || "none";

        const accountName = interaction.fields.getTextInputValue("account_name");
        const gameId = interaction.fields.getTextInputValue("game_id");
        const hours = interaction.fields.getTextInputValue("hours");
        const acceptedBy = interaction.fields.getTextInputValue("accepted_by");

        const log = interaction.guild.channels.cache.get(CHANNELS.activationLog);

        if (!log) {
          return interaction.reply({
            content: "Activation log channel not found.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("New Activation Request")
          .setColor("Blue")
          .addFields(
            { name: "User", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Rank", value: rankName, inline: true },
            { name: "اسم الحساب داخل اللعبة", value: accountName },
            { name: "الايدي داخل اللعبة", value: gameId },
            { name: "الساعات + الدليل", value: hours },
            { name: "من قام بقبولك؟", value: acceptedBy }
          )
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`accept_activation_${interaction.user.id}_${roleId}_${teamRoleId}`)
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`deny_activation_${interaction.user.id}`)
            .setLabel("Deny")
            .setStyle(ButtonStyle.Danger)
        );

        await log.send({
          content: `New activation request from <@${interaction.user.id}>`,
          embeds: [embed],
          components: [row]
        });

        await interaction.reply({
          content: "Activation request submitted.",
          ephemeral: true
        });

        activeApplications.delete(interaction.user.id);
      }

      if (interaction.customId.startsWith("deny_modal_")) {
        const parts = interaction.customId.split("_");
        const userId = parts[2];
        const messageId = parts[3];
        const reason = interaction.fields.getTextInputValue("deny_reason");

        const user = await client.users.fetch(userId).catch(() => null);

        if (user) {
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("Staff Activation Denied")
                .setDescription(`Reason: ${reason}`)
                .setColor("Red")
            ]
          }).catch(() => {});
        }

        activeApplications.delete(userId);

        const logChannel = interaction.guild.channels.cache.get(CHANNELS.activationLog);
        const logMessage = await logChannel.messages.fetch(messageId).catch(() => null);

        if (logMessage) {
          const oldEmbed = logMessage.embeds[0];

          const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor("Red")
            .setTitle("Activation Request Denied")
            .addFields(
              { name: "Status", value: "Denied", inline: true },
              { name: "Denied By", value: `<@${interaction.user.id}>`, inline: true },
              { name: "Applicant", value: `<@${userId}>`, inline: true },
              { name: "Deny Reason", value: reason }
            );

          await logMessage.edit({
            content: `Denied by <@${interaction.user.id}> | Applicant: <@${userId}>`,
            embeds: [newEmbed],
            components: []
          });
        }

        return interaction.reply({
          content: "Activation denied.",
          ephemeral: true
        });
      }
    }
  } catch (err) {
    console.log(err);

    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: "Something went wrong.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

client.login(TOKEN);
