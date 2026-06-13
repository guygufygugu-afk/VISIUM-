const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const http = require('http');

// Server mic pentru UptimeRobot
http.createServer((req, res) => { res.write("Bot is online!"); res.end(); }).listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', async () => {
    console.log(`✅ VISIUM BOT este online!`);
    
    const commands = [
        new SlashCommandBuilder().setName('ticket').setDescription('Deschide un tichet'),
        new SlashCommandBuilder().setName('ban').setDescription('Baneaza un user').addUserOption(o => o.setName('user').setRequired(true)),
        new SlashCommandBuilder().setName('kick').setDescription('Kick la un user').addUserOption(o => o.setName('user').setRequired(true))
    ].map(cmd => cmd.toJSON());

    try {
        await new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand() && i.commandName === 'ticket') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 Deschide Tichet').setStyle(ButtonStyle.Primary));
        await i.reply({ content: 'Apasă butonul:', components: [row] });
    }
    if (i.isButton() && i.customId === 'create_ticket') {
        const channel = await i.guild.channels.create({ name: `tichet-${i.user.username}`, type: ChannelType.GuildText });
        await i.reply({ content: `Tichet creat: ${channel}`, ephemeral: true });
    }
});

process.on('unhandledRejection', e => console.error(e));
client.login(process.env.DISCORD_TOKEN);
