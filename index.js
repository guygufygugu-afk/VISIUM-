/**
 * VISIUM BOT - MASIV ARCHITECTURE (v15.0)
 * Cod extins pentru stabilitate și volum.
 */

const { 
    Client, GatewayIntentBits, Collection, EmbedBuilder, Events, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, 
    PermissionFlagsBits, ActivityType, REST, Routes 
} = require('discord.js');
const http = require('http');

// Server pentru 24/7 Uptime (Keep-Alive)
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write("VISIUM BOT SYSTEM - ONLINE");
    res.end();
}).listen(process.env.PORT || 10000);

// Configurarea clientului
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages
    ] 
});

// Baza de date (Map-uri structurate pentru volum mare)
client.db = {
    xp: new Map(),
    bal: new Map(),
    warns: new Map(),
    tickets: new Map(),
    cooldowns: new Collection(),
    cache: new Set()
};

/**
 * SISTEM DE LOGARE MASIV (Detaliat pentru fiecare eveniment)
 */
const logEvent = (type, info) => {
    const time = new Date().toISOString();
    const output = `[${time}] [${type.toUpperCase()}] -> ${info}`;
    console.log(output);
};

// Evenimentul Ready (Inițializare complexă)
client.once(Events.ClientReady, async () => {
    logEvent('INFO', `------------------------------------------------`);
    logEvent('INFO', `VISIUM BOT A FOST PORNIT CU SUCCES`);
    logEvent('INFO', `ID BOT: ${client.user.id}`);
    logEvent('INFO', `TAG BOT: ${client.user.tag}`);
    logEvent('INFO', `------------------------------------------------`);

    client.user.setActivity('Management VISIUM', { type: ActivityType.Watching });

    // Înregistrarea comenzilor Slash (Masivă)
    const commands = [
        { name: 'ban', description: 'Ban user', options: [{name:'user', type:6, required:true, description:'User'}] },
        { name: 'mute', description: 'Timeout', options: [{name:'user', type:6, required:true, description:'User'}, {name:'time', type:4, required:true, description:'Minute'}] },
        { name: 'warn', description: 'Warn user', options: [{name:'user', type:6, required:true, description:'User'}, {name:'reason', type:3, required:true, description:'Motiv'}] },
        { name: 'support', description: 'Deschide suport', options: [] },
        { name: 'userinfo', description: 'Info user', options: [{name:'user', type:6, required:true, description:'User'}] },
        { name: 'clear', description: 'Clear', options: [{name:'amount', type:4, required:true, description:'Nr'}] },
        { name: 'ping', description: 'Verifică ping' },
        { name: 'bal', description: 'Verifică bani' }
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    logEvent('INFO', 'Toate comenzile slash au fost injectate in API.');
});

/**
 * SISTEM DE PROCESARE MESAJE (Extensibil)
 */
client.on(Events.MessageCreate, async (m) => {
    if (m.author.bot) return;

    // Logare mesaje (audit)
    logEvent('MSG', `User: ${m.author.tag} | Content: ${m.content}`);

    // Ping / Mention
    if (m.mentions.has(client.user.id)) {
        return m.reply("👋 Salut! Sunt activ. Folosește +help.");
    }

    // Logică XP
    const currentXp = client.db.xp.get(m.author.id) || 0;
    client.db.xp.set(m.author.id, currentXp + 1);

    if (!m.content.startsWith('+')) return;

    const args = m.content.slice(1).split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Blocuri de cod switch extinse (fără compresie)
    switch(cmd) {
        case 'ping':
            m.reply(`🏓 Latența botului este: ${client.ws.ping}ms.`);
            break;
        case 'bal':
            m.reply(`💰 Contul tău conține: ${client.db.bal.get(m.author.id) || 0} monede.`);
            break;
        case 'help':
            m.reply("📜 Comenzi disponibile: +ping, +bal, +daily, +rank.");
            break;
        default:
            logEvent('WARN', `Comandă necunoscută primită: ${cmd}`);
            break;
    }
});

/**
 * BLOC MASIV DE INTERACȚIUNI (InteractionCreate)
 */
client.on(Events.InteractionCreate, async (i) => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply({ ephemeral: true });

    if (i.commandName === 'warn') {
        const u = i.options.getMember('user');
        const r = i.options.getString('reason');
        client.db.warns.set(u.id, (client.db.warns.get(u.id) || 0) + 1);
        i.editReply(`⚠️ ${u.user.tag} a fost avertizat. Motiv: ${r}.`);
    } else if (i.commandName === 'userinfo') {
        const u = i.options.getMember('user');
        i.editReply(`User: ${u.user.tag}\nWarn-uri: ${client.db.warns.get(u.id) || 0}`);
    } else if (i.commandName === 'support') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tic_s').setLabel('Support').setStyle(ButtonStyle.Primary)
        );
        i.editReply({ content: "🎫 Alege:", components: [row] });
    }
});

/**
 * Audit Log Extensiv (Monitorizarea a 15+ tipuri de evenimente)
 */
client.on(Events.GuildMemberAdd, m => logEvent('JOIN', `${m.user.tag} a intrat pe server.`));
client.on(Events.GuildMemberRemove, m => logEvent('LEAVE', `${m.user.tag} a ieșit.`));
client.on(Events.MessageDelete, m => logEvent('DEL', `Mesaj șters în ${m.channel.name}.`));
client.on(Events.ChannelCreate, c => logEvent('CHAN', `Canal creat: ${c.name}`));
client.on(Events.RoleCreate, r => logEvent('ROLE', `Rol creat: ${r.name}`));
client.on(Events.ChannelDelete, c => logEvent('CHAN', `Canal șters: ${c.name}`));
client.on(Events.RoleDelete, r => logEvent('ROLE', `Rol șters: ${r.name}`));
client.on(Events.GuildBanAdd, b => logEvent('BAN', `User banat: ${b.user.tag}`));
client.on(Events.GuildBanRemove, b => logEvent('UNBAN', `User debanat: ${b.user.tag}`));
client.on(Events.EmojiCreate, e => logEvent('EMOJI', `Emoji nou: ${e.name}`));
client.on(Events.EmojiDelete, e => logEvent('EMOJI', `Emoji șters: ${e.name}`));
client.on(Events.InviteCreate, inv => logEvent('INVITE', `Link nou: ${inv.code}`));
client.on(Events.MessageUpdate, (oldM, newM) => logEvent('EDIT', `Mesaj editat în ${oldM.channel.name}`));
client.on(Events.VoiceStateUpdate, (oldS, newS) => logEvent('VOICE', `Update voce: ${newS.member.user.tag}`));
client.on(Events.GuildMemberUpdate, (oldM, newM) => logEvent('UPDATE', `Update membru: ${newM.user.tag}`));

client.login(process.env.DISCORD_TOKEN);
