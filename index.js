const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const http = require('http');

// 1. Server HTTP mic pentru a ține botul treaz 24/7 (folosit de Render/UptimeRobot)
http.createServer((req, res) => {
    res.write("Bot is online!");
    res.end();
}).listen(process.env.PORT || 3000);

// 2. Inițializare Bot
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// 3. Pornirea botului și înregistrarea comenzilor FĂRĂ ERORI
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este online și pregătit!`);
    
    // Toate comenzile au descrieri complete pentru a evita ValidationError
    const commands = [
        new SlashCommandBuilder()
            .setName('ticket')
            .setDescription('Deschide un tichet de suport'),
        new SlashCommandBuilder()
            .setName('ban')
            .setDescription('Banează un utilizator de pe server')
            .addUserOption(option => 
                option.setName('user')
                      .setDescription('Alege utilizatorul pe care vrei să-l banezi')
                      .setRequired(true)),
        new SlashCommandBuilder()
            .setName('kick')
            .setDescription('Dă afară un utilizator de pe server')
            .addUserOption(option => 
                option.setName('user')
                      .setDescription('Alege utilizatorul pe care vrei să-l dai afară')
                      .setRequired(true))
    ].map(cmd => cmd.toJSON());

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comenzile au fost sincronizate cu succes!');
    } catch (error) { 
        console.error('❌ Eroare la înregistrarea comenzilor:', error); 
    }
});

// 4. Gestionarea Comenzilor (Slash) și a Butoanelor (Tichete)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ticket') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 Deschide Tichet').setStyle(ButtonStyle.Primary)
            );
            await interaction.reply({ content: 'Apasă pe butonul de mai jos pentru a deschide un tichet:', components: [row] });
        }
        
        if (interaction.commandName === 'ban') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ content: 'Nu ai permisiunea de a bana!', ephemeral: true });
            }
            const user = interaction.options.getMember('user');
            if (user) {
                await user.ban();
                await interaction.reply({ content: `${user.user.tag} a fost banat!`, ephemeral: true });
            }
        }

        if (interaction.commandName === 'kick') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interaction.reply({ content: 'Nu ai permisiunea de a da kick!', ephemeral: true });
            }
            const user = interaction.options.getMember('user');
            if (user) {
                await user.kick();
                await interaction.reply({ content: `${user.user.tag} a primit kick!`, ephemeral: true });
            }
        }
    }

    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        try {
            const channel = await interaction.guild.channels.create({
                name: `tichet-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            await interaction.reply({ content: `Tichetul tău a fost creat: ${channel}`, ephemeral: true });
        } catch (error) {
            console.error('Eroare tichet:', error);
            await interaction.reply({ content: 'A apărut o eroare la crearea tichetului. Verifică dacă botul are rolul de Administrator.', ephemeral: true });
        }
    }
});

// 5. Protecție Anti-Crash (Împiedică botul să se oprească la erori mici)
process.on('unhandledRejection', error => console.error('Eroare neprevăzută:', error));
process.on('uncaughtException', error => console.error('Excepție critică:', error));

// 6. Conectarea Botului
client.login(process.env.DISCORD_TOKEN);
