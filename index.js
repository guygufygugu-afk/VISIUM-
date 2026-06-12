const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// ID-ul tău oficial de Staff salvat în cod:
const STAFF_ROLE_ID = "1490701828831052027"; 

// Când botul pornește, înregistrăm comanda cu Slash pe Discord
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} este online și rulează Slash Commands!`);

    // Definim comanda /setup-ticket
    const commands = [
        new SlashCommandBuilder()
            .setName('setup-ticket')
            .setDescription('Generează panoul premium de tichete VISIUM')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Doar Adminii o pot vedea/folosi
            .toJSON()
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Se încarcă comenzile cu slash (/) pe Discord...');
        
        // Înregistrează comanda global (va apărea pe toate serverele unde este botul în maxim câteva secunde)
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log('✅ Comenzile cu slash (/) au fost înregistrate cu succes!');
    } catch (error) {
        console.error('❌ Eroare la încărcarea comenzilor:', error);
    }
});

// Sistemul care reacționează când cineva folosește comanda cu SLASH (/)
client.on('interactionCreate', async (interaction) => {
    // Verificăm dacă interacțiunea este o comandă de tip chat (slash)
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup-ticket') {
            // Îi spunem Discordului că procesăm, dar trimitem panoul direct pe canal
            await interaction.deferReply({ ephemeral: true });

            const ticketEmbed = new EmbedBuilder()
                .setTitle('VISIUM Support Panel')
                .setDescription(
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '** 👷Ai nevoie de ajutor? Deschide un ticket de support.**\n' +
                    '** 🏦Pentru cumpărare, apasă Purchase. Fără alte opțiuni.**\n' +
                    '** 🎁Ai de revendicat un reward? Deschide Claim Reward.**\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                )
                .setColor('#0099ff');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_support')
                        .setLabel('Support')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ticket_purchase')
                        .setLabel('Purchase')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('ticket_claim')
                        .setLabel('Claim Reward')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Trimitem panoul pe canalul unde s-a scris comanda
            await interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
            
            // Îi confirmăm adminului în secret că panoul s-a pus cu succes
            await interaction.editReply({ content: '✅ Panoul de tichete a fost generat!' });
        }
    }

    // Sistemul pentru butoanele din tichete (rămâne neschimbat, funcționează perfect)
    if (interaction.isButton()) {
        const { customId, guild, user } = interaction;
        
        if (['ticket_support', 'ticket_purchase', 'ticket_claim'].includes(customId)) {
            await interaction.deferReply({ ephemeral: true });

            let typeLabel = 'support';
            if (customId === 'ticket_purchase') typeLabel = 'purchase';
            if (customId === 'ticket_claim') typeLabel = 'claim';

            const ticketChannel = await guild.channels.create({
                name: `${typeLabel}-${user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel], // Ascunde de @everyone
                    },
                    {
                        id: user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: STAFF_ROLE_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    }
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`🎫 Ticket ${typeLabel.toUpperCase()}`)
                .setDescription(`Salut ${user}!\n\nUn membru din staff (<@&${STAFF_ROLE_ID}>) va ajunge în cel mai scurt timp pentru a te ajuta.\nPentru a închide acest ticket, apasă pe butonul roșu de mai jos.`)
                .setColor('#ffcc00');

            const closeRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                );

            await ticketChannel.send({ content: `${user} | <@&${STAFF_ROLE_ID}>`, embeds: [welcomeEmbed], components: [closeRow] });
            await interaction.editReply({ content: `Ticketul tău a fost creat cu succes în ${ticketChannel}!`, ephemeral: true });
        }

        if (customId === 'close_ticket') {
            await interaction.reply({ content: 'Acest ticket se va șterge definitiv în 5 secunde...' });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => {});
            }, 5000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                                            
