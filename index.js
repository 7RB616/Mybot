const {
Client,
GatewayIntentBits,
PermissionsBitField,
EmbedBuilder
} = require('discord.js');

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

// 👇 ايدي الرتبة المطلوبة
const TARGET_ROLE_ID = "1459620766587813888";

client.once('ready', () => {
console.log(✅ Logged in as ${client.user.tag});
});

client.on('messageCreate', async (message) => {

if (!message.guild) return;
if (message.author.bot) return;

/* ================== أمر الإيمبد ================== */

if (message.content.startsWith("!embed")) {

if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {  
  return;  
}  

const content = message.content.slice(7).trim();  
if (!content) return;  

await message.delete().catch(() => {});  

const embed = new EmbedBuilder()  
  .setColor("#8B4513") // بني  
  .setDescription(content)  
  .setFooter({ text: message.guild.name })  
  .setTimestamp();  

return message.channel.send({ embeds: [embed] });

}

/* ================== أمر تعديل الرتب ================== */

if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
return;
}

if (message.content !== "!resetroles confirm") return;

const role = message.guild.roles.cache.get(TARGET_ROLE_ID);
if (!role) return message.reply("❌ الرتبة غير موجودة.");

const botMember = message.guild.members.me;

if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
return message.reply("❌ البوت ما عنده Manage Roles.");
}

if (botMember.roles.highest.position <= role.position) {
return message.reply(
❌ ترتيب الرتب غلط.\n\n +
🔹 رتبة البوت: ${botMember.roles.highest.position}\n +
🔹 الرتبة المطلوبة: ${role.position}\n\n +
لازم ترفع رتبة البوت فوق الرتبة المطلوبة.
);
}

await message.reply("🚨 بدأ التنفيذ...");

await message.guild.members.fetch();

for (const member of message.guild.members.cache.values()) {
try {

if (member.id === message.guild.ownerId) continue;  

  await member.roles.set([role]);  

} catch (err) {  
  console.log(`❌ فشل عند: ${member.user.tag}`);  
  console.log(err);  
}

}

message.channel.send("✅ تم إعطاء الرتبة للجميع بنجاح.");
});

require("dotenv").config();
client.login(process.env.TOKEN);
