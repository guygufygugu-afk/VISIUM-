const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738';
const processedMessages = new Set();
const vouchCount = new Map(); 

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este ONLINE!`);
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
    
    // Protecție anti-dublură (folosind un timestamp mic)
    const now = Date.now();
    if (processedMessages.has(message.author.id + now.toString().slice(0, -3))) return;
    processedMessages.add(message.author.id + now.toString().slice(0, -3));
    setTimeout(() => processedMessages.clear(), 1000);

    const args = message.content.split(' ');

    // COMANDĂ PROFIL (+p) - Doar vouch-uri
    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        const count = vouchCount.get(user.id) || 0;
        const embed = new EmbedBuilder()
            .setTitle(`👤 Profil: ${user.username}`)
            .setDescription(`📊 Vouch-uri Totale: ${count}`)
            .setColor("#2F3136")
            .setThumbnail(user.displayAvatarURL());
        return message.reply({ embeds: [embed] });
    }

    // COMANDĂ VOUCH
    if (message.content.startsWith('+vouch')) {
        const target = message.mentions.users.first();
        if (!target || target.id === message.author.id) return message.reply("❌ Menționează un alt user!");
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v_accept_${target.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_decline').setLabel('Respins').setStyle(ButtonStyle.Danger)
        );
        
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ 
                embeds: [new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}`).setColor("#FFD700")], 
                components: [row] 
            });
            return message.reply("✅ Vouch trimis!");
        }
    }
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false });
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("🎫 VISIUM | Centru de Suport").setDescription("👷 **Support**: Probleme tehnice\n🏦 **Purchase**: Achiziții\n🎁 **Claim**: Revendicări").setColor("#5865F2");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary).setEmoji('👷'),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success).setEmoji('🏦'),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🎁')
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }
        // ... logica de moderare (ban/mute/etc)
    }

    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId.startsWith('v_accept_')) {
            const targetId = i.customId.split('_')[2];
            vouchCount.set(targetId, (vouchCount.get(targetId) || 0) + 1);
            return i.editReply("✅ Vouch acceptat și adăugat la profil!");
        }
        if (i.customId === 'v_decline') return i.editReply("❌ Vouch respins.");
        if (i.customId.startsWith('ticket_')) {
            const channel = await i.guild.channels.create({ name: `tichet-${i.user.username}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet creat: ${channel}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
            
