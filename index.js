const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

// --- SERVER EXPRESS ---
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Botul este online!'));
app.listen(port, () => console.log(`Server web activ pe portul ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// --- CONFIGURAȚIE ---
const CONFIG = {
    OWNER_ID: '1522987982527922297',
    STAFF_ROLE_ID: '1522995287201812671',
    VOUCH_CHANNEL_ID: '1524691694912540813',
    SUSPECT_ROLE_ID: '1492892693959938089'
};

const vouches = new Map();
const pendingVouches = new Map();

client.once('ready', async () => {
    const slashCommands = [
        { name: 'warn', description: 'Warn', options: [{ name: 'utilizator', type: 6, required: true }, { name: 'motiv', type: 3, required: false }] },
        { name: 'kick', description: 'Kick', options: [{ name: 'utilizator', type: 6, required: true }] },
        { name: 'ban', description: 'Ban', options: [{ name: 'utilizator', type: 6, required: true }] },
        { name: 'unban', description: 'Unban', options: [{ name: 'id', type: 3, required: true }] },
        { name: 'timeout', description: 'Timeout', options: [{ name: 'utilizator', type: 6, required: true }, { name: 'minute', type: 4, required: true }] },
        { name: 'untimeout', description: 'Untimeout', options: [{ name: 'utilizator', type: 6, required: true }] },
        { name: 'suspect', description: 'Rol Suspect', options: [{ name: 'utilizator', type: 6, required: true }] },
        { name: 'clear', description: 'Șterge mesaje', options: [{ name: 'cantitate', type: 4, required: true }] }
    ];
    await client.application.commands.set(slashCommands);
    console.log('Bot activ!');
});

// --- INTERACȚIUNI SLASH & BUTOANE ---
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        const data = pendingVouches.get(interaction.message.id);
        if (!data) return;
        if (interaction.customId === 'vouch_accept') {
            if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
            vouches.get(data.targetId).push({ status: 'accepted', comment: data.comment, authorName: data.authorName });
            pendingVouches.delete(interaction.message.id);
            return interaction.update({ embeds: [new EmbedBuilder().setTitle('✅ Vouch Aprobat').setColor(0x2ECC71)], components: [] });
        } else {
            pendingVouches.delete(interaction.message.id);
            return interaction.update({ embeds: [new EmbedBuilder().setTitle('❌ Vouch Respins').setColor(0xFF0000)], components: [] });
        }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;
    const target = options.getMember('utilizator');
    
    try {
        if (commandName === 'kick') { await target.kick(); await interaction.reply('✅ Kick dat.'); }
        else if (commandName === 'ban') { await target.ban(); await interaction.reply('✅ Banat.'); }
        else if (commandName === 'unban') { await interaction.guild.members.unban(options.getString('id')); await interaction.reply('✅ Unban efectuat.'); }
        else if (commandName === 'timeout') { await target.timeout(options.getInteger('minute') * 60 * 1000); await interaction.reply('✅ Timeout aplicat.'); }
        else if (commandName === 'untimeout') { await target.timeout(null); await interaction.reply('✅ Timeout scos.'); }
        else if (commandName === 'suspect') { await target.roles.add(CONFIG.SUSPECT_ROLE_ID); await interaction.reply('✅ Rol Suspect acordat.'); }
        else if (commandName === 'clear') { await interaction.channel.bulkDelete(options.getInteger('cantitate'), true); await interaction.reply('✅ Mesaje șterse.'); }
    } catch (e) { interaction.reply('❌ Eroare: Nu am permisiuni sau ID invalid.'); }
});

// --- COMENZI TEXT (+vouch, +p, +help) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === '+help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🤖 Meniu Comenzi')
            .setColor(0x3498DB)
            .setDescription(`**📜 Vouch System**\n\`+vouch <user> <comentariu>\`\n\`+p [user]\`\n\`+leaderboard\`\n\n**🛠️ Staff / Slash Commands**\n\`/ban /unban /kick /timeout /untimeout /suspect /clear\`\n\n**💡 Exemplu vouch**\n\`+vouch @user 24€ LTC to MM\``);
        return message.reply({ embeds: [helpEmbed] });
    }

    if (cmd === '+vouch') {
        const target = message.mentions.users.first();
        const comment = args.slice(2).join(' ');
        if (!target) return message.reply('❌ Specifică un user!');
        if (!comment) return message.reply('❌ Trebuie să scrii un comentariu!');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vouch_accept').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('vouch_reject').setLabel('Respinge').setStyle(ButtonStyle.Danger)
        );
        const m = await client.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID).send({
            embeds: [new EmbedBuilder().setTitle('📩 Vouch Nou').setDescription(`Pentru: ${target}\nDe la: ${message.author}\nComentariu: ${comment}`)],
            components: [row]
        });
        pendingVouches.set(m.id, { targetId: target.id, authorName: message.author.username, comment: comment });
        message.reply('✅ Vouch trimis la staff!');
    }

    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author;
        const allVouches = vouches.get(target.id) || [];
        const acceptate = allVouches.filter(v => v.status === 'accepted');
        const refuzate = allVouches.filter(v => v.status === 'rejected').length;
        
        const badge = acceptate.length >= 5 ? '👨‍✈️ Trusted' : 'Niciunul';
        const coms = acceptate.slice(-3).map((v, i) => `${i + 1}. **${v.authorName}**: ${v.comment}`).join('\n') || 'Nu există.';

        const embed = new EmbedBuilder()
            .setTitle('👨‍✈️ Profil Utilizator')
            .setColor(0x00FFFF)
            .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤺 **User:** ${target.tag}\n🆔 **ID:** ${target.id}\n📱 **Display Name:** ${target.username}\n⌚ **Cont creat:** <t:${Math.floor(target.createdTimestamp / 1000)}:D>\n\n📰 **Informații Vouch**\n✅ **Vouch-uri acceptate:** ${acceptate.length}\n❌ **Vouch-uri refuzate:** ${refuzate}\n\n🚦 **Badge-uri**\n${badge}\n\n✉️ **Ultimele comentarii**\n${coms}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        message.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
