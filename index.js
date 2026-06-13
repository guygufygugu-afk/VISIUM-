const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

// Server pentru Render (obligatoriu)
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738'; 

client.once('ready', () => {
    console.log('✅ VISIUM Bot este ONLINE!');
});

// Gestionăm TOTUL într-un singur bloc de mesaje pentru a evita duplicarea
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;

    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder().setTitle(`👤 User: ${user.username}`).setDescription(`ID: ${user.id}`).setColor("#2F3136");
        return message.reply({ embeds: [embed] });
    }

    if (message.content.startsWith('+vouch')) {
        const target = message.mentions.users.first();
        if (!target) return message.reply("❌ Menționează un user.");
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_decline').setLabel('Respins').setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
            .setTitle("🔔 Vouch Nou")
            .setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}`)
            .setColor("#FFD700");
        
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed], components: [row] });
            return message.reply("✅ Vouch trimis!");
        }
    }
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false });
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder()
                .setTitle("VISIUM Support Panel")
                .setDescription("👷 **Ai nevoie de ajutor? Deschide un ticket.**")
                .setColor("#2F3136");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success)
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }
    }
    
    if (i.isButton()) {
        if (i.customId.startsWith('ticket_')) {
            const type = i.customId.split('_')[1];
            const channel = await i.guild.channels.create({ name: `${type}-${i.user.username}`, type: ChannelType.GuildText });
            return i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
