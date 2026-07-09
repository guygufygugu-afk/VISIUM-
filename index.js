const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const express = require('express');

// --- SERVER EXPRESS ---
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Botul este online și stabil!'));
app.listen(port, () => console.log(`Server web activ pe portul ${port}`));

// --- CONFIGURARE CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// --- SISTEM ANTI-CRASH ---
client.on('error', error => console.error('[VISIUM ERRORE CLIENT]', error));
process.on('unhandledRejection', error => console.error('[ANTI-CRASH] Rejection:', error));
process.on('uncaughtException', error => console.error('[ANTI-CRASH] Exception:', error));

// --- CONFIGURAȚIE ---
const CONFIG = {
    OWNER_ID: '1522987982527922297',
    STAFF_ROLE_ID: '1522995287201812671',
    VOUCH_CHANNEL_ID: '1524691694912540813',
    SUSPECT_ROLE_ID: '1492892693959938089' // Adăugat ID-ul pentru suspect
};

const vouches = new Map();
const pendingVouches = new Map();
const sanctions = new Map();

function addSanction(userId, type, reason, modTag) {
    if (!sanctions.has(userId)) sanctions.set(userId, []);
    sanctions.get(userId).push({ type, reason, mod: modTag, date: new Date().toLocaleDateString() });
}

// --- ÎNREGISTRARE SLASH COMMANDS ---
client.once('ready', async () => {
    const slashCommands = [
        { name: 'warn', description: 'Avertizează un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul sancționat', required: true }, { name: 'motiv', type: 3, description: 'Motivul', required: false }] },
        { name: 'unwarn', description: 'Șterge ultimul avertisment', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'kick', description: 'Dă afară un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'ban', description: 'Banează un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'timeout', description: 'Dă timeout', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }, { name: 'minute', type: 4, description: 'Timp în minute', required: true }, { name: 'motiv', type: 3, description: 'Motivul', required: false }] },
        { name: 'untimeout', description: 'Scoate timeout-ul', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'lock', description: 'Blochează canalul curent' },
        { name: 'unlock', description: 'Deblochează canalul curent' },
        { name: 'clear', description: 'Șterge mesaje', options: [{ name: 'cantitate', type: 4, description: 'Numărul de mesaje', required: true }] },
        { name: 'suspect', description: 'Oferă rolul Suspect', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] }
    ];
    await client.application.commands.set(slashCommands);
});

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        const data = pendingVouches.get(interaction.message.id);
        if (!data) return;
        if (interaction.customId === 'vouch_accept') {
            if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
            vouches.get(data.targetId).push({ status: 'accepted', comment: data.comment, authorName: data.authorName, timestamp: Date.now() });
            pendingVouches.delete(interaction.message.id);
            return interaction.update({ embeds: [new EmbedBuilder().setTitle('✅ Vouch Aprobat').setColor(0x2ECC71).setDescription(`Vouch-ul pentru <@${data.targetId}> a fost acceptat.`)], components: [] });
        } else {
            pendingVouches.delete(interaction.message.id);
            return interaction.update({ embeds: [new EmbedBuilder().setTitle('❌ Vouch Respins').setColor(0xFF0000).setDescription(`Vouch-ul pentru <@${data.targetId}> a fost respins.`)], components: [] });
        }
    }

    if (!interaction.isChatInputCommand()) return;
    
    const { commandName, options } = interaction;
    if (['warn', 'unwarn', 'kick', 'ban', 'timeout', 'untimeout', 'lock', 'unlock', 'clear', 'suspect'].includes(commandName)) {
        if (!interaction.member.roles.cache.has(CONFIG.STAFF_ROLE_ID) && interaction.user.id !== CONFIG.OWNER_ID) return interaction.reply({ content: '❌ Nu ai permisiuni!', flags: 64 });
    }

    const target = options.getMember('utilizator');
    if (commandName === 'warn') { addSanction(target.id, 'WARN', options.getString('motiv') || 'Fără motiv', interaction.user.tag); await interaction.reply(`⚠️ ${target.user.tag} avertizat.`); }
    else if (commandName === 'unwarn') { const uS = sanctions.get(target.id); if(!uS || uS.length === 0) return interaction.reply('❌ Fără warn-uri.'); uS.pop(); await interaction.reply(`✅ Ultimul warn șters.`); }
    else if (commandName === 'kick') { await target.kick(); await interaction.reply(`👢 ${target.user.tag} kick.`); }
    else if (commandName === 'ban') { await target.ban(); await interaction.reply(`🛑 ${target.user.tag} banat.`); }
    else if (commandName === 'timeout') { await target.timeout(options.getInteger('minute') * 60 * 1000); await interaction.reply(`⏱️ ${target.user.tag} timeout.`); }
    else if (commandName === 'untimeout') { await target.timeout(null); await interaction.reply(`✅ Timeout scos.`); }
    else if (commandName === 'lock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }); await interaction.reply('🔒 Canal blocat.'); }
    else if (commandName === 'unlock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true }); await interaction.reply('🔓 Canal deblocat.'); }
    else if (commandName === 'clear') { await interaction.channel.bulkDelete(options.getInteger('cantitate'), true); await interaction.reply({ content: `🧹 Mesaje șterse.`, flags: 64 }); }
    else if (commandName === 'suspect') { await target.roles.add(CONFIG.SUSPECT_ROLE_ID); await interaction.reply(`🕵️ Rol Suspect acordat.`); }
});

// --- COMENZI TEXT ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === '+help') {
        const helpEmbed = new EmbedBuilder().setTitle('🤖 Meniu Comenzi').setColor(0x3498DB)
            .setDescription(`**+vouch <user> <comentariu>**\n**+p / +profile [user]**\n**+lb / +leaderboard**`);
        return message.reply({ embeds: [helpEmbed] });
    }

    if (cmd === '+vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifică un user.');
        const comment = args.slice(2).join(' ');
        const vc = client.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vouch_accept').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('vouch_reject').setLabel('Respinge').setStyle(ButtonStyle.Danger)
        );
        const m = await vc.send({ embeds: [new EmbedBuilder().setTitle('📩 Vouch').setDescription(`De la: ${message.author}\nPentru: ${target}\nComentariu: ${comment}`)], components: [row] });
        pendingVouches.set(m.id, { targetId: target.id, authorName: message.author.username, comment: comment });
        message.reply('✅ Vouch trimis la staff.');
    }

    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author;
        const allVouches = vouches.get(target.id) || [];
        const acceptate = allVouches.filter(v => v.status === 'accepted').length;
        const refuzate = allVouches.filter(v => v.status === 'rejected').length;
        message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil Vouch: ${target.username}`).setColor(0x00FFFF).setDescription(`✅ Aprobate: \`${acceptate}\`\n❌ Respinse: \`${refuzate}\``)] });
    }

    if (cmd === '+leaderboard' || cmd === '+lb') {
        let arr = [];
        for (const [uid, list] of vouches.entries()) {
            const count = list.filter(v => v.status === 'accepted').length;
            if (count > 0) arr.push({ uid, count });
        }
        arr.sort((a, b) => b.count - a.count);
        let txt = `# 🏆 Top Vouch-uri\n`;
        arr.slice(0, 10).forEach((u, i) => { txt += `**#${i+1}** <@${u.uid}> — \`${u.count}\`\n`; });
        message.reply(txt.length > 15 ? txt : "Nu există vouch-uri încă.");
    }
});

client.login(process.env.TOKEN);
         
