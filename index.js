const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Server HTTP obligatoriu pentru Render
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => console.log('✅ VISIUM Bot este ONLINE!'));

// 1. Comenzi Prefix (+p, +vouch)
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
    if (args[0] === '+vouch') return message.reply("🟢 Vouch-ul a fost primit!");
});

// 2. Slash Commands și Tichete
client.on('interactionCreate', async (i) => {
    if (i.isButton()) {
        if (i.customId.startsWith('ticket_')) {
            const type = i.customId.split('_')[1];
            // Creare canal privat
            const channel = await i.guild.channels.create({ 
                name: `${type}-${i.user.username}`,
                permissionOverwrites: [{ id: i.guild.id, deny: ['ViewChannel'] }, { id: i.user.id, allow: ['ViewChannel'] }]
            });
            await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
        }
    } else if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: true });
        const member = i.options.getMember('user');
        
        if (i.commandName === 'ban') { await member.ban(); await i.editReply('✅ Utilizator banat.'); }
        else if (i.commandName === 'kick') { await member.kick(); await i.editReply('✅ Utilizator dat afară.'); }
        else if (i.commandName === 'timeout') { 
            await member.timeout(i.options.getInteger('minute') * 60 * 1000); 
            await i.editReply('✅ Timeout aplicat.'); 
        }
        else if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder()
                .setTitle("VISIUM Support Panel")
                .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👷 **Ai nevoie de ajutor? Deschide un ticket de support.**\n🏦 **Pentru cumpărare, apasă Purchase. Fără alte opțiuni.**\n🎁 **Ai de revendicat un reward? Deschide Claim Reward.**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                .setColor("#2F3136");
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            await i.editReply({ embeds: [embed], components: [row] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
               
