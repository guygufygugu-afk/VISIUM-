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
    SCAMMER_ROLE_ID: '1492892376979738715',
};

const vouches = new Map();

client.once('ready', async () => {
    console.log(`Conectat ca ${client.user.tag}!`);
    const commands = [
        { name: 'clear', description: 'Sterge mesaje', options: [{ name: 'cantitate', type: ApplicationCommandOptionType.Integer, description: 'Nr mesaje', required: true }] },
        { name: 'lock', description: 'Blocheaza' },
        { name: 'unlock', description: 'Deblocheaza' },
        { name: 'timeout', description: 'Da timeout', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Minute', required: true }] },
        { name: 'untimeout', description: 'Scoate timeout', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }]},
        { name: 'warn', description: 'Warn', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'kick', description: 'Kick', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'ban', description: 'Ban', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'mark', description: 'Marcheaza scammer', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'suspect', description: 'Alias mark', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
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
        return interaction.reply({ content: `🧹 Am sters ${amount} mesaje.`, ephemeral: true });
    }

    if (commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        return interaction.reply('🔒 Canal blocat.');
    }

    if (commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        return interaction.reply('🔓 Canal deblocat.');
    }

    if (commandName === 'timeout') {
        const member = interaction.options.getMember('membru');
        const minutes = options.getInteger('minute');
        await member.timeout(minutes * 60 * 1000);
        return interaction.reply({ content: `⏱️ ${member.user.tag} a primit timeout ${minutes} minute.` });
    }

    if (commandName === 'untimeout') {
        const member = interaction.options.getMember('membru');
        await member.timeout(null);
        return interaction.reply({ content: `✅ Timeout scos pentru ${member.user.tag}.` });
    }

    if (commandName === 'mark' || commandName === 'suspect') {
        const user = options.getUser('utilizator');
        const reason = options.getString('motiv');
        const member = interaction.guild.members.cache.get(user.id);
        
        if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(console.error);

        // Formatul cerut de tine
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription(`# 🚨 Scammer Marcat\n## ⚠️ Utilizator marcat scammer\n\n🛑 ***Utilizator: ${user} | Motiv: ${reason}***`);
            
        return interaction.reply({ embeds: [embed] });
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
        return message.reply('📜 **Comenzi:** `+vouch`, `+p`, `+leaderboard`');
    }
    if (cmd === '+vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifica un user!');
        if (!vouches.has(target.id)) vouches.set(target.id, []);
        vouches.get(target.id).push({ author: message.author.tag });
        return message.reply(`✅ Vouch adaugat pentru ${target.tag}!`);
    }
    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author;
        const count = vouches.get(target.id)?.length || 0;
        return message.reply(`👤 **Profil Vouch - ${target.username}** | Total: ${count}`);
    }
});

client.login(process.env.TOKEN);
    
