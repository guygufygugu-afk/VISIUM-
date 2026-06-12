const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ID-ul tău de Staff salvat direct în cod
const STAFF_ROLE_ID = "1490701828831052027"; 

client.once('ready', () => {
    console.log(`🤖 ${client.user.tag} este online și rulează de pe GitHub!`);
});

client.on('messageCreate', async (message) => {
    if (message.content === '!setup-ticket' && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        
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

        await message.channel.send({ embeds: [ticketEmbed], components: [row] });
        await message.delete().catch(() => {});
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

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
                    deny: [PermissionFlagsBits.ViewChannel], // Ascunde de restul lumii
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Acces user
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Acces STAFF!
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

        // Dă tag userului și rolului de Staff când se deschide camera
        await ticketChannel.send({ content: `${user} | <@&${STAFF_ROLE_ID}>`, embeds: [welcomeEmbed], components: [closeRow] });
        await interaction.editReply({ content: `Ticketul tău a fost creat cu succes în ${ticketChannel}!`, ephemeral: true });
    }

    if (customId === 'close_ticket') {
        await interaction.reply({ content: 'Acest ticket se va șterge definitiv în 5 secunde...' });
        setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
                            
