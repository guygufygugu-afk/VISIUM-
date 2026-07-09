const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const vouches = new Map();

const CONFIG = {
    SERVER_ID: '1522942162025840670',
    OWNER: '1522987982527922297',
    MOD_IMP: '1522994291335762060',
    MOD_SLAB: '1522995287201812671',
    TICKET_STAFF: '1522995560972554393',
    MM: { 
        PVP: '1522997096930607114', 
        _0_150: '1522997211519258785', 
        _150_500: '1522997417765507153', 
        _1B: '1522997572979920938', 
        OG: '1522997679733473280' 
    }
};

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('setup-support').setDescription('Panou Support'),
        new SlashCommandBuilder().setName('setup-mm').setDescription('Panou Middleman'),
        new SlashCommandBuilder().setName('ban').setDescription('Ban').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
        new SlashCommandBuilder().setName('lock').setDescription('Lock'),
        new SlashCommandBuilder().setName('unlock').setDescription('Unlock')
    ];
    await client.application.commands.set(commands);
});

// LOGICĂ TICKETE
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu()) {
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                { id: CONFIG.TICKET_STAFF, allow: ['ViewChannel', 'SendMessages'] }
            ]
        });
        return interaction.reply({ content: `✅ Ticket creat: ${channel}`, ephemeral: true });
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'setup-support') {
        const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('s').setOptions([
            { label: 'Suport', value: 'supp', emoji: '🎧' }, { label: 'Raport', value: 'rep', emoji: '📄' }
        ]));
        interaction.reply({ content: "Panou Suport", components: [row] });
    }
});

// LOGICĂ PREFIX (+p)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    
    if (args[0] === '+p') {
        const target = message.mentions.users.first() || message.author;
        const data = vouches.get(target.id) || { list: [], accepted: 0, rejected: 0 };
        const comms = data.list.length > 0 ? data.list.slice(-3).map((v, i) => `${i + 1}. **${v.author}**: ${v.text}`).join('\n') : "Nu există.";
        const badge = data.accepted >= 10 ? '👑 Legend' : (data.accepted >= 5 ? '👨‍✈️ Trusted' : 'Niciunul');
        
        const embed = new EmbedBuilder()
            .setTitle('👨‍✈️ Profil Utilizator')
            .setColor(0x00FFFF)
            .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤺 **User:** ${target.tag}
🆔 **ID:** ${target.id}
📱 **Display Name:** ${target.username}
⌚ **Cont creat:** <t:${Math.floor(target.createdTimestamp / 1000)}:D>

📰 **Informații Vouch**
✅ **Vouch-uri acceptate:** ${data.accepted}
❌ **Vouch-uri refuzate:** ${data.rejected}

🚦 **Badge-uri**
${badge}

✉️ **Ultimele comentarii**
${comms}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        message.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
