const fs = require('fs');
const http = require('http');
http.createServer((req, res) => res.end("System Online")).listen(process.env.PORT || 10000);

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, Events } = require('discord.js');
const client = new Client({ intents: [3276799] });

const CHANNELS = { LOGS: '1496563852052136016', WELCOME: '1492880249518686280', BYE: '1513435916515934248' };
let db = { bal: new Map() };

if (fs.existsSync('./data.json')) {
    const raw = fs.readFileSync('./data.json');
    const d = JSON.parse(raw);
    db.bal = new Map(Object.entries(d.bal || {}));
}
const save = () => fs.writeFileSync('./data.json', JSON.stringify({ bal: Object.fromEntries(db.bal) }, null, 2));

client.once(Events.ClientReady, () => console.log(`[SYSTEM] VISIUM Online: ${client.user.tag}`));

// WELCOME/BYE
client.on(Events.GuildMemberAdd, async m => {
    const ch = await m.guild.channels.fetch(CHANNELS.WELCOME).catch(() => null);
    if (ch) ch.send(`👋 Bun venit, ${m.user}!`);
});
client.on(Events.GuildMemberRemove, async m => {
    const ch = await m.guild.channels.fetch(CHANNELS.BYE).catch(() => null);
    if (ch) ch.send(`😢 ${m.user.tag} a părăsit serverul.`);
});

// COMENZI PREFIX
client.on(Events.MessageCreate, async (m) => {
    if (m.author.bot || !m.content.startsWith('+')) return;
    const args = m.content.slice(1).split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'balance') m.reply(`💰 Balanță: ${db.bal.get(m.author.id) || 0}`);
    if (cmd === 'daily') {
        db.bal.set(m.author.id, (db.bal.get(m.author.id) || 0) + 500);
        save();
        m.reply("🎁 500 monede primite!");
    }
    if (cmd === 'give') {
        const target = m.mentions.users.first();
        const amt = parseInt(args[1]);
        if (!target || isNaN(amt)) return m.reply("Folosește: +give @user suma");
        db.bal.set(target.id, (db.bal.get(target.id) || 0) + amt);
        save();
        m.reply(`✅ Transferat ${amt} monede către ${target.tag}.`);
    }
    if (cmd === 'purge') {
        const amt = parseInt(args[0]);
        await m.channel.bulkDelete(amt + 1);
        m.reply(`🧹 Șters ${amt} mesaje.`);
    }
});

// SLASH & TICHETE
client.on(Events.InteractionCreate, async (i) => {
    if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: true });
        if (i.commandName === 'ban') { await i.options.getMember('user').ban(); i.editReply("🔨 Banat!"); }
        if (i.commandName === 'kick') { await i.options.getMember('user').kick(); i.editReply("👢 Kick-at!"); }
        if (i.commandName === 'serverinfo') {
            const embed = new EmbedBuilder().setTitle(`📊 ${i.guild.name}`).addFields({ name: "Membri", value: `${i.guild.memberCount}`, inline: true });
            i.editReply({ embeds: [embed] });
        }
        if (i.commandName === 'supportpanel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tic_sup').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('tic_pur').setLabel('Purchase').setStyle(ButtonStyle.Success)
            );
            i.editReply({ embeds: [new EmbedBuilder().setTitle("VISIUM Support")], components: [row] });
        }
    }
    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        const ch = await i.guild.channels.create({ name: `${i.customId}-${i.user.username}`, type: ChannelType.GuildText });
        i.editReply(`✅ Tichet creat: ${ch}`);
    }
});

// LOGS
client.on(Events.MessageDelete, async m => {
    const ch = await m.guild.channels.fetch(CHANNELS.LOGS).catch(() => null);
    if (ch) ch.send(`🗑️ Mesaj șters în ${m.channel.name}: ${m.content}`);
});

client.login(process.env.DISCORD_TOKEN);
            
