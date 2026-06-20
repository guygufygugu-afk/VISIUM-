const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Botul Visium Ultra-Enterprise este online!'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// CONFIGURAȚII GENERALE ALE SERVERULUI
const CONFIG = {
    SCAMMER_ROLE_ID: '1492892376979738715',
    SUSPECT_ROLE_ID: '1492892693959938089', 
    STAFF_ROLE_ID: '1490701828831052027',      
    TICKET_CATEGORY_ID: '1492885716856868978',
    ALLOWED_CLOSE_ID: '1485154781247967356',
    VOUCH_CHANNEL_ID: '1517878554619150476',
    
    TRUST_ROLES: {
        BRONZE: '1492892693959938089', 
        SILVER: '1492892693959938089', 
        GOLD: '1490701828831052027'
    }
};

// BAZE DE DATE TEMPORARE ÎN MEMORIE (MAPS)
const vouches = new Map();
const pendingVouches = new Map();
const userNotes = new Map();
const afkUsers = new Map();
const sanctionHistory = new Map();
const wallets = new Map();        
const economy = new Map();        
const staffRatings = new Map();   
const activeAuctions = new Map(); 
const lastDaily = new Map();      
const lastWork = new Map();       
const userInvitesCount = new Map(); 
const guildInvites = new Map();     

// 🎰 STRUCTURI ȘI FUNCȚII PENTRU CAZINOU (+v)
const activeBlackjack = new Map();

function drawCard() { 
    const cards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11]; 
    return cards[Math.floor(Math.random() * cards.length)]; 
}

function getScore(hand) { 
    let score = hand.reduce((a, b) => a + b, 0); 
    let aces = hand.filter(c => c === 11).length; 
    while (score > 21 && aces > 0) { 
        score -= 10; 
        aces--; 
    } 
    return score; 
}

function addSanction(userId, type, reason, executor) {
    if (!sanctionHistory.has(userId)) sanctionHistory.set(userId, []);
    sanctionHistory.get(userId).push({ type, reason, executor, date: Date.now() });
}

function getBalance(userId) { return economy.get(userId) || 0; }
function addBalance(userId, amount) { economy.set(userId, getBalance(userId) + amount); }

// ÎNCĂRCARE INIȚIALĂ A INVITAȚIILOR DIN SERVER
client.once('ready', async () => {
    console.log(`[🤖 VISIUM GOD-MODE] Conectat ca ${client.user.tag}!`);
    
    client.guilds.cache.forEach(async guild => {
        const firstInvites = await guild.invites.fetch().catch(() => null);
        if (firstInvites) {
            guildInvites.set(guild.id, new Map(firstInvites.map(invite => [invite.code, invite.uses])));
        }
    });

    const commands = [
        { name: 'clear', description: 'Sterge mesaje', options: [{ name: 'cantitate', type: ApplicationCommandOptionType.Integer, description: 'Nr mesaje', required: true }] },
        { name: 'lock', description: 'Blocheaza canalul' },
        { name: 'unlock', description: 'Deblocheaza canalul' },
        { name: 'timeout', description: 'Da timeout unui membru', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Minute', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'untimeout', description: 'Scoate timeout', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }]},
        { name: 'warn', description: 'Da un avertisment', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'kick', description: 'Da afara un membru', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'ban', description: 'Interzice un membru', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'mark', description: 'Marcheaza scammer, sistemul vechi', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'suspect', description: 'Marcheaza un utilizator ca suspect de hack', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'supportpanel', description: 'Panou tickete' },
        { name: 'check', description: 'Verifica detaliile de securitate ale unui membru', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru de verificat', required: true }] },
        { name: 'stats', description: 'Afiseaza statisticile live ale serverului' },
        { name: 'crypto', description: 'Afiseaza pretul live al unei monede crypto', options: [{ name: 'moneda', type: ApplicationCommandOptionType.String, description: 'Ex: BTC, LTC, ETH, USDT', required: true }] },
        { name: 'tax', description: 'Calculeaza taxele si comisioanele pentru o suma', options: [{ name: 'suma', type: ApplicationCommandOptionType.Number, description: 'Suma de bani', required: true }, { name: 'procent', type: ApplicationCommandOptionType.Number, description: 'Procentul taxei', required: true }] },
        { name: 'note', description: 'Adauga o nota secreta pe profilul unui membru (Staff)', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: true }, { name: 'text', type: ApplicationCommandOptionType.String, description: 'Nota text', required: true }] },
        { name: 'report', description: 'Raporteaza un utilizator suspect catre staff', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru suspect', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'De ce il raportezi?', required: true }] },
        { name: 'afk', description: 'Te seteaza ca fiind plecat de la tastatura', options: [{ name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motivul afk', required: false }] },
        { name: 'remind', description: 'Iti seteaza un memento personal', options: [{ name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Peste cate minute sa iti amintesc?', required: true }, { name: 'mesaj', type: ApplicationCommandOptionType.String, description: 'Textul mementoului', required: true }] },
        { name: 'history', description: 'Afiseaza istoricul complet de sanctiuni al unui membru', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: true }] },
        { name: 'slowmode', description: 'Seteaza slowmode pe canalul curent (Staff)', options: [{ name: 'secunde', type: ApplicationCommandOptionType.Integer, description: 'Secunde', required: true }] },
        { name: 'gstart', description: 'Porneste un giveaway rapid cu buton pe canal (Staff)', options: [{ name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Durata in minute', required: true }, { name: 'premiu', type: ApplicationCommandOptionType.String, description: 'Ce se castiga?', required: true }] },
        { name: 'setwallet', description: 'Salveaza adresele tale oficiale crypto', options: [{ name: 'tip', type: ApplicationCommandOptionType.String, description: 'Moneda', required: true, choices: [{ name: 'Litecoin (LTC)', value: 'ltc' }, { name: 'Bitcoin (BTC)', value: 'btc' }, { name: 'Tether (USDT)', value: 'usdt' }] }, { name: 'adresa', type: ApplicationCommandOptionType.String, description: 'Adresa portofel', required: true }] },
        { name: 'wallet', description: 'Vizualizeaza portofelul crypto al unui membru', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: true }] },
        { name: 'daily', description: 'Colecteaza recompensa ta zilnica de Visium Coins' },
        { name: 'work', description: 'Lucreaza pentru a castiga monede Visium' },
        { name: 'balance', description: 'Verifica balanta ta de monede', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: false }] },
        { name: 'coinflip', description: 'Pariaza monede la datul cu banul', options: [{ name: 'suma', type: ApplicationCommandOptionType.Integer, description: 'Suma pariu', required: true }, { name: 'alegere', type: ApplicationCommandOptionType.String, description: 'Cap sau Pajura', required: true, choices: [{ name: 'Cap', value: 'cap' }, { name: 'Pajura', value: 'pajura' }] }] },
        { name: 'convert', description: 'Convertor valutar si crypto instant', options: [{ name: 'suma', type: ApplicationCommandOptionType.Number, description: 'Suma', required: true }, { name: 'din', type: ApplicationCommandOptionType.String, description: 'Din ce moneda', required: true }, { name: 'in', type: ApplicationCommandOptionType.String, description: 'In ce moneda', required: true }] },
        { name: 'shop', description: 'Vizualizeaza magazinul oficial interactiv' },
        { name: 'buy', description: 'Cumpara un articol exclusiv din shop', options: [{ name: 'articol', type: ApplicationCommandOptionType.String, description: 'Articol', required: true, choices: [{ name: 'Custom Name Color (5000 Coins)', value: 'color' }, { name: 'Vouch Badge VIP (10000 Coins)', value: 'badge' }] }] },
        { name: 'rate', description: 'Lasa o recenzie unui membru din staff sau Middleman', options: [{ name: 'staff', type: ApplicationCommandOptionType.User, description: 'Staff', required: true }, { name: 'stele', type: ApplicationCommandOptionType.Integer, description: 'Stele', required: true, choices: [{ name: '⭐', value: 1 }, { name: '⭐⭐', value: 2 }, { name: '⭐⭐⭐', value: 3 }, { name: '⭐⭐⭐⭐', value: 4 }, { name: '⭐⭐⭐⭐⭐', value: 5 }] }, { name: 'comentariu', type: ApplicationCommandOptionType.String, description: 'Comentariu', required: true }] },
        { name: 'stafflb', description: 'Afiseaza clasamentul staff' },
        { name: 'auction', description: 'Scoate un bun la licitatie (Staff)', options: [{ name: 'obiect', type: ApplicationCommandOptionType.String, description: 'Obiect', required: true }, { name: 'pornire', type: ApplicationCommandOptionType.Integer, description: 'Pret pornire', required: true }, { name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Minute', required: true }] },
        { name: 'bid', description: 'Pluseaza in licitatia activa', options: [{ name: 'suma', type: ApplicationCommandOptionType.Integer, description: 'Suma', required: true }] },
        { name: 'trivia', description: 'Lanseaza o intrebare Trivia cu premii' },
        { name: 'invites', description: 'Verifică numărul total de utilizatori reali invitați de tine pe server' }
    ];
    await client.application.commands.set(commands);
});

client.on('inviteCreate', async invite => {
    if (!guildInvites.has(invite.guild.id)) guildInvites.set(invite.guild.id, new Map());
    guildInvites.get(invite.guild.id).set(invite.code, invite.uses);
});

client.on('guildMemberAdd', async member => {
    const isFake = (Date.now() - member.user.createdTimestamp) < 3 * 24 * 60 * 60 * 1000;
    const cachedInvites = guildInvites.get(member.guild.id);
    const newInvites = await member.guild.invites.fetch().catch(() => null);
    
    if (cachedInvites && newInvites) {
        for (const [code, invite] of newInvites) {
            const cachedUses = cachedInvites.get(code) || 0;
            if (invite.uses > cachedUses) {
                cachedInvites.set(code, invite.uses); 
                if (invite.inviter) {
                    const trackingChannel = member.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
                    if (!isFake) {
                        addBalance(invite.inviter.id, 300);
                        userInvitesCount.set(invite.inviter.id, (userInvitesCount.get(invite.inviter.id) || 0) + 1);
                        if (trackingChannel) {
                            trackingChannel.send(`📥 ${member.user} s-a alăturat comunității. Invitat de: **${invite.inviter.username}** (Recompensat cu \`300 Visium Coins\`).`);
                        }
                    } else {
                        if (trackingChannel) {
                            trackingChannel.send(`⚠️ ${member.user} s-a alăturat, dar contul este suspect de nou (< 3 zile). **${invite.inviter.username}** NU a fost recompensat (Sistem Anti-Fake).`);
                        }
                    }
                }
                break;
            }
        }
    }
});

client.on('messageDelete', async message => {
    if (!message.guild || message.author?.bot) return;
    if (message.mentions.users.size > 0 || message.mentions.roles.size > 0) {
        const reportChannel = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        if (reportChannel) {
            const embed = new EmbedBuilder()
                .setTitle('🚨 Ghost Ping / Mențiune Ștearsă Detectată')
                .setColor(0xFF8C00)
                .setDescription(`👤 **Autor:** ${message.author} (\`${message.author.username}\`)\n💬 **Canal:** ${message.channel}\n📝 **Conținut șters:** *${message.content || '[Fără text]'}*`)
                .setTimestamp();
            reportChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
            const isUser = interaction.user.id === CONFIG.ALLOWED_CLOSE_ID;
            const hasRole = interaction.member.roles.cache.has(CONFIG.ALLOWED_CLOSE_ID);
            if (!isUser && !hasRole) return interaction.reply({ content: `❌ Nu ai permisiunea sa inchizi acest ticket!`, ephemeral: true });
            await interaction.reply({ content: '🔒 Acest ticket se va inchide in 5 secunde...' });
            setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
            return;
        }

        if (interaction.customId === 'vouch_accept' || interaction.customId === 'vouch_reject') {
            if (!pendingVouches.has(interaction.message.id)) return interaction.reply({ content: '❌ Cerere expirata.', ephemeral: true });
            const data = pendingVouches.get(interaction.message.id);
            
            if (interaction.customId === 'vouch_accept') {
                if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
                vouches.get(data.targetId).push({ author: data.authorName, comment: data.comment, date: Date.now(), status: 'accepted' });
                
                const acceptedCount = vouches.get(data.targetId).filter(v => v.status === 'accepted').length;
                const targetMember = await interaction.guild.members.fetch(data.targetId).catch(() => null);
                if (targetMember) {
                    if (acceptedCount >= 30) await targetMember.roles.add(CONFIG.TRUST_ROLES.GOLD).catch(() => {});
                    else if (acceptedCount >= 15) await targetMember.roles.add(CONFIG.TRUST_ROLES.SILVER).catch(() => {});
                    else if (acceptedCount >= 5) await targetMember.roles.add(CONFIG.TRUST_ROLES.BRONZE).catch(() => {});
                }
                await interaction.update({ content: `✅ Vouch-ul trimis de **${data.authorName}** a fost **ACCEPTAT**. Total approved: \`${acceptedCount}\`.`, embeds: [], components: [] });
            } else {
                if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
                vouches.get(data.targetId).push({ author: data.authorName, comment: data.comment, date: Date.now(), status: 'rejected' });
                await interaction.update({ content: `❌ Vouch-ul trimis de **${data.authorName}** a fost **RESPINS**.`, embeds: [], components: [] });
            }
            pendingVouches.delete(interaction.message.id);
            return;
        }

        // 🃏 PROCESARE INTERACȚIUNI BUTOANE BLACKJACK (+v bj)
        if (interaction.customId.startsWith('bj_hit_') || interaction.customId.startsWith('bj_stand_')) {
            const isHit = interaction.customId.startsWith('bj_hit_');
            const userId = interaction.customId.replace(isHit ? 'bj_hit_' : 'bj_stand_', '');

            if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Acesta nu este jocul tău!', ephemeral: true });
            if (!activeBlackjack.has(userId)) return interaction.reply({ content: '❌ Acest joc a expirat.', ephemeral: true });

            const game = activeBlackjack.get(userId);

            if (isHit) {
                game.pHand.push(drawCard());
                const pScore = getScore(game.pHand);

                if (pScore > 21) {
                    addBalance(userId, -game.bet);
                    activeBlackjack.delete(userId);
                    const loseEmbed = new EmbedBuilder()
                        .setTitle('💥 Blackjack - BUST!')
                        .setColor(0xFF0000)
                        .setDescription(`Ai depășit 21! Ai pierdut **${game.bet} Visium Coins**.\nMâna ta: [${game.pHand.join(', ')}] (Scor: **${pScore}**)`);
                    return interaction.update({ embeds: [loseEmbed], components: [] });
                }

                const updateEmbed = new EmbedBuilder()
                    .setTitle('🃏 Blackjack Table')
                    .setColor(0x2ECC71)
                    .addFields(
                        { name: '🫵 Mâna Ta', value: `Carduri: [${game.pHand.join(', ')}]\nScor: **${pScore}**`, inline: true },
                        { name: '🤖 Dealer', value: `Carduri: [${game.dHand[0]}, ?]`, inline: true }
                    );
                return interaction.update({ embeds: [updateEmbed] });
            } else {
                let dScore = getScore(game.dHand);
                while (dScore < 17) {
                    game.dHand.push(drawCard());
                    dScore = getScore(game.dHand);
                }

                const pScore = getScore(game.pHand);
                let msg = '';
                let color = 0x34495E;

                if (dScore > 21 || pScore > dScore) {
                    addBalance(userId, game.bet);
                    msg = `🎉 **Ai câștigat!** Dealerul a făcut ${dScore > 21 ? 'BUST' : dScore}. Ai primit **${game.bet} Visium Coins**!`;
                    color = 0x2ECC71;
                } else if (pScore < dScore) {
                    addBalance(userId, -game.bet);
                    msg = `😭 **Ai pierdut!** Dealerul a câștigat cu scorul de **${dScore}** contra **${pScore}**. Ai pierdut **${game.bet} Visium Coins**.`;
                    color = 0xFF0000;
                } else {
                    msg = `🤝 **Egalitate (Push)!** Amândoi aveți scorul de **${pScore}**. Monedele tale au fost returnate.`;
                    color = 0xF1C40F;
                }

                activeBlackjack.delete(userId);
                const finalEmbed = new EmbedBuilder()
                    .setTitle('🏁 Rezultat Blackjack')
                    .setColor(colo
