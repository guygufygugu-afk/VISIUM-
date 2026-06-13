const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738';
const processedMessages = new Set();
const economie = new Map();

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este ONLINE!`);
    
    const commands = [
        { name: 'ban', description: 'Ban user', options: [{name:'user', type:6, description:'User', required:true}, {name:'reason', type:3, description:'Motiv', required:false}] },
        { name: 'kick', description: 'Kick user', options: [{name:'user', type:6, description:'User', required:true}, {name:'reason', type:3, description:'Motiv', required:false}] },
        { name: 'warn', description: 'Warn user', options: [{name:'user', type:6, description:'User', required:true}, {name:'reason', type:3, description:'Motiv', required:false}] },
        { name: 'unwarn', description: 'Unwarn user', options: [{name:'user', type:6, description:'User', required:true}] },
        { name: 'mute', description: 'Mute user', options: [{name:'user', type:6, description:'User', required:true}, {name:'time', type:4, description:'Minute', required:true}] },
        { name: 'unmute', description: 'Unmute user', options: [{name:'user', type:6, description:'User', required:true}] },
        { name: 'supportpanel', description: 'Postează panoul' }
    ];
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('messageCreate', async (message) => {
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 3000);

    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const id = message.author.id;
    if (!economie.has(id)) economie.set(id, 0);

    if (message.content.startsWith('+bal')) return message.reply(`💰 Balanța: **${economie.get(id)}** monede.`);
    if (message.content.startsWith('+daily')) { economie.set(id, economie.get(id) + 100); return message.reply("🎁 Ai primit 100 monede!"); }
    if (message.content.startsWith('+vouch')) {
        const target = message.mentions.users.first();
        const comentariu = args.slice(2).join(' ');
        if (!target || target.id === message.author.id || !comentariu) return message.reply("❌ Eroare: Nu poți da vouch singur sau format greșit.");
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send(`🔔 **Vouch de la ${message.author.username} pentru ${target.username}**: ${comentariu}`);
            return message.reply("✅ Vouch trimis!");
        }
    }
    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${user.username}`).setDescription(`💰 Bani: ${economie.get(user.id) || 0}`).setColor("#2F3136")] });
    }
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false });
        const member = i.options.getMember('user');
        
        if (i.commandName === 'supportpanel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success)
            );
            return i.editReply({ content: "👷 Alege o opțiune:", components: [row] });
        }
        if (i.commandName === 'ban') return i.editReply(`✅ ${member.user.tag} a fost banat.`);
        if (i.commandName === 'kick') return i.editReply(`✅ ${member.user.tag} a fost dat afară.`);
        if (i.commandName === 'warn') return i.editReply(`⚠️ ${member.user.tag} a fost avertizat.`);
        if (i.commandName === 'unwarn') return i.editReply(`🧹 Avertismente șterse pentru ${member.user.tag}.`);
        if (i.commandName === 'mute') {
            await member.timeout(i.options.getInteger('time') * 60000, "Muted by staff");
            return i.editReply(`⏱️ ${member.user.tag} a primit mute.`);
        }
        if (i.commandName === 'unmute') {
            await member.timeout(null, "Unmuted by staff");
            return i.editReply(`✅ ${member.user.tag} a primit unmute.`);
        }
    }

    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId.startsWith('ticket_')) {
            const channel = await i.guild.channels.create({ name: `tichet-${i.user.username.slice(0, 8)}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet creat: ${channel}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
            
