const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// 1. Server HTTP (obligatoriu pentru Render)
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738';
const STAFF_ROLE_ID = '1490701828831052027';

client.once('ready', () => console.log('✅ Botul este ONLINE!'));

// 2. Sistem mesaje (Prefix)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === '+p') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`Profilul lui ${user.username}`)
            .setColor("#0099ff")
            .setDescription(`**ID:** ${user.id}`)
            .addFields({ name: "ℹ️ Informații Vouch", value: "🟢 Acceptate: 0\n🔴 Respinse: 0" });
        return message.reply({ embeds: [embed] });
    }

    if (cmd === '+vouch') {
        if (!args[1]) return message.reply("↗️ Folosește: `+vouch @user comentariu`");
        const embed = new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${message.mentions.users.first()}\n**Comentariu:** ${args.slice(2).join(' ')}`).setColor("#FFD700");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_deny').setLabel('Respinge').setStyle(ButtonStyle.Danger)
        );
        message.guild.channels.cache.get(VOUCH_CHANNEL_ID)?.send({ embeds: [embed], components: [row] });
        return message.reply("🟢 Vouch-ul a fost primit!");
    }
});

// 3. Slash Commands și Butoane (Tichete + Moderare)
client.on('interactionCreate', async (i) => {
    if (i.isButton()) {
        if (i.customId === 'v_accept' || i.customId === 'v_deny') {
            const embedNou = new EmbedBuilder(i.message.embeds[0]).setTitle(i.customId === 'v_accept' ? "✅ Vouch Aprobat" : "❌ Vouch Respins").setColor(i.customId === 'v_accept' ? "#00FF00" : "#FF0000");
            await i.update({ embeds: [embedNou], components: [] });
        } else if (i.customId.startsWith('ticket_')) {
            const channel = await i.guild.channels.create({ name: `${i.customId.split('_')[1]}-${i.user.username}` });
            await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
        }
    } else if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: true });
        const member = i.options.getMember('user');
        if (i.commandName === 'ban') { await member.ban(); await i.editReply('✅ Ban aplicat.'); }
        if (i.commandName === 'kick') { await member.kick(); await i.editReply('✅ Kick aplicat.'); }
        if (i.commandName === 'timeout') { await member.timeout(i.options.getInteger('minute') * 60 * 1000); await i.editReply('✅ Timeout aplicat.'); }
        if (i.commandName === 'supportpanel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success)
            );
            await i.editReply({ content: "Apasă un buton:", components: [row] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                
