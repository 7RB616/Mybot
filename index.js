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

// ⭐️ إعدادات نظام النقاط المطور الحقيقية بناءً على خوادمك ⭐️
const POINTS_CONFIG = {
  MAIN_GUILD_ID: "1489798320762130452",         // السيرفر الرئيسي للتفاعل
  ADMIN_GUILD_ID: "1493304316906176563",        // سيرفر الإدارة لفحص الرتب
  MAIN_CHAT_ID: "1491127422278566067",          // الشات العام المستهدف بالحساب
  LOG_CHANNEL_ID: "1507083912453820497",        // شات اللوق الخاص بالنقاط
  
  // الرتب الإدارية المستهدفة التي أرسلتها سابقاً في TEAM_ROLES
  STAFF_ROLES: [
    "1493305553429205183",
    "1493306105240092782",
    "1493306515862458368"
  ],
  
  // نظام الفلاتر والحساب
  POINTS: {
    MESSAGE_POINTS: 2,      // نقطتين لكل رسالة
    COOLDOWN: 5000,         // منع السبام: 5 ثوانٍ بين الرسائل
    MIN_LENGTH: 4,          // الحد الأدنى للحروف (الرسائل القصيرة جداً لن تحسب)
    
    VOICE_INTERVAL: 600000, // كل 10 دقائق في الفويس
    VOICE_POINTS: 5         // يحصل على 5 نقاط
  }
};

// تشغيل وتهيئة قاعدة البيانات
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
let db;
(async () => {
    db = await open({
        filename: './admin_points.db',
        driver: sqlite3.Database
    });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS staff_points (
            user_id TEXT PRIMARY KEY,
            points INTEGER DEFAULT 0,
            msg_count INTEGER DEFAULT 0,
            voice_minutes INTEGER DEFAULT 0,
            last_msg_time INTEGER DEFAULT 0
        )
    `);
})();

// كاش مؤقت لحفظ جلسات الصوت
const voiceLog = new Map();

// إنشاء العميل مع إضافة الـ Intent الخاص بالفويس
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates // ⭐️ مضاف لحساب نقاط الفويس بدقة
  ],
  partials: [Partials.Channel]
});

// دالة التحقق التلقائي هل العضو إداري بناءً على سيرفر الإدارة
async function isStaffMember(userId) {
  try {
    const adminGuild = await client.guilds.fetch(POINTS_CONFIG.ADMIN_GUILD_ID).catch(() => null);
    if (!adminGuild) return false;
    const member = await adminGuild.members.fetch(userId).catch(() => null);
    if (!member) return false;
    return member.roles.cache.some(role => POINTS_CONFIG.STAFF_ROLES.includes(role.id));
  } catch {
    return false;
  }
}

// دالة إرسال لوق النقاط بشكل متطور ومميز
async function sendPointsLog(title, description, color = 0x3498db) {
  const logChannel = await client.channels.fetch(POINTS_CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel) return;
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
  logChannel.send({ embeds: [embed] });
}

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
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }
    ];

    if (member) {
      overwrites.push({ 
        id: member.id, 
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] 
      });
    }

    await category.permissionOverwrites.set(overwrites).catch(() => {});
    const children = guild.channels.cache.filter(c => c.parentId === category.id);
    
    for (const [childId, child] of children) {
      await child.lockPermissions().catch(() => {});
      const messages = await child.messages.fetch({ limit: 5 }).catch(() => new Map());
      if (messages.size === 0) {
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

// --- نظام التصحيح التلقائي لروم التقارير + نظام احتساب نقاط الشات المتطور ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // 1. نظام التقارير القديم الخاص بك
  if (message.channel.name && message.channel.name.endsWith("-report")) {
    const required = ["تقرير رقم :", "تاريخ اليوم :", "شرح التقرير :"];
    const isValid = required.every(f => message.content.includes(f));
    if (!isValid) {
      await message.delete().catch(() => {});
      const msg = await message.channel.send(`⚠️ <@${message.author.id}> يرجى الالتزام بالنموذج:\n\nتقرير رقم :\nتاريخ اليوم :\nشرح التقرير :`);
      setTimeout(() => msg.delete().catch(() => {}), 5000);
      return; // يخرج عشان ما يعطيه نقاط على رسالة خاطئة ومحذوفة
    }
  }

  // 2. ⭐️ نظام احتساب نقاط تفاعل الشات الجديد ⭐️
  if (message.guildId === POINTS_CONFIG.MAIN_GUILD_ID && message.channelId === POINTS_CONFIG.MAIN_CHAT_ID) {
    if (message.content.length < POINTS_CONFIG.POINTS.MIN_LENGTH) return; // فلتر الرسائل القصيرة

    const userId = message.author.id;
    if (!(await isStaffMember(userId))) return; // التأكد أنه إداري معتمد

    let data = await db.get('SELECT * FROM staff_points WHERE user_id = ?', userId);
    if (!data) {
      await db.run('INSERT INTO staff_points (user_id) VALUES (?)', userId);
      data = { points: 0, msg_count: 0, last_msg_time: 0 };
    }

    const now = Date.now();
    if (now - data.last_msg_time < POINTS_CONFIG.POINTS.COOLDOWN) return; // فلتر الكول داون والسبام

    await db.run(
      'UPDATE staff_points SET points = points + ?, msg_count = msg_count + 1, last_msg_time = ? WHERE user_id = ?',
      POINTS_CONFIG.POINTS.MESSAGE_POINTS, now, userId
    );
  }
});

// ⭐️ 3. نظام احتساب تفاعل الفويس المطور ومنع الـ AFK والميوت ⭐️
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.guild.id !== POINTS_CONFIG.MAIN_GUILD_ID) return;
  const userId = newState.id;
  if (!(await isStaffMember(userId))) return;

  // حالة دخول روم صوتي
  if (!oldState.channelId && newState.channelId) {
    if (newState.channelId === newState.guild.afkChannelId || newState.deaf || newState.mute) return;
    voiceLog.set(userId, Date.now());
  }

  // حالة تعديل الميوت / الديفن أو دخول غرفة الـ AFK يعامل كخروج ويتوقف الحساب فوراً للعدل
  if (oldState.channelId && newState.channelId) {
    if (newState.deaf || newState.mute || newState.channelId === newState.guild.afkChannelId) {
      await handleVoicePointsRecord(userId);
    } else if (!oldState.deaf && !newState.deaf && !oldState.mute && !newState.mute) {
      if (!voiceLog.has(userId)) voiceLog.set(userId, Date.now());
    }
  }

  // حالة الخروج النهائي من الرومات الصوتي
  if (oldState.channelId && !newState.channelId) {
    await handleVoicePointsRecord(userId);
  }
});

// دالة داخلية تابعة للفويس لمعالجة الدقائق والنقاط بالقاعدة تلقائياً
async function handleVoicePointsRecord(userId) {
  const startTime = voiceLog.get(userId);
  if (!startTime) return;

  const totalTime = Date.now() - startTime;
  voiceLog.delete(userId);

  if (totalTime < POINTS_CONFIG.POINTS.VOICE_INTERVAL) return;

  const intervals = Math.floor(totalTime / POINTS_CONFIG.POINTS.VOICE_INTERVAL);
  const pointsToAdd = intervals * POINTS_CONFIG.POINTS.VOICE_POINTS;
  const minutesCount = Math.floor(totalTime / 60000);

  let data = await db.get('SELECT * FROM staff_points WHERE user_id = ?', userId);
  if (!data) {
    await db.run('INSERT INTO staff_points (user_id, points, voice_minutes) VALUES (?, ?, ?)', userId, pointsToAdd, minutesCount);
  } else {
    await db.run(
      'UPDATE staff_points SET points = points + ?, voice_minutes = voice_minutes + ? WHERE user_id = ?',
      pointsToAdd, minutesCount, userId
    );
  }

  sendPointsLog(
    '🎙️ تحديث تفاعل صوتي',
    `الإداري: <@${userId}>\nالمدة: \`${minutesCount}\` دقيقة\nالنقاط المضافة: \`+${pointsToAdd}\` نقطة.`,
    0x2ecc71
  );
}

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

// كود التعامل مع التفاعلات (مدمج بالكامل مع أنظمتك السابقة وبدون أي تعديل ضار)
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;

      // أمر الاستقالة المطور حقك
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

      // أمر الرتب القديم حقك
      if (commandName === "rank") {
        const user = options.getUser("user");
        const rankName = options.getString("rank");
        const reason = options.getString("reason");
        const member = await interaction.guild.members.fetch(user.id);
        const roleId = STAFF_ROLES[rankName];
        await member.roles.set([roleId]);
        return interaction.reply({ content: `✅ تم تغيير رتبة <@${user.id}> إلى ${rankName}`, ephemeral: true });
      }

      // أمر التحذير القديم حقك
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

      // أمر لوحة التفعيل حقك
      if (commandName === "setup-activation") {
        const embed = new EmbedBuilder().setTitle("Activation System").setDescription("اضغط على الزر أدناه لبدء التفعيل");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_activation").setLabel("بدء التفعيل").setStyle(ButtonStyle.Primary));
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: "تم الإرسال.", ephemeral: true });
      }

      // ⭐️ [إضافة] أوامر نظام النقاط الجديد المتطور في الـ interactionCreate ⭐️
      if (commandName === 'points') {
        const target = options.getUser('user') || interaction.user;
        if (!(await isStaffMember(target.id))) {
          return interaction.reply({ content: '❌ هذا العضو ليس من ضمن طاقم الإدارة المعتمد بسيرفر الإدارة.', ephemeral: true });
        }

        const row = await db.get('SELECT * FROM staff_points WHERE user_id = ?', target.id);
        const leaderboard = await db.all('SELECT user_id FROM staff_points ORDER BY points DESC');
        const rank = leaderboard.findIndex(s => s.user_id === target.id) + 1 || 'غير مصنف';

        const embed = new EmbedBuilder()
          .setTitle(`📊 ملف تفاعل الطاقم الإداري`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .setColor(0x3498db)
          .setDescription(`إحصائيات تفاعل الإداري: ${target}`)
          .addFields(
            { name: '🏆 الترتيب الحالي', value: `\`#${rank}\``, inline: true },
            { name: '✨ إجمالي النقاط', value: `\`${row ? row.points : 0}\` نقطة`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, 
            { name: '💬 رسائل الشات العام', value: `\`${row ? row.msg_count : 0}\` رسالة`, inline: true },
            { name: '🎙️ دقائق الصوت المتفاعل', value: `\`${row ? row.voice_minutes : 0}\` دقيقة`, inline: true }
          )
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'top-staff') {
        const list = await db.all('SELECT * FROM staff_points ORDER BY points DESC LIMIT 10');
        if (list.length === 0) return interaction.reply({ content: '📭 لا توجد بيانات تفاعل مسجلة للإداريين حتى الآن.', ephemeral: true });

        const embed = new EmbedBuilder().setTitle('🏆 متصدري التفاعل الإداري قبل الافتتاح').setColor(0xf1c40f).setTimestamp();
        let desc = '';
        for (let i = 0; i < list.length; i++) {
          const user = await client.users.fetch(list[i].user_id).catch(() => null);
          let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
          desc += `${medal} **${user ? user.username : list[i].user_id}** ➔ \`${list[i].points}\` نقطة (💬 \`${list[i].msg_count}\` | 🎙️ \`${list[i].voice_minutes}د\`)\n`;
        }
        embed.setDescription(desc);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'manage-points') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة العليا فقط.', ephemeral: true });
        }
        const target = options.getUser('user');
        if (!(await isStaffMember(target.id))) return interaction.reply({ content: '❌ لا يمكنك تعديل نقاط عضو خارج طاقم الإدارة.', ephemeral: true });

        const action = options.getString('action');
        const amount = options.getInteger('amount');

        let data = await db.get('SELECT * FROM staff_points WHERE user_id = ?', target.id) || { points: 0 };
        if (!data.user_id) await db.run('INSERT INTO staff_points (user_id) VALUES (?)', target.id);

        let finalPoints = data.points;
        if (action === 'add') finalPoints += amount;
        if (action === 'remove') finalPoints = Math.max(0, finalPoints - amount);
        if (action === 'set') finalPoints = amount;

        await db.run('UPDATE staff_points SET points = ? WHERE user_id = ?', finalPoints, target.id);
        
        await interaction.reply({ content: `⚙️ تم تحديث نقاط ${target} بنجاح من \`${data.points}\` إلى \`${finalPoints}\`` });

        return sendPointsLog(
          '🛠️ إجراء إداري علوي للملفات', 
          ` المسؤول المعدل: ${interaction.user}\nالمستهدف: ${target}\n**النوع:** \`${action}\`\n**الكمية:** \`${amount}\`\n**الرصيد الحالي والجديد:** \`${finalPoints}\` نقطة`, 
          0xe67e22
        );
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "start_activation") {
        const modal = new ModalBuilder().setCustomId("activation_modal").setTitle("Activation Form");
        const nameInput = new TextInputBuilder().setCustomId("real_name").setLabel("الاسم الحقيقي").setStyle(TextInputStyle.Short);
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        await interaction.showModal(modal);
      }

      // زر القبول المطور حقك
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
require('./deploy-commands.js');

client.login(TOKEN);
