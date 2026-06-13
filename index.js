const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Server HTTP necesar pentru Render
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => {
    console.log('✅ VISIUM Bot este ONLINE!');
});

// Comenzi Prefix (+p, +vouch)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    
    if (args[0] === '+p') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`👤 User: ${user.username}`)
            .setColor("#2F3136")
            .setDescription(`🆔 **ID:** ${user.id}\n\n🖼️ **Display Name:** ${user.displayName}\n📅 **Cont creat:** 3 luni în urmă`)
            .addFields(
                { name: "ℹ️ Informații Vouch", value: "🟢 Vouch-uri acceptate: 0\n🔴 Vouch-uri refuzate: 0\n⏳ Ultimele 7 zile: 0\n✅ Total exchanged: 0€\n🏆 Leaderboard: #23" },
                { name: "🏅 Badge-uri", value: "❌ Fără badge-uri încă" },
                { name: "📝 Ultimele comentarii", value: "❌ Nu există comentarii încă." }
            )
            .setFooter({ text: "VISIUM bot" });
        return message.reply({ embeds: [embed] });
    }

    if (args[0] === '+vouch') {
        return message.reply("🟢 Vouch-ul a fost primit!");
    }
});

// Slash Commands (Moderare + Tichete)
client.on('interactionCreate', async (i) => {
    if (i.isButton()) {
        if (i.customId.startsWith('ticket_')) {
            const channel = await i.guild.channels.create({ name: `${i.customId.split('_')[1]}-${i.user.username}` });
            await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
        }
    } else if (i.isChatInputCommand()) {
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
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success)
            );
            await i.editReply({ content: "VISIUM Support Panel\n-------------------\nAi nevoie de ajutor? Deschide un tichet.", components: [row] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
