const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738';
const vouchCount = new Map(); 

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este ONLINE!`);
    
    // Înregistrare comenzi Slash
    const commands = [
        { name: 'ban', description: 'Ban', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'kick', description: 'Kick', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'warn', description: 'Warn', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'unwarn', description: 'Unwarn', options: [{name:'user', type:6, required:true}] },
        { name: 'mute', description: 'Mute', options: [{name:'user', type:6, required:true}, {name:'time', type:4, required:true}] },
        { name: 'unmute', description: 'Unmute', options: [{name:'user', type:6, required:true}] },
        { name: 'supportpanel', description: 'Panou Suport' }
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // +p Profil
    if (command === 'p') {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${user.username}`).setDescription(`📊 Vouch-uri Totale: ${vouchCount.get(user.id) || 0}`).setColor("#2F3136")] });
    }

    // +vouch
    if (command === 'vouch') {
        const target = message.mentions.users.first();
        if (!target || target.id === message.author.id) return message.reply("❌ Menționează un alt user!");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v_accept_${target.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_decline').setLabel('Respins').setStyle(ButtonStyle.Danger)
        );
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}`).setColor("#FFD700")], components: [row] });
            return message.reply("✅ Vouch trimis!");
        }
    }
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false });
        const member = i.options.getMember('user');
        
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("🎫 VISIUM | Centru de Suport").setDescription("👷 **Support**: Probleme tehnice\n🏦 **Purchase**: Achiziții\n🎁 **Claim**: Revendicări").setColor("#5865F2");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary).setEmoji('👷'),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success).setEmoji('🏦'),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🎁')
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }
        
        // Moderare
        if (i.commandName === 'ban') return i.editReply(`✅ ${member.user.tag} a fost banat.`);
        if (i.commandName === 'kick') return i.editReply(`✅ ${member.user.tag} a fost dat afară.`);
        if (i.commandName === 'warn') return i.editReply(`⚠️ ${member.user.tag} avertizat.`);
        if (i.commandName === 'unwarn') return i.editReply(`🧹 Avertismente șterse pentru ${member.user.tag}.`);
        if (i.commandName === 'mute') { await member.timeout(i.options.getInteger('time') * 60000); return i.editReply(`⏱️ ${member.user.tag} a primit mute.`); }
        if (i.commandName === 'unmute') { await member.timeout(null); return i.editReply(`✅ ${member.user.tag} a primit unmute.`); }
    }

    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId.startsWith('v_accept_')) {
            const targetId = i.customId.split('_')[2];
            vouchCount.set(targetId, (vouchCount.get(targetId) || 0) + 1);
            return i.editReply("✅ Vouch acceptat!");
        }
        if (i.customId === 'v_decline') return i.editReply("❌ Vouch respins!");
        if (i.customId.startsWith('ticket_')) {
            const channel = await i.guild.channels.create({ name: `tichet-${i.user.username.slice(0, 8)}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet creat: ${channel}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
