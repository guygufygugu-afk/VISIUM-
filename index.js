const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738';
const processedMessages = new Set();
const vouchCount = new Map(); 
const balance = new Map();

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
    
    // Anti-duplicare strictă (ignoră același mesaj primit în sub 5 secunde)
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 5000);

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const id = message.author.id;

    // Economie
    if (cmd === 'bal') return message.reply(`💰 Balanța ta: **${balance.get(id) || 0}** monede.`);
    if (cmd === 'daily') { balance.set(id, (balance.get(id) || 0) + 100); return message.reply("🎁 Ai primit 100 monede!"); }
    if (cmd === 'give') {
        const target = message.mentions.users.first();
        const suma = parseInt(args[1]);
        if (!target || !suma) return message.reply("❌ Folosește: +give @user <suma>");
        balance.set(id, (balance.get(id) || 0) - suma);
        balance.set(target.id, (balance.get(target.id) || 0) + suma);
        return message.reply(`✅ Ai trimis ${suma} monede lui ${target.username}.`);
    }

    // Profil (Doar Vouch-uri, fara bani)
    if (cmd === 'p') {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${user.username}`).setDescription(`📊 Vouch-uri Totale: ${vouchCount.get(user.id) || 0}`).setColor("#2F3136")] });
    }

    // Vouch
    if (cmd === 'vouch') {
        const target = message.mentions.users.first();
        if (!target || target.id === id) return message.reply("❌ Menționează un alt user!");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v_accept_${target.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_decline').setLabel('Respins').setStyle(ButtonStyle.Danger)
        );
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}`).setColor("#FFD700")], components: [row] });
            return message.reply("✅ Vouch trimis spre verificare!");
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
                new ButtonBuilder().setCustomId('ticket_s').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_p').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_c').setLabel('Claim').setStyle(ButtonStyle.Secondary)
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }
        if (i.commandName === 'ban') return i.editReply(`✅ ${member.user.tag} banat.`);
        if (i.commandName === 'kick') return i.editReply(`✅ ${member.user.tag} kick.`);
        if (i.commandName === 'warn') return i.editReply(`⚠️ ${member.user.tag} avertizat.`);
        if (i.commandName === 'unwarn') return i.editReply(`🧹 Avertismente șterse.`);
        if (i.commandName === 'mute') { await member.timeout(i.options.getInteger('time') * 60000); return i.editReply("⏱️ Mute."); }
        if (i.commandName === 'unmute') { await member.timeout(null); return i.editReply("✅ Unmute."); }
    }
    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId.startsWith('v_accept_')) { const tId = i.customId.split('_')[2]; vouchCount.set(tId, (vouchCount.get(tId) || 0) + 1); return i.editReply("✅ Vouch acceptat!"); }
        if (i.customId === 'v_decline') return i.editReply("❌ Vouch respins.");
        if (i.customId.startsWith('ticket_')) { 
            const ch = await i.guild.channels.create({ name: `tichet-${i.user.username}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet: ${ch}`); 
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                                                              
