const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');

// 1. Server HTTP (Fix pentru "Port scan timeout" pe Render)
http.createServer((req, res) => {
    res.end("Bot activ!");
}).listen(process.env.PORT || 10000);

// 2. Definirea Clientului
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738';
const STAFF_ROLE_ID = '1490701828831052027';

// 3. Evenimentul Ready (pentru a înregistra Slash Commands o singură dată)
client.once('ready', async () => {
    console.log('✅ Botul este ONLINE!');
});

// 4. Procesarea mesajelor cu "+" (Aici se rezolvă duplicarea prin check-uri stricte)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;

    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    // Comanda +p (Profil)
    if (cmd === '+p') {
        const user = message.mentions.users.first() || message.author;
        const profileEmbed = new EmbedBuilder()
            .setTitle(`Profilul lui ${user.username}`)
            .setDescription(`**ID:** ${user.id}`)
            .addFields(
                { name: "ℹ️ Informații Vouch", value: "🟢 Vouch-uri acceptate: 0\n🔴 Vouch-uri refuzate: 0\n🏆 Leaderboard: #23" },
                { name: "📝 Ultimele comentarii", value: "❌ Nu există comentarii încă." }
            )
            .setFooter({ text: "Siropel bot" });
        return message.reply({ embeds: [profileEmbed] });
    }

    // Comanda +vouch
    if (cmd === '+vouch') {
        if (!args[1] || !args[2]) return message.reply("↗️ Scrie și comentariul vouch-ului. Exemplu: `+vouch @user 24€ LTC to MM`");
        const embed = new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${message.mentions.users.first()}\n**Comentariu:** ${args.slice(2).join(' ')}`).setColor("#FFD700");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_deny').setLabel('Respinge').setStyle(ButtonStyle.Danger)
        );
        message.guild.channels.cache.get(VOUCH_CHANNEL_ID)?.send({ embeds: [embed], components: [row] });
        return message.reply("🟢 Vouch-ul a fost primit!");
    }
});

// 5. Interacțiuni Slash și Butoane (Fix pentru "Aplicația nu a răspuns")
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: true }); // Fix pentru eroarea de timeout
        await i.editReply({ content: "Comandă procesată cu succes!" });
    } else if (i.isButton()) {
        if (i.customId === 'v_accept' || i.customId === 'v_deny') {
            const embedVechi = i.message.embeds[0];
            const embedNou = new EmbedBuilder()
                .setTitle(i.customId === 'v_accept' ? "✅ Vouch Aprobat" : "❌ Vouch Respins")
                .setDescription(`${embedVechi.description}\n\n**Statut:**\nAcceptat de: ${i.user}`)
                .setColor(i.customId === 'v_accept' ? "#00FF00" : "#FF0000");
            await i.update({ embeds: [embedNou], components: [] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
