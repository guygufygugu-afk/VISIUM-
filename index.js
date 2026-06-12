const http = require('http');
http.createServer((req, res) => res.end("VISIUM Vouch & Staff Bot is Online!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent
    ]
});

const STAFF_ROLE_ID = "1490701828831052027"; 
const VOUCH_LOGS_CHANNEL_ID = "1514651853348929738"; 
const BANNER_URL = "https://i.imgur.com/6Y8W74M.png"; 

const WARNS_FILE = path.join('/tmp', 'warns.json');
const INVITES_FILE = path.join('/tmp', 'invites.json');
const VOUCHES_FILE = path.join('/tmp', 'vouches.json');

if (!fs.existsSync(WARNS_FILE)) fs.writeFileSync(WARNS_FILE, JSON.stringify({}));
if (!fs.existsSync(INVITES_FILE)) fs.writeFileSync(INVITES_FILE, JSON.stringify({}));
if (!fs.existsSync(VOUCHES_FILE)) fs.writeFileSync(VOUCHES_FILE, JSON.stringify({}));
const invitesCache = new Map();

// O bază de date temporară în memorie ca să nu mai pierdem textul la split-uri
const temporaryVouches = new Map();

client.once('ready', async () => {
    console.log(`💼 ${client.user.tag} este online! Toate erorile de sintaxă au fost rezolvate.`);
    for (const [_, guild] of client.guilds.cache) {
        try { const gi = await guild.invites.fetch(); invitesCache.set(guild.id, new Map(gi.map(i => [i.code, i.uses]))); } catch {}
    }
    
    const commands = [
        new SlashCommandBuilder().setName('setup-ticket').setDescription('Panou tichete VISIUM').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('lock').setDescription('Blochează canalul curent').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        new SlashCommandBuilder().setName('unlock').setDescription('Deblochează canalul curent').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        new SlashCommandBuilder().setName('clear').setDescription('Șterge un număr de mesaje').addIntegerOption(o => o.setName('numar').setDescription('Numărul de mesaje (1-100)').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        new SlashCommandBuilder().setName('suspect').setDescription('Marchează un utilizator ca suspect de hack').addUserOption(o => o.setName('user').setDescription('Utilizatorul').setRequired(true)).addStringOption(o => o.setName('detalii').setDescription('Detalii/Dovezi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
        new SlashCommandBuilder().setName('mark').setDescription('Marchează un utilizator ca scammer').addUserOption(o => o.setName('user').setDescription('Utilizatorul').setRequired(true)).addStringOption(o => o.setName('motiv').setDescription('Motivul marcării').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
        new SlashCommandBuilder().setName('ban').setDescription('Ban').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Motiv')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        new SlashCommandBuilder().setName('kick').setDescription('Kick').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Motiv').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        new SlashCommandBuilder().setName('mute').setDescription('Mute').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('Minute').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Motiv')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('unmute').setDescription('Unmute').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('warn').setDescription('Warn').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Motiv')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('unwarn').setDescription('Scoate warn-uri').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addIntegerOption(o => o.setName('cantitate').setDescription('Câte (implicit 1)')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('clearwarns').setDescription('Șterge toate warn-urile').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('warns').setDescription('Vezi warn-uri').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('invites').setDescription('Vezi invitații').addUserOption(o => o.setName('user').setDescription('Membru')),
        new SlashCommandBuilder().setName('invites-leaderboard').setDescription('Top invitații'),
        new SlashCommandBuilder().setName('invites-reset').setDescription('Reset invitații').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(cmd => cmd.toJSON());

    try { await new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands }); console.log('✅ Comenzi sincronizate!'); } catch (e) { console.error(e); }
});

// ================= GESTIONARE VOUCH TEXT (+) =================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const prefix = "+";
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'vouch') {
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply("❌ **Format incorect!** Folosește: `+vouch @user <comentariu>`");
        
        const comentariu = args.slice(1).join(' ');
        if (!comentariu) return message.reply("❌ Te rog adaugă un comentariu pentru acest vouch.");
        if (targetUser.id === message.author.id) return message.reply("❌ Nu îți poți da vouch singur!");
        
        const logsChannel = message.guild.channels.cache.get(VOUCH_LOGS_CHANNEL_ID);
        if (!logsChannel) return message.reply("❌ Canalul de loguri pentru vouch nu este configurat corect.");

        const vouchId = Date.now().toString();
        temporaryVouches.set(vouchId, { from: message.author.id, to: targetUser.id, text: comentariu });

        const vouchEmb = new EmbedBuilder()
            .setTitle("📩 Vouch Nou în Așteptare")
            .setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${targetUser}\n\n**Comentariu:**\n\`\`\`\n${comentariu}\n\`\`\``)
            .setColor("#00ffea")
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v_accept_${vouchId}`).setLabel("Aprobă ✅").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`v_deny_${vouchId}`).setLabel("Respinge ❌").setStyle(ButtonStyle.Danger)
        );

        await logsChannel.send({ embeds: [vouchEmb], components: [row] });
        return message.reply("✅ Vouch-ul tău a fost trimis spre verificare către echipa Staff!");
    }

    if (command === 'profile' || command === 'p') {
        const targetUser = message.mentions.users.first() || message.author;
        let vData = JSON.parse(fs.readFileSync(VOUCHES_FILE, 'utf-8'));
        let totalVouches = vData[targetUser.id] ? vData[targetUser.id].count : 0;
        let listaVouches = vData[targetUser.id] ? vData[targetUser.id].list : [];

        const profEmb = new EmbedBuilder()
            .setTitle(`👤 Profil Vouch-uri: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setColor("#5865F2")
            .addFields({ name: "📊 Vouch-uri Totale Aprobate:", value: `⭐ **${totalVouches}** vouch-uri` })
            .setTimestamp();

        if (listaVouches.length > 0) {
            profEmb.addFields({ name: "💬 Ultimele recenzii:", value: listaVouches.slice(-5).map(v => `• de la <@${v.from}>: *"${v.text}"*`).join('\n') });
        } else {
            profEmb.addFields({ name: "💬 Ultimele recenzii:", value: "*Nu are nicio recenzie aprobată încă.*" });
        }
        return message.reply({ embeds: [profEmb] });
    }

    if (command === 'leaderboard') {
        let vData = JSON.parse(fs.readFileSync(VOUCHES_FILE, 'utf-8'));
        const sorted = Object.entries(vData).map(([id, info]) => ({ id, count: info.count })).sort((a, b) => b.count - a.count).slice(0, 10);
        if (sorted.length === 0) return message.reply("ℹ️ Nu există date în clasament.");
        
        let txt = '';
        sorted.forEach((u, idx) => { txt += `${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹'} <@${u.id}> — \`${u.count}\` vouch-uri\n`; });
        return message.reply({ embeds: [new EmbedBuilder().setTitle("🏆 Top Utilizatori Vouch").setDescription(txt).setColor("#ffcc00").setTimestamp()] });
    }
});

// ================= INTERACȚIUNI ȘI COMANDE SLASH =================
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        const { commandName: cmd, options: opts, guild, user, channel } = i;
        const member = guild.members.cache.get(user.id);

        const comenziStaff = ['ban', 'kick', 'mute', 'unmute', 'warn', 'unwarn', 'clearwarns', 'lock', 'unlock', 'clear', 'suspect', 'mark', 'setup-ticket', 'invites-reset'];
        if (comenziStaff.includes(cmd) && !member.roles.cache.has(STAFF_ROLE_ID) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            return i.reply({ content: '❌ **Acces Refuzat!** Nu ai rolul necesar.', ephemeral: true });
        }

        if (cmd === 'mark') {
            const u = opts.getUser('user');
            const motiv = opts.getString('motiv');
            const markEmb = new EmbedBuilder()
                .setTitle("Scammer Marcat")
                .setDescription(`🚨 **Utilizator marcat scammer**\n\n🕵️‍♂️ *Utilizator:* ${u}\n❯ *Motiv:* *${motiv}*`)
                .setColor("#ff3333")
                .setImage(BANNER_URL);
            return i.reply({ embeds: [markEmb] });
        }

        if (cmd === 'suspect') {
            const u = opts.getUser('user');
            const detalii = opts.getString('detalii');
            const suspEmb = new EmbedBuilder()
                .setTitle("Suspect de Hack")
                .setDescription(`⚠️ **Utilizator marcat suspect**\n\n🕵️‍♂️ *Utilizator:* ${u}\n❯ *Detalii / Dovezi:* *${detalii}*`)
                .setColor("#ffaa00") 
                .setImage(BANNER_URL);
            return i.reply({ embeds: [suspEmb] });
        }

        if (cmd === 'clear') {
            const numar = opts.getInteger('numar');
            if (numar < 1 || numar > 100) return i.reply({ content: '❌ Între 1 și 100!', ephemeral: true });
            await channel.bulkDelete(numar, true);
            return i.reply({ content: `🧹 Am șters \`${numar}\` mesaje!`, ephemeral: true });
        }

        if (cmd === 'lock') { await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }); return i.reply({ content: `🔒 Canal blocat!` }); }
        if (cmd === 'unlock') { await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }); return i.reply({ content: `🔓 Canal deblocat!` }); }
        
        if (cmd === 'setup-ticket') {
            await i.deferReply({ ephemeral: true });
            const emb = new EmbedBuilder().setTitle('VISIUM Support Panel').setDescription('━━━━━━━\n**👷 Support**\n**🏦 Purchase**\n**🎁 Claim Reward**\n━━━━━━━').setColor('#0099ff');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('tk_support').setLabel('Support').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('tk_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('tk_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary));
            await i.channel.send({ embeds: [emb], components: [row] }); return i.editReply({ content: '✅ Panou generat!' });
        }
    }

    if (i.isButton()) {
        const { customId: cid, guild, user, message: msg } = i;
        
        if (cid.startsWith('v_accept_') || cid.startsWith('v_deny_')) {
            const member = guild.members.cache.get(user.id);
            if (!member.roles.cache.has(STAFF_ROLE_ID) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                return i.reply({ content: '❌ Doar Staff-ul poate aproba sau respinge vouch-uri!', ephemeral: true });
            }

            const vouchId = cid.split('_')[2];
            
            if (cid.startsWith('v_deny_')) {
                temporaryVouches.delete(vouchId);
                await msg.delete().catch(() => {});
                return i.reply({ content: "❌ Vouch-ul a fost respins.", ephemeral: true });
            }

            const cachedData = temporaryVouches.get(vouchId);
            if (!cachedData) {
                return i.reply({ content: "❌ Datele acestui vouch s-au învechit. Cere-i utilizatorului să trimită din nou comanda.", ephemeral: true });
            }

            let vData = JSON.parse(fs.readFileSync(VOUCHES_FILE, 'utf-8'));
            if (!vData[cachedData.to]) vData[cachedData.to] = { count: 0, list: [] };
            
            vData[cachedData.to].count++;
            vData[cachedData.to].list.push({ from: cachedData.from, text: cachedData.text });
            fs.writeFileSync(VOUCHES_FILE, JSON.stringify(vData, null, 2));
            temporaryVouches.delete(vouchId);
            
            await msg.edit({ embeds: [EmbedBuilder.from(msg.embeds[0]).setTitle("✅ Vouch Aprobat").setColor("#00ff00").addFields({ name: "Statut:", value: `Acceptat de: ${user}` })], components: [] });
            return i.reply({ content: "✅ Vouch aprobat cu succes!", ephemeral: true });
        }

        if (['tk_support', 'tk_purchase', 'tk_claim'].includes(cid)) {
            await i.deferReply({ ephemeral: true }); let lbl = cid === 'tk_purchase' ? 'purchase' : (cid === 'tk_claim' ? 'claim' : 'support');
            const ch = await guild.channels.create({ name: `${lbl}-${user.username}`, type: ChannelType.GuildText, permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }, { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] });
            await ch.send({ content: `${user} | <@&${STAFF_ROLE_ID}>`, embeds: [new EmbedBuilder().setTitle(`🎫 Ticket ${lbl.toUpperCase()}`).setDescription(`Salut ${user}!\n\nStaff-ul te va ajuta imediat.`).setColor('#ffcc00')], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('tk_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger))] });
            return i.editReply({ content: `Creat în ${ch}!` });
        }
        if (cid === 'tk_close') { await i.reply({ content: 'Șterg...' }); setTimeout(async () => { await i.channel.delete().catch(() => {}); }, 5000); }
    }
});

client.login(process.env.DISCORD_TOKEN);
            
