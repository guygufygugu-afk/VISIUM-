const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

// ID-ul oficial de Staff pentru tichete:
const STAFF_ROLE_ID = "1490701828831052027"; 

// Directoare de stocare compatibile cu mediul Render /tmp
const WARNS_FILE = path.join('/tmp', 'warns.json');
const INVITES_FILE = path.join('/tmp', 'invites.json');

if (!fs.existsSync(WARNS_FILE)) fs.writeFileSync(WARNS_FILE, JSON.stringify({}));
if (!fs.existsSync(INVITES_FILE)) fs.writeFileSync(INVITES_FILE, JSON.stringify({}));

const invitesCache = new Map();

client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} rulează stabil cu toate sistemele sincronizate!`);

    for (const [guildId, guild] of client.guilds.cache) {
        try {
            const guildInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Map(guildInvites.map(invite => [invite.code, invite.uses])));
        } catch (err) {}
    }

    const commands = [
        new SlashCommandBuilder()
            .setName('setup-ticket')
            .setDescription('Generează panoul premium de tichete VISIUM')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('setup-sugestii')
            .setDescription('Generează panoul premium fix pentru Sugestii (cu Formular)')
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
            .setName('unwarn')
            .setDescription('Scoate un număr specific de avertismente unui membru')
            .addUserOption(option => option.setName('user').setDescription('Membrul căruia îi scazi warn-urile').setRequired(true))
            .addIntegerOption(option => option.setName('cantitate').setDescription('Câte warn-uri ștergi (implicit 1)').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

        new SlashCommandBuilder()
            .setName('clearwarns')
            .setDescription('Șterge ABSOLUT TOATE avertismentele unui utilizator')
            .addUserOption(option => option.setName('user').setDescription('Membrul căruia îi cureți istoricul').setRequired(true))
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
        console.log('🔄 Actualizăm setul complet de comenzi în cache-ul global...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Reînregistrare reușită! Sistemele de Unwarn și Clearwarns sunt active.');
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
    } catch (err) {}
});

client.on('interactionCreate', async (interaction) => {
    
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, user } = interaction;

        // --- SCOATERE WARN INDIVIDUAL / CANTITATE ---
        if (commandName === 'unwarn') {
            const targetUser = options.getUser('user');
            let cantitate = options.getInteger('cantitate') ?? 1;
            let data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));

            if (!data[targetUser.id] || data[targetUser.id].length === 0) {
                return interaction.reply({ content: `ℹ️ ${targetUser.tag} nu are avertismente înregistrate.`, ephemeral: true });
            }

            if (cantitate < 1) cantitate = 1;
            
            let eliminate = 0;
            for (let i = 0; i < cantitate; i++) {
                if (data[targetUser.id] && data[targetUser.id].length > 0) {
                    data[targetUser.id].pop();
                    eliminate++;
                }
            }

            const ramase = data[targetUser.id] ? data[targetUser.id].length : 0;
            if (ramase === 0) delete data[targetUser.id];

            fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
            return interaction.reply({ content: `✅ S-au eliminat \`${eliminate}\` avertismente pentru ${targetUser}.\n📉 În prezent mai are: \`${ramase}\` warn-uri.` });
        }

        // --- ȘTERGERE COMPLETĂ ISTORIC WARNS ---
        if (commandName === 'clearwarns') {
            const targetUser = options.getUser('user');
            let data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));

            if (!data[targetUser.id] || data[targetUser.id].length === 0) {
                return interaction.reply({ content: `ℹ️ Utilizatorul ${targetUser.tag} are deja cazierul curat.`, ephemeral: true });
            }

            delete data[targetUser.id];
            fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
            return interaction.reply({ content: `🧹 Cazier curățat complet! Toate avertismentele lui ${targetUser} au fost șterse de către ${user}.` });
        }

        // --- REZOLVARE COMANDE SUGESTII / TICKETS / MODERARE CURENTĂ ---
        if (commandName === 'setup-sugestii') {
            await interaction.deferReply({ ephemeral: true });
            const embedSugestii = new EmbedBuilder()
                .setTitle('💡 Trimite o Sugestie')
                .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n**💭 Ai o idee pentru server? Trimite sugestia ta apăsând pe butonul de mai jos.**\n\n**🎭 Cum funcționează?**\n* 📝 Apeși butonul și completezi formularul.\n* 📊 Se va genera automat un mesaj pentru votul comunității.\n* 👷 Staff-ul o va analiza și va decide statusul ei.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                .setColor('#7289da')
                .setFooter({ text: 'Ajută-ne să facem comunitatea mai bună!' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('deschide_formular_sugestie').setLabel('📝 Trimite Sugestie').setStyle(ButtonStyle.Primary)
            );
            await interaction.channel.send({ embeds: [embedSugestii], components: [row] });
            return interaction.editReply({ content: '✅ Panou sugestii generat!' });
        }

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
            const u = options.getUser('user'); const r = options.getString('reason') || 'Fără motiv specificat'; const m = guild.members.cache.get(u.id);
            if (!m || !m.bannable) return interaction.reply({ content: '❌ Imposibil de executat!', ephemeral: true });
            await m.ban({ reason: `${user.tag}: ${r}` });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔨 Membru Banat').setDescription(`**Membru:** ${u.tag}\n**Staff:** ${user}\n**Motiv:** ${r}`).setColor('#ff0000')] });
        }
        if (commandName === 'kick') {
            const u = options.getUser('user'); const r = options.getString('reason') || 'Fără motiv specificat'; const m = guild.members.cache.get(u.id);
            if (!m || !m.kickable) return interaction.reply({ content: '❌ Imposibil de executat!', ephemeral: true });
            await m.kick(`${user.tag}: ${r}`);
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('👢 Membru Kick').setDescription(`**Membru:** ${u.tag}\n**Staff:** ${user}\n**Motiv:** ${r}`).setColor('#ffaa00')] });
        }
        if (commandName === 'mute') {
            const u = options.getUser('user'); const min = options.getInteger('minutes'); const r = options.getString('reason') || 'Fără motiv specificat'; const m = guild.members.cache.get(u.id);
            if (!m) return interaction.reply({ content: '❌ Nu e pe server!', ephemeral: true });
            try { await m.timeout(min * 60 * 1000, r); return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🤫 Timeout').setDescription(`**Membru:** ${u.tag}\n**Durată:** ${min} min\n**Staff:** ${user}`).setColor('#333333')] }); } catch(e) { return interaction.reply({ content: '❌ Eroare roluri!', ephemeral: true }); }
        }
        if (commandName === 'unmute') {
            const u = options.getUser('user'); const m = guild.members.cache.get(u.id);
            if (!m) return interaction.reply({ content: '❌ Nu e pe server!', ephemeral: true });
            try { await m.timeout(null); return interaction.reply({ content: `🔊 Mutul lui ${u.tag} a fost scos!` }); } catch(e) { return interaction.reply({ content: '❌ Eroare!', ephemeral: true }); }
        }
        if (commandName === 'warn') {
            const u = options.getUser('user'); const r = options.getString('reason') || 'Fără motiv specificat';
            let d = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8')); if (!d[u.id]) d[u.id] = [];
               
