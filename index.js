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

// ID-ul tău oficial de Staff:
const STAFF_ROLE_ID = "1490701828831052027"; 

// Fișiere în /tmp pentru Render
const WARNS_FILE = path.join('/tmp', 'warns.json');
const INVITES_FILE = path.join('/tmp', 'invites.json');

if (!fs.existsSync(WARNS_FILE)) fs.writeFileSync(WARNS_FILE, JSON.stringify({}));
if (!fs.existsSync(INVITES_FILE)) fs.writeFileSync(INVITES_FILE, JSON.stringify({}));

const invitesCache = new Map();

client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} este online cu Panouri Premium (Tickets & Sugestii Formulare)!`);

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
        console.log('🔄 Încărcăm comenzile cu slash în API...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Sistemele de panouri sunt gata!');
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
    
    // --- PARTEA DE COMENZI SLASH ---
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, user } = interaction;

        // Comanda Setup Panou Sugestii
        if (commandName === 'setup-sugestii') {
            await interaction.deferReply({ ephemeral: true });

            const embedSugestii = new EmbedBuilder()
                .setTitle('💡 Trimite o Sugestie')
                .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n**💭 Ai o idee pentru server? Trimite sugestia ta apăsând pe butonul de mai jos.**\n\n**🎭 Cum funcționează?**\n* 📝 Apeși butonul și completezi formularul.\n* 📊 Se va genera automat un mesaj pentru votul comunității.\n* 👷 Staff-ul o va analiza și va decide statusul ei.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                .setColor('#7289da')
                .setFooter({ text: 'Ajută-ne să facem comunitatea mai bună!' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('deschide_formular_sugestie')
                    .setLabel('📝 Trimite Sugestie')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [embedSugestii], components: [row] });
            return interaction.editReply({ content: '✅ Panoul fix pentru sugestii a fost generat!' });
        }

        // Setup Panou Ticket
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

        // Moderare & Invites (Rămân active din codurile trecute)
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
            d[u.id].push({ staff: user.tag, reason: r, date: new Date().toLocaleDateString() }); fs.writeFileSync(WARNS_FILE, JSON.stringify(d, null, 2));
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚠️ Warn').setDescription(`**Membru:** ${u}\n**Staff:** ${user}\n**Motiv:** ${r}\n**Total:** \`${d[u.id].length}\``).setColor('#ffff00')] });
        }
        if (commandName === 'warns') {
            const u = options.getUser('user'); let d = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));
            if (!d[u.id] || d[u.id].length === 0) return interaction.reply({ content: `ℹ️ Fără avertismente.` });
            let l = d[u.id].map((w, i) => `**${i + 1}.** Staff: \`${w.staff}\` | Motiv: \`${w.reason}\` (${w.date})`).join('\n');
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`📋 Warn-uri: ${u.tag}`).setDescription(l).setColor('#ffff00')] });
        }
        if (commandName === 'invites') {
            const t = options.getUser('user') || user; let d = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8'));
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`📊 Invites`).setDescription(`${t} are **${d[t.id] ? d[t.id].regular : 0}** invitații.`).setColor('#00ffcc')] });
        }
        if (commandName === 'invites-leaderboard') {
            let d = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8'));
            const s = Object.entries(d).map(([id, info]) => ({ id, regular: info.regular })).sort((a, b) => b.regular - a.regular).slice(0, 10);
            if (s.length === 0) return interaction.reply({ content: 'ℹ️ Fără date.' });
            let txt = ''; s.forEach((u, i) => { txt += `${i===0?'🥇':i===1?'🥈':i===2?'🥉':'🔹'} <@${u.id}> — \`${u.regular}\` invites\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription(txt).setColor('#ffcc00')] });
        }
        if (commandName === 'invites-reset') { fs.writeFileSync(INVITES_FILE, JSON.stringify({})); return interaction.reply({ content: '✅ Resetat!' }); }
    }

    // --- PARTEA DE INTERACȚIUNI BUTOANE ---
    if (interaction.isButton()) {
        const { customId, guild, user, message } = interaction;

        // Când cineva apasă butonul din Panou, îi trimitem Formularul (Modal)
        if (customId === 'deschide_formular_sugestie') {
            const modal = new ModalBuilder()
                .setCustomId('modal_sugestie')
                .setTitle('Trimite o sugestie');

            const intrebi1 = new TextInputBuilder()
                .setCustomId('sugestie_continut')
                .setLabel('Ce sugestie ai?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Descrie ideea ta aici...')
                .setRequired(true);

            const intrebi2 = new TextInputBuilder()
                .setCustomId('sugestie_ajutor')
                .setLabel('Cu ce va ajuta serverul sugestia?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Cum îmbunătățește asta experiența membrilor?')
                .setRequired(true);

            const primulRand = new ActionRowBuilder().addComponents(intrebi1);
            const alDoileaRand = new ActionRowBuilder().addComponents(intrebi2);

            modal.addComponents(primulRand, alDoileaRand);
            return await interaction.showModal(modal);
        }

        // Sistem de Voturi pentru butoanele de sub sugestia generată
        if (customId === 'sugestie_da' || customId === 'sugestie_nu') {
            await interaction.deferUpdate();
            
            const oldEmbed = message.embeds[0];
            const oldComponents = message.components[0].components;
            
            let voturiDa = parseInt(oldComponents[0].label.match(/\d+/)[0]);
            let voturiNu = parseInt(oldComponents[1].label.match(/\d+/)[0]);

            if (customId === 'sugestie_da') voturiDa++;
            if (customId === 'sugestie_nu') voturiNu++;

            const noulEmbed = EmbedBuilder.from(oldEmbed).setFields(
                { name: oldEmbed.fields[0].name, value: oldEmbed.fields[0].value, inline: false },
                { name: oldEmbed.fields[1].name, value: oldEmbed.fields[1].value, inline: false },
                { name: '📊 Status Voturi:', value: `✅ Aprobări: \`${voturiDa}\` | ❌ Respingeri: \`${voturiNu}\``, inline: false }
            );

            const randNou = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(oldComponents[0]).setLabel(`Aprobă (${voturiDa})`),
                ButtonBuilder.from(oldComponents[1]).setLabel(`Respinge (${voturiNu})`)
            );

            return message.edit({ embeds: [noulEmbed], components: [randNou] });
        }

        // Logica de Tichete
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

    // --- PARTEA CÂND MEMBRUL TRIMITE FORMULARUL COMPLETAT (MODAL SUBMIT) ---
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_sugestie') {
            const idee = interaction.fields.getTextInputValue('sugestie_continut');
            const beneficiu = interaction.fields.getTextInputValue('sugestie_ajutor');

            // Căutăm canalul numit "sugestii" pe server unde trimitem votul
            const sugestiiChannel = interaction.guild.channels.cache.find(c => c.name === 'sugestii' && c.type === ChannelType.GuildText);
            
            if (!sugestiiChannel) {
                return interaction.reply({ content: '❌ Eroare: Nu am găsit niciun canal text numit exact `sugestii`. Creează-l mai întâi ca să am unde posta!', ephemeral: true });
            }

            await interaction.reply({ content: '✅ Formularul a fost trimis! Mulțumim pentru implicare.', ephemeral: true });

            const embedVot = new EmbedBuilder()
                .setTitle('💡 Sugestie Nouă')
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setColor('#ffff00')
                .addFields(
                    { name: '📝 Sugestia meaa:', value: `\`\`\`\n${idee}\n\`\`\``, inline: false },
                    { name: '❓ Cu ce va ajuta serverul:', value: `\`\`\`\n${beneficiu}\n\`\`\``, inline: false },
                    { name: '📊 Status Voturi:', value: '✅ Aprobări: `0` | ❌ Respingeri: `0`', inline: false }
                )
                .setFooter({ text: `Trimisă de: ${interaction.user.tag}` })
                .setTimestamp();

            const rowVoturi = new ActionRowBuilder().addComponents(
