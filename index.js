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

const vouches = new Map();

client.once('ready', async () => {
    console.log(`Conectat ca ${client.user.tag}!`);
    const commands = [
        { name: 'ping', description: 'Ping' },
        { name: 'clear', description: 'Sterge mesaje', options: [{ name: 'cantitate', type: ApplicationCommandOptionType.Integer, description: 'Nr mesaje', required: true }] },
        { name: 'lock', description: 'Blocheaza' },
        { name: 'unlock', description: 'Deblocheaza' },
        { name: 'timeout', description: 'Da timeout', options: [
            { name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true },
            { name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Minute', required: true },
            { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }
        ]},
        { name: 'untimeout', description: 'Scoate timeout', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }]},
        { name: 'warn', description: 'Warn', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'kick', description: 'Kick', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'ban', description: 'Ban', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'mark', description: 'Marcheaza scammer', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'supportpanel', description: 'Panou tickete' }
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'clear') {
        const amount = options.getInteger('cantitate');
        await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 Am sters mesaje.`, ephemeral: true });
    }

    if (commandName === 'timeout') {
        const member = interaction.options.getMember('membru');
        const minutes = options.getInteger('minute');
        const reason = options.getString('motiv') || 'Fara motiv';
        await member.timeout(minutes * 60 * 1000, reason);
        return interaction.reply({ content: `⏱️ ${member.user.tag} a primit timeout ${minutes} minute.` });
    }

    if (commandName === 'untimeout') {
        const member = interaction.options.getMember('membru');
        await member.timeout(null);
        return interaction.reply({ content: `✅ Timeout scos pentru ${member.user.tag}.` });
    }

    if (commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        return interaction.reply('🔒 Canal blocat.');
    }

    if (commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        return interaction.reply('🔓 Canal deblocat.');
    }

    if (commandName === 'mark') {
        const user = options.getUser('utilizator');
        const reason = options.getString('motiv');
        const member = interaction.guild.members.cache.get(user.id);
        
        if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(console.error);

        const embed = new EmbedBuilder()
            .setTitle('Scammer Marcat')
            .setColor(0xFF0000)
            .setDescription(`🚨 Utilizator marcat scammer\n\n👤 **Utilizator:** ${user}\n» **Motiv:** ${reason}`)
            .setImage('https://cdn.discordapp.com/attachments/1515449144599249038/1516171455941841107/1780855051320.png');
            
        const chan = interaction.guild.channels.cache.get(CONFIG.SCAMMER_ROLE_ID ? CONFIG.SCAM_CHANNEL_ID : null);
        if (chan) await chan.send({ embeds: [embed] });
        return interaction.reply({ content: '✅ Marcat!' });
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
                { name: '🛡️ Staff Commands', value: '`/supportpanel`, `/mark`, `/timeout`, `/untimeout`, `/clear`, `/lock`' }
            );
        return message.reply({ embeds: [embed] });
    }

    if (cmd === '+vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifica un user!');
        if (!vouches.has(target.id)) vouches.set(target.id, []);
        vouches.get(target.id).push({ author: message.author.tag, comment: args.slice(2).join(' ') || 'Fara comentariu' });
        return message.reply(`✅ Vouch adaugat!`);
    }

    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author;
        const userVouches = vouches.get(target.id) || [];
        return message.reply(`👤 **Profil Vouch - ${target.username}**\nTotal: ${userVouches.length}`);
    }
});

client.login(process.env.TOKEN);
        
