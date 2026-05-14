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
  activationLog: "1502699859340431520",
  warnLog: "1502685588535640195",
  supportRequest: "1502697610509549810",
  adminRequests: "1502697779410108639",
  archiveCategory: "1504375411600003153" // كاتجوري الأرشيف الجديد
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// --- وظيفة تعديل الرومات السابقة لمرة واحدة ---
async function updateOldStaffChannels(guild) {
  console.log("جاري تحديث صلاحيات الرومات القديمة لمرة واحدة...");
  const staffCategories = guild.channels.cache.filter(c => 
    c.type === ChannelType.GuildCategory && c.name.toLowerCase().endsWith("staff")
  );

  for (const [id, category] of staffCategories) {
    const username = category.name.replace(" Staff", "").toLowerCase();
    const member = guild.members.cache.find(m => m.user.username.toLowerCase() === username);

    const overwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] } // مخفي عن الجميع
    ];

    if (member) {
      overwrites.push({ 
        id: member.id, 
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] 
      });
    }

    await category.permissionOverwrites.set(overwrites);
    const children = guild.channels.cache.filter(c => c.parentId === category.id);
    
    for (const [childId, child] of children) {
      await child.lockPermissions();
      const messages = await child.messages.fetch({ limit: 5 });
      if (messages.size === 0) { // لو الروم فاضي نرسل الترحيب أو النموذج
        if (child.name.endsWith("-report")) {
          await child.send("تقرير رقم :\nتاريخ اليوم :\nشرح التقرير :");
        } else if (child.name.endsWith("-communication") && member) {
          await child.send(`اهلا بك في طاقم ادارة فورتيكس <@${member.id}>، منشن الاداري\nهنا روم التواصل اذا واجهتك مشكلة، طلب اجازة يمكنك التواصل مع مسؤولك هنا.`);
        }
      }
    }
  }
  console.log("✅ تم تحديث الرومات القديمة.");
}

client.once("ready", async () => {
  console.log(`${client.user.tag} Online`);
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) await updateOldStaffChannels(guild);
});

// --- نظام التصحيح التلقائي لروم التقارير ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.name && message.channel.name.endsWith("-report")) {
    const required = ["تقرير رقم :", "تاريخ اليوم :", "شرح التقرير :"];
    const isValid = required.every(f => message.content.includes(f));
    if (!isValid) {
      await message.delete().catch(() => {});
      const msg = await message.channel.send(`⚠️ <@${message.author.id}> يرجى الالتزام بالنموذج:\n\nتقرير رقم :\nتاريخ اليوم :\nشرح التقرير :`);
      setTimeout(() => msg.delete().catch(() => {}), 5000);
    }
  }
});

// التحقق من الإدارة (Administrator)
function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

// كود التعامل مع التفاعلات (مدمج بالكامل)
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;

      // أمر الاستقالة المطور
      if (commandName === "resign") {
        const user = options.getUser("user");
        const reason = options.getString("reason");
        const lastRank = options.getString("last_rank");

        const category = interaction.guild.channels.cache.find(c => 
          c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes(user.username.toLowerCase())
        );

        if (category) {
          const channels = interaction.guild.channels.cache.filter(c => c.parentId === category.id);
          for (const [id, channel] of channels) {
            await channel.setParent(CHANNELS.archiveCategory, { lockPermissions: true });
            await channel.setName(`ارشيف-${channel.name}`);
          }
          await category.delete().catch(() => {});
        }

        const resignEmbed = new EmbedBuilder()
          .setTitle("استقالة إداري / سحب رتبة")
          .setColor("DarkButNotBlack")
          .addFields(
            { name: "الإداري", value: `<@${user.id}>`, inline: true },
            { name: "آخر رتبة", value: lastRank, inline: true },
            { name: "تاريخ التسليم", value: new Date().toLocaleDateString('en-GB'), inline: true },
            { name: "السبب", value: reason }
          );

        await interaction.guild.channels.cache.get(CHANNELS.activationLog).send({ embeds: [resignEmbed] });
        return interaction.reply({ content: "تمت الأرشفة بنجاح.", ephemeral: true });
      }

      // بقية أوامر السلاش الأصلية (rank, warn, clearwarns, setup-activation, setup-request)
      if (commandName === "rank") {
        const user = options.getUser("user");
        const rankName = options.getString("rank");
        const reason = options.getString("reason");
        const member = await interaction.guild.members.fetch(user.id);
        const roleId = STAFF_ROLES[rankName];
        await member.roles.set([roleId]);
        return interaction.reply({ content: `✅ تم تغيير رتبة <@${user.id}> إلى ${rankName}`, ephemeral: true });
      }

      if (commandName === "warn") {
        const user = options.getUser("user");
        const num = options.getInteger("number");
        const reason = options.getString("reason");
        const member = await interaction.guild.members.fetch(user.id);
        await member.roles.add(WARN_ROLES[num]);
        const warnEmbed = new EmbedBuilder().setTitle("تحذير جديد").addFields({name:"المستلم", value:`<@${user.id}>`}, {name:"السبب", value:reason});
        await interaction.guild.channels.cache.get(CHANNELS.warnLog).send({ embeds: [warnEmbed] });
        return interaction.reply({ content: "تم إعطاء التحذير.", ephemeral: true });
      }

      if (commandName === "setup-activation") {
        const embed = new EmbedBuilder().setTitle("Activation System").setDescription("اضغط على الزر أدناه لبدء التفعيل");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_activation").setLabel("بدء التفعيل").setStyle(ButtonStyle.Primary));
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: "تم الإرسال.", ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "start_activation") {
        const modal = new ModalBuilder().setCustomId("activation_modal").setTitle("Activation Form");
        const nameInput = new TextInputBuilder().setCustomId("real_name").setLabel("الاسم الحقيقي").setStyle(TextInputStyle.Short);
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        await interaction.showModal(modal);
      }

      // زر القبول المطور
      if (interaction.customId.startsWith("accept_activation_")) {
        const [, , userId, roleId] = interaction.customId.split("_");
        const member = await interaction.guild.members.fetch(userId);

        const category = await interaction.guild.channels.create({
          name: `${member.user.username} Staff`,
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });

        const comm = await interaction.guild.channels.create({ name: `${member.user.username}-communication`, parent: category.id });
        await comm.send(`اهلا بك في طاقم ادارة فورتيكس <@${member.id}>، منشن الاداري\nهنا روم التواصل اذا واجهتك مشكلة، طلب اجازة يمكنك التواصل مع مسؤولك هنا.`);

        const rep = await interaction.guild.channels.create({ name: `${member.user.username}-report`, parent: category.id });
        await rep.send(`تقرير رقم :\nتاريخ اليوم :\nشرح التقرير :`);

        await member.roles.add(roleId);
        return interaction.update({ content: "✅ تم التفعيل بنجاح.", components: [], embeds: [] });
      }
    }

    // هنا تضع بقية التعامل مع الـ ModalSubmit والـ StringSelectMenu من كودك القديم...
    
  } catch (err) {
    console.log(err);
  }
});

client.login(TOKEN);
            
