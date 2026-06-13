const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

let economie = {};
const VOUCH_CHANNEL_ID = '1514651853348929738';

client.once('ready', () => console.log('✅ VISIUM Bot ONLINE & STABIL'));

// --- COMENZI PREFIX (+p, +vouch, +bal, +daily, +give, +coinflip) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const id = message.author.id;
    if (!economie[id]) economie[id] = 0;

    // Economie
    if (message.content.startsWith('+bal')) return message.reply(`💰 Balanța ta: **${economie[id]}** monede.`);
    if (message.content.startsWith('+daily')) { economie[id] += 100; return message.reply("🎁 Ai primit 100 monede!"); }
    if (message.content.startsWith('+give')) {
        const target = message.mentions.users.first();
        const suma = parseInt(args[2]);
        if (!target || !suma || suma > economie[id]) return message.reply("❌ Sumă invalidă!");
        economie[id] -= suma; if (!economie[target.id]) economie[target.id] = 0; economie[target.id] += suma;
        return message.reply(`✅ Ai trimis ${suma} monede către ${target.username}.`);
    }
    
    // Moderare și Vouch-uri
    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 ${user.username}`).setDescription(`ID: ${user.id}`).setColor("#2F3136")] });
    }
    if (message.content.startsWith('+vouch')) {
        const target = message.mentions.users.first();
        if (!target) return message.reply("❌ Menționează un user.");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_decline').setLabel('Respins').setStyle(ButtonStyle.Danger)
        );
        const channel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}`).setColor("#FFD700")], components: [row] });
            return message.reply("✅ Vouch trimis!");
        }
    }
});

// --- COMENZI SLASH (Ban, Kick, Support Panel) ---
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: false });
        if (i.commandName === 'ban') { await i.options.getMember('user').ban(); return i.editReply('✅ Banat.'); }
        if (i.commandName === 'kick') { await i.options.getMember('user').kick(); return i.editReply('✅ Dat afară.'); }
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("🎫 VISIUM | Centru de Suport").setDescription("Bun venit! Selectează butonul de mai jos pentru a deschide un tichet.").setColor("#5865F2");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary).setEmoji('👷'),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success).setEmoji('🏦'),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🎁')
            );
            return i.editReply({ embeds: [embed], components: [row] });
        }
    }

    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId === 'v_accept') return i.editReply("✅ Vouch confirmat!");
        if (i.customId === 'v_decline') return i.editReply("❌ Vouch respins!");
        if (i.customId.startsWith('ticket_')) {
            const type = i.customId.split('_')[1];
            const channel = await i.guild.channels.create({ name: `${type}-${i.user.username.slice(0, 8)}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet creat: ${channel}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
