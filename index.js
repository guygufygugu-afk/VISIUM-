const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ApplicationCommandOptionType } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Botul Visium este online!'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const CONFIG = {
    STAFF_ROLE_ID: '1490701828831052027',      
    TICKET_CATEGORY_ID: '1492885716856868978', 
    SCAM_CHANNEL_ID: '1514651853348929738',
    SCAMMER_ROLE_ID: '1492892376979738715',
};

const vouches = new Map(); // Stocare vouch-uri

client.once('ready', async () => {
    console.log(`Conectat ca ${client.user.tag}!`);
    const commands = [
        { name: 'ping', description: 'Verifică latența' },
        { name: 'clear', description: 'Șterge mesaje', options: [{ name: 'cantitate', type: ApplicationCommandOptionType.Integer, description: 'Nr mesaje', required: true }] },
        { name: 'lock', description: 'Blochează canalul' },
        { name: 'unlock', description: 'Deblochează canalul' },
        { name: 'warn', description: 'Warn', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'unwarn', description: 'Unwarn', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }] },
        { name: 'clearwarns', description: 'Șterge warn-uri', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }] },
        { name: 'warns', description: 'Vezi warn-uri', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }] },
        { name: 'kick', description: 'Kick', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'ban', description: 'Ban', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'mark', description: 'Marchează scammer', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'suspect', description: 'Alias mark', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'supportpanel', description: 'Meniu tickete' }
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'clear') {
        const amount = options.getInteger('cantitate');
        await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 Am șters mesaje.`, ephemeral: true });
    }

    if (commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        return interaction.reply('🔒 Canal blocat.');
    }

    if (commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        return interaction.reply('🔓 Canal deblocat.');
    }

    if (commandName === 'mark' || commandName === 'suspect') {
        const user = options.getUser('utilizator');
        const reason = options.getString('motiv');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(console.error);

        const embed = new EmbedBuilder()
            .setTitle('🚨 Scammer Marcat')
            .setDescription(`**Utilizator:** ${user}\n**Motiv:** ${reason}`)
            .setColor(0xFF0000);
        const chan = interaction.guild.channels.cache.get(CONFIG.SCAM_CHANNEL_ID);
        if (chan) await chan.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Marcat!`, ephemeral: true });
    }

    if (commandName === 'supportpanel') {
        const embed = new EmbedBuilder()
            .setTitle('⚔️ VisiumCommunity Support Panel')
            .setColor(0x1ABC9C)
            .setImage('https://cdn.discordapp.com/attachments/1515449144599249038/1516171455941841107/1780855051320.png');
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Alege tipul ticketului >')
                .addOptions([{ label: 'Support', value: 'support', emoji: '🎒' }, { label: 'Purchase', value: 'purchase', emoji: '💸' }, { label: 'Claim Reward', value: 'claim_reward', emoji: '✅' }])
        );
        return interaction.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return;
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === '+help') {
        const embed = new EmbedBuilder()
            .setTitle('📜 Comenzi Visium Bot')
            .setColor(0x5865F2)
            .addFields(
                { name: '👑 Vouch System', value: '`+vouch @user <comentariu>`\n`+p` / `+profile`\n`+leaderboard`' },
                { name: '🛡️ Staff Commands', value: '`/supportpanel`\n`/mark` / `/suspect`\n`/clear`\n`/lock` / `/unlock`\n`/ban` / `/kick`' }
            );
        return message.reply({ embeds: [embed] });
    }

    if (cmd === '+vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifică un user!');
        const comment = args.slice(2).join(' ');
        if (!vouches.has(target.id)) vouches.set(target.id, []);
        vouches.get(target.id).push({ author: message.author.tag, comment: comment || 'Fără comentariu' });
        return message.reply(`✅ Vouch adăugat pentru ${target.tag}!`);
    }

    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author;
        const userVouches = vouches.get(target.id) || [];
        return message.reply(`👤 **Profil Vouch - ${target.username}**\nTotal vouch-uri: ${userVouches.length}`);
    }

    if (cmd === '+leaderboard') {
        return message.reply('📊 **Top Vouch-uri:** (Sistemul este activ)');
    }
});

client.login(process.env.TOKEN);
            
