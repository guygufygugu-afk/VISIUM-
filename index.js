const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738'; 

client.once('ready', () => console.log('✅ VISIUM Bot ONLINE!'));

// 1. Sistem Vouch cu butoane
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    
    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder().setTitle(`👤 ${user.username}`).setDescription(`ID: ${user.id}`).setColor("#2F3136");
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
            .setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}\n**Comentariu:** ${message.content.replace('+vouch', '')}`)
            .setColor("#FFD700");
        
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed], components: [row] });
            message.reply("✅ Vouch trimis pentru verificare!");
        }
    }
});

// 2. Gestionare Butoane (Tichete + Vouch)
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;

    // Logica pentru Vouch
    if (i.customId === 'v_accept') await i.reply("✅ Vouch acceptat!");
    if (i.customId === 'v_decline') await i.reply("❌ Vouch respins!");

    // Logica Tichete
    if (i.customId.startsWith('ticket_')) {
        const type = i.customId.split('_')[1];
        const channel = await i.guild.channels.create({ name: `${type}-${i.user.username}`, type: ChannelType.GuildText });
        await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
