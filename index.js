const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Stocare bani (TEMPORAR - se șterge la restart)
let economie = {};

client.once('ready', () => console.log('✅ VISIUM Bot ONLINE!'));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const id = message.author.id;
    if (!economie[id]) economie[id] = 0;

    // --- COMMEZI ECONOMIE ---
    if (message.content.startsWith('+bal')) {
        message.reply(`💰 Ai **${economie[id]}** monede.`);
    }

    if (message.content.startsWith('+daily')) {
        economie[id] += 100;
        message.reply("🎁 Ai primit 100 monede daily!");
    }

    if (message.content.startsWith('+give')) {
        const target = message.mentions.users.first();
        const suma = parseInt(args[2]);
        if (!target || !suma || suma > economie[id]) return message.reply("❌ Sumă invalidă sau fonduri insuficiente!");
        economie[id] -= suma;
        if (!economie[target.id]) economie[target.id] = 0;
        economie[target.id] += suma;
        message.reply(`✅ Ai trimis ${suma} monede către ${target.username}.`);
    }

    if (message.content.startsWith('+coinflip')) {
        const suma = parseInt(args[1]);
        if (!suma || suma > economie[id]) return message.reply("❌ Introdu o sumă validă.");
        const castig = Math.random() > 0.5;
        if (castig) {
            economie[id] += suma;
            message.reply(`🪙 Ai dat cu banul și ai CÂȘTIGAT ${suma}! Balanța: ${economie[id]}`);
        } else {
            economie[id] -= suma;
            message.reply(`🪙 Ai dat cu banul și ai PIERDUT ${suma}. Balanța: ${economie[id]}`);
        }
    }

    // --- COMENZI SUPORT/MODERARE (cele vechi) ---
    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 ${user.username}`).setDescription(`ID: ${user.id}`).setColor("#2F3136")] });
    }
});

client.login(process.env.DISCORD_TOKEN);
    
