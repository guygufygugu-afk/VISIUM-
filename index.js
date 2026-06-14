const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes } = require('discord.js');
const http = require('http');

// Server pentru Render (Menține botul activ)
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

// Baze de date simple (în memorie)
const vouchCount = new Map();
const balance = new Map();
const VOUCH_CHANNEL_ID = '1514651853348929738';

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este ONLINE!`);
    // Înregistrare Slash Commands
    const commands = [
        { name: 'ban', description: 'Ban', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'kick', description: 'Kick', options: [{name:'user', type:6, required:true}, {name:'reason', type:3, required:false}] },
        { name: 'mute', description: 'Mute', options: [{name:'user', type:6, required:true}, {name:'time', type:4, required:true}] },
        { name: 'supportpanel', description: 'Panou Suport' }
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const id = message.author.id;

    // --- ECONOMIE (Tip OwO) ---
    if (cmd === 'bal') return message.reply(`💰 **${message.author.username}**, ai **${balance.get(id) || 0}** monede.`);
    
    if (cmd === 'daily') {
        balance.set(id, (balance.get(id) || 0) + 500);
        return message.reply("🎁 **Daily!** Ai primit 500 monede!");
    }

    if (cmd === 'coinflip') {
        const bet = parseInt(args[0]);
        if (!bet || bet <= 0) return message.reply("❌ Trebuie să pariezi o sumă!");
        if ((balance.get(id) || 0) < bet) return message.reply("❌ Nu ai destule monede!");
        const win = Math.random() > 0.5;
        if (win) { balance.set(id, (balance.get(id) || 0) + bet); return message.reply(`🪙 **Câștigat!** Ai primit ${bet} monede.`); }
        else { balance.set(id, (balance.get(id) || 0) - bet); return message.reply(`🪙 **Pierdut!** Ai pierdut ${bet} monede.`); }
    }

    if (cmd === 'give') {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);
        if (!target || !amount) return message.reply("❌ Folosește: +give @user <suma>");
        if ((balance.get(id) || 0) < amount) return message.reply("❌ Fonduri insuficiente!");
        balance.set(id, (balance.get(id) || 0) - amount);
        balance.set(target.id, (balance.get(target.id) || 0) + amount);
        return message.reply(`✅ Ai trimis ${amount} monede către ${target.username}.`);
    }

    // --- PROFIL & VOUCH ---
    if (cmd === 'p') {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Profil: ${user.username}`).setDescription(`📊 Vouch-uri: ${vouchCount.get(user.id) || 0}\n💰 Monede: ${balance.get(user.id) || 0}`).setColor("#2F3136")] });
    }

    if (cmd === 'vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("❌ Menționează un user!");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v_acc_${target.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_dec').setLabel('Respins').setStyle(ButtonStyle.Danger)
        );
        const ch = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (ch) {
            await ch.send({ embeds: [new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${target}`).setColor("#FFD700")], components: [row] });
            return message.reply("✅ Vouch trimis!");
        }
    }
});

// Handling butoane (Tichete + Vouch)
client.on('interactionCreate', async (i) => {
    if (i.isButton()) {
        await i.deferReply({ ephemeral: true });
        if (i.customId.startsWith('v_acc_')) {
            const tId = i.customId.split('_')[2];
            vouchCount.set(tId, (vouchCount.get(tId) || 0) + 1);
            return i.editReply("✅ Vouch acceptat!");
        }
        if (i.customId === 'v_dec') return i.editReply("❌ Vouch respins.");
        if (i.customId.startsWith('ticket_')) { 
            const ch = await i.guild.channels.create({ name: `tichet-${i.user.username}`, type: ChannelType.GuildText });
            return i.editReply(`✅ Tichet creat: ${ch}`); 
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
            
