const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este online!`);
    // Înregistrare comenzi
    const commands = [
        new SlashCommandBuilder().setName('ticket').setDescription('Deschide un tichet'),
        new SlashCommandBuilder().setName('ban').setDescription('Banează un user').addUserOption(o => o.setName('user').setRequired(true)),
        new SlashCommandBuilder().setName('kick').setDescription('Kick la un user').addUserOption(o => o.setName('user').setRequired(true))
    ].map(cmd => cmd.toJSON());

    await new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ticket') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 Deschide Tichet').setStyle(ButtonStyle.Primary));
            await i.reply({ content: 'Apasă butonul pentru a deschide un tichet:', components: [row] });
        }
        if (i.commandName === 'ban') {
            await i.options.getMember('user').ban();
            await i.reply('Utilizatorul a fost banat.');
        }
    }

    if (i.isButton() && i.customId === 'create_ticket') {
        const channel = await i.guild.channels.create({
            name: `tichet-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [{ id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel] }]
        });
        await i.reply({ content: `Tichet creat: ${channel}`, ephemeral: true });
    }
});

// Prevenire crash 24/7
process.on('unhandledRejection', e => console.error(e));
process.on('uncaughtException', e => console.error(e));

client.login(process.env.DISCORD_TOKEN);
