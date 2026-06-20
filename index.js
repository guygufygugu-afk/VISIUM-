const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');

// --- SERVER EXPRESS (Pentru a menține portul deschis pe Render) ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Botul este online!'));
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

const CONFIG = {
    SCAMMER_ROLE_ID: '1492892376979738715', 
    SUSPECT_ROLE_ID: '1492892693959938089',  
    VOUCH_CHANNEL_ID: '1517878554619150476' 
};

// --- BAZA DE DATE (In-Memory) ---
const vouches = new Map();
const pendingVouches = new Map();
const sanctions = new Map();

function addSanction(userId, type, reason, modTag) {
    if (!sanctions.has(userId)) sanctions.set(userId, []);
    sanctions.get(userId).push({ type, reason, mod: modTag, date: new Date().toLocaleDateString() });
}

client.once('ready', () => {
    console.log(`[VISIUM BOT] Conectat! Totul este organizat.`);
});

// --- INTERACTION HANDLER (Slash Commands & Panels) ---
client.on('interactionCreate', async interaction => {
    // Handling Butoane Vouch (Accept/Reject)
    if (interaction.isButton()) {
        const data = pendingVouches.get(interaction.message.id);
        if (!data) return interaction.reply({ content: '❌ Eroare: Vouch-ul nu mai există.', ephemeral: true });

        if (interaction.customId === 'vouch_accept') {
            if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
            vouches.get(data.targetId).push({ status: 'accepted', comment: data.comment, authorName: data.authorName, timestamp: Date.now() });
            pendingVouches.delete(interaction.message.id);
            return interaction.update({ embeds: [new EmbedBuilder().setTitle('✅ Vouch Aprobat').setColor(0x2ECC71).setDescription(`Vouch-ul pentru <@${data.targetId}> a fost acceptat.`)], components: [] });
        } else if (interaction.customId === 'vouch_reject') {
            pendingVouches.delete(interaction.message.id);
            return interaction.update({ embeds: [new EmbedBuilder().setTitle('❌ Vouch Respins').setColor(0xFF0000).setDescription(`Vouch-ul pentru <@${data.targetId}> a fost respins.`)], components: [] });
        }
    }

    // Handling Ticket Panel Selection
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_select') {
            return interaction.reply({ content: `✅ Ai selectat: **${interaction.values[0]}**. Tichetul va fi creat imediat.`, ephemeral: true });
        }
    }

    // Handling Slash Commands
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'supportpanel') {
        const embed = new EmbedBuilder()
            .setTitle('# VisiumComunity Support Panel')
            .setColor(0x5865F2)
            .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🎫 **Ai nevoie de ajutor? Deschide un ticket de support.**\n` +
                `👋 **Pentru cumpărare, apasă Purchase. Fără alte opțiuni.**\n` +
                `✅ **Ai de revendicat un reward? Deschide Claim Reward.**\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('Alege tipul ticketului')
                .addOptions([
                    { label: 'Support', value: 'support', emoji: '🎫' },
                    { label: 'Purchase', value: 'purchase', emoji: '👋' },
                    { label: 'Claim Reward', value: 'claim', emoji: '✅' }
                ])
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panou creat.', ephemeral: true });
    }

    // Comenzi de moderație
    if (commandName === 'warn') {
        const target = options.getMember('utilizator');
        addSanction(target.id, 'WARN', options.getString('motiv') || 'Fără motiv', interaction.user.tag);
        await interaction.reply(`⚠️ ${target.user.tag} a fost avertizat.`);
    }
    if (commandName === 'kick') {
        const target = options.getMember('utilizator');
        await target.kick().catch(() => {});
        await interaction.reply(`👢 ${target.user.tag} a fost dat afară.`);
    }
    if (commandName === 'ban') {
        const target = options.getMember('utilizator');
        await target.ban().catch(() => {});
        await interaction.reply(`🛑 ${target.user.tag} a fost banat.`);
    }
    if (commandName === 'timeout') {
        const target = options.getMember('utilizator');
        await target.timeout(options.getInteger('minute') * 60 * 1000, options.getString('motiv'));
        await interaction.reply(`⏱️ ${target.user.tag} a primit timeout.`);
    }
    if (commandName === 'untimeout') {
        const target = options.getMember('utilizator');
        await target.timeout(null);
        await interaction.reply(`✅ Timeout scos pentru ${target.user.tag}.`);
    }
    if (commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.reply('🔒 Canal blocat.');
    }
    if (commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
        await interaction.reply('🔓 Canal deblocat.');
    }
    if (commandName === 'clear') {
        await interaction.channel.bulkDelete(options.getInteger('cantitate'), true);
        await interaction.reply({ content: `🧹 Am șters mesajele.`, ephemeral: true });
    }
    if (commandName === 'suspect') {
        const user = options.getUser('utilizator');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) await member.roles.add(CONFIG.SUSPECT_ROLE_ID).catch(() => {});
        await interaction.reply(`🚨 ${user} a fost marcat ca suspect.`);
    }
    if (commandName === 'mark') {
        const user = options.getUser('utilizator');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(() => {});
        await interaction.reply(`🛑 ${user} a fost marcat ca scammer.`);
    }
});

// --- PREFIX COMMANDS (+comenzi) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;

    const args = message.content.split(' '); 
    const cmd = args[0].toLowerCase();

    // +help
    if (cmd === '+help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🤖 Meniu Comenzi Bot')
            .setColor(0x3498DB)
            .setDescription(`## 📩 Vouch System\n` +
            `**+vouch <user> <comentariu>** - Trimite un vouch.\n` +
            `**+profile [user]** - Arată profilul.\n` +
            `**+leaderboard** - Top 10 utilizatori.\n\n` +
            `## 🛡️ Staff / Slash Commands\n` +
            `**/supportpanel** - Panou tichet.\n` +
            `**/warn, /kick, /ban, /clear**\n` +
            `**/suspect, /mark**`);
        return message.reply({ embeds: [helpEmbed] });
    }

    // +vouch (Logica strictă din screenshot)
    if (cmd === '+vouch') {
        if (!args[1]) {
            return message.reply('💡 Folosire: `+vouch <user> <comentariu>`');
        }

        const target = message.mentions.users.first();
        if (!target) {
            return message.reply('❌ Specifică un utilizator valid.');
        }

        if (target.id === message.author.id) {
            return message.reply('🚫 Nu poți să îți dai vouch singur.');
        }

        const comment = args.slice(2).join(' ');
        if (!comment) {
            return message.reply('📝 Scrie și comentariul vouch-ului. Exemplu: `+vouch @user 24€ LTC to MM`');
        }

        const vc = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        if (!vc) return message.reply('Eroare: Canalul de vouch-uri nu a fost configurat.');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vouch_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('vouch_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
        );
        
        const m = await vc.send({ 
            embeds: [new EmbedBuilder()
                .setTitle('📩 Vouch Nou')
                .setColor(0x3498DB)
                .setDescription(`De la: ${message.author}\nPentru: ${target}\nComentariu: ${comment}`)
            ], 
            components: [row] 
        });
        
        pendingVouches.set(m.id, { targetId: target.id, authorName: message.author.username, comment: comment }); 
        return message.reply('✅ Vouch-ul a fost primit și așteaptă să fie acceptat de un owner/admin.');
    }

    // +profile
    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author; 
        const allVouches = vouches.get(target.id) || [];
        const acceptate = allVouches.filter(v => v.status === 'accepted').length;
        const refuzate = allVouches.filter(v => v.status === 'rejected').length;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${target.username}`).setDescription(`✅ Aprobate: \`${acceptate}\`\n❌ Respinse: \`${refuzate}\``)] });
    }

    // +leaderboard
    if (cmd === '+leaderboard' || cmd === '+lb') {
        let arr = [];
        for (const [uid, list] of vouches.entries()) {
            const count = list.filter(v => v.status === 'accepted').length;
            if (count > 0) arr.push({ uid, count });
        }
        arr.sort((a, b) => b.count - a.count);
        let txt = `# 🏆 Top 10 Vouch-uri\n`;
        if (arr.length === 0) txt += `Niciun vouch încă.`;
        else arr.slice(0, 10).forEach((u, i) => { txt += `**#${i+1}** <@${u.uid}> - \`${u.count}\` vouch-uri\n`; });
        return message.reply(txt);
    }
});

client.login(process.env.TOKEN);
        
