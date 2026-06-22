const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');

// --- SERVER EXPRESS ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Botul este online!'));
app.listen(port, () => console.log(`Server web activ pe portul ${port}`));

// --- CONFIGURARE CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// SIGURANȚĂ ANTI-CRASH: Previne oprirea botului la erori de conexiune sau latență API
client.on('error', error => console.error('[VISIUM ERRORE CLIENT]', error));

const CONFIG = {
    SCAMMER_ROLE_ID: '1492892376979738715', 
    SUSPECT_ROLE_ID: '1492892693959938089',  
    VOUCH_CHANNEL_ID: '1517878554619150476',
    TICKET_CATEGORY_ID: '1492885716856868978',
    OWNER_ID: '1485154781247967356',
    STAFF_ROLE_ID: '1490701828831052027',
    SUGGESTION_CHANNEL_ID: '1517878554619150476'
};

// --- BAZA DE DATE (In-Memory) ---
const vouches = new Map();
const pendingVouches = new Map();
const sanctions = new Map();

function addSanction(userId, type, reason, modTag) {
    if (!sanctions.has(userId)) sanctions.set(userId, []);
    sanctions.get(userId).push({ type, reason, mod: modTag, date: new Date().toLocaleDateString() });
}

// --- ÎNREGISTRARE AUTOMATĂ SLASH COMMANDS LA PORNIRE ---
client.once('ready', async () => {
    console.log(`[VISIUM BOT] Conectat! Înregistrez comenzile...`);
    
    const slashCommands = [
        { name: 'supportpanel', description: 'Creează panoul de suport (Tichete)' },
        { name: 'suggestionpanel', description: 'Creează panoul pentru sugestii' },
        { name: 'warn', description: 'Avertizează un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul sancționat', required: true }, { name: 'motiv', type: 3, description: 'Motivul', required: false }] },
        { name: 'kick', description: 'Dă afară un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'ban', description: 'Banează un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'timeout', description: 'Dă timeout unui utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }, { name: 'minute', type: 4, description: 'Timp în minute', required: true }, { name: 'motiv', type: 3, description: 'Motivul', required: false }] },
        { name: 'untimeout', description: 'Scoate timeout-ul', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'lock', description: 'Blochează canalul curent' },
        { name: 'unlock', description: 'Deblochează canalul curent' },
        { name: 'clear', description: 'Șterge mesaje', options: [{ name: 'cantitate', type: 4, description: 'Numărul de mesaje', required: true }] },
        { name: 'suspect', description: 'Oferă rolul Suspect', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'mark', description: 'Oferă rolul Scammer', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] }
    ];

    await client.application.commands.set(slashCommands);
    console.log(`[VISIUM BOT] Comenzile slash au fost încărcate cu succes!`);
});

// --- INTERACTION HANDLER (Butoane, Modal, SelectMenu, Slash) ---
client.on('interactionCreate', async interaction => {
    
    // ================= 1. BUTOANE =================
    if (interaction.isButton()) {
        
        // --- A. Vouch ---
        if (interaction.customId === 'vouch_accept' || interaction.customId === 'vouch_reject') {
            const data = pendingVouches.get(interaction.message.id);
            if (!data) return interaction.reply({ content: '❌ Eroare: Vouch-ul nu mai există.', flags: 64 });

            if (interaction.customId === 'vouch_accept') {
                if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
                vouches.get(data.targetId).push({ status: 'accepted', comment: data.comment, authorName: data.authorName, timestamp: Date.now() });
                pendingVouches.delete(interaction.message.id);
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('✅ Vouch Aprobat').setColor(0x2ECC71).setDescription(`Vouch-ul pentru <@${data.targetId}> a fost acceptat.`)], components: [] });
            } else {
                pendingVouches.delete(interaction.message.id);
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('❌ Vouch Respins').setColor(0xFF0000).setDescription(`Vouch-ul pentru <@${data.targetId}> a fost respins.`)], components: [] });
            }
        }

        // --- B. Închidere Tichet ---
        if (interaction.customId === 'ticket_close') {
            if (interaction.user.id !== CONFIG.OWNER_ID) {
                return interaction.reply({ content: '❌ Doar proprietarul botului poate închide tichetele!', flags: 64 });
            }
            await interaction.reply('🔒 Canalul se închide în 3 secunde...');
            setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
        }

        // --- C. Modal Sugestii ---
        if (interaction.customId === 'open_suggestion_modal') {
            const modal = new ModalBuilder()
                .setCustomId('suggestion_modal')
                .setTitle('Trimite o sugestie');

            const q1 = new TextInputBuilder()
                .setCustomId('sugestie_text')
                .setLabel('Care este sugestia ta?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const q2 = new TextInputBuilder()
                .setCustomId('sugestie_motiv')
                .setLabel('Cu ce ajută serverul sugestia ta?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2));
            return interaction.showModal(modal);
        }

        // --- D. Aprobare/Respingere Sugestie ---
        if (interaction.customId.startsWith('sug_accept_') || interaction.customId.startsWith('sug_reject_')) {
            if (!interaction.member.roles.cache.has(CONFIG.STAFF_ROLE_ID) && interaction.user.id !== CONFIG.OWNER_ID) {
                return interaction.reply({ content: '❌ Doar staff-ul poate folosi aceste butoane.', flags: 64 });
            }

            const isAccept = interaction.customId.startsWith('sug_accept_');
            const userId = interaction.customId.split('_')[2];
            const originalEmbed = interaction.message.embeds[0];

            try {
                const user = await interaction.client.users.fetch(userId);
                const dmEmbed = new EmbedBuilder()
                    .setTitle(isAccept ? '✅ Sugestie Aprobată' : '❌ Sugestie Respinsă')
                    .setColor(isAccept ? 0x2ECC71 : 0xFF0000)
                    .setDescription(`Salut! Sugestia ta a fost **${isAccept ? 'aprobată' : 'respinsă'}** de către membrul staff **${interaction.user.tag}**.\n\n**Sugestia ta:**\n${originalEmbed.fields.find(f => f.name === '📝 Sugestia').value}`);
                
                await user.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (e) {
                console.error('Nu am putut trimite DM.');
            }

            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isAccept ? 0x2ECC71 : 0xFF0000)
                .addFields({ name: '📊 Status', value: `${isAccept ? '✅ Aprobată' : '❌ Respinsă'} de ${interaction.user}` });

            await interaction.update({ embeds: [updatedEmbed], components: [] });
        }
    }

    // ================= 2. MODAL SUBMIT =================
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'suggestion_modal') {
            const sugestie = interaction.fields.getTextInputValue('sugestie_text');
            const motiv = interaction.fields.getTextInputValue('sugestie_motiv');

            const channel = interaction.client.channels.cache.get(CONFIG.SUGGESTION_CHANNEL_ID);
            if (!channel) return interaction.reply({ content: '❌ Eroare: Canalul de sugestii nu a fost găsit.', flags: 64 });

            const embed = new EmbedBuilder()
                .setTitle('💡 O nouă sugestie')
                .setColor(0xF1C40F)
                .addFields(
                    { name: '👤 Trimisă de', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: false },
                    { name: '📝 Sugestia', value: sugestie, inline: false },
                    { name: '❓ Cu ce ajută', value: motiv, inline: false }
                )
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`sug_accept_${interaction.user.id}`).setLabel('Aprobă').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`sug_reject_${interaction.user.id}`).setLabel('Respinge').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Sugestia ta a fost trimisă cu succes către staff!', flags: 64 });
        }
    }

    // ================= 3. MENIU TICHETE =================
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        // Se încearcă deferReply, iar dacă interacțiunea a expirat din cauza latenței Render, eroarea este prinsă în siguranță
        try {
            await interaction.deferReply({ flags: 64 });
        } catch (error) {
            console.error('[VISIUM WARNING] Interacțiunea select-menu a expirat (Render Slow-Wakeup):', error.message);
            return; 
        }

        const ticketType = interaction.values[0];
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}-${ticketType}`,
            type: ChannelType.GuildText,
            parent: CONFIG.TICKET_CATEGORY_ID, 
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] }, 
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages'] },
                { id: CONFIG.STAFF_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
            ],
        });

        const rowClose = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Închide Tichet').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ 
            content: `<@&${CONFIG.STAFF_ROLE_ID}>, tichet nou deschis de ${interaction.user} (Tip: ${ticketType}).`, 
            components: [rowClose] 
        });

        await interaction.editReply({ content: `✅ Tichetul tău a fost creat: ${channel}` });
    }

    // ================= 4. SLASH COMMANDS =================
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'supportpanel') {
        const embed = new EmbedBuilder()
            .setTitle('# VisiumComunity Support Panel')
            .setColor(0x5865F2)
            .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🎫 **Ai nevoie de ajutor? Deschide un ticket de support.**\n` +
                `👋 **Pentru cumpărare, apasat Purchase. Fără alte opțiuni.**\n` +
                `✅ **Ai de revendicat un reward? Deschide Claim Reward.**\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('Alege tipul ticketului')
                .addOptions([
                    { label: 'Support', value: 'support', emoji: '🎫' },
                    { label: 'Purchase', value: 'purchase', emoji: '👋' },
                    { label: 'Claim Reward', value: 'claim', emoji: '✅' }
                ])
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panou creat.', flags: 64 });
    }

    if (commandName === 'suggestionpanel') {
        const embed = new EmbedBuilder()
            .setTitle('# VisiumComunity Suggestion Panel')
            .setColor(0x9B59B6)
            .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `**Ai o idee pentru server? Trimite sugestia ta prin butonul de mai jos.**\n` +
                `**Staff-ul va verifica sugestia și îți va trimite răspuns în privat.**\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `## Cum funcționează?\n` +
                `🔹 ***Scrii sugestia ta***\n` +
                `🔹 ***Scrii cu ce ajută serverul***\n` +
                `🔹 ***Staff-ul o acceptă sau o respinge***\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `**Ajută-ne să facem VisiumComunity mai bun!**`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_suggestion_modal')
                .setLabel('Sugestie')
                .setEmoji('💡')
                .setStyle(ButtonStyle.Primary)
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panou sugestii creat.', flags: 64 });
    }

    // --- COMENZI MODERAȚIE (Securizate local pentru membrii simpli) ---
    if (['warn', 'kick', 'ban', 'timeout', 'untimeout', 'lock', 'unlock', 'clear', 'suspect', 'mark'].includes(commandName)) {
        if (!interaction.member.roles.cache.has(CONFIG.STAFF_ROLE_ID) && interaction.user.id !== CONFIG.OWNER_ID) {
            return interaction.reply({ content: '❌ Nu ai permisiunea de a folosi comenzile administrative ale acestui bot!', flags: 64 });
        }
    }

    if (commandName === 'warn') {
        const target = options.getMember('utilizator');
        addSanction(target.id, 'WARN', options.getString('motiv') || 'Fără motiv', interaction.user.tag);
        await interaction.reply(`⚠️ ${target.user.tag} a fost avertizat.`);
    }
    if (commandName === 'kick') {
        const target = options.getMember('utilizator');
        await target.kick().catch(() => {});
        await interaction.reply(`👢 ${target.user.tag} a fost dat afară.`);
    }
    if (commandName === 'ban') {
        const target = options.getMember('utilizator');
        await target.ban().catch(() => {});
        await interaction.reply(`🛑 ${target.user.tag} a fost banat.`);
    }
    if (commandName === 'timeout') {
        const target = options.getMember('utilizator');
        await target.timeout(options.getInteger('minute') * 60 * 1000, options.getString('motiv'));
        await interaction.reply(`⏱️ ${target.user.tag} a primit timeout.`);
    }
    if (commandName === 'untimeout') {
        const target = options.getMember('utilizator');
        await target.timeout(null);
        await interaction.reply(`✅ Timeout scos pentru ${target.user.tag}.`);
    }
    if (commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.reply('🔒 Canal blocat.');
    }
    if (commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
        await interaction.reply('🔓 Canal deblocat.');
    }
    if (commandName === 'clear') {
        await interaction.channel.bulkDelete(options.getInteger('cantitate'), true);
        await interaction.reply({ content: `🧹 Am șters mesajele.`, flags: 64 });
    }
    if (commandName === 'suspect') {
        const user = options.getUser('utilizator');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) await member.roles.add(CONFIG.SUSPECT_ROLE_ID).catch(() => {});
        await interaction.reply(`🚨 ${user} a fost marcat ca suspect.`);
    }
    if (commandName === 'mark') {
        const user = options.getUser('utilizator');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(() => {});
        await interaction.reply(`🛑 ${user} a fost marcat ca scammer.`);
    }
});

// ================= 5. PREFIX COMMANDS (+vouch, +p) =================
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;

    const args = message.content.split(' '); 
    const cmd = args[0].toLowerCase();

    if (cmd === '+help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🤖 Meniu Comenzi Bot')
            .setColor(0x3498DB)
            .setDescription(`## 📩 Vouch System\n**+vouch <user> <comentariu>**\n**+profile [user]**\n**+leaderboard**\n\n## 🛡️ Slash Commands (Doar Staff/Owner)\n**/supportpanel** - Panou Tichete\n**/suggestionpanel** - Panou Sugestii\n**/warn, /kick, /ban, /timeout, /untimeout, /lock, /unlock, /clear, /suspect, /mark**`);
        return message.reply({ embeds: [helpEmbed] });
    }

    if (cmd === '+vouch') {
        if (!args[1]) return message.reply('💡 Folosire: `+vouch <user> <comentariu>`');
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifică un utilizator valid.');
        if (target.id === message.author.id) return message.reply('🚫 Nu poți să îți dai vouch singur.');
        const comment = args.slice(2).join(' ');
        if (!comment) return message.reply('📝 Scrie și comentariul vouch-ului.');

        const vc = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        if (!vc) return message.reply('❌ Canalul de vouch-uri nu a fost setat corect.');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vouch_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('vouch_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
        );
        
        const m = await vc.send({ 
            embeds: [new EmbedBuilder().setTitle('📩 Vouch Nou').setDescription(`De la: ${message.author}\nPentru: ${target}\nComentariu: ${comment}`)], 
            components: [row] 
        });
        
        pendingVouches.set(m.id, { targetId: target.id, authorName: message.author.username, comment: comment }); 
        return message.reply('✅ Vouch-ul a fost primit și așteaptă să fie acceptat.');
    }

    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author; 
        const allVouches = vouches.get(target.id) || [];
        const acceptate = allVouches.filter(v => v.status === 'accepted').length;
        const refuzate = allVouches.filter(v => v.status === 'rejected').length;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${target.username}`).setDescription(`✅ Aprobate: \`${acceptate}\`\n❌ Respinse: \`${refuzate}\``)] });
    }

    if (cmd === '+leaderboard' || cmd === '+lb') {
        let arr = [];
        for (const [uid, list] of vouches.entries()) {
                            const count = list.filter(v => v.status === 'accepted').length;
                if (count > 0) arr.push({ uid, count });
            }
            arr.sort((a, b) => b.count - a.count);
            let txt = `# 🏆 Top 10 Vouch-uri\n`;
            if (arr.length === 0) txt += `Niciun vouch încă.`;
            else arr.slice(0, 10).forEach((u, i) => { txt += `**#${i+1}** <@${u.uid}> - \`${u.count}\` vouch-uri\n`; });
            return message.reply(txt);
        }
    });

    client.login(process.env.TOKEN).catch(err => {
    console.error("❌ [VISIUM ERRORE CONECTARE DISCORD]:", err);
});

