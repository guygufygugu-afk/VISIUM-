const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const express = require('express');

// Server Express obligatoriu pentru ca Render să nu dea crash ("status 1")
const app = express();
app.get('/', (req, res) => res.send('Botul Visium rulează 24/7!'));
app.listen(process.env.PORT || 3000, () => console.log('Server Web pentru Uptime pornit!'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// CONFIGURARE ID-URI
const CONFIG = {
    STAFF_ROLE_ID: '1490701828831052027',      
    TICKET_CATEGORY_ID: '1492885716856868978', 
    SCAM_CHANNEL_ID: '1514651853348929738',    
};

// Baze de date temporare în memorie (se resetează la restart)
const warns = new Map();
const vouches = new Map();

client.once('ready', async () => {
    console.log(`Conectat cu succes ca ${client.user.tag}!`);

    // Lista completă de comenzi înregistrate
    const commands = [
        { name: 'ping', description: 'Verifică latența botului.' },
        {
            name: 'purge',
            description: 'Șterge un număr de mesaje.',
            options: [{ name: 'cantitate', type: ApplicationCommandOptionType.Integer, description: 'Numărul de mesaje (1-100)', required: true }]
        },
        {
            name: 'lock',
            description: 'Blochează canalul curent pentru membrii de rând.'
        },
        {
            name: 'unlock',
            description: 'Deblochează canalul curent.'
        },
        {
            name: 'warn',
            description: 'Avertizează un membru.',
            options: [
                { name: 'membru', type: ApplicationCommandOptionType.User, description: 'Membrul avertizat', required: true },
                { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motivul avertismentului', required: false }
            ]
        },
        {
            name: 'unwarn',
            description: 'Scoate un avertisment unui membru.',
            options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'Membrul vizat', required: true }]
        },
        {
            name: 'clearwarns',
            description: 'Șterge toate avertismentele unui membru.',
            options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'Membrul vizat', required: true }]
        },
        {
            name: 'warns',
            description: 'Vezi câte avertismente are un membru.',
            options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'Membrul vizat', required: true }]
        },
        {
            name: 'kick',
            description: 'Dă afară un membru de pe server.',
            options: [
                { name: 'membru', type: ApplicationCommandOptionType.User, description: 'Membrul vizat', required: true },
                { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motivul', required: false }
            ]
        },
        {
            name: 'ban',
            description: 'Interzice definitiv un membru pe server.',
            options: [
                { name: 'membru', type: ApplicationCommandOptionType.User, description: 'Membrul vizat', required: true },
                { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motivul', required: false }
            ]
        },
        {
            name: 'mark',
            description: 'Marchează un utilizator ca scammer.',
            options: [
                { name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Utilizatorul suspect', required: true },
                { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motivul marcării', required: true }
            ]
        },
        {
            name: 'setup-ticket',
            description: 'Generează panoul de suport pentru tickete.'
        }
    ];

    try {
        await client.application.commands.set(commands);
        console.log('Toate comenzile Slash (inclusiv Lock/Unlock) au fost încărcate!');
    } catch (error) {
        console.error('Eroare la încărcarea comenzilor:', error);
    }
});

// LOGICA PENTRU COMENZILE SLASH
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'ping') {
        return interaction.reply(`🏓 Pong! Latența botului este de ${client.ws.ping}ms.`);
    }

    if (commandName === 'purge') {
        const amount = options.getInteger('cantitate');
        if (amount < 1 || amount > 100) return interaction.reply({ content: 'Alege o cifră între 1 și 100.', ephemeral: true });
        await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 Am șters ${amount} mesaje!`, ephemeral: true });
    }

    // COMANDA LOCK
    if (commandName === 'lock') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ Nu ai permisiunea să folosești această comandă.', ephemeral: true });
        }
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            const embed = new EmbedBuilder()
                .setTitle('🔒 Canal Blocat')
                .setDescription(`Acest canal a fost blocat de către ${interaction.user}. Membrii nu mai pot trimite mesaje aici.`)
                .setColor(0xFF0000)
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: '❌ Nu am putut bloca canalul. Verifică permisiunile mele!', ephemeral: true });
        }
    }

    // COMANDA UNLOCK
    if (commandName === 'unlock') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ Nu ai permisiunea să folosești această comandă.', ephemeral: true });
        }
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
            const embed = new EmbedBuilder()
                .setTitle('🔓 Canal Deblocat')
                .setDescription(`Acest canal a fost deblocat de către ${interaction.user}. Se poate discuta din nou!`)
                .setColor(0x00FF00)
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: '❌ Nu am putut debloca canalul. Verifică permisiunile mele!', ephemeral: true });
        }
    }

    if (commandName === 'warn') {
        const user = options.getUser('membru');
        const reason = options.getString('motiv') || 'Fără motiv';
        
        let userWarns = warns.get(user.id) || 0;
        userWarns++;
        warns.set(user.id, userWarns);

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Warn Added')
            .setColor(0xFFAA00)
            .addFields(
                { name: 'Membru', value: `${user}`, inline: true },
                { name: 'Staff', value: `${interaction.user}`, inline: true },
                { name: 'Motiv', value: reason },
                { name: 'Total Avertismente', value: `${userWarns}` }
            );
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'unwarn') {
        const user = options.getUser('membru');
        let userWarns = warns.get(user.id) || 0;
        if (userWarns > 0) userWarns--;
        warns.set(user.id, userWarns);
        return interaction.reply(`✅ S-a scos un avertisment pentru ${user}. Total curent: ${userWarns}`);
    }

    if (commandName === 'clearwarns') {
        const user = options.getUser('membru');
        warns.set(user.id, 0);
        return interaction.reply(`🧹 Toate avertismentele lui ${user} au fost șterse de către ${interaction.user}!`);
    }

    if (commandName === 'warns') {
        const user = options.getUser('membru');
        const total = warns.get(user.id) || 0;
        return interaction.reply(`👤 Utilizatorul ${user} are în acest moment **${total}** avertismente.`);
    }

    if (commandName === 'kick') {
        const user = options.getUser('membru');
        const reason = options.getString('motiv') || 'Fără motiv';
        const member = interaction.guild.members.cache.get(user.id);
        if (!member) return interaction.reply('Utilizatorul nu se află pe server.');
        await member.kick(reason);
        return interaction.reply(`👢 **${user.tag}** a primit kick. Motiv: ${reason}`);
    }

    if (commandName === 'ban') {
        const user = options.getUser('membru');
        const reason = options.getString('motiv') || 'Fără motiv';
        await interaction.guild.members.ban(user.id, { reason });
        return interaction.reply(`🔨 **${user.tag}** a fost banat definitiv. Motiv: ${reason}`);
    }

    if (commandName === 'mark') {
        const user = options.getUser('utilizator');
        const reason = options.getString('motiv');

        const embed = new EmbedBuilder()
            .setTitle('🚨 Scammer Marcat')
            .setDescription(`**Utilizator adăugat pe lista neagră**\n\n🕵️‍♂️ **Utilizator:** ${user}\n» **Motiv:** ${reason}`)
            .setColor(0xFF0000)
            .setTimestamp();

        const scamChannel = interaction.guild.channels.cache.get(CONFIG.SCAM_CHANNEL_ID);
        if (scamChannel) {
            await scamChannel.send({ embeds: [embed] });
        }
        return interaction.reply({ content: `Utilizatorul ${user.tag} a fost marcat ca suspect.`, ephemeral: true });
    }

    if (commandName === 'setup-ticket') {
        const embed = new EmbedBuilder()
            .setTitle('⚔️ VisiumCommunity Support Panel')
            .setDescription([
                '------------------',
                '🎒 **Ai nevoie de ajutor?** Deschide un ticket de support.',
                '💸 **Pentru cumpărare**, apasă Purchase.',
                '✅ **Ai de revendicat un reward?** Deschide Claim Reward.',
                '------------------'
            ].join('\n'))
            .setColor(0x1ABC9C)
            .setImage('https://cdn.discordapp.com/attachments/1515449144599249038/1516171455941841107/1780855051320.png?ex=6a31ac34&is=6a305ab4&hm=62da77f6bc272943125bce00522f18870372e1a3b320e402e9298cc7b5f43393&'); 

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Alege tipul ticketului >')
            .addOptions([
                { label: 'Support', description: 'Deschide un ticket de support', value: 'support', emoji: '🎒' },
                { label: 'Purchase', description: 'Deschide un ticket pentru cumpărare', value: 'purchase', emoji: '💸' },
                { label: 'Claim Reward', description: 'Revendică un reward', value: 'claim_reward', emoji: '✅' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ content: 'Panoul de tickete a fost generat!', ephemeral: true });
        return interaction.channel.send({ embeds: [embed], components: [row] });
    }
});

// LOGICA DE DESCHIDERE A TICKETULUI
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'ticket_select') {
        const option = interaction.values[0];
        const guild = interaction.guild;
        
        await interaction.deferReply({ ephemeral: true });

        const ticketTypes = {
            support: 'SUPPORT',
            purchase: 'PURCHASE',
            claim_reward: 'REWARD'
        };

        const typeName = ticketTypes[option] || 'TICKET';
        
        const safeUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
        const channelName = `ticket-${safeUsername || 'user'}`;

        try {
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: 0, 
                parent: CONFIG.TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: CONFIG.STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`Ticket nou generat - ${typeName}`)
                .setDescription(`Salutare ${interaction.user}! Echipa administrativă a fost alertată. Te rugăm să detaliezi solicitarea ta, iar un membru Staff va prelua ticketul în cel mai scurt timp.`)
                .setColor(0x1ABC9C)
                .setTimestamp();

            await ticketChannel.send({ content: `<@&${CONFIG.STAFF_ROLE_ID}>`, embeds: [welcomeEmbed] });
            await interaction.editReply({ content: `Ticketul tău a fost deschis cu succes în canalul: ${ticketChannel}` });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Eroare la crearea ticketului! Verifică permisiunile botului.' });
        }
    }
});

// LOGICA PENTRU COMENZILE TEXT (+vouch și +p)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return;

    if (message.content.startsWith('+vouch')) {
        const args = message.content.slice('+vouch'.length).trim().split(/ +/);
        const targetUser = message.mentions.users.first();

        if (!targetUser) {
            return message.reply('❌ **Format incorect!** Folosește: `+vouch @user <comentariu>`');
        }

        args.shift();
        const comment = args.join(' ');

        if (!comment) {
            return message.reply('❌ **Te rog adaugă un comentariu pentru acest vouch.**');
        }

        if (!vouches.has(targetUser.id)) {
            vouches.set(targetUser.id, []);
        }
        vouches.get(targetUser.id).push({ author: message.author.username, comment: comment });

        return message.reply('✅ **Vouch-ul tău a fost înregistrat cu succes!**');
    }

    if (message.content.trim() === '+p') {
        const targetUser = message.author;
        const userVouches = vouches.get(targetUser.id) || [];
        const totalVouches = userVouches.length;

        let lastReviews = '*Nu există recenzii înregistrate.*';
        if (totalVouches > 0) {
            lastReviews = userVouches.slice(-3).map(v => `• **${v.author}**: ${v.comment}`).join('\n');
        }

        const embed = new EmbedBuilder()
            .setTitle(`👤 Profil Vouch: ${targetUser.username}`)
            .addFields(
                { name: '📊 Vouch-uri Totale:', value: `⭐ **${totalVouches}**` },
                { name: '💬 Ultimele recenzii:', value: lastReviews }
            )
            .setColor(0x5865F2)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
    
