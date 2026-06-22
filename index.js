const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    MessageFlags,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const express = require('express');

// =========================================================
// 1. CONFIGURARE WEB SERVER (PENTRU CA RENDER SĂ ȚINĂ BOTUL ONLINE)
// =========================================================
const app = express();
app.get('/', (req, res) => {
    res.send('Botul este online!');
});
app.listen(10000, () => {
    console.log('Server web activ pe portul 10000');
});

// =========================================================
// 2. CONFIGURĂRI JURNALIZARE / BAZE DE DATE REZIDENTE ÎN MEMORIE
// =========================================================
const CONFIG = {
    VOUCH_CHANNEL_ID: '123456789012345678',   // 💡 SCHIMBĂ CU ID-UL CANALULUI TĂU DE VOUCH-URI
    TICKET_CATEGORY_ID: '123456789012345678' // 💡 SCHIMBĂ CU ID-UL CATEGORIEI UNDE VREI SĂ SE SE CREEZE TICKETELE
};

const pendingVouches = new Map();
const vouches = new Map(); // Stocare temporară utilizator -> listă vouch-uri

// =========================================================
// 3. INIȚIALIZARE CLIENT DISCORD CU TOATE INTENȚIILE CORECTE
// =========================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // 🟥 FOARTE IMPORTANT: Permite citirea textului după "+"
        GatewayIntentBits.GuildMembers,    // Permite interacțiunea și citirea membrilor serverului
        GatewayIntentBits.GuildPresences
    ]
});

// =========================================================
// 4. EVENIMENTUL DE PORNIRE (MODERNIZAT LA clientReady)
// =========================================================
client.once('clientReady', async (c) => {
    console.log(`[VISIUM BOT] Conectat! Înregistrez comenzile...`);

    // Înregistrează automat comanda de tip Slash: /supportpanel
    const commands = [
        new SlashCommandBuilder()
            .setName('supportpanel')
            .setDescription('Trimite panelul principal de suport în canalul curent')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(c.user.id),
            { body: commands },
        );
        console.log('[VISIUM BOT] Comenzile slash au fost încărcate cu succes!');
    } catch (error) {
        console.error('❌ Eroare la încărcarea comenzilor slash:', error);
    }
});

// =========================================================
// 5. SECȚIUNEA INTERACȚIUNI (SLASH COMMANDS, MENIURI ȘI BUTOANE)
// =========================================================
client.on('interactionCreate', async (interaction) => {

    // A. EXECUTARE COMANDĂ SLASH: /supportpanel
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'supportpanel') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const supportEmbed = new EmbedBuilder()
                .setTitle('# VisiumComunity Support Panel')
                .setDescription(
                    '---------------------------------------------\n\n' +
                    '📩 **Ai nevoie de ajutor? Deschide un ticket de support.**\n' +
                    '👋 **Pentru cumpărare, apasă Purchase.**\n' +
                    'Fără alte opțiuni.\n' +
                    '✅ **Ai de revendicat un reward?**\n' +
                    'Deschide Claim Reward.\n\n' +
                    '---------------------------------------------'
                )
                .setColor(0x3498DB);

            const menu = new StringSelectMenuBuilder()
                .setCustomId('support_menu')
                .setPlaceholder('Alege tipul ticketului')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Support').setValue('ticket_support').setDescription('Deschide un ticket general de suport'),
                    new StringSelectMenuOptionBuilder().setLabel('Purchase').setValue('ticket_purchase').setDescription('Deschide un ticket pentru cumpărături/donații'),
                    new StringSelectMenuOptionBuilder().setLabel('Claim Reward').setValue('ticket_reward').setDescription('Deschide un ticket pentru revendicare premiu')
                );

            const row = new ActionRowBuilder().addComponents(menu);

            await interaction.channel.send({ embeds: [supportEmbed], components: [row] });
            return interaction.editReply({ content: '✅ Panelul de suport a fost trimis în acest canal!' });
        }
    }

    // B. SELECȚIE MENIU: Creare Ticket din Support Panel
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'support_menu') {
            // Răspuns instant către Discord pentru a tăia eroarea de tip Timeout/Aplicația nu răspunde
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const choice = interaction.values[0];
            const tipTicket = choice.replace('ticket_', '').toUpperCase();

            try {
                // Generare canal nou de ticket
                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: 0, // GuildText channel
                    parent: CONFIG.TICKET_CATEGORY_ID || null,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: ['ViewChannel'] },
                        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
                    ]
                });

                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎫 Ticket Deschis cu Succes')
                    .setDescription(`Salut ${interaction.user},\n\nAi deschis un ticket de tipul: **${tipTicket}**.\nEchipa de staff te va ajuta în cel mai scurt timp posibil.`)
                    .setColor(0x2ECC71);

                await ticketChannel.send({ embeds: [ticketEmbed] });
                await interaction.editReply({ content: `✅ Ticketul tău a fost generat cu succes! Click aici: ${ticketChannel}` });
            } catch (err) {
                console.error("Eroare la crearea canalului de ticket:", err);
                await interaction.editReply({ content: '❌ Botul nu a putut crea ticketul. Verifică permisiunile lui (Manage Channels).' });
            }
        }
    }

    // C. APĂSARE BUTOANE: Management Vouch (Acceptă / Respinge)
    if (interaction.isButton()) {
        if (interaction.customId === 'vouch_accept' || interaction.customId === 'vouch_reject') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const vouchData = pendingVouches.get(interaction.message.id);
            if (!vouchData) {
                return interaction.editReply({ content: '❌ Datele acestui vouch nu se mai află în memoria temporară a botului.' });
            }

            // Dacă este apăsat butonul de Acceptă
            if (interaction.customId === 'vouch_accept') {
                if (!vouches.has(vouchData.targetId)) vouches.set(vouchData.targetId, []);
                vouches.get(vouchData.targetId).push({
                    authorId: vouchData.authorId,
                    authorName: vouchData.authorName,
                    comment: vouchData.comment,
                    status: 'accepted'
                });

                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0x2ECC71)
                    .setTitle('📩 Vouch Aprobat de Staff ✅');

                await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
                pendingVouches.delete(interaction.message.id);
                return interaction.editReply({ content: '✅ Vouch-ul a fost aprobat și înregistrat în profilul utilizatorului.' });
            }

            // Dacă este apăsat butonul de Respinge
            if (interaction.customId === 'vouch_reject') {
                if (!vouches.has(vouchData.targetId)) vouches.set(vouchData.targetId, []);
                vouches.get(vouchData.targetId).push({
                    authorId: vouchData.authorId,
                    authorName: vouchData.authorName,
                    comment: vouchData.comment,
                    status: 'rejected'
                });

                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0xE74C3C)
                    .setTitle('📩 Vouch Respins de Staff ❌');

                await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
                pendingVouches.delete(interaction.message.id);
                return interaction.editReply({ content: '❌ Vouch-ul a fost respins cu succes.' });
            }
        }
    }
});

// =========================================================
// 6. SECȚIUNEA COMENZI TEXT (PREFIXUL „+”)
// =========================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;

    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    // COMANDA: +help
    if (cmd === '+help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🤖 Meniu Comenzi Bot')
            .setColor(0x3498DB)
            .setDescription(
                '## 📩 Vouch System\n' +
                '**+vouch <user> <comentariu>** - Trimite un vouch spre analiză staff-ului\n' +
                '**+p / +profile <user>** - Vizualizează statisticile profilului tău sau al altui user\n' +
                '**+lb / +leaderboard** - Afișează clasamentul top 10 utilizatori cu cele mai multe vouch-uri'
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    // COMANDA: +vouch
    if (cmd === '+vouch') {
        if (!args[1]) return message.reply('💡 Folosire corectă: `+vouch <user> <comentariu>`');
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Te rog specifică un utilizator valid prin mențiune (@user).');
        if (target.id === message.author.id) return message.reply('❌ Nu îți poți acorda un vouch singur.');
        
        const comment = args.slice(2).join(' ');
        if (!comment) return message.reply('📝 Te rog adaugă și un scurt comentariu pentru vouch-ul tău.');

        const vc = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        if (!vc) return message.reply('❌ Canalul administrativ pentru aprobări vouch nu a fost găsit în fișierul de configurare.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vouch_accept').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('vouch_reject').setLabel('Respinge').setStyle(ButtonStyle.Danger)
        );

        const m = await vc.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('📩 Vouch Nou în Așteptare')
                    .setDescription(`**De la:** ${message.author}\n**Pentru:** ${target}\n**Comentariu:** ${comment}`)
                    .setColor(0xF1C40F)
            ],
            components: [row]
        });

        pendingVouches.set(m.id, { 
            targetId: target.id, 
            authorId: message.author.id, 
            authorName: message.author.username, 
            comment: comment 
        });

        return message.reply('✅ Vouch-ul tău a fost trimis spre analiză echipei staff!');
    }

    // COMANDA: +p sau +profile
    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author;
        const allVouches = vouches.get(target.id) || [];
        const acceptate = allVouches.filter(v => v.status === 'accepted').length;
        const refuzate = allVouches.filter(v => v.status === 'rejected').length;

        const profileEmbed = new EmbedBuilder()
            .setTitle(`👤 Profil Vouch-uri: ${target.username}`)
            .setDescription(`✅ **Aprobate:** ${acceptate}\n❌ **Respinse:** ${refuzate}`)
            .setColor(0x3498DB);
        return message.reply({ embeds: [profileEmbed] });
    }

    // COMANDA: +leaderboard sau +lb
    if (cmd === '+leaderboard' || cmd === '+lb') {
        let arr = [];
        for (const [uid, list] of vouches.entries()) {
            const count = list.filter(v => v.status === 'accepted').length;
            if (count > 0) arr.push({ uid, count });
        }
        
        arr.sort((a, b) => b.count - a.count);
        const top = arr.slice(0, 10);

        let desc = "";
        if (top.length === 0) {
            desc = "Niciun vouch înregistrat pe acest server momentan.";
        } else {
            desc = top.map((x, i) => `#${i + 1} <@${x.uid}> - **${x.count}** vouch-uri aprobate`).join('\n');
        }

        const lbEmbed = new EmbedBuilder()
            .setTitle('🏆 Top 10 Vouch-uri Comunitate')
            .setDescription(desc)
            .setColor(0xF1C40F);
        return message.reply({ embeds: [lbEmbed] });
    }
});

// =========================================================
// 7. CONECTARE SECURIZATĂ CU COLECTARE ERORI PENTRU LOGIN
// =========================================================
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ [VISIUM ERRORE CONECTARE DISCORD]:", err);
});
                                                       
