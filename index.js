const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const app = express();
app.listen(process.env.PORT || 10000);

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
    MM_ROLES: {
        PVP: '1522997096930607114',
        _0_150: '1522997211519258785',
        _150_500: '1522997417765507153',
        _1B: '1522997572979920938',
        OG: '1522997679733473280'
    },
    GIF_LINK: 'https://cdn.discordapp.com/attachments/1524034577784635472/1524038680556077137/Adobe_Express_-_ezgif.com-video-to-gif-converter.gif?ex=6a504560&is=6a4ef3e0&hm=7d060c1aa3c96ea25da450b6f1fc3f34b299b1872fa23da28f2c2ba149667308&'
};

// --- SLASH COMMANDS SETUP ---
client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('setup-support').setDescription('Panou Support'),
        new SlashCommandBuilder().setName('setup-mm').setDescription('Panou Middleman'),
        new SlashCommandBuilder().setName('ban').setDescription('Ban user').addUserOption(o => o.setName('user').setRequired(true)),
        new SlashCommandBuilder().setName('kick').setDescription('Kick user').addUserOption(o => o.setName('user').setRequired(true)),
        new SlashCommandBuilder().setName('lock').setDescription('Lock canal'),
        new SlashCommandBuilder().setName('unlock').setDescription('Unlock canal'),
        new SlashCommandBuilder().setName('timeout').setDescription('Timeout').addUserOption(o => o.setName('user').setRequired(true)).addIntegerOption(o => o.setName('min').setRequired(true))
    ];
    await client.application.commands.set(commands);
    console.log('Bot activ!');
});

// --- INTERACȚIUNI (Slash + Meniuri) ---
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
            { label: 'Suport General', value: 'supp', emoji: '🎧' }, { label: 'Raportare', value: 'rep', emoji: '📄' }, { label: 'Cumparare', value: 'buy', emoji: '💎' }
        ]));
        const embed = new EmbedBuilder().setDescription(`## <:433405340:1523979383612768257> User Community Support Panel\n **Echipa noastră este aici să te ajute. Timpul de răspuns poate varia în funcție de încărcare, dar vom ajunge la tine cât mai repede posibil!**\n## <:5454654:1523979441158492263> Support General\n **Dacă ai o întrebare generală, ai găsit un bug sau nu știi exact unde să mergi, acesta este locul potrivit. Deschide un ticket și staff-ul te va ajuta.**\n## <:404560406:1523979551624003604> Raportează un utilizator\n **Luăm regulile în serios pentru a păstra comunitatea în siguranță. Dacă ai dovezi că cineva dă scam sau încalcă regulile, deschide un ticket și spune-ne.**\n## <:203442304:1523979639335157841> Servicii de Cumparare\n **Ai văzut o ofertă bombă pe server? Deschide ticket de cumpărare!**`);
        interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.commandName === 'setup-mm') {
        const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('mm').setOptions([
            { label: 'PVP', value: CONFIG.MM_ROLES.PVP }, { label: '0-150m', value: CONFIG.MM_ROLES._0_150 }, { label: '150-500m', value: CONFIG.MM_ROLES._150_500 }, { label: '1b+', value: CONFIG.MM_ROLES._1B }, { label: 'OG', value: CONFIG.MM_ROLES.OG }
        ]));
        const embed = new EmbedBuilder().setImage(CONFIG.GIF_LINK).setDescription(`<:433405340:1523979383612768257>**Middleman\nCand deschizi un ticket:**\n<:433405340:1523979383612768257>  **Așteptați ca un intermediar să vă revendice Ticket. Nu contactați intermediarii.**\n<:433405340:1523979383612768257>  **Urmați cu atenție instrucțiunile intermediarului.**\n<:433405340:1523979383612768257> **Asigurați-vă că da-ti vouch la intermediar în canalul desemnat odată ce trade-ul este finalizat.\nPowered by USER**`);
        interaction.reply({ embeds: [embed], components: [row] });
    }
});

// --- PREFIX COMMANDS (+) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === '+p') {
        const target = message.mentions.users.first() || message.author;
        const data = vouches.get(target.id) || { list: [], accepted: 0, rejected: 0 };
        const comms = data.list.length > 0 ? data.list.slice(-3).map((v, i) => `${i + 1}. **${v.author}**: ${v.text}`).join('\n') : "Nu există.";
        const badge = data.accepted >= 10 ? '👑 Legend' : (data.accepted >= 5 ? '👨‍✈️ Trusted' : 'Niciunul');
        
        const embed = new EmbedBuilder().setTitle('👨‍✈️ Profil Utilizator').setColor(0x00FFFF).setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🤺 **User:** ${target.tag}\n🆔 **ID:** ${target.id}\n📱 **Display Name:** ${target.username}\n⌚ **Cont creat:** <t:${Math.floor(target.createdTimestamp / 1000)}:D>\n\n📰 **Informații Vouch**\n✅ **Vouch-uri acceptate:** ${data.accepted}\n❌ **Vouch-uri refuzate:** ${data.rejected}\n\n🚦 **Badge-uri**\n${badge}\n\n✉️ **Ultimele comentarii**\n${comms}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        message.reply({ embeds: [embed] });
    }

    if (cmd === '+vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifică un user!');
        const comment = args.slice(2).join(' ') || "Fără comentariu";
        const data = vouches.get(target.id) || { list: [], accepted: 0, rejected: 0 };
        data.list.push({ author: message.author.username, text: comment });
        data.accepted += 1;
        vouches.set(target.id, data);
        message.reply(`✅ Vouch adăugat pentru ${target.username}!`);
    }

    if (cmd === '+help') {
        message.reply('📜 **Comenzi:**\n+p [user], +vouch [user] [text], +lb\n/setup-support, /setup-mm, /ban, /kick, /lock, /unlock');
    }
});

client.login(process.env.TOKEN);
        
