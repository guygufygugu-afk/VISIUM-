const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

// Server pentru Render
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// ID-ul canalului tău de vouch-uri introdus aici:
const VOUCH_CHANNEL_ID = '1514651853348929738'; 

client.once('ready', () => console.log('✅ VISIUM Bot este ONLINE!'));

// 1. Comenzi Prefix
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    
    if (args[0] === '+p') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`👤 User: ${user.username}`)
            .setColor("#2F3136")
            .setDescription(`🆔 **ID:** ${user.id}`)
            .setFooter({ text: "VISIUM bot" });
        return message.reply({ embeds: [embed] });
    }

    if (args[0] === '+vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("❌ Te rog menționează un utilizator.");
        
        const embed = new EmbedBuilder()
            .setTitle("🔔 Vouch Nou")
            .setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}\n**Comentariu:** ${args.slice(2).join(' ')}`)
            .setColor("#FFD700");
        
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed] });
            message.reply("✅ Vouch trimis în canalul de confirmări!");
        } else {
            message.reply("❌ Canalul de vouch-uri nu a fost găsit.");
        }
    }
});

// 2. Slash Commands și Tichete
client.on('interactionCreate', async (i) => {
    if (i.isButton()) {
        if (i.customId === 'close_ticket') {
            await i.reply("🔒 Canalul se va închide în 5 secunde...");
            setTimeout(() => i.channel.delete(), 5000);
        } else if (i.customId.startsWith('ticket_')) {
            const type = i.customId.split('_')[1];
            const channel = await i.guild.channels.create({ 
                name: `${type}-${i.user.username}`,
                type: ChannelType.GuildText
            });
            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
            );
            await channel.send({ content: `Salut ${i.user}, staff-ul te va ajuta imediat.`, components: [closeRow] });
            await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
        }
    } else if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false }); // Am pus false ca să vadă toți
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder()
                .setTitle("VISIUM Support Panel")
                .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👷 **Ai nevoie de ajutor? Deschide un ticket de support.**\n🏦 **Pentru cumpărare, apasă Purchase.**\n🎁 **Ai de revendicat un reward? Deschide Claim Reward.**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                .setColor("#2F3136");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            await i.editReply({ embeds: [embed], components: [row] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                
