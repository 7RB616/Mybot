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
  ModalBuilder
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

// 📁 مستودعات الرومات والكاتجوريز المحددة بسيرفراتك
const CHANNELS = {
  activationPanelChannel: "1504931178958950490", // روم لوحة التفعيل
  activationLog: "1507083912453820497",          // لوق التفعيل والنقاط الموحد
  warnLog: "1502685588535640195",                // لوق التحذيرات
  archiveCategory: "1505649145229082624"         // كاتجوري أرشيف الرومات عند الاستقالة
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

// 🏛️ رتب سيرفر الإدارة الثابتة (الريموت كنترول للتحكم والأوامر)
const STAFF_ROLES = {
  "Executive Management": "1493304989794435212",
  "Conductor Management": "1493305170854019207",
  "Head Management": "1493305291087937676",
  "Senior Management": "1493305338718584883",
  "Novice Management": "1493305383534596238",
  "- Admin Manager": "1493307310540324885",
  "- Support Manager": "1493307361467568190",
  "Executive Administrator": "1493305632768393226",
  "Supervisor Administrator": "1493305553429205183",
  "Senior Administrator": "1493305967993946244",
  "Novice Administrator": "1493306037200093296",
  "Support": "1493306309355901068",
  "Senior Support": "1493306398547902525",
  "Novice Support": "1493306470199070720"
};

const MANAGER_ROLE_ID = "1493307310540324885"; // رتبة مسؤولي الإدارة العليا للتحقق

// 🔄 [إعدادات نظام المزامنة والتفاعل المطور للسيرفرين]
const POINTS_CONFIG = {
  MAIN_GUILD_ID: "1489798320762130452",  // آيدي السيرفر الرئيسي
  ADMIN_GUILD_ID: "1493304316906176563", // آيدي سيرفر الإدارة
  MAIN_CHAT_ID: "1491127422278566067",    // شات التفاعل الرئيسي للحساب
  LOG_CHANNEL_ID: "1507083912453820497",  // روم لوق تفاعل النقاط
  
  STAFF_ROLES: [
    "1493305553429205183",
    "1493306105240092782",
    "1493306515862458368"
  ],
  
  POINTS: {
    MESSAGE_POINTS: 2,
    COOLDOWN: 5000,
    MIN_LENGTH: 4,
    VOICE_INTERVAL: 600000,
    VOICE_POINTS: 5
  }
};

// 🗺️ جدول ربط رتب سيرفر الإدارة برتب السيرفر الرئيسي المحدثة بالكامل
const MAIN_SERVER_ROLES = {
  MTA_CREW: "1491283474391367742", // رتبة تأتي مع كل رتبة إدارية تلقائياً
  
  // 🛡️ رتب الأدمينية بالسيرفر الإداري (تمنح رتبة الأدمين بالرئيسي)
  ADMINISTRATORS: [
    STAFF_ROLES["Executive Administrator"],
    STAFF_ROLES["Supervisor Administrator"],
    STAFF_ROLES["Senior Administrator"],
    STAFF_ROLES["Novice Administrator"]
  ],
  MAIN_ADMIN_ROLE_ID: "1491282664441774080", // رتبة MTA: Network Administrators بالرئيسي

  // 👑 جميع رتب المانجمينت العليا بالسيرفر الإداري (تمنح رتبة المانجمينت والأدمن بالرئيسي)
  MANAGEMENTS: [
    STAFF_ROLES["Executive Management"],
    STAFF_ROLES["Conductor Management"],
    STAFF_ROLES["Head Management"],
    STAFF_ROLES["Senior Management"],
    STAFF_ROLES["Novice Management"],
    STAFF_ROLES["- Admin Manager"],    
    STAFF_ROLES["- Support Manager"]
  ],
  MAIN_MANAGEMENT_ROLE_ID: "1491282871783129250", // رتبة Senior Managment بالرئيسي
  
  // 🎯 [تحديث النطاق الحصري]: رتب المانجمينت المستهدفة للحصول على الرتبة الإضافية الجديدة (من نفويس مانجمينت إلى سينيور مانجمينت)
  SPECIFIC_MANAGEMENTS: [
    STAFF_ROLES["Senior Management"],
    STAFF_ROLES["Novice Management"]
  ],
  SPECIAL_ADDITIONAL_ROLE_ID: "1491282962082173130" // 👈 الرتبة المطلوبة الجديدة في السيرفر الرئيسي
};

// ذاكرة حفظ البيانات المؤقتة
const activeApplications = new Set();
const requestData = new Map();
const warnEvidences = new Map(); 
const userSelectedRole = new Map(); 
const activeActivationRooms = new Map();
const processedActivations = new Set(); // لحظر نقرات قبول الاستمارة المتكررة

// إعداد وتجهيز داتابيز النقاط SQLite
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
let db;

(async () => {
    db = await open({ filename: './admin_points.db', driver: sqlite3.Database });
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

const voiceLog = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

async function isStaffMember(userId) {
  try {
    const adminGuild = await client.guilds.fetch(POINTS_CONFIG.ADMIN_GUILD_ID).catch(() => null);
    if (!adminGuild) return false;
    const member = await adminGuild.members.fetch(userId).catch(() => null);
    if (!member) return false;
    return member.roles.cache.some(role => POINTS_CONFIG.STAFF_ROLES.includes(role.id));
  } catch { return false; }
}

async function sendPointsLog(title, description, color = 0x3498db) {
  const logChannel = await client.channels.fetch(POINTS_CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel) return;
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
  logChannel.send({ embeds: [embed] });
}

async function generateLeaderboardEmbed() {
  const rows = await db.all('SELECT user_id, points FROM staff_points WHERE points > 0 ORDER BY points DESC');
  
  const embed = new EmbedBuilder()
    .setTitle("🌟 لوحة تفاعل ونقاط طاقم الإدارة العام | Vortex")
    .setColor(0xd4af37) 
    .setThumbnail(client.user.displayAvatarURL())
    .setFooter({ text: "شبكة فورتيكس الإدارية" })
    .setTimestamp();

  if (rows.length === 0) {
    embed.setDescription("❌ **لا توجد نقاط أو تفاعل مسجل لأي إداري حتى الآن بالخادم.**");
    return embed;
  }

  let listContent = "";
  rows.forEach((row, index) => {
    let positionIndicator = "";
    if (index === 0) positionIndicator = "🥇 **المركز الأول**";
    else if (index === 1) positionIndicator = "🥈 **المركز الثاني**";
    else if (index === 2) positionIndicator = "🥉 **المركز الثالث**";
    else positionIndicator = `🎖️ **المركز #${index + 1}**`;

    listContent += `${positionIndicator}\n👤 **الإداري:** <@${row.user_id}>\n💰 **مجموع النقاط:** \`${row.points}\` نقطة\n────────────────────\n`;
  });

  embed.setDescription(listContent);
  return embed;
}

client.once("ready", async () => {
  console.log(`🔥 ${client.user.tag} جاهز تماماً. نظام المزامنة الفوري والآمن مستقر.`);
});

// ⚡ [دالة معالجة المزامنة الذكية الفورية للسيرفر الرئيسي - نسخة فرز نطاق المانجمينت الحصرية المحدثة]
async function syncMemberRolesToMainServer(adminMember) {
  const mainGuild = client.guilds.cache.get(POINTS_CONFIG.MAIN_GUILD_ID);
  if (!mainGuild) return;

  const mainMember = await mainGuild.members.fetch(adminMember.id).catch(() => null);
  if (!mainMember) return;

  const adminRoles = adminMember.roles.cache;
  const allStaffRoleIds = Object.values(STAFF_ROLES);
  
  // التحقق هل يملك المشرف أي رتبة إدارية حالياً؟
  const hasAnyStaffRole = adminRoles.some(role => allStaffRoleIds.includes(role.id));

  if (!hasAnyStaffRole) {
    // إذا سُحبت كل الرتب يدوياً، نظّف حسابه فوراً في الرئيسي
    await stripMainServerStaffRoles(mainMember);
    return;
  }

  let rolesToApplyInMain = [];

  // 1. منح رتبة MTA Crew الأساسية لأن لديه رتبة إدارية
  rolesToApplyInMain.push(MAIN_SERVER_ROLES.MTA_CREW);

  // 2. التحقق من رتب الأدمنية
  const hasAdminRole = adminRoles.some(role => MAIN_SERVER_ROLES.ADMINISTRATORS.includes(role.id));
  if (hasAdminRole) {
    rolesToApplyInMain.push(MAIN_SERVER_ROLES.MAIN_ADMIN_ROLE_ID);
  }

  // 3. التحقق من رتب المانجمينت العليا (إدارة عليا)
  const hasMgmtRole = adminRoles.some(role => MAIN_SERVER_ROLES.MANAGEMENTS.includes(role.id));
  if (hasMgmtRole) {
    if (!rolesToApplyInMain.includes(MAIN_SERVER_ROLES.MAIN_ADMIN_ROLE_ID)) {
      rolesToApplyInMain.push(MAIN_SERVER_ROLES.MAIN_ADMIN_ROLE_ID);
    }
    rolesToApplyInMain.push(MAIN_SERVER_ROLES.MAIN_MANAGEMENT_ROLE_ID); // يمنح رتبة سينيور مانجمينت الأساسية بالرئيسي
    
    // 🎯 [الفحص الحصري الجديد]: التحقق هل رتبته الحالية تقع في نطاق (Novice Management و Senior Management) فقط؟
    const fallsInSpecificMgmtRange = adminRoles.some(role => MAIN_SERVER_ROLES.SPECIFIC_MANAGEMENTS.includes(role.id));
    if (fallsInSpecificMgmtRange) {
      rolesToApplyInMain.push(MAIN_SERVER_ROLES.SPECIAL_ADDITIONAL_ROLE_ID); // يمنح الرتبة الإضافية الجديدة المطلوبة
    }
  }

  // 🧼 جلب رتب العضو الحالية بالسيرفر الرئيسي لتصفيتها (للحفاظ على رتب الألعاب والمواطنة)
  const currentMainRoles = mainMember.roles.cache.map(r => r.id);
  const cleanRoles = currentMainRoles.filter(id => 
    id !== MAIN_SERVER_ROLES.MTA_CREW && 
    id !== MAIN_SERVER_ROLES.MAIN_ADMIN_ROLE_ID && 
    id !== MAIN_SERVER_ROLES.MAIN_MANAGEMENT_ROLE_ID &&
    id !== MAIN_SERVER_ROLES.SPECIAL_ADDITIONAL_ROLE_ID // تنظيف رتبة النطاق الإضافية عند السحب أو التعديل العكسي
  );

  // دمج الرتب العادية النظيفة مع الرتب الإدارية المستحقة حالياً فقط للتحديث الفوري العكسي
  const finalRolesSet = [...new Set([...cleanRoles, ...rolesToApplyInMain])];
  
  // تطبيق القائمة المحدثة مباشرة في ديسكورد لتحديث رتب حسابه بالرئيسي فوراً
  await mainMember.roles.set(finalRolesSet).catch(err => console.error(`❌ فشل تعيين الرتب بالمزامنة: ${err.message}`));
}

// دالة تنظيف رتب السيرفر الرئيسي للإداري المستقيل أو المسحوب منه الصلاحيات بالكامل
async function stripMainServerStaffRoles(mainMember) {
  const currentRoles = mainMember.roles.cache.map(r => r.id);
  const filtered = currentRoles.filter(id => 
    id !== MAIN_SERVER_ROLES.MTA_CREW && 
    id !== MAIN_SERVER_ROLES.MAIN_ADMIN_ROLE_ID && 
    id !== MAIN_SERVER_ROLES.MAIN_MANAGEMENT_ROLE_ID &&
    id !== MAIN_SERVER_ROLES.SPECIAL_ADDITIONAL_ROLE_ID
  );
  await mainMember.roles.set(filtered).catch(() => {});
}

// 🔄 [الاستماع المباشر للأحداث] - تحديث فوري عند تعديل رتب العضو يدوياً بسيرفر الإدارة
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (newMember.guild.id !== POINTS_CONFIG.ADMIN_GUILD_ID) return;
  await syncMemberRolesToMainServer(newMember);
});

// 🔒 [تأمين وحماية عند الخروج] - سحب فوري لرتب الرئيسي عند خروج أو طرد العضو من الإدارة
client.on("guildMemberRemove", async (member) => {
  if (member.guild.id !== POINTS_CONFIG.ADMIN_GUILD_ID) return;
  const mainGuild = client.guilds.cache.get(POINTS_CONFIG.MAIN_GUILD_ID);
  if (!mainGuild) return;
  const mainMember = await mainGuild.members.fetch(member.id).catch(() => null);
  if (mainMember) {
    await stripMainServerStaffRoles(mainMember);
    console.log(`🗑️ جُرّد العضو <@${member.id}> من رتب الرئيسي لخروجه من سيرفر الإدارة.`);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.channel.name && message.channel.name.includes("-تقارير")) {
    await message.react("✅").catch(() => {});
    await message.react("❌").catch(() => {});
  }

  if (message.guildId === POINTS_CONFIG.MAIN_GUILD_ID && message.channelId === POINTS_CONFIG.MAIN_CHAT_ID) {
    if (message.content.length < POINTS_CONFIG.POINTS.MIN_LENGTH) return; 
    const userId = message.author.id;
    if (!(await isStaffMember(userId))) return; 

    let data = await db.get('SELECT * FROM staff_points WHERE user_id = ?', userId);
    if (!data) {
      await db.run('INSERT INTO staff_points (user_id) VALUES (?)', userId);
      data = { points: 0, msg_count: 0, last_msg_time: 0 };
    }
    const now = Date.now();
    if (now - data.last_msg_time < POINTS_CONFIG.POINTS.COOLDOWN) return; 

    await db.run(
      'UPDATE staff_points SET points = points + ?, msg_count = msg_count + 1, last_msg_time = ? WHERE user_id = ?',
      POINTS_CONFIG.POINTS.MESSAGE_POINTS, now, userId
    );
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) {
    try { await reaction.fetch(); } catch (error) { return; }
  }

  if (reaction.message.channel.name && reaction.message.channel.name.includes("-تقارير")) {
    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const hasAdminPermission = member.permissions.has(PermissionFlagsBits.Administrator);
    const hasManagerRole = member.roles.cache.has(MANAGER_ROLE_ID); 

    if (!hasAdminPermission && !hasManagerRole) {
      await reaction.users.remove(user.id).catch(() => {});
    }
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.guild.id !== POINTS_CONFIG.MAIN_GUILD_ID) return;
  const userId = newState.id;
  if (!(await isStaffMember(userId))) return;

  if (!oldState.channelId && newState.channelId) {
    if (newState.channelId === newState.guild.afkChannelId) return;
    voiceLog.set(userId, Date.now());
  }
  if (oldState.channelId && newState.channelId) {
    if (newState.channelId === newState.guild.afkChannelId) {
      await handleVoicePointsRecord(userId);
    } else if (!voiceLog.has(userId)) {
      voiceLog.set(userId, Date.now());
    }
  }
  if (oldState.channelId && !newState.channelId) {
    await handleVoicePointsRecord(userId);
  }
});

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
    await db.run('UPDATE staff_points SET points = points + ?, voice_minutes = voice_minutes + ? WHERE user_id = ?', pointsToAdd, minutesCount, userId);
  }
  sendPointsLog('🎙️ تحديث تفاعل صوتي', `الإداري: <@${userId}>\nالمدة: \`${minutesCount}\` دقيقة\nالنقاط المضافة: \`+${pointsToAdd}\` نقطة.`, 0x2ecc71);
}

// دالة تفريغ وسحب رتب سيرفر الإدارة الداخلي
async function stripStaffRoles(member) {
  const rolesToRemove = Object.values(STAFF_ROLES);
  const currentRoles = member.roles.cache.map(r => r.id);
  const filteredRoles = currentRoles.filter(roleId => !rolesToRemove.includes(roleId));
  await member.roles.set(filteredRoles).catch(() => {});
}

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;

      if (commandName === "say") {
        const isManager = interaction.member.roles.cache.has(MANAGER_ROLE_ID);
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isManager && !isAdmin) {
          return interaction.reply({ content: "❌ عذراً، هذا الأمر مخصص لمسؤولي الإدارة العليا فقط.", ephemeral: true });
        }

        const targetChannel = options.getChannel("channel");
        const textContent = options.getString("message");
        const attachment = options.getAttachment("image");

        if (!textContent && !attachment) {
          return interaction.reply({ content: "❌ يجب كتابة نص أو إرفاق صورة لإرسال الإعلان.", ephemeral: true });
        }

        const sendOptions = {};
        if (textContent) sendOptions.content = textContent.replace(/\\n/g, '\n'); 
        if (attachment) sendOptions.files = [attachment];

        await targetChannel.send(sendOptions);
        return interaction.reply({ content: `✅ تم إرسال إعلانك بنجاح داخل الروم المستهدف: ${targetChannel}`, ephemeral: true });
      }

      if (commandName === "top-staff") {
        await interaction.deferReply(); 
        const updatedEmbed = await generateLeaderboardEmbed();
        return await interaction.editReply({ embeds: [updatedEmbed] });
      }

      if (commandName === "resign") {
        const user = options.getUser("user");
        const reason = options.getString("reason");
        const lastRank = options.getString("last_rank");
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const category = interaction.guild.channels.cache.find(c => 
          c.type === ChannelType.GuildCategory && c.name.includes(user.username)
        );

        if (category) {
          const channels = interaction.guild.channels.cache.filter(c => c.parentId === category.id);
          for (const [id, channel] of channels) {
            const archiveAlert = new EmbedBuilder()
              .setTitle("🗄️ إغلاق وأرشفة الروم الإداري")
              .setColor(0xd63031)
              .setDescription(`تمت أرشفة هذا الروم بسبب الإقالة/الاستقالة.\n**السبب:** ${reason}\n**التاريخ:** ${new Date().toLocaleDateString('en-GB')}`);
            await channel.send({ embeds: [archiveAlert] }).catch(() => {});
            await channel.setParent(CHANNELS.archiveCategory, { lockPermissions: true }).catch(() => {});
            await channel.setName(`ارشيف-${channel.name}`).catch(() => {});
          }
          await category.delete().catch(() => {});
        }

        if (member) {
          await stripStaffRoles(member);
          await syncMemberRolesToMainServer(member); // مزامنة حية لسحب رتب الرئيسي فوراً
        }

        const resignEmbed = new EmbedBuilder()
          .setTitle("⛔ استقالة إداري / سحب رتبة")
          .setColor(0x2f3136)
          .addFields(
            { name: "👤 الإداري المعني:", value: `<@${user.id}>`, inline: true },
            { name: "🎖️ آخر رتبة شغلها:", value: `\`${lastRank}\``, inline: true },
            { name: "📅 تاريخ السحب:", value: `\`${new Date().toLocaleDateString('en-GB')}\``, inline: true },
            { name: "📝 السبب المعلن:", value: `\`\`\`${reason}\`\`\`` }
          );

        await interaction.guild.channels.cache.get(CHANNELS.activationLog).send({ embeds: [resignEmbed] });
        return interaction.reply({ content: "✅ تم سحب الرتب وتجريد الصلاحيات وأرشفة الرومات بنجاح وبشكل متزامن.", ephemeral: true });
      }

      if (commandName === "rank") {
        const user = options.getUser("user");
        const rankName = options.getString("rank");
        const reason = options.getString("reason") || "تحديث المرتبة الإدارية";
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: "❌ هذا العضو غير موجود في الخادم.", ephemeral: true });
        const roleId = STAFF_ROLES[rankName];
        if (!roleId) return interaction.reply({ content: "❌ الرتبة المحددة غير صالحة بالنظام.", ephemeral: true });

        await stripStaffRoles(member); 
        
        await member.roles.add(roleId)
          .then(async () => {
            await syncMemberRolesToMainServer(member); // تحديث فوري ومزامنة ذكية للرئيسي في نفس اللحظة
            
            const rankUpdateEmbed = new EmbedBuilder()
              .setTitle("⚡ تحديث رتبة إدارية / ترقية")
              .setColor(0x3498db)
              .addFields(
                { name: "👤 الإداري:", value: `<@${user.id}>`, inline: true },
                { name: "🎖️ الرتبة الجديدة:", value: `\`${rankName}\``, inline: true },
                { name: "📝 السبب الحالي:", value: `\`${reason}\``, inline: true }
              ).setTimestamp();

            await interaction.guild.channels.cache.get(CHANNELS.activationLog).send({ embeds: [rankUpdateEmbed] });
            return interaction.reply({ content: `✅ تم تحديث المرتبة الإدارية لـ <@${user.id}> إلى **${rankName}** بنجاح وتعديلها بالرئيسي.`, ephemeral: true });
          })
          .catch((err) => {
            console.error(err);
            return interaction.reply({ content: `❌ فشل تحديث الرتبة.`, ephemeral: true });
          });
          return;
      }

      if (commandName === "warn") {
        const user = options.getUser("user");
        const num = options.getInteger("number");
        const reason = options.getString("reason");
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: "❌ لم يتم العثور على هذا العضو في السيرفر.", ephemeral: true });
        if (WARN_ROLES[num]) await member.roles.add(WARN_ROLES[num]).catch(() => {});

        const warnEmbed = new EmbedBuilder()
          .setTitle("⚠️ تحذير إداري ")
          .setColor(0xe74c3c)
          .addFields(
            { name: "👤 المستلم:", value: `<@${user.id}>`, inline: true },
            { name: "🛡️ المسؤول الإداري:", value: `<@${interaction.user.id}>`, inline: true },
            { name: "🔢 رقم التحذير:", value: `\`التحذير رقم ${num}\``, inline: true },
            { name: "📝 السبب:", value: `\`\`\`${reason}\`\`\`` }
          ).setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`show_evidence_${interaction.user.id}_${user.id}`).setLabel("🔍 إظهار / إضافة الدليل").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`cancel_warn_${interaction.user.id}_${user.id}_${num}`).setLabel("❌ إلغاء التحذير").setStyle(ButtonStyle.Danger)
        );

        await interaction.guild.channels.cache.get(CHANNELS.warnLog)?.send({ embeds: [warnEmbed], components: [row] });
        return interaction.reply({ content: `✅ تم إصدار التحذير بنجاح وإرساله للوق.`, ephemeral: true });
      }

      if (commandName === "setup-activation") {
        const panelEmbed = new EmbedBuilder()
          .setTitle("🔵 Vortex Network | نظام التفعيل الرومات الإداريه ")
          .setDescription(".\n\n> **يجب تفعيل روماتك الإدارية لعدم مخالفة القوانين وتجنب العقوبات.**\n\n*الرجاء اختيار رتبتك الإدارية الحالية من القائمة أدناه أولاً لإنشاء نموذجك المؤقت:*")
          .setColor(0x00d2d3)
          .setFooter({ text: "Vortex Network Automation System" });

        const menuOptions = Object.keys(STAFF_ROLES).map(rank => ({
          label: rank,
          value: rank,
          description: `تفعيل الصلاحيات لمرتبة: ${rank}`
        }));

        const menu = new StringSelectMenuBuilder()
          .setCustomId("select_activation_role")
          .setPlaceholder("🎯 اختر رتبتك الإدارية الحالية أولاً...")
          .addOptions(menuOptions);

        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
        return interaction.reply({ content: "✅ تم إرسال لوحة التفعيل الحديثة بالسيرفر الحالي.", ephemeral: true });
      }

      if (commandName === 'points') {
        const target = options.getUser('user') || interaction.user;
        if (!(await isStaffMember(target.id))) return interaction.reply({ content: '❌ هذا العضو ليس من ضمن طاقم الإدارة المعتمد.', ephemeral: true });
        const row = await db.get('SELECT * FROM staff_points WHERE user_id = ?', target.id);
        const leaderboard = await db.all('SELECT user_id FROM staff_points ORDER BY points DESC');
        const rank = leaderboard.findIndex(s => s.user_id === target.id) + 1 || 'غير مصنف';

        const embed = new EmbedBuilder()
          .setTitle(`📊 ملف تفاعل الطاقم الإداري`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .setColor(0x3498db)
          .addFields(
            { name: '🏆 الترتيب الحالي', value: `\`#${rank}\``, inline: true },
            { name: '✨ إجمالي النقاط', value: `\`${row ? row.points : 0}\` نقطة`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, 
            { name: '💬 رسائل الشات العام', value: `\`${row ? row.msg_count : 0}\` رسالة`, inline: true },
            { name: '🎙️ دقائق الصوت المتفاعل', value: `\`${row ? row.voice_minutes : 0}\` دقيقة`, inline: true }
          ).setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'manage-points') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة العليا فقط.', ephemeral: true });
        const target = options.getUser('user');
        const action = options.getString('action');
        const amount = options.getInteger('amount');

        let data = await db.get('SELECT * FROM staff_points WHERE user_id = ?', target.id) || { points: 0 };
        if (!data.user_id) await db.run('INSERT INTO staff_points (user_id) VALUES (?)', target.id);
        let finalPoints = data.points;
        if (action === 'add') finalPoints += amount;
        if (action === 'remove') finalPoints = Math.max(0, finalPoints - amount);
        if (action === 'set') finalPoints = amount;

        await db.run('UPDATE staff_points SET points = ? WHERE user_id = ?', finalPoints, target.id);
        await interaction.reply({ content: `⚙️ تم تحديث نقاط ${target} بنجاح إلى \`${finalPoints}\`` });
        return sendPointsLog('🛠️ إجراء إداري علوي للملفات', `المسؤول: ${interaction.user}\nالمستهدف: ${target}\nالإجراء: \`${action}\` بمقدار \`${amount}\` نقاط`, 0xe67e22);
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "select_activation_role") {
        const userId = interaction.user.id;

        if (activeActivationRooms.has(userId)) {
          const existingChannelId = activeActivationRooms.get(userId);
          const checkChannel = interaction.guild.channels.cache.get(existingChannelId);
          if (checkChannel) {
            return interaction.reply({ content: `❌ لديك روم تفعيل مفتوح وقائم بالفعل حالياً! <#${existingChannelId}>`, ephemeral: true });
          } else {
            activeActivationRooms.delete(userId);
          }
        }

        const selectedRole = interaction.values[0];
        userSelectedRole.set(userId, selectedRole);

        const tempChannel = await interaction.guild.channels.create({
          name: `تفعيل-${interaction.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
          ]
        });

        activeActivationRooms.set(userId, tempChannel.id);

        const startEmbed = new EmbedBuilder()
          .setTitle("📝 استمارة معلومات التفعيل الإداري")
          .setDescription(`أهلاً بك يا <@${userId}>، لقد قمت باختيار رتبة: **${selectedRole}**.\nاضغط على الزر أدناه لتعبئة الاستمارة.`)
          .setColor(0x00d2d3);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`open_act_modal_${userId}`).setLabel("✍️ تعبئة الاستمارة").setStyle(ButtonStyle.Success)
        );

        await tempChannel.send({ content: `<@${userId}> الروم المؤقت الخاص بك جاهز.`, embeds: [startEmbed], components: [row] });
        return interaction.reply({ content: `✅ تم إنشاء روم مؤقت خاص بك لتعبئة البيانات: <#${tempChannel.id}>`, ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith("open_act_modal_")) {
        const userId = customId.split("_")[3];
        if (interaction.user.id !== userId) return interaction.reply({ content: "❌ هذه الاستمارة ليست لك.", ephemeral: true });

        const modal = new ModalBuilder().setCustomId(`submit_act_modal`).setTitle("Vortex Activation Form");
        const inGameName = new TextInputBuilder().setCustomId("ingame_name").setLabel("اسم حسابك داخل الخادم :").setStyle(TextInputStyle.Short).setRequired(true);
        const inGameId = new TextInputBuilder().setCustomId("ingame_id").setLabel("ايديك داخل الخادم :").setStyle(TextInputStyle.Short).setRequired(true);
        const acceptorName = new TextInputBuilder().setCustomId("acceptor_name").setLabel("من المسؤول عن قبولك :").setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(inGameName),
          new ActionRowBuilder().addComponents(inGameId),
          new ActionRowBuilder().addComponents(acceptorName)
        );

        await interaction.showModal(modal);
        return;
      }

      if (customId.startsWith("approve_activation_")) {
        const [, , userId, rankName, ingameName, ingameId] = customId.split("_");
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الإجراء مخصص للمسؤولين أصحاب رتب الإدارة العليا فقط.", ephemeral: true });
        }
        if (processedActivations.has(interaction.message.id)) {
          return interaction.reply({ content: "⚠️ تم التعامل مع هذا الطلب مسبقاً (تم قبول التفعيل بالفعل).", ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) return interaction.reply({ content: "❌ تعذر العثور على هذا العضو بالسيرفر حالياً.", ephemeral: true });

        const checkCategory = interaction.guild.channels.cache.find(c => 
          c.type === ChannelType.GuildCategory && c.name === `┃ ${member.user.username} - ${rankName}`
        );
        if (checkCategory) {
          processedActivations.add(interaction.message.id);
          return interaction.reply({ content: "❌ هذا الإداري يملك بالفعل كاتجوري تفعيل قائم بنفس الاسم في الخادم.", ephemeral: true });
        }

        processedActivations.add(interaction.message.id); // قفل فوري لمنع نقرات زر القبول المتكرر

        const roleId = STAFF_ROLES[rankName];
        if (roleId) await member.roles.add(roleId).catch(() => {});

        await member.setNickname(`${ingameName} - ${ingameId}`).catch(() => {});
        
        await syncMemberRolesToMainServer(member); // مزامنة فورية وحية للرئيسي بمجرد قبول التفعيل

        const staffCategory = await interaction.guild.channels.create({
          name: `┃ ${member.user.username} - ${rankName}`,
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });

        const commChannel = await interaction.guild.channels.create({ name: `💬-تواصل-${member.user.username}`, parent: staffCategory.id });
        await commChannel.send(`أهلاً بك في طاقم إدارة فورتيكس <@${member.id}>.`);

        const reportChannel = await interaction.guild.channels.create({ name: `📝-تقارير-${member.user.username}`, parent: staffCategory.id });
        await reportChannel.send(`**نموذج التقارير الإدارية المعتمد:**\n\nتقرير رقم :\nتاريخ اليوم :\nشرح التقرير :`);

        await member.send("✉️ **رسالة إدارية:** تم تفعيلك بنظام شبكة فورتيكس الإدارية والمزامنة بنجاح!").catch(() => {});

        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(0x2ecc71)
          .setTitle("✅ تم قبول وتفعيل الإداري بنجاح")
          .addFields({ name: "🛡️ مسؤول قبل التفعيل:", value: `<@${interaction.user.id}>`, inline: false });

        await interaction.update({ embeds: [updatedEmbed], components: [] });
        return;
      }

      if (customId.startsWith("deny_activation_")) {
        const userId = customId.split("_")[2];
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الإجراء مخصص لمسؤولي الإدارة العليا فقط.", ephemeral: true });
        }
        if (processedActivations.has(interaction.message.id)) {
          return interaction.reply({ content: "⚠️ تم التعامل مع هذا الطلب مسبقاً.", ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId(`deny_reason_modal_${userId}`).setTitle("❌ سبب رفض التفعيل الإداري");
        const reasonInput = new TextInputBuilder().setCustomId("deny_reason_text").setLabel("اكتب سبب رفض طلب التفعيل بالتفصيل:").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
        return;
      }

      if (customId.startsWith("cancel_warn_")) {
        const [, , adminId, targetId, warnNum] = customId.split("_");
        if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) return interaction.reply({ content: "❌ هذا الزر مخصص للإدارة العليا فقط.", ephemeral: true });
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (targetMember && WARN_ROLES[warnNum]) await targetMember.roles.remove(WARN_ROLES[warnNum]).catch(() => {});

        const oldEmbed = interaction.message.embeds[0];
        const cancelledEmbed = new EmbedBuilder().setTitle(`~~${oldEmbed.title} (ملغي)~~`).setDescription(`~~${oldEmbed.description || ""}~~`).setColor(0x7f8c8d).setTimestamp();
        if (oldEmbed.fields) oldEmbed.fields.forEach(f => cancelledEmbed.addFields({ name: `~~${f.name}~~`, value: `~~${f.value}~~`, inline: f.inline }));
        await interaction.update({ embeds: [cancelledEmbed], components: [] });
        return;
      }

      if (customId.startsWith("show_evidence_")) {
        const [, , adminId, targetId] = customId.split("_");
        if (!warnEvidences.has(interaction.message.id)) {
          if (interaction.user.id !== adminId && !interaction.member.roles.cache.has(MANAGER_ROLE_ID)) return interaction.reply({ content: "❌ لا يوجد دليل، وفقط المسؤول يمكنه إضافته.", ephemeral: true });
          const modal = new ModalBuilder().setCustomId(`evidence_modal_${interaction.message.id}`).setTitle("📝 إضافة دليل التحذير");
          const evidenceInput = new TextInputBuilder().setCustomId("evidence_text").setLabel("رابط الدليل أو تفاصيل الإثبات:").setStyle(TextInputStyle.Paragraph).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(evidenceInput));
          await interaction.showModal(modal);
          return;
        }
        if (interaction.user.id !== adminId && interaction.user.id !== targetId && !interaction.member.roles.cache.has(MANAGER_ROLE_ID)) return interaction.reply({ content: "🔒 عذراً، لا يُسمح برؤية الدليل إلا للمسؤول أو العضو المحذّر نفسه.", ephemeral: true });
        return interaction.reply({ content: `ℹ️ **دليل التحذير المرفق:**\n${warnEvidences.get(interaction.message.id)}`, ephemeral: true });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "submit_act_modal") {
        const userId = interaction.user.id;
        const inGameName = interaction.fields.getTextInputValue("ingame_name");
        const inGameId = interaction.fields.getTextInputValue("ingame_id");
        const acceptorName = interaction.fields.getTextInputValue("acceptor_name");
        const rankName = userSelectedRole.get(userId) || "Novice Support";

        const logEmbed = new EmbedBuilder()
          .setTitle("📥 طلب تفعيل روم اداري قيد المراجعة")
          .setColor(0xe67e22)
          .addFields(
            { name: "👤 العضو المتقدم:", value: `<@${userId}> (\`${userId}\`)`, inline: true },
            { name: "🎖️ الرتبة المطلوبة:", value: `\`${rankName}\``, inline: true },
            { name: "🎮 اسم الحساب بالخادم:", value: `\`${inGameName}\``, inline: true },
            { name: "🆔 آيدي الحساب بالخادم:", value: `\`${inGameId}\``, inline: true },
            { name: "🛡️ المسؤول عن القبول:", value: `\`${acceptorName}\``, inline: false }
          )
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`approve_activation_${userId}_${rankName}_${inGameName}_${inGameId}`).setLabel("✅ قبول التفعيل").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`deny_activation_${userId}`).setLabel("❌ رفض التفعيل").setStyle(ButtonStyle.Danger)
        );

        const logChannel = interaction.guild.channels.cache.get(CHANNELS.activationLog);
        if (logChannel) {
          await logChannel.send({ content: `🔔 المتقدم للتفعيل: <@${userId}>`, embeds: [logEmbed], components: [row] });
        }

        await interaction.reply({ content: "✅ تم تسليم استمارتك إلى لوق الإدارة العليا بنجاح!", ephemeral: true });
        activeActivationRooms.delete(userId);
        setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 3000);
        userSelectedRole.delete(userId); 
        return;
      }

      if (interaction.customId.startsWith("deny_reason_modal_")) {
        const targetUserId = interaction.customId.split("_")[3];
        const denyReason = interaction.fields.getTextInputValue("deny_reason_text");

        processedActivations.add(interaction.message.id);

        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        if (targetMember) {
          const alertDm = new EmbedBuilder()
            .setTitle("❌ تحديث بخصوص طلب التفعيل الإداري")
            .setDescription(`مرحباً بك، يؤسفنا إعلامك بأنه قد تم **رفض طلب تفعيل روماتك**\n\n**📝 السبب المعلن للرفض:**\n\`\`\`${denyReason}\`\`\``)
            .setColor(0xe74c3c)
            .setTimestamp();
          await targetMember.send({ embeds: [alertDm] }).catch(() => {});
        }

        const deniedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(0xd63031)
          .setTitle("❌ تم رفض طلب التفعيل الإداري")
          .addFields(
            { name: "🛡️ المسؤول الرافض:", value: `<@${interaction.user.id}>`, inline: true },
            { name: "📝 سبب الرفض:", value: `\`${denyReason}\``, inline: false }
          );

        await interaction.update({ embeds: [deniedEmbed], components: [] });
        return;
      }

      if (interaction.customId.startsWith("evidence_modal_")) {
        const msgId = interaction.customId.split("_")[2];
        warnEvidences.set(msgId, interaction.fields.getTextInputValue("evidence_text"));
        return interaction.reply({ content: "✅ تم حفظ وإرفاق الدليل بنجاح.", ephemeral: true });
      }
    }
  } catch (error) {
    console.error("حدث خطأ غير متوقع أثناء معالجة التفاعل:", error);
  }
});

client.login(TOKEN);
