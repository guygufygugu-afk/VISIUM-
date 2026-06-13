const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const STAFF_ROLE_ID = '1490701828831052027';
const VOUCH_CHANNEL_ID = '1514651853348929738'; // Canalul unde se trimite confirmarea

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Sistem Vouch
    if (message.content.startsWith('+vouch')) {
        const vouchEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setDescription("🟢 Vouch-ul a fost primit și așteaptă să fie acceptat de un owner/admin.");
        
        await message.reply({ embeds: [vouchEmbed] });

        // Trimite notificarea în canalul specificat
        const logChannel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (logChannel) {
            logChannel.send({ content: `🔔 Vouch nou de la ${message.author}: \n> ${message.content}` });
        }
    }

    if (message.content.startsWith('+p')) message.reply(`Profilul lui ${message.author.username} este gata!`);
    if (message.content.startsWith('+help')) message.reply("📋 **Comenzi:** +p, +vouch, +profile, +leaderboard, /supportpanel");
});

// ... (Restul logicii de Slash Commands și Tichete rămâne neschimbat)

client.login(process.env.DISCORD_TOKEN);
