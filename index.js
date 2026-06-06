// استدعاء المكتبات المطلوبة
require('dotenv').config(); // سحب التوكن بشكل آمن من ملف البيئة
const { 
    Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ==================== [ إعدادات السيرفر الثابتة ] ====================
const CONFIG = {
    TOKEN: process.env.TOKEN,             // يتم جلب التوكن هنا بأمان من الـ Secrets
    PREFIX: "!",                          // البريفكس الخاص بالأوامر النصية
    APPLY_CHANNEL_ID: "1512796890419171378", // روم التقديم العام
    LOG_CHANNEL_ID: "1512796852540407890",   // روم المسؤولين الموحد
};

// متغيرات النظام لحفظ الحالة أثناء التشغيل
let isApplyOpen = true; 
let appliedUsers = [];  // لتخزين الـ IDs للأعضاء لمنع التكرار
let acceptedUsers = []; // لتخزين الـ IDs للأعضاء المقبولين لطباعة اللائحة النهائية

client.on('ready', () => {
    console.log(`🤖 البوت شغال وجاهز باسم: ${client.user.tag}`);
});

// دالة لتحديث وصياغة رسالة التقديم الأساسية بناءً على الحالة
function getApplyEmbed() {
    const statusText = isApplyOpen ? "🟢 التقديم على الإدارة ( مفتوح )" : "🔴 التقديم على الإدارة ( مغلق )";
    return new EmbedBuilder()
        .setTitle(statusText)
        .setDescription('إذا كنت ترى في نفسك الكفاءة للانضمام إلى طاقم الإدارة، اضغط على الزر أدناه لتعبئة النموذج.')
        .setColor(isApplyOpen ? '#2ECC71' : '#E74C3C');
}

// ==================== [ أوامر التحكم (للمسؤولين) ] ====================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.PREFIX)) return;

    // تم إصلاح تقسيم الفراغات هنا لمنع خطأ الـ Regex القديم
    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. أمر تشغيل السيت اب لأول مرة في روم التقديم
    if (command === 'setup-apply') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply("❌ ليس لديك صلاحية لاستخدام هذا الأمر.");
        }

        const applyChannel = await client.channels.fetch(CONFIG.APPLY_CHANNEL_ID).catch(() => null);
        if (!applyChannel) return message.reply("❌ لم يتم العثور على روم التقديم، تأكد من الـ ID.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('apply_btn')
                .setLabel('تقديم الآن')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );

        await applyChannel.send({ embeds: [getApplyEmbed()], components: [row] });
        return message.reply("✅ تم إرسال رسالة وزر التقديم بنجاح في روم التتقديم!");
    }

    // 2. أمر فتح وإغلاق التقديم تلقائياً مع تحديث الرسالة ونشر اللائحة
    if (command === 'toggle-apply') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply("❌ ليس لديك صلاحية لاستخدام هذا الأمر.");
        }

        isApplyOpen = !isApplyOpen; // عكس الحالة

        const applyChannel = await client.channels.fetch(CONFIG.APPLY_CHANNEL_ID).catch(() => null);

        if (isApplyOpen) {
            // أ) إذا تم فتح التقديم: تصفير القوائم للفترة الجديدة
            appliedUsers = []; 
            acceptedUsers = [];

            if (applyChannel) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('apply_btn').setLabel('تقديم الآن').setStyle(ButtonStyle.Primary).setEmoji('📝')
                );
                await applyChannel.send({ embeds: [getApplyEmbed()], components: [row] });
            }
            return message.reply("🔓 تم فتح التقديم بنجاح، وتصفير قائمة المتقدمين السابقة.");
        } else {
            // ب) إذا تم إغلاق التقديم: تعديل رسالة التقديم العام وإرسال لائحة المقبولين
            if (applyChannel) {
                await applyChannel.send({ embeds: [getApplyEmbed()], components: [] });

                // إذا كان هناك مقبولين، يتم صياغة وإرسال اللائحة النهائية في روم التقديم فوراً
                if (acceptedUsers.length > 0) {
                    const mentionsList = acceptedUsers.map(id => `- <@${id}>`).join('\n');

                    const announcementText = 
`# **${message.guild.name}**
**تم قبول**

${mentionsList}

نطلب منهم التواصل مع المسؤول ( ${message.author} )
-# #2026`;

                    await applyChannel.send({ content: announcementText });
                }
            }
            return message.reply("🔒 تم إغلاق التقديم بنجاح ونشر لائحة المقبولين في الروم العام (إذا وُجدوا).");
        }
    }
});

// ==================== [ نظام التفاعل والتقديم الآلي ] ====================
client.on('interactionCreate', async (interaction) => {

    // 1. عند الضغط على زر "تقديم الآن"
    if (interaction.isButton() && interaction.customId === 'apply_btn') {

        if (!isApplyOpen) {
            return await interaction.reply({ 
                content: '❌ عذراً، التقديم على الإدارة مغلق حالياً. نتمنى لك التوفيق في المرات القادمة.', 
                ephemeral: true 
            });
        }

        if (appliedUsers.includes(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ لقد قمت بتقديم نموذج بالفعل في هذه الفترة! يرجى انتظار رد الإدارة.',
                ephemeral: true 
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('apply_modal')
            .setTitle('استمارة التقديم للإدارة');

        const q1 = new TextInputBuilder().setCustomId('name').setLabel('اسمك الكريم؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q2 = new TextInputBuilder().setCustomId('age').setLabel('عمرك؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q3 = new TextInputBuilder().setCustomId('experience').setLabel('هل كنت اداري في خادم اخر؟').setStyle(TextInputStyle.Paragraph).setRequired(true);
        const q4 = new TextInputBuilder().setCustomId('activity').setLabel('مدة تفاعلك؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q5 = new TextInputBuilder().setCustomId('skills').setLabel('خبراتك؟').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(q1),
            new ActionRowBuilder().addComponents(q2),
            new ActionRowBuilder().addComponents(q3),
            new ActionRowBuilder().addComponents(q4),
            new ActionRowBuilder().addComponents(q5)
        );

        return await interaction.showModal(modal);
    }

    // 2. عند إرسال المتقدم للقائمة (تعبئة الأجوبة)
    if (interaction.isModalSubmit() && interaction.customId === 'apply_modal') {
        await interaction.deferReply({ ephemeral: true });

        if (appliedUsers.includes(interaction.user.id)) {
            return interaction.editReply({ content: '❌ لقد قمت بالتقديم مسبقاً.' });
        }

        const name = interaction.fields.getTextInputValue('name');
        const age = interaction.fields.getTextInputValue('age');
        const exp = interaction.fields.getTextInputValue('experience');
        const act = interaction.fields.getTextInputValue('activity');
        const skills = interaction.fields.getTextInputValue('skills');

        const logChannel = await interaction.guild.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
        if (!logChannel) return interaction.editReply({ content: '❌ خطأ: لم يتم العثور على روم المسؤولين الموحد.' });

        const embed = new EmbedBuilder()
            .setTitle('📥 طلب تقديم جديد للمراجعة')
            .setColor('#E67E22')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 المتقدم:', value: `${interaction.user} (${interaction.user.id})`, inline: false },
                { name: '📝 الاسم:', value: name, inline: true },
                { name: '🎂 العمر:', value: age, inline: true },
                { name: '⏳ مدة التفاعل:', value: act, inline: true },
                { name: '🌍 خبرة سابقة:', value: exp, inline: false },
                { name: '💡 المهارات والخبرات:', value: skills, inline: false }
            )
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('قبول ✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('رفض ❌').setStyle(ButtonStyle.Danger)
        );

        await logChannel.send({ embeds: [embed], components: [row] });

        appliedUsers.push(interaction.user.id);

        return interaction.editReply({ content: '✅ تم إرسال طلبك بنجاح للإدارة لمراجعته، سيتم الرد عليك قريباً!' });
    }

    // 3. تفاعل المسؤولين مع أزرار (قبول / رفض)
    if (interaction.isButton() && (interaction.customId.startsWith('accept_') || interaction.customId.startsWith('reject_'))) {
        await interaction.deferUpdate();

        const action = interaction.customId.startsWith('accept_') ? 'ACCEPT' : 'REJECT';
        const userId = interaction.customId.split('_')[1]; 

        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const oldEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

        if (action === 'ACCEPT') {
            oldEmbed.setColor('#2ECC71')
                    .setTitle('✅ تم قبول الطلب')
                    .addFields({ name: '📢 حالة الطلب:', value: `تم القبول بواسطة المسؤول: ${interaction.user}`, inline: false });

            if (!acceptedUsers.includes(userId)) {
                acceptedUsers.push(userId);
            }

            if (member) {
                await member.send(`🎉 نبارك لك قبولك المبدئي لدا ادارتنا يرجى التواصل مع ${interaction.user} لتسليمك مهامك نتمنى لك التوفيق.`).catch(() => null);
            }
        } else {
            oldEmbed.setColor('#E74C3C')
                    .setTitle('❌ تم رفض الطلب')
                    .addFields({ name: '📢 حالة الطلب:', value: `تم الرفض بواسطة المسؤول: ${interaction.user}`, inline: false });
        }

        await interaction.message.edit({ embeds: [oldEmbed], components: [] });
    }
});

client.login(CONFIG.TOKEN);
