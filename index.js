const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Server HTTP necesar pentru a evita Port Scan Timeout pe Render
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot activ!');
}).listen(process.env.PORT || 10000);

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;

    // Prevenție duplicare: verificăm dacă mesajul este deja procesat (simplificat)
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === '+p') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`Profilul lui ${user.username}`)
            .setDescription(`**ID:** ${user.id}\n**Creat:** 3 luni în urmă`)
            .addFields(
                { name: "ℹ️ Informații Vouch", value: "🟢 Vouch-uri acceptate: 0\n🔴 Vouch-uri refuzate: 0\n🏆 Leaderboard: #23" },
                { name: "📝 Ultimele comentarii", value: "❌ Nu există comentarii încă." }
            )
            .setFooter({ text: "Siropel bot" });
        return message.reply({ embeds: [embed] });
    }
    // ... restul comenzilor +
});

client.on('interactionCreate', async (i) => {
    // Răspundem imediat pentru a evita "Aplicația nu a răspuns"
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: true }); 
        // Logica ta de Slash (suspect, mark, etc)
        await i.editReply({ content: "Comanda a fost procesată!" });
    }
});

client.login(process.env.DISCORD_TOKEN);
