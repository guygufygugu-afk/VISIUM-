const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let economie = {};
const VOUCH_CHANNEL_ID = '1514651853348929738';

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este ONLINE!`);
    
    // Înregistrare automată Slash Commands
    const commands = [
        { name: 'ban', description: 'Ban user', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'kick', description: 'Kick user', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'timeout', description: 'Timeout user', options: [{name:'user', type:6, required:true}, {name:'time', type:4, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'untimeout', description: 'Untimeout user', options: [{name:'user', type:6, required:true}] },
        { name: 'warn', description: 'Warn user', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'unwarn', description: 'Unwarn user', options: [{name:'user', type:6, required:true}] },
        { name: 'supportpanel', description: 'Postează panoul de suport' }
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

// --- COMENZI PREFIX ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const id = message.author.id;
    if (!economie[id]) economie[id] = 0;

    if (message.content.startsWith('+bal')) return message.reply(`💰 Balanța ta: **${economie[id]}** monede.`);
    if (message.content.startsWith('+daily')) { economie[id] += 100; return message.reply("🎁 Ai primit 100 monede!"); }
    if (message.content.startsWith('+vouch')) {
        const target = message.mentions.users.first();
        if (!target) return message.reply("❌ Menționează un user.");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_decline').setLabel('Respins').setStyle(ButtonStyle.Danger)
        );
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}`).setColor("#FFD700")], components: [row] });
            return message.reply("✅ Vouch trimis!");
        }
    }
});

// --- COMENZI SLASH + BUTOANE ---
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false });
        const member = i.options.getMember('user');
        const reason = i.options.getString('reason') || 'Fără motiv';

        if (i.commandName === 'ban') { await member.ban({ reason }); return i.editReply(`✅ ${member.user.tag} banat.`); }
        if (i.commandName === 'kick') { await member.kick(reason); return i.editReply(`✅ ${member.user.tag} dat afară.`); }
        if (i.commandName === 'timeout') { await member.timeout(i.options.getInteger('time') * 60000, reason); return i.editReply(`⏱️ ${member.user.tag} primit timeout.`); }
        if (i.commandName === 'untimeout') { await member.timeout(null); return i.editReply(`✅ ${member.user.tag} fără timeout.`); }
        if (i.commandName === 'warn') { return i.editReply(`⚠️ ${member.user.tag} avertizat. Motiv: ${reason}`); }
        if (i.commandName === 'unwarn') { return i.editReply(`✅ ${member.user.tag} unwarned.`); }
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("🎫 VISIUM | Centru de Suport").setDescription("Apasă un buton pentru asistență.").setColor("#5865F2");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary).setEmoji('👷'),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success).setEmoji('🏦'),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🎁')
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }
    }

    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId.startsWith('ticket_')) {
            const channel = await i.guild.channels.create({ name: `tichet-${i.user.username.slice(0, 8)}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet creat: ${channel}`);
        }
        if (i.customId === 'v_accept') return i.editReply("✅ Vouch acceptat!");
        if (i.customId === 'v_decline') return i.editReply("❌ Vouch respins!");
    }
});

client.login(process.env.DISCORD_TOKEN);
        
