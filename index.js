/**
 * VISIUM BOT - FULL ENTERPRISE EDITION
 * Include: HTTP Keep-Alive, Welcome/Bye, Moderare, Economie, Tichete, Logs
 */

const http = require('http');
// Server pentru a preveni "adormirea" botului pe platforme tip host
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("VISIUM BOT - SYSTEM ONLINE");
}).listen(process.env.PORT || 10000);

const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Events 
} = require('discord.js');

const client = new Client({ intents: [3276799] });

// Baza de date în memorie
const db = { bal: new Map(), warns: new Map(), xp: new Map() };

client.once(Events.ClientReady, () => {
    console.log(`[SYSTEM] VISIUM este online: ${client.user.tag}`);
});

/* 
==========================================================
SISTEM WELCOME & BYE
==========================================================
*/
client.on(Events.GuildMemberAdd, member => {
    const channel = member.guild.systemChannel;
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setTitle("👋 Bun venit!")
        .setDescription(`Salut ${member.user}, bine ai venit pe ${member.guild.name}!`)
        .setColor(0x00FF00);
    channel.send({ embeds: [embed] });
});

client.on(Events.GuildMemberRemove, member => {
    const channel = member.guild.systemChannel;
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setTitle("😢 Ne pare rău...")
        .setDescription(`${member.user.tag} a părăsit serverul nostru.`)
        .setColor(0xFF0000);
    channel.send({ embeds: [embed] });
});

/* 
==========================================================
SISTEM DE COMENZI PREFIX (Conversație)
==========================================================
*/
client.on(Events.MessageCreate, async (m) => {
    if (m.author.bot || !m.content.startsWith('+')) return;
    const args = m.content.slice(1).split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'balance') m.reply(`💰 Balanța ta: ${db.bal.get(m.author.id) || 0} monede.`);
    if (cmd === 'daily') {
        db.bal.set(m.author.id, (db.bal.get(m.author.id) || 0) + 500);
        m.reply("🎁 Ai revendicat 500 monede!");
    }
    if (cmd === 'purge') {
        const amt = parseInt(args[0]);
        if (!amt || amt > 100) return m.reply("Introdu o sumă între 1-100");
        await m.channel.bulkDelete(amt + 1);
        const msg = await m.channel.send(`🧹 Am șters ${amt} mesaje.`);
        setTimeout(() => msg.delete(), 3000);
    }
});

/* 
==========================================================
SISTEM DE INTERACȚIUNI SLASH (Butoane, Tichete, Info)
==========================================================
*/
client.on(Events.InteractionCreate, async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: true });

        if (i.commandName === 'ban') {
            const member = i.options.getMember('user');
            await member.ban();
            i.editReply("🔨 Membru banat!");
        }

        if (i.commandName === 'serverinfo') {
            const { guild } = i;
            const embed = new EmbedBuilder().setTitle(`📊 Info: ${guild.name}`)
                .addFields(
                    { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
                    { name: "👥 Membri", value: `${guild.memberCount}`, inline: true },
                    { name: "📅 Creat", value: `${guild.createdAt.toDateString()}`, inline: true }
                );
            i.editReply({ embeds: [embed] });
        }

        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("VISIUM Support Panel")
                .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n** 👷Ai nevoie de ajutor? Deschide un tichet.**\n** 🏦Pentru cumpărare, apasă Purchase.**\n** 🎁Ai de revendicat un reward?**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tic_sup').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('tic_pur').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('tic_cla').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            i.editReply({ embeds: [embed], components: [row] });
        }
    }

    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        const ch = await i.guild.channels.create({
            name: `${i.customId}-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [{ id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel] }]
        });
        i.editReply(`✅ Tichet deschis: ${ch}`);
    }
});

/* 
==========================================================
SISTEM DE LOG-URI (Audit)
==========================================================
*/
client.on(Events.MessageDelete, m => console.log(`[LOG] Mesaj șters: ${m.content}`));
client.on(Events.MessageUpdate, (o, n) => console.log(`[LOG] Editat: ${o.content} -> ${n.content}`));

// LOGIN (Folosește process.env.DISCORD_TOKEN în fișierul .env)
client.login(process.env.DISCORD_TOKEN);
