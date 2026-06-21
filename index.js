const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const express = require('express');

// --- SERVER EXPRESS (Pentru a menține portul deschis pe Render) ---
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

const CONFIG = {
    SCAMMER_ROLE_ID: '1492892376979738715', 
    SUSPECT_ROLE_ID: '1492892693959938089',  
    VOUCH_CHANNEL_ID: '1517878554619150476',
    TICKET_CATEGORY_ID: '1492885716856868978',
    OWNER_ID: '1485154781247967356',
    STAFF_ROLE_ID: '1490701828831052027'
};

const vouches = new Map();
const pendingVouches = new Map();
const sanctions = new Map();

client.once('ready', () => {
    console.log(`[VISIUM BOT] Conectat! Totul este pregătit.`);
});

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async interaction => {
    // 1. Butoane (Vouch & Ticket Close)
    if (interaction.isButton()) {
        // Logica Vouch
        if (interaction.customId === 'vouch_accept' || interaction.customId === 'vouch_reject') {
            const data = pendingVouches.get(interaction.message.id);
            if (!data) return interaction.reply({ content: '❌ Eroare.', ephemeral: true });

            if (interaction.customId === 'vouch_accept') {
                if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
                vouches.get(data.targetId).push({ status: 'accepted', comment: data.comment, authorName: data.authorName });
                pendingVouches.delete(interaction.message.id);
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('✅ Vouch Aprobat').setColor(0x2ECC71).setDescription(`Vouch-ul pentru <@${data.targetId}> a fost acceptat.`)], components: [] });
            } else {
                pendingVouches.delete(interaction.message.id);
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('❌ Vouch Respins').setColor(0xFF0000).setDescription(`Vouch-ul pentru <@${data.targetId}> a fost respins.`)], components: [] });
            }
        }

        // Logica Închidere Tichet
        if (interaction.customId === 'close') {
            if (interaction.user.id !== CONFIG.OWNER_ID) {
                return interaction.reply({ content: '❌ Doar proprietarul poate închide tichetele!', ephemeral: true });
            }
            await interaction.reply('🔒 Canalul se închide...');
            setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
        }
    }

    // 2. Creare Tichet
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        await interaction.deferReply({ ephemeral: true });

        const ticketType = interaction.values[0];
        const channel = await interaction.guild.channels.create({
            name: `${ticketType}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages'] }
            ],
        });

        const rowClose = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close').setLabel('Închide Tichet').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ 
            content: `<@&${CONFIG.STAFF_ROLE_ID}>, tichet nou deschis de ${interaction.user} (Tip: ${ticketType}).`, 
            components: [rowClose] 
        });
        
        await interaction.editReply({ content: `✅ Tichetul tău a fost creat: ${channel}` });
    }

    // 3. Slash Commands
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'supportpanel') {
        const embed = new EmbedBuilder()
            .setTitle(' VisiumComunity Support Panel')
            .setColor(0x5865F2)
            .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🎫 **Ai nevoie de ajutor? Deschide un ticket de support.**\n` +
                `👋 **Pentru cumpărare, apasă Purchase. Fără alte opțiuni.**\n` +
                `✅ **Ai de revendicat un reward? Deschide Claim Reward.**\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('Alege tipul ticketului')
                .addOptions([
                    { label: 'Support', value: 'support', emoji: '🎫' },
                    { label: 'Purchase', value: 'purchase', emoji: '🏦' },
                    { label: 'Claim Reward', value: 'claim', emoji: '🎁' }
                ])
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panou creat.', ephemeral: true });
    }

    // Comenzi moderație
    if (commandName === 'warn') {
        const target = options.getMember('utilizator');
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
    if (commandName === 'clear') {
        await interaction.channel.bulkDelete(options.getInteger('cantitate'), true);
        await interaction.reply({ content: `🧹 Am șters mesajele.`, ephemeral: true });
    }
    if (commandName === 'suspect') {
        const user = options.getUser('utilizator');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) await member.roles.add(CONFIG.SUSPECT_ROLE_ID).catch(() => {});
        await interaction.reply(`🚨 ${user} a fost marcat ca suspect de hack.`);
    }
    if (commandName === 'mark') {
        const user = options.getUser('utilizator');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(() => {});
        await interaction.reply(`🛑 ${user} a fost marcat ca scammer.`);
    }
});

// --- PREFIX COMMANDS ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;

    const args = message.content.split(' '); 
    const cmd = args[0].toLowerCase();

    if (cmd === '+vouch') {
        if (!args[1]) return message.reply('💡 Folosire: `+vouch <user> <comentariu>`');
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifică un utilizator valid.');
        if (target.id === message.author.id) return message.reply('🚫 Nu poți să îți dai vouch singur.');
        const comment = args.slice(2).join(' ');
        if (!comment) return message.reply('📝 Scrie și comentariul vouch-ului. Exemplu: `+vouch @user 24€ LTC to MM`');

        const vc = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vouch_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('vouch_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
        );
        
        const m = await vc.send({ 
            embeds: [new EmbedBuilder().setTitle('📩 Vouch Nou').setDescription(`De la: ${message.author}\nPentru: ${target}\nComentariu: ${comment}`)], 
            components: [row] 
        });
        
        pendingVouches.set(m.id, { targetId: target.id, authorName: message.author.username, comment: comment }); 
        return message.reply('✅ Vouch-ul a fost primit și așteaptă să fie acceptat de un admin.');
    }

    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author; 
        const allVouches = vouches.get(target.id) || [];
        const acceptate = allVouches.filter(v => v.status === 'accepted').length;
        const refuzate = allVouches.filter(v => v.status === 'rejected').length;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${target.username}`).setDescription(`✅ Aprobate: \`${acceptate}\`\n❌ Respinse: \`${refuzate}\``)] });
    }
});

client.login(process.env.TOKEN);
            
