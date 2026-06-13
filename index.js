const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const VOUCH_CHANNEL_ID = '1514651853348929738';
const lastProcessedMessages = new Set(); // Previne mesajele duble

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este ONLINE!`);
    
    const commands = [
        { name: 'ban', description: 'Ban user', options: [{name:'user', type:6, description:'User', required:true}, {name:'reason', type:3, description:'Motiv', required:false}] },
        { name: 'kick', description: 'Kick user', options: [{name:'user', type:6, description:'User', required:true}, {name:'reason', type:3, description:'Motiv', required:false}] },
        { name: 'warn', description: 'Warn user', options: [{name:'user', type:6, description:'User', required:true}, {name:'reason', type:3, description:'Motiv', required:false}] },
        { name: 'clearwarns', description: 'Clear warns', options: [{name:'user', type:6, description:'User', required:true}] },
        { name: 'supportpanel', description: 'Postează panoul de suport' }
    ];
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (e) { console.error(e); }
});

client.on('messageCreate', async (message) => {
    // Evită procesarea dublă
    if (lastProcessedMessages.has(message.id)) return;
    lastProcessedMessages.add(message.id);
    setTimeout(() => lastProcessedMessages.delete(message.id), 2000);

    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');

    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${user.username}`).setDescription("📊 Vouch-uri Totale Aprobate: 0").setColor("#2F3136")] });
    }

    if (message.content.startsWith('+vouch')) {
        const target = message.mentions.users.first();
        const comentariu = args.slice(2).join(' ');
        if (!target || !comentariu) return message.reply("❌ Format incorect! Folosește: +vouch @user <comentariu>");
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send(`🔔 **Vouch de la ${message.author.username} pentru ${target.username}**: ${comentariu}`);
            return message.reply("✅ Vouch-ul tău a fost trimis spre verificare!");
        }
    }
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false });
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("VISIUM Support Panel").setDescription("👷 Ai nevoie de ajutor? Deschide un tichet.\n🏦 Pentru cumpărare, apasă Purchase.\n🎁 Ai de revendicat un reward? Deschide Claim.").setColor("#2F3136");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }
        if (i.commandName === 'warn') return i.editReply(`⚠️ ${i.options.getMember('user')} a primit un avertisment!`);
        if (i.commandName === 'clearwarns') return i.editReply(`🧹 Avertismente șterse pentru ${i.options.getMember('user')}!`);
        if (i.commandName === 'ban') return i.editReply(`✅ ${i.options.getMember('user')} a fost banat.`);
        if (i.commandName === 'kick') return i.editReply(`✅ ${i.options.getMember('user')} a fost dat afară.`);
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
        
