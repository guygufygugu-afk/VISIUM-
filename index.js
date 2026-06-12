const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

// ID-ul tău oficial de Staff:
const STAFF_ROLE_ID = "1490701828831052027"; 

// Folosim folderul /tmp special pentru Render ca să nu mai dea eroare la permisiuni de scriere
const WARNS_FILE = path.join('/tmp', 'warns.json');
const INVITES_FILE = path.join('/tmp', 'invites.json');

if (!fs.existsSync(WARNS_FILE)) fs.writeFileSync(WARNS_FILE, JSON.stringify({}));
if (!fs.existsSync(INVITES_FILE)) fs.writeFileSync(INVITES_FILE, JSON.stringify({}));

const invitesCache = new Map();

client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} este online pe Render cu Moderare, Tichete și Invites!`);

    for (const [guildId, guild] of client.guilds.cache) {
        try {
            const guildInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Map(guildInvites.map(invite => [invite.code, invite.uses])));
        } catch (err) {
            console.log(`Nu s-au putut prelua invitațiile inițiale pentru: ${guild.name}`);
        }
    }

    const commands = [
        new SlashCommandBuilder()
            .setName('setup-ticket')
            .setDescription('Generează panoul premium de tichete VISIUM')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('ban')
            .setDescription('Dă ban unui membru de pe server')
            .addUserOption(option => option.setName('user').setDescription('Membrul căruia îi dai ban').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Motivul banului').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

        new SlashCommandBuilder()
            .setName('kick')
            .setDescription('Dă afară un membru de pe server')
            .addUserOption(option => option.setName('user').setDescription('Membrul dat afară').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Motivul').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

        new SlashCommandBuilder()
            .setName('mute')
            .setDescription('Pune mut unui membru (Timeout)')
            .addUserOption(option => option.setName('user').setDescription('Membrul pe care îl pui pe mut').setRequired(true))
            .addIntegerOption(option => option.setName('minutes').setDescription('Durata în minute').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Motivul').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

        new SlashCommandBuilder()
            .setName('unmute')
            .setDescription('Scoate mutul unui membru')
            .addUserOption(option => option.setName('user').setDescription('Membrul').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

        new SlashCommandBuilder()
            .setName('warn')
            .setDescription('Avertizează un membru')
            .addUserOption(option => option.setName('user').setDescription('Membrul avertizat').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Motivul avertismentului').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

        new SlashCommandBuilder()
            .setName('warns')
            .setDescription('Verifică câte avertismente are un membru')
            .addUserOption(option => option.setName('user').setDescription('Membrul').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

        new SlashCommandBuilder()
            .setName('invites')
            .setDescription('Verifică câte invitații ai tu sau alt membru')
            .addUserOption(option => option.setName('user').setDescription('Membrul căruia vrei să îi vezi invitațiile').setRequired(false)),

        new SlashCommandBuilder()
            .setName('invites-leaderboard')
            .setDescription('Arată topul membrilor cu cele mai multe invitații active'),

        new SlashCommandBuilder()
            .setName('invites-reset')
            .setDescription('Resetează baza de date cu invitații (Doar Admini)')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Trimit noile comenzi către Discord API...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Toate comenzile (inclusiv cele de Invites) sunt active!');
    } catch (error) {
        console.error(error);
    }
});

client.on('inviteCreate', async (invite) => {
    const guildInvites = invitesCache.get(invite.guild.id) || new Map();
    guildInvites.set(invite.code, invite.uses);
    invitesCache.set(invite.guild.id, guildInvites);
});

client.on('guildMemberAdd', async (member) => {
    try {
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invitesCache.get(member.guild.id);
        let inviterUser = null;
        
        if (oldInvites) {
            const usedInvite = newInvites.find(i => oldInvites.has(i.code) && i.uses > oldInvites.get(i.code));
            if (usedInvite) inviterUser = usedInvite.inviter;
        }
        
        invitesCache.set(member.guild.id, new Map(newInvites.map(invite => [invite.code, invite.uses])));

        if (inviterUser) {
            let data = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8'));
            if (!data[inviterUser.id]) data[inviterUser.id] = { regular: 0 };
            data[inviterUser.id].regular += 1;
            fs.writeFileSync(INVITES_FILE, JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error(err);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild } = interaction;

        if (commandName === 'setup-ticket') {
            await interaction.deferReply({ ephemeral: true });
            const ticketEmbed = new EmbedBuilder()
                .setTitle('VISIUM Support Panel')
                .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n** 👷Ai nevoie de ajutor? Deschide un ticket de support.**\n** 🏦Pentru cumpărare, apasă Purchase. Fără alte opțiuni.**\n** 🎁Ai de revendicat un reward? Deschide Claim Reward.**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                .setColor('#0099ff');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            await interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
            return interaction.editReply({ content: '✅ Panou generat!' });
        }

        if (commandName === 'ban') {
            const user = options.getUser('user');
            const reason = options.getString('reason') || 'Fără motiv specificat';
            const member = guild.members.cache.get(user.id);
            if (!member) return interaction.reply({ content: '❌ Utilizatorul nu este pe server!', ephemeral: true });
            if (!member.bannable) return interaction.reply({ content: '❌ Nu pot da ban acestui membru!', ephemeral: true });
            await member.ban({ reason: `${interaction.user.tag}: ${reason}` });
            const embed = new EmbedBuilder().setTitle('🔨 Membru Banat').setDescription(`**Membru:** ${user.tag}\n**Staff:** ${interaction.user}\n**Motiv:** ${reason}`).setColor('#ff0000');
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'kick') {
            const user = options.getUser('user');
            const reason = options.getString('reason') || 'Fără motiv specificat';
            const member = guild.members.cache.get(user.id);
            if (!member) return interaction.reply({ content: '❌ Utilizatorul nu este pe server!', ephemeral: true });
            if (!member.kickable) return interaction.reply({ content: '❌ Nu pot da afară acest membru!', ephemeral: true });
            await member.kick(`${interaction.user.tag}: ${reason}`);
            const embed = new EmbedBuilder().setTitle('👢 Membru Dat Afară (Kick)').setDescription(`**Membru:** ${user.tag}\n**Staff:** ${interaction.user}\n**Motiv:** ${reason}`).setColor('#ffaa00');
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'mute') {
            const user = options.getUser('user');
            const minutes = options.getInteger('minutes');
            const reason = options.getString('reason') || 'Fără motiv specificat';
            const member = guild.members.cache.get(user.id);
            if (!member) return interaction.reply({ content: '❌ Utilizatorul nu este pe server!', ephemeral: true });
            try {
                await member.timeout(minutes * 60 * 1000, reason);
                const embed = new EmbedBuilder().setTitle('🤫 Membru pus pe Mut (Timeout)').setDescription(`**Membru:** ${user.tag}\n**Durată:** ${minutes} minute\n**Staff:** ${interaction.user}\n**Motiv:** ${reason}`).setColor('#333333');
                return interaction.reply({ embeds: [embed] });
            } catch (err) { return interaction.reply({ content: '❌ Eroare ierarhie roluri!', ephemeral: true }); }
        }

        if (commandName === 'unmute') {
            const user = options.getUser('user');
            const member = guild.members.cache.get(user.id);
            if (!member) return interaction.reply({ content: '❌ Utilizatorul nu este pe server!', ephemeral: true });
            try { await member.timeout(null); return interaction.reply({ content: `🔊 Mutul lui ${user.tag} a fost scos!` }); } catch (err) { return interaction.reply({ content: '❌ Eroare!', ephemeral: true }); }
        }

        if (commandName === 'warn') {
            const user = options.getUser('user');
            const reason = options.getString('reason') || 'Fără motiv specificat';
            let data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));
            if (!data[user.id]) data[user.id] = [];
            data[user.id].push({ staff: interaction.user.tag, reason: reason, date: new Date().toLocaleDateString() });
            fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚠️ Avertisment (Warn)').setDescription(`**Membru:** ${user}\n**Staff:** ${interaction.user}\n**Motiv:** ${reason}\n**Warn-uri totale:** \`${data[user.id].length}\``).setColor('#ffff00')] });
        }

        if (commandName === 'warns') {
            const user = options.getUser('user');
            let data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));
            if (!data[user.id] || data[user.id].length === 0) return interaction.reply({ content: `ℹ️ ${user.tag} nu are niciun avertisment.` });
            let list = data[user.id].map((w, index) => `**${index + 1}.** Staff: \`${w.staff}\` | Motiv: \`${w.reason}\` (${w.date})`).join('\n');
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`📋 Warn-uri: ${user.tag}`).setDescription(list).setColor('#ffff00')] });
        }

        if (commandName === 'invites') {
            const targetUser = options.getUser('user') || interaction.user;
            let data = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8'));
            const userInvites = data[targetUser.id] ? data[targetUser.id].regular : 0;
            const embed = new EmbedBuilder().setTitle(`📊 Invitații: ${targetUser.username}`).setDescription(`Membru: ${targetUser}\nAre în prezent: **${userInvites} invitații** valide!`).setColor('#00ffcc');
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'invites-leaderboard') {
            let data = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8'));
            const sorted = Object.entries(data).map(([id, info]) => ({ id, regular: info.regular })).sort((a, b) => b.regular - a.regular).slice(0, 10);
            if (sorted.length === 0) return interaction.reply({ content: 'ℹ️ Nu există invitații înregistrate.' });
            let leaderboardText = '';
            sorted.forEach((user, index) => {
                let medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '🔹'));
                leaderboardText += `${medal} **Top ${index + 1}:** <@${user.id}> — \`${user.regular}\` invitații\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Top Invitații (Leaderboard)').setDescription(leaderboardText).setColor('#ffcc00')] });
        }

        if (commandName === 'invites-reset') {
            fs.writeFileSync(INVITES_FILE, JSON.stringify({}));
            return interaction.reply({ content: '✅ Baza de date a invitațiilor a fost resetată complet!' });
        }
    }

    if (interaction.isButton()) {
        const { customId, guild, user } = interaction;
        if (['ticket_support', 'ticket_purchase', 'ticket_claim'].includes(customId)) {
            await interaction.deferReply({ ephemeral: true });
            let typeLabel = customId === 'ticket_purchase' ? 'purchase' : (customId === 'ticket_claim' ? 'claim' : 'support');

            const ticketChannel = await guild.channels.create({
                name: `${typeLabel}-${user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ],
            });

            const welcomeEmbed = new EmbedBuilder().setTitle(`🎫 Ticket ${typeLabel.toUpperCase()}`).setDescription(`Salut ${user}!\n\nUn membru din staff (<@&${STAFF_ROLE_ID}>) va ajunge în cel mai scurt timp.`).setColor('#ffcc00');
            const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger));
            await ticketChannel.send({ content: `${user} | <@&${STAFF_ROLE_ID}>`, embeds: [welcomeEmbed], components: [closeRow] });
            await interaction.editReply({ content: `Creată în ${ticketChannel}!`, ephemeral: true });
        }

        if (customId === 'close_ticket') {
            await interaction.reply({ content: 'Se șterge în 5 secunde...' });
            setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                
