/**
 * VISIUM BOT - Advanced Architecture
 * Version: 2.0.0 (Ultimate Build)
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes, PermissionFlagsBits } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

// Stocări complexe
const db = {
    vouch: new Map(),
    bal: new Map(),
    cooldowns: new Map(),
    warnings: new Map(),
    tickets: new Map()
};

const VOUCH_CHANNEL_ID = '1514651853348929738';
const LOG_MSG = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// -- REGISTRARE COMENZI COMPLEXĂ --
client.once('ready', async () => {
    LOG_MSG(`Bot pornit: ${client.user.tag}`);
    const commands = [
        { name: 'ban', description: 'Ban user', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'kick', description: 'Kick user', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'mute', description: 'Timeout', options: [{name:'user', type:6, required:true}, {name:'time', type:4, required:true}] },
        { name: 'unmute', description: 'Elimină timeout', options: [{name:'user', type:6, required:true}] },
        { name: 'warn', description: 'Avertizează user', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:true}] },
        { name: 'clear', description: 'Șterge mesaje', options: [{name:'amount', type:4, required:true}] },
        { name: 'supportpanel', description: 'Postează panoul de suport' }
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        LOG_MSG("Comenzile Slash au fost încărcate.");
    } catch (err) { LOG_MSG(`Eroare înregistrare comenzi: ${err.message}`); }
});

// -- PROCESARE MESAJE CU ANTI-SPAM --
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.content.startsWith('+')) return;
    
    // Anti-Spam (3 secunde)
    if ((db.cooldowns.get(m.author.id) || 0) > Date.now()) return m.reply("⏳ Prea rapid!");
    db.cooldowns.set(m.author.id, Date.now() + 3000);

    const args = m.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const id = m.author.id;

    // Economie
    if (cmd === 'bal') return m.reply(`💰 Balanța ta: **${db.bal.get(id) || 0}** monede.`);
    if (cmd === 'daily') { db.bal.set(id, (db.bal.get(id) || 0) + 1000); return m.reply("🎁 Bonus zilnic: 1000 monede!"); }
    
    if (cmd === 'give') {
        const target = m.mentions.users.first();
        const amount = parseInt(args[1]);
        if (!target || !amount) return m.reply("❌ Utilizare: +give @user <suma>");
        if ((db.bal.get(id) || 0) < amount) return m.reply("❌ Fonduri insuficiente!");
        db.bal.set(id, (db.bal.get(id) || 0) - amount);
        db.bal.set(target.id, (db.bal.get(target.id) || 0) + amount);
        return m.reply(`✅ Ai transferat ${amount} monede către ${target.username}.`);
    }

    if (cmd === 'p') {
        const u = m.mentions.users.first() || m.author;
        return m.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${u.username}`).setDescription(`📊 Vouch-uri: ${db.vouch.get(u.id) || 0}\n💰 Monede: ${db.bal.get(u.id) || 0}\n⚠️ Warn-uri: ${db.warnings.get(u.id) || 0}`).setColor(0x2F3136)] });
    }

    if (cmd === 'vouch') {
        const t = m.mentions.users.first();
        if (!t) return m.reply("❌ Menționează pe cineva!");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v_acc_${t.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`v_dec_${t.id}`).setLabel('Respins').setStyle(ButtonStyle.Danger)
        );
        const ch = m.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (ch) await ch.send({ embeds: [new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`Destinatar: ${t}`).setColor(0xFFD700)], components: [row] });
        return m.reply("✅ Vouch trimis.");
    }
});

// -- INTERACȚIUNI AVANSATE --
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: i.commandName !== 'supportpanel' });
        
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("🎫 VISIUM | Centru de Suport").setDescription("Apasă un buton pentru a deschide un tichet.").setColor(0x5865F2);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tic_sup').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('tic_pur').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('tic_clm').setLabel('Claim').setStyle(ButtonStyle.Secondary)
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }

        const m = i.options.getMember('user');
        if (i.commandName === 'ban') { await m.ban(); return i.editReply(`✅ ${m.user.tag} a fost banat.`); }
        if (i.commandName === 'mute') { await m.timeout(i.options.getInteger('time') * 60000); return i.editReply(`⏱️ ${m.user.tag} este pe mute.`); }
        if (i.commandName === 'warn') { 
            db.warnings.set(m.id, (db.warnings.get(m.id) || 0) + 1);
            return i.editReply(`⚠️ ${m.user.tag} a primit un avertisment.`); 
        }
        if (i.commandName === 'clear') {
            const amt = i.options.getInteger('amount');
            await i.channel.bulkDelete(amt);
            return i.editReply(`🧹 Am șters ${amt} mesaje.`);
        }
    }
    
    if (i.isButton()) {
        if (i.customId.startsWith('tic_')) {
            await i.deferReply({ ephemeral: true });
            const ch = await i.guild.channels.create({
                name: `tichet-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [{ id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel] }]
            });
            const tEmbed = new EmbedBuilder().setTitle("🎫 Tichet Deschis").setDescription(`Salut ${i.user}, un admin te va ajuta imediat.`).setColor(0x00FF00);
            const tRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_tic').setLabel('Închide').setStyle(ButtonStyle.Danger));
            await ch.send({ embeds: [tEmbed], components: [tRow] });
            return i.editReply(`✅ Tichet creat: ${ch}`);
        }
        if (i.customId === 'close_tic') {
            await i.reply("🔒 Închidere în 5 secunde...");
            setTimeout(() => i.channel.delete(), 5000);
        }
        if (i.customId.startsWith('v_acc_')) {
            await i.deferReply({ ephemeral: true });
            const t = i.customId.split('_')[2];
            db.vouch.set(t, (db.vouch.get(t) || 0) + 1);
            return i.editReply("✅ Vouch înregistrat!");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
    
