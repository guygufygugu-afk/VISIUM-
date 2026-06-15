const http = require('http');

// === SERVER HTTP PENTRU RENDER (OBLIGATORIU PE PRIMA LINIE) ===
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('🤖 Botul VISIUM este online și rulează pe Render!');
}).listen(process.env.PORT || 3000, () => {
    console.log(`🌐 Serverul HTTP a pornit cu succes pe portul ${process.env.PORT || 3000}`);
});

// === RESTUL CODULUI PENTRU DISCORD BOT ===
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    PermissionsBitField, 
    ChannelType,
    REST,
    Routes
} = require('discord.js');

// === CONFIGURAȚIE SECURIZATĂ ȘI ACTUALIZATĂ ===
const TOKEN = process.env.TOKEN; 
const CLIENT_ID = '1514313530869026867'; 
const STAFF_ROLE_ID = '1490701828831052027'; 
const TICKET_PING_ROLE_ID = '1490701828831052027'; 
const TICKET_CATEGORY_ID = '1492885716856868978'; 
const VERIFY_CHANNEL_ID = '1514651853348929738';   

// Stocare temporară în memorie (se resetează la restart)
const userWarns = new Map();
const userVouches = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// DEFINIRE COMENZI SLASH
const commands = [
    { name: 'ping', description: 'Vezi latența botului.' },
    { 
        name: 'purge', 
        description: 'Șterge un număr de mesaje.',
        options: [{ name: 'numar', type: 4, description: 'Numărul de mesaje de șters', required: true }]
    },
    { 
        name: 'warn', 
        description: 'Avertizează un membru.',
        options: [
            { name: 'user', type: 6, description: 'Membrul pe care vrei să îl avertizezi', required: true },
            { name: 'motiv', type: 3, description: 'Motivul avertismentului', required: false }
        ]
    },
    { 
        name: 'clearwarns', 
        description: 'Șterge toate avertismentele unui membru.',
        options: [{ name: 'user', type: 6, description: 'Membrul vizat', required: true }]
    },
    { 
        name: 'mark', 
        description: 'Marchează un utilizator ca scammer.',
        options: [
            { name: 'user', type: 6, description: 'Utilizatorul suspect', required: true },
            { name: 'motiv', type: 3, description: 'Motivul pentru care este marcat', required: true }
        ]
    },
    { name: 'setup-ticket', description: 'Spawnează panelul de support (Doar Admin).' }
];

client.once('ready', async () => {
    console.log(`🤖 Logat cu succes ca ${client.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Se încarcă comenzile slash...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Toate comenzile slash au fost configurate global!');
    } catch (error) {
        console.error('Eroare la încărcarea comenzilor:', error);
    }
});

// === SISTEMUL DE VOUCH (+vouch / +p) ===
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = '+';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'vouch') {
        const targetUser = message.mentions.users.first();
        const comment = args.slice(1).join(' ');

        if (!targetUser) return message.reply('❌ **Format incorect!** Folosește: `+vouch @user <comentariu>`');
        if (!comment) return message.reply('❌ Te rog adaugă un comentariu valid pentru acest vouch.');
        if (targetUser.id === message.author.id) return message.reply('❌ Nu îți poți acorda vouch singur.');

        const verifyChannel = message.guild.channels.cache.get(VERIFY_CHANNEL_ID);
        if (!verifyChannel) return message.reply('❌ Eroare: Canalul de verificare a vouch-urilor nu a fost găsit.');

        const embedVouch = new EmbedBuilder()
            .setTitle('Nou Vouch Spre Verificare')
            .setDescription(`**Autor:** <@${message.author.id}>\n**Destinatar:** <@${targetUser.id}>\n\n**Comentariu:**\n\`\`\`\n${comment}\n\`\`\``)
            .setColor('Blurple')
            .setFooter({ text: 'Verificare Vouch-uri VISIUM' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`v_accept_${message.author.id}_${targetUser.id}`)
                .setLabel('Acceptă')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`v_reject_${message.author.id}_${targetUser.id}`)
                .setLabel('Respinge')
                .setStyle(ButtonStyle.Danger)
        );

        await verifyChannel.send({ embeds: [embedVouch], components: [row] });
        return message.reply('✅ Vouch-ul tău a fost trimis spre analiză echipei Staff!');
    }

    if (command === 'p') {
        const targetUser = message.mentions.users.first() || message.author;
        const data = userVouches.get(targetUser.id) || { count: 0, reviews: [] };

        let latestReviews = data.reviews.length > 0 
            ? data.reviews.slice(-3).map(r => `*„${r.comment}”* - de la <@${r.author}>`).join('\n')
            : '*Nu există recenzii aprobate pentru acest utilizator.*';

        const profileEmbed = new EmbedBuilder()
            .setColor('DarkButNotBlack')
            .setAuthor({ name: `Profil Vouch: ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
            .addFields(
                { name: '📊 Vouch-uri Totale Aprobate:', value: `⭐ **${data.count}**` },
                { name: '💬 Ultimele opinii approved:', value: latestReviews }
            );

        message.reply({ embeds: [profileEmbed] });
    }
});

// === HANDLER INTERACȚIUNI ===
client.on('interactionCreate', async interaction => {
    
    // 1. COMENZI SLASH
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'ping') {
            await interaction.reply(`🏓 Pong! Latența botului: **${client.ws.ping}ms**.`);
        }

        if (commandName === 'purge') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: '❌ Nu ai permisiunea de a folosi comanda purge.', ephemeral: true });
            }
            const amount = interaction.options.getInteger('numar');
            if (amount < 1 || amount > 100) return interaction.reply({ content: 'Alege o valoare între 1 și 100.', ephemeral: true });
            
            await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `🧹 Am șters ${amount} mesaje cu succes.`, ephemeral: true });
        }

        if (commandName === 'warn') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return interaction.reply({ content: '❌ Permisiuni insuficiente pentru a da avertismente.', ephemeral: true });
            }
            const target = interaction.options.getUser('user');
            const reason = interaction.options.getString('motiv') || 'Nespecificat';
            
            let currentWarns = userWarns.get(target.id) || 0;
            currentWarns++;
            userWarns.set(target.id, currentWarns);

            const warnEmbed = new EmbedBuilder()
                .setTitle('⚠️ Membru Avertizat')
                .setColor('Orange')
                .setDescription(`**Utilizator:** ${target}\n**Staff:** ${interaction.user}\n**Motiv:** ${reason}\n**Număr total de avertismente:** ${currentWarns}`);

            await interaction.reply({ embeds: [warnEmbed] });
        }

        if (commandName === 'clearwarns') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return interaction.reply({ content: '❌ Permisiuni insuficiente.', ephemeral: true });
            }
            const target = interaction.options.getUser('user');
            userWarns.set(target.id, 0);

            await interaction.reply(`🧹 Toate avertismentele aplicate utilizatorului ${target} au fost șterse.`);
        }

        // COMANDĂ MARK CONFORM MODELULUI
        if (commandName === 'mark') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return interaction.reply({ content: '❌ Doar membrii Staff pot marca un scammer.', ephemeral: true });
            }
            const target = interaction.options.getUser('user');
            const reason = interaction.options.getString('motiv');

            const scamEmbed = new EmbedBuilder()
                .setTitle('Scammer Marcat')
                .setDescription('🚨 **Utilizator marcat scammer**')
                .setColor('Red')
                .addFields(
                    { name: '🕵️ Utilizator:', value: `<@${target.id}>`, inline: false },
                    { name: '≫ Motiv:', value: `${reason}`, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [scamEmbed] });
        }

        if (commandName === 'setup-ticket') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Doar un Administrator poate rula configurarea panelului.', ephemeral: true });
            }

            const ticketEmbed = new EmbedBuilder()
                .setTitle('VISIUM Support Panel')
                .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n** 👷Ai nevoie de ajutor? Deschide un ticket de support.**\n** 🏦Pentru cumpărare, apasă Purchase. Fără alte opțiuni.**\n** 🎁Ai de revendicat un reward? Deschide Claim Reward.**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                .setColor('#2b2d31');

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_ticket')
                    .setPlaceholder('Alege categoria potrivită...')
                    .addOptions([
                        { label: 'Support', description: 'Deschide un ticket de asistență tehnică', value: 'ticket_support', emoji: '🛠️' },
                        { label: 'Purchase', description: 'Deschide un ticket pentru achiziții', value: 'ticket_purchase', emoji: '🛒' },
                        { label: 'Claim Reward', description: 'Revendică un premiu / reward', value: 'ticket_reward', emoji: '🎁' }
                    ])
            );

            await interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
            await interaction.reply({ content: 'Panelul de tickete a fost trimis în acest canal!', ephemeral: true });
        }
    }

    // 2. LOGICA SELECT MENU - CREARE TICKET + PING ROL
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_ticket') {
            const type = interaction.values[0];
            const channelName = `ticket-${interaction.user.username.toLowerCase()}`;

            await interaction.deferReply({ ephemeral: true });

            try {
                const channel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] },
                        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                    ]
                });

                await interaction.editReply({ content: `✅ Ticketul tău a fost deschis cu succes în canalul: ${channel}` });

                let tipAfisat = 'SUPPORT';
                if (type === 'ticket_purchase') tipAfisat = 'PURCHASE';
                if (type === 'ticket_reward') tipAfisat = 'REWARD';

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`Ticket nou generat - ${tipAfisat}`)
                    .setDescription(`Salutare <@${interaction.user.id}>! Echipa a fost alertată. Te rugăm să explici problema ta în detaliu aici și un operator îți va răspunde în cel mai scurt timp.`)
                    .setColor('Green')
                    .setTimestamp();

                await channel.send({ content: `<@&${TICKET_PING_ROLE_ID}>`, embeds: [welcomeEmbed] });

            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Eroare la crearea canalului de ticket. Verifică ID-ul categoriei sau permisiunile botului!' });
            }
        }
    }

    // 3. BUTOANE DE INTERACȚIUNE (ACCEPTĂ/RESPINGE VOUCH)
    if (interaction.isButton()) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ Nu ai permisiunea necesară (Manage Messages) pentru a modera vouch-uri.', ephemeral: true });
        }

        const parts = interaction.customId.split('_');
        const action = parts[1];
        const authorId = parts[2];
        const targetId = parts[3];

        const originalEmbed = interaction.message.embeds[0];
        
        // --- LINIA CORECTATĂ PENTRU SIGURANȚĂ MAXIMĂ LA COPY-PASTE ---
        const safeRegex = new RegExp('```\\n([\\s\\S]*?)\\n```');
        const commentMatch = originalEmbed.description.match(safeRegex);
        const commentText = commentMatch ? commentMatch[1] : "Fără comentariu identificat";

        if (action === 'accept') {
            let uData = userVouches.get(targetId) || { count: 0, reviews: [] };
            uData.count++;
            uData.reviews.push({ author: authorId, comment: commentText });
            userVouches.set(targetId, uData);

            const acceptedEmbed = EmbedBuilder.from(originalEmbed)
                .setTitle('✅ Vouch Aprobat de Staff')
                .setColor('Green')
                .setFooter({ text: `Confirmat de: ${interaction.user.username}` });

            await interaction.update({ embeds: [acceptedEmbed], components: [] });
            await interaction.channel.send(`⭐ <@${targetId}> a primit un vouch aprobat de la <@${authorId}>!`);
        }

        if (action === 'reject') {
            const rejectedEmbed = EmbedBuilder.from(originalEmbed)
                .setTitle('❌ Vouch Respins de Staff')
                .setColor('Red')
                .setFooter({ text: `Respins de: ${interaction.user.username}` });

            await interaction.update({ embeds: [rejectedEmbed], components: [] });
        }
    }
});

client.login(TOKEN);
