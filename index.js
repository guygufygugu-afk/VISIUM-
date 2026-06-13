const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// 1. Server HTTP (Fix pentru Render)
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

// 2. Definirea Clientului
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => console.log('✅ Botul este ONLINE!'));

// 3. Comenzile cu Prefix (+p, +vouch)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    
    if (args[0] === '+p') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`Profilul lui ${user.username}`)
            .setDescription(`**ID:** ${user.id}`)
            .addFields({ name: "ℹ️ Informații", value: "🟢 Vouch-uri: 0\n🏆 Leaderboard: #23" })
            .setFooter({ text: "VISIUM bot" }); // Nume actualizat
        return message.reply({ embeds: [embed] });
    }

    if (args[0] === '+vouch') {
        return message.reply("🟢 Vouch-ul a fost primit!");
    }
});

// 4. Slash Commands și Tichete (Rezolvă eroarea de timeout)
client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply({ ephemeral: true });
    
    const member = i.options.getMember('user');
    
    if (i.commandName === 'ban') { await member.ban(); await i.editReply('✅ Ban aplicat.'); }
    else if (i.commandName === 'kick') { await member.kick(); await i.editReply('✅ Kick aplicat.'); }
    else if (i.commandName === 'timeout') { 
        await member.timeout(i.options.getInteger('minute') * 60 * 1000); 
        await i.editReply('✅ Timeout aplicat.'); 
    }
    else if (i.commandName === 'supportpanel') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary)
        );
        await i.editReply({ content: "Apasă butonul:", components: [row] });
    }
});

// 5. Login
client.login(process.env.DISCORD_TOKEN);
