const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Când botul pornește cu succes
client.once('ready', () => {
    console.log(`🤖 ${client.user.tag} este online și rulează de pe GitHub!`);
});

// Comanda simplă pe chat pentru a genera panoul de tichete
client.on('messageCreate', async (message) => {
    // Verifică dacă mesajul este exact comanda și dacă cel care o scrie este Administrator
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
            .setColor('#0099ff'); // Culoare albastru tech

        // Creăm cele 3 butoane cerute de tine
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_support')
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Primary), // Buton albastru
                new ButtonBuilder()
                    .setCustomId('ticket_purchase')
                    .setLabel('Purchase')
                    .setStyle(ButtonStyle.Success), // Buton verde
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim Reward')
                    .setStyle(ButtonStyle.Secondary) // Buton gri
            );

        // Trimite panoul pe canalul respectiv
        await message.channel.send({ embeds: [ticketEmbed], components: [row] });
        
        // Șterge textul "!setup-ticket" trimis de tine ca să rămână chatul curat
        await message.delete().catch(() => {});
    }
});

// Sistemul care reacționează când un membru apasă pe butoane
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, guild, user } = interaction;
    
    // Verificăm dacă butonul apăsat face parte din sistemul nostru de tichete
    if (['ticket_support', 'ticket_purchase', 'ticket_claim'].includes(customId)) {
        // Îi spunem Discordului că botul procesează cererea (ca să nu expire butonul)
        await interaction.deferReply({ ephemeral: true });

        let typeLabel = 'support';
        if (customId === 'ticket_purchase') typeLabel = 'purchase';
        if (customId === 'ticket_claim') typeLabel = 'claim';

        // Creează canalul de text privat pe server
        const ticketChannel = await guild.channels.create({
            name: `${typeLabel}-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel], // Ascunde canalul de restul lumii
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Îi dă acces doar celui care a apăsat butonul
                },
            ],
        });

        // Mesajul din interiorul tichetului nou deschis
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`🎫 Ticket ${typeLabel.toUpperCase()}`)
            .setDescription(`Salut ${user}!\n\nUn membru din staff va ajunge în cel mai scurt timp pentru a te ajuta.\nPentru a închide acest ticket, apasă pe butonul roșu de mai jos.`)
            .setColor('#ffcc00');

        // Butonul roșu de închidere
        const closeRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger) // Buton roșu
            );

        // Trimite mesajul de întâmpinare și dă-i tag utilizatorului ca să vadă camera
        await ticketChannel.send({ content: `${user}`, embeds: [welcomeEmbed], components: [closeRow] });
        
        // Răspunde-i utilizatorului în secret pe ecran că tichetul s-a creat
        await interaction.editReply({ content: `Ticketul tău a fost creat cu succes în ${ticketChannel}!`, ephemeral: true });
    }

    // Dacă se apasă butonul roșu de Close
    if (customId === 'close_ticket') {
        await interaction.reply({ content: 'Acest ticket se va șterge definitiv în 5 secunde...' });
        
        // Așteaptă 5 secunde și șterge camera
        setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

// Botul își ia token-ul securizat din setările platformei de găzduire (Render)
client.login(process.env.DISCORD_TOKEN);
                              
