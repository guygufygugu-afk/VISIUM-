const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

let economie = {};
const VOUCH_CHANNEL_ID = '1514651853348929738';

client.once('ready', () => console.log('✅ VISIUM Bot ONLINE (Versiune Completă)'));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const id = message.author.id;
    if (!economie[id]) economie[id] = 0;

    // --- Economie ---
    if (message.content.startsWith('+bal')) return message.reply(`💰 Ai **${economie[id]}** monede.`);
    if (message.content.startsWith('+daily')) { economie[id] += 100; return message.reply("🎁 Ai primit 100 monede!"); }
    
    // --- Vouch-uri ---
    if (message.content.startsWith('+vouch')) {
        const target = message.mentions.users.first();
        if (!target) return message.reply("❌ Menționează un user.");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_decline').setLabel('Respins').setStyle(ButtonStyle.Danger)
        );
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`Autor: ${message.author}\nDestinatar: ${target}`).setColor("#FFD700")], components: [row] });
            return message.reply("✅ Vouch trimis!");
        }
    }
});

client.on('interactionCreate', async (i) => {
    // --- Panou Suport / Tichete ---
    if (i.isChatInputCommand() && i.commandName === 'supportpanel') {
        await i.deferReply({ ephemeral: false });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success)
        );
        return i.editReply({ content: "👷 VISIUM Support Panel", components: [row] });
    }

    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId === 'v_accept') return i.editReply("✅ Vouch acceptat!");
        if (i.customId === 'v_decline') return i.editReply("❌ Vouch respins!");
        if (i.customId === 'ticket_support' || i.customId === 'ticket_purchase') {
            const channel = await i.guild.channels.create({ name: `tichet-${i.user.username}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet creat: ${channel}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
