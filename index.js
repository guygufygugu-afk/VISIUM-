const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', async () => {
    console.log(`✅ VISIUM BOT este online!`);
    
    // Comenzi cu descrieri complete pentru a evita ValidationError
    const commands = [
        new SlashCommandBuilder()
            .setName('ticket')
            .setDescription('Deschide un tichet de suport'),
        new SlashCommandBuilder()
            .setName('ban')
            .setDescription('Baneaza un utilizator')
            .addUserOption(o => o.setName('user').setDescription('User-ul de banat').setRequired(true)),
        new SlashCommandBuilder()
            .setName('kick')
            .setDescription('Kick la un utilizator')
            .addUserOption(o => o.setName('user').setDescription('User-ul de dat afara').setRequired(true))
    ].map(cmd => cmd.toJSON());

    try {
        await new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)
            .put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comenzi sincronizate!');
    } catch (e) { console.error('Eroare sincronizare:', e); }
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand() && !i.isButton()) return;

    if (i.isChatInputCommand()) {
        if (i.commandName === 'ticket') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 Deschide Tichet').setStyle(ButtonStyle.Primary)
            );
            await i.reply({ content: 'Apasă butonul pentru a deschide un tichet:', components: [row] });
        }
    }

    if (i.isButton() && i.customId === 'create_ticket') {
        try {
            const channel = await i.guild.channels.create({
                name: `tichet-${i.user.username}`,
                type: ChannelType.GuildText
            });
            await i.reply({ content: `Tichet creat: ${channel}`, ephemeral: true });
        } catch (err) { console.error(err); }
    }
});

// Protecție anti-crash 24/7
process.on('unhandledRejection', err => console.error('Eroare:', err));
process.on('uncaughtException', err => console.error('Excepție:', err));

client.login(process.env.DISCORD_TOKEN);
