const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(port, () => {
    console.log(`Server web activ pe portul ${port}`);
});

// Restul codului tău (clientul, comenzile, etc) urmează aici...

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const vouches = new Map();
const CONFIG = {
    TICKET_STAFF: '1522995560972554393',
    VOUCH_CHANNEL: '1524691694912540813',
    GIF_LINK: 'https://cdn.discordapp.com/attachments/1524034577784635472/1524038680556077137/Adobe_Express_-_ezgif.com-video-to-gif-converter.gif?ex=6a504560&is=6a4ef3e0&hm=7d060c1aa3c96ea25da450b6f1fc3f34b299b1872fa23da28f2c2ba149667308&'
};

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('setup-support').setDescription('Panou Support'),
        new SlashCommandBuilder().setName('setup-mm').setDescription('Panou Middleman')
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu()) {
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                { id: CONFIG.TICKET_STAFF, allow: ['ViewChannel', 'SendMessages'] }
            ]
        });
        return interaction.reply({ content: `✅ Ticket creat: ${channel}`, ephemeral: true });
    }
    // ... setup-support și setup-mm logica (ca mai sus) ...
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    // +vouch @user [comentariu]
    if (cmd === '+vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifică un user!');
        const comment = args.slice(2).join(' ') || "Fără comentariu";
        
        const data = vouches.get(target.id) || { accepted: 0 };
        data.accepted += 1;
        vouches.set(target.id, data);

        const vChannel = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL);
        if (vChannel) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Vouch Nou')
                .setColor(0x00FF00)
                .setDescription(`**User:** <@${target.id}>\n**De la:** ${message.author.username}\n**Mesaj:** ${comment}`);
            vChannel.send({ embeds: [embed] });
        }
        message.reply(`✅ Vouch adăugat cu succes pentru ${target.username}!`);
    }

    if (cmd === '+p') {
        const target = message.mentions.users.first() || message.author;
        const data = vouches.get(target.id) || { accepted: 0 };
        const embed = new EmbedBuilder().setTitle('👨‍✈️ Profil Utilizator').setDescription(`🤺 **User:** ${target.tag}\n🆔 **ID:** ${target.id}\n✅ **Vouch-uri:** ${data.accepted}`);
        message.reply({ embeds: [embed] });
    }

    if (cmd === '+help') {
        message.reply('📜 **Comenzi:**\n+p [user], +vouch [user] [text]\n/setup-support, /setup-mm');
    }
});

client.login(process.env.TOKEN);
