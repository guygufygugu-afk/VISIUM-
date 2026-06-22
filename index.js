const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');

// --- SERVER EXPRESS (PENTRU RENDER) ---
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Botul este online!'));
app.listen(port, () => console.log(`Server web activ pe portul ${port}`));

// --- CONFIGURARE CLIENT CU TOATE PERMISIUNILE ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// --- SISTEM ANTI-CRASH RADICAL ---
client.on('error', error => console.error('[VISIUM ERRORE CLIENT]', error));
process.on('unhandledRejection', error => console.error('[ANTI-CRASH] Eroare respinsă:', error));
process.on('uncaughtException', error => console.error('[ANTI-CRASH] Excepție:', error));

// 💡 ASIGURĂ-TE CĂ ACESTE ID-URI SUNT EXACT CELE DE PE SERVERUL TĂU!
const CONFIG = {
    SCAMMER_ROLE_ID: '1492892376979738715', 
    SUSPECT_ROLE_ID: '1492892693959938089',  
    VOUCH_CHANNEL_ID: '1517878554619150476',
    TICKET_CATEGORY_ID: '1492885716856868978',
    OWNER_ID: '1485154781247967356',
    STAFF_ROLE_ID: '1490701828831052027',
    SUGGESTION_CHANNEL_ID: '1517878554619150476'
};

// --- BAZA DE DATE TEMPORARĂ ---
const vouches = new Map();
const pendingVouches = new Map();
const sanctions = new Map();

function addSanction(userId, type, reason, modTag) {
    if (!sanctions.has(userId)) sanctions.set(userId, []);
    sanctions.get(userId).push({ type, reason, mod: modTag, date: new Date().toLocaleDateString() });
}

// --- ÎNREGISTRARE SLASH COMMANDS ---
client.once('ready', async () => {
    console.log(`[VISIUM BOT] Conectat cu succes!`);
    
    const slashCommands = [
        { name: 'supportpanel', description: 'Creează panoul de suport (Tichete)' },
        { name: 'suggestionpanel', description: 'Creează panoul pentru sugestii' },
        { name: 'warn', description: 'Avertizează un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul sancționat', required: true }, { name: 'motiv', type: 3, description: 'Motivul', required: false }] },
        { name: 'unwarn', description: 'Șterge ultimul avertisment al unui utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'kick', description: 'Dă afară un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'ban', description: 'Banează un utilizator', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'timeout', description: 'Dă timeout unui utilizator', options: [{ name: 'utilizator', type: 6, description: 'Timp', required: true }, { name: 'minute', type: 4, description: 'Minute', required: true }, { name: 'motiv', type: 3, description: 'Motiv', required: false }] },
        { name: 'untimeout', description: 'Scoate timeout-ul', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'lock', description: 'Blochează canalul curent' },
        { name: 'unlock', description: 'Deblochează canalul curent' },
        { name: 'clear', description: 'Șterge mesaje', options: [{ name: 'cantitate', type: 4, description: 'Număr mesaje', required: true }] },
        { name: 'suspect', description: 'Oferă rolul Suspect', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] },
        { name: 'mark', description: 'Oferă rolul Scammer', options: [{ name: 'utilizator', type: 6, description: 'Userul vizat', required: true }] }
    ];

    try {
        await client.application.commands.set(slashCommands);
        console.log(`[VISIUM BOT] Toate comenzile au fost reîmprospătate în Discord.`);
    } catch (e) {
        console.error('Eroare la slash commands:', e);
    }
});

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async interaction => {
    
    if (interaction.isButton()) {
        try {
            if (interaction.customId === 'vouch_accept' || interaction.customId === 'vouch_reject') {
                const data = pendingVouches.get(interaction.message.id);
                if (!data) return interaction.reply({ content: '❌ Eroare: Vouch-ul nu mai există în memoria cache.', flags: 64 });

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

            if (interaction.customId === 'ticket_close') {
                if (interaction.user.id !== CONFIG.OWNER_ID) return interaction.reply({ content: '❌ Doar proprietarul botului poate închide tichetele!', flags: 64 });
                await interaction.reply('🔒 Canalul se închide în 3 secunde...');
                setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            if (interaction.customId === 'open_suggestion_modal') {
                const modal = new ModalBuilder().setCustomId('suggestion_modal').setTitle('Trimite o sugestie');
                const q1 = new TextInputBuilder().setCustomId('sugestie_text').setLabel('Care este sugestia ta?').setStyle(TextInputStyle.Paragraph).setRequired(true);
                const q2 = new TextInputBuilder().setCustomId('sugestie_motiv').setLabel('Cu ce ajută serverul?').setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2));
                return interaction.showModal(modal);
            }
        } catch (err) { console.error(err); }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'suggestion_modal') {
        try {
            const sugestie = interaction.fields.getTextInputValue('sugestie_text');
            const motiv = interaction.fields.getTextInputValue('sugestie_motiv');
            const channel = interaction.client.channels.cache.get(CONFIG.SUGGESTION_CHANNEL_ID);
            if (!channel) return interaction.reply({ content: '❌ Eroare: Canalul de sugestii nu a fost găsit.', flags: 64 });

            const embed = new EmbedBuilder().setTitle('💡 O nouă sugestie').setColor(0xF1C40F).addFields(
                { name: '👤 Trimisă de', value: `${interaction.user}`, inline: false },
                { name: '📝 Sugestia', value: sugestie, inline: false },
                { name: '❓ Cu ce ajută', value: motiv, inline: false }
            );
            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ Sugestia ta a fost trimisă!', flags: 64 });
        } catch (err) { console.error(err); }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        try {
            await interaction.deferReply({ flags: 64 });
            const ticketType = interaction.values[0];
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}-${ticketType}`,
                type: ChannelType.GuildText,
                parent: CONFIG.TICKET_CATEGORY_ID || null, 
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: ['ViewChannel'] }, 
                    { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages'] }
                ],
            });
            await channel.send({ content: `👋 Tichet nou deschis de ${interaction.user} (Tip: ${ticketType}). Folosește butonul dedicat pentru închidere.` });
            await interaction.editReply({ content: `✅ Tichetul tău a fost creat: ${channel}` });
        } catch (error) { 
            console.error(error);
            await interaction.editReply({ content: '❌ Nu s-a putut crea canalul. Verifică ID-ul categoriei sau permisiunile mele.' });
        }
    }

    // --- EXECUȚIE COMANDE SLASH BLINDATE ---
    if (!interaction.isChatInputCommand()) return;
    
    try {
        const { commandName, options } = interaction;

        if (commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle('# VisiumComunity Support Panel').setColor(0x5865F2)
                .setDescription(`🎫 **Ai nevoie de ajutor? Deschide un ticket.**`);
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Alege tipul ticketului').addOptions([
                    { label: 'Support', value: 'support', emoji: '🎫' },
                    { label: 'Purchase', value: 'purchase', emoji: '👋' },
                    { label: 'Claim Reward', value: 'claim', emoji: '✅' }
                ])
            );
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return await interaction.reply({ content: '✅ Panou creat.', flags: 64 });
        }

        // Verificare Staff generat automat
        if (['warn', 'unwarn', 'kick', 'ban', 'timeout', 'untimeout', 'lock', 'unlock', 'clear', 'suspect', 'mark'].includes(commandName)) {
            if (!interaction.member.roles.cache.has(CONFIG.STAFF_ROLE_ID) && interaction.user.id !== CONFIG.OWNER_ID) {
                return interaction.reply({ content: '❌ Nu ai permisiunea de a folosi comenzile administrative!', flags: 64 });
            }
        }

        const target = options.getMember('utilizator');

        if (commandName === 'warn') { 
            if (!target) return interaction.reply({ content: '❌ Utilizatorul nu este pe server.', flags: 64 });
            addSanction(target.id, 'WARN', options.getString('motiv') || 'Fără motiv', interaction.user.tag); 
            return await interaction.reply(`⚠️ ${target.user.tag} a fost avertizat.`); 
        }

        if (commandName === 'unwarn') {
            if (!target) return interaction.reply({ content: '❌ Utilizatorul nu este pe server.', flags: 64 });
            if (!sanctions.has(target.id) || sanctions.get(target.id).length === 0) return interaction.reply({ content: `❌ Acest utilizator nu are avertismente active.`, flags: 64 });
            
            const userSanctions = sanctions.get(target.id);
            const lastWarnIndex = userSanctions.map(s => s.type).lastIndexOf('WARN');
            if (lastWarnIndex === -1) return interaction.reply({ content: `❌ Utilizatorul nu are niciun avertisment de tip WARN.`, flags: 64 });
            
            userSanctions.splice(lastWarnIndex, 1);
            return await interaction.reply(`✅ Am șters ultimul avertisment pentru ${target.user.tag}.`);
        }

        if (commandName === 'kick') { 
            if (!target) return interaction.reply({ content: '❌ Utilizatorul nu este pe server.', flags: 64 });
            await target.kick().catch(()=>{}); 
            return await interaction.reply(`👢 ${target.user.tag} a primit kick.`); 
        }
        
        if (commandName === 'ban') { 
            if (!target) return interaction.reply({ content: '❌ Utilizatorul nu este pe server.', flags: 64 });
            await target.ban().catch(()=>{}); 
            return await interaction.reply(`🛑 ${target.user.tag} a fost banat.`); 
        }

        if (commandName === 'timeout') { 
            if (!target) return interaction.reply({ content: '❌ Utilizatorul nu este pe server.', flags: 64 });
            const min = options.getInteger('minute');
            await target.timeout(min * 60 * 1000).catch(()=>{}); 
            return await interaction.reply(`⏱️ ${target.user.tag} a primit timeout pentru ${min} minute.`); 
        }

        if (commandName === 'untimeout') { 
            if (!target) return interaction.reply({ content: '❌ Utilizatorul nu este pe server.', flags: 64 });
            await target.timeout(null).catch(()=>{}); 
            return await interaction.reply(`✅ S-a scos timeout-ul pentru ${target.user.tag}.`); 
        }

        if (commandName === 'lock') { 
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }); 
            return await interaction.reply('🔒 Canal blocat.'); 
        }

        if (commandName === 'unlock') { 
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true }); 
            return await interaction.reply('🔓 Canal deblocat.'); 
        }

        if (commandName === 'clear') { 
            const cantitate = options.getInteger('cantitate');
            await interaction.channel.bulkDelete(cantitate, true).catch(()=>{}); 
            return await interaction.reply({ content: `🧹 Am șters ${cantitate} mesaje.`, flags: 64 }); 
        }

    } catch (error) {
        console.error("Eroare executie comanda:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ Eroare internă: \`${error.message}\`. Verifică logurile.`, flags: 64 }).catch(()=>{});
        }
    }
});

// --- COMENZI TEXT CU PREFIXUL "+" ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;

    try {
        const args = message.content.split(' '); 
        const cmd = args[0].toLowerCase();

        if (cmd === '+help') {
            const helpEmbed = new EmbedBuilder().setTitle('🤖 Meniu Comenzi').setColor(0x3498DB).setDescription(`**+vouch <user> <comentariu>**\n**+p / +profile [user]**\n**+lb / +leaderboard**`);
            return message.reply({ embeds: [helpEmbed] });
        }

        if (cmd === '+vouch') {
            if (!args[1]) return message.reply('💡 Folosire: `+vouch <user> <comentariu>`');
            const target = message.mentions.users.first();
            if (!target) return message.reply('❌ Specifică un utilizator valid.');
            const comment = args.slice(2).join(' ');
            if (!comment) return message.reply('📝 Scrie și comentariul vouch-ului.');

            const vc = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
            if (!vc) return message.reply('❌ Canalul de vouch-uri nu a fost găsit pe server.');
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vouch_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('vouch_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
            );
            
            const m = await vc.send({ embeds: [new EmbedBuilder().setTitle('📩 Vouch Nou').setDescription(`De la: ${message.author}\nPentru: ${target}\nComentariu: ${comment}`)], components: [row] });
            pendingVouches.set(m.id, { targetId: target.id, authorName: message.author.username, comment: comment }); 
            return message.reply('✅ Vouch-ul a fost trimis spre verificare staff-ului.');
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
    } catch (err) { console.error(err); }
});

client.login(process.env.TOKEN).catch(err => console.error("Eroare Login:", err));
                    
