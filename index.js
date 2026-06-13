const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// --- Bază de date simplă ---
const DB_FILE = './data.json';
function loadDB() { return JSON.parse(fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE) : '{}'); }
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- Sistem Profil (+p) ---
    if (message.content.startsWith("+p")) {
        const target = message.mentions.users.first() || message.author;
        const db = loadDB();
        const userData = db[target.id] || { total: 0, reviews: [] };
        
        const embed = new EmbedBuilder()
            .setTitle(`👤 Profil Vouch-uri: ${target.username}`)
            .addFields(
                { name: '📊 Vouch-uri Totale Aprobate:', value: `⭐ ${userData.total} vouch-uri` },
                { name: '💬 Recenzii:', value: userData.reviews.length ? userData.reviews.slice(-3).map(r => `• ${r.text}`).join('\n') : "Nicio recenzie." }
            );
        message.reply({ embeds: [embed] });
    }

    // --- Sistem Vouch (+vouch) ---
    if (message.content.startsWith("+vouch")) {
        const args = message.content.split(' ').slice(1);
        const target = message.mentions.users.first();
        if (!target || !args[1]) return message.reply("❌ Format: +vouch @user <comentariu>");
        if (target.id === message.author.id) return message.reply("❌ Nu îți poți da vouch singur!");
        
        message.reply(`✅ Vouch-ul tău pentru ${target.username} a fost trimis spre verificare!`);
    }
});

// --- Interacțiuni (Butoane / Modaluri / Slash) ---
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        // Exemplu de comandă `/lock`
        if (i.commandName === 'lock') {
            await i.reply("🔒 Canal blocat!");
        }
        // Adaugă aici restul comenzilor slash
    }

    if (i.isButton()) {
        if (i.customId === 'btn_sugestie') {
            const modal = new ModalBuilder().setCustomId('modal_sugestie').setTitle('Trimite o sugestie');
            const input = new TextInputBuilder().setCustomId('sug_text').setLabel('Sugestia ta').setStyle(TextInputStyle.Paragraph);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await i.showModal(modal);
        }
    }
});

client.login('TOKEN-UL-TAU');
