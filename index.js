const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// --- CONFIGURARE ---
const VOUCH_CHANNEL_ID = '1514651853348929738'; 
let economie = {};

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este ONLINE!`);
    
    // Înregistrare Slash Commands
    const commands = [
        { name: 'ban', description: 'Ban', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'kick', description: 'Kick', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'warn', description: 'Warn', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'clearwarns', description: 'Clear', options: [{name:'user', type:6, required:true}] },
        { name: 'supportpanel', description: 'Panel Support' }
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

// --- COMENZI PREFIX (Vouch + Economie) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const id = message.author.id;

    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${user.username}`).setDescription("📊 Vouch-uri Totale Aprobate: 0").setColor("#2F3136")] });
    }

    if (message.content.startsWith('+vouch')) {
        const target = message.mentions.users.first();
        const comentariu = args.slice(2).join(' ');
        if (!target || !comentariu) return message.reply("❌ Format incorect! Folosește: +vouch @user <comentariu>");
        
        // Trimite în canalul de staff
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send(`🔔 **Vouch de la ${message.author.username} pentru ${target.username}**: ${comentariu}`);
            return message.reply("✅ Vouch-ul tău a fost trimis spre verificare către echipa Staff!");
        }
    }
});

// --- INTERACȚIUNI (Panel + Moderare) ---
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false });
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("VISIUM Support Panel").setDescription("👷 Ai nevoie de ajutor? Deschide un tichet.\n🏦 Pentru cumpărare, apasă Purchase.\n🎁 Ai de revendicat un reward? Deschide Claim.").setColor("#2F3136");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }
        if (i.commandName === 'warn') return i.editReply(`⚠️ ${i.options.getMember('user')} a primit un avertisment!`);
        if (i.commandName === 'clearwarns') return i.editReply(`🧹 Toate avertismentele lui ${i.options.getMember('user')} au fost șterse!`);
    }

    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId.startsWith('ticket_')) {
            const channel = await i.guild.channels.create({ name: `tichet-${i.user.username.slice(0, 8)}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet creat: ${channel}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                                
