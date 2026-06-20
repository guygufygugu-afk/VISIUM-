const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Botul Visium Ultra-Enterprise este online și extins!'));
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
    OWNER_ID: '1485154781247967356', // 🏛️ ID-ul tău salvat direct! Toate taxele/amenzile vin aici.
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

// BAZE DE DATA TEMPORARE ÎN MEMORIE (MAPS)
const vouches = new Map();
const pendingVouches = new Map();
const userNotes = new Map();
const afkUsers = new Map();
const sanctionHistory = new Map();       
const economy = new Map();        
const staffRatings = new Map();   
const activeAuctions = new Map(); 
const lastDaily = new Map();      
const lastWork = new Map();       
const lastCrime = new Map();      
const lastFish = new Map();       
const lastHunt = new Map();       
const userInvitesCount = new Map(); 
const guildInvites = new Map();     
const marriages = new Map();
const activeBlackjack = new Map();

// FUNCȚII AJUTĂTOARE ECONOMIE / JOCURI
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

// ÎNCĂRCARE INIȚIALĂ A COMMANDELOR (SLASHE-URI DETALIATE)
client.once('ready', async () => {
    console.log(`[🤖 VISIUM GOD-MODE] Conectat ca ${client.user.tag}! Sistemul este gata.`);
    
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
        { name: 'mark', description: 'Marcheaza scammer', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'suspect', description: 'Marcheaza un utilizator ca suspect', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'supportpanel', description: 'Panou tickete' },
        { name: 'check', description: 'Verifica detaliile de securitate ale unui membru', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru de verificat', required: true }] },
        { name: 'stats', description: 'Afiseaza statisticile live ale serverului' },
        { name: 'crypto', description: 'Afiseaza pretul live al unei monede crypto', options: [{ name: 'moneda', type: ApplicationCommandOptionType.String, description: 'Ex: BTC, LTC, ETH, USDT', required: true }] },
        { name: 'tax', description: 'Calculeaza taxele si comisioanele pentru o suma', options: [{ name: 'suma', type: ApplicationCommandOptionType.Number, description: 'Suma de bani', required: true }, { name: 'procent', type: ApplicationCommandOptionType.Number, description: 'Procentul taxei', required: true }] },
        { name: 'note', description: 'Adauga o nota secreta pe profilul unui membru (Staff)', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: true }, { name: 'text', type: ApplicationCommandOptionType.String, description: 'Nota text', required: true }] },
        { name: 'report', description: 'Raporteaza un utilizator suspect catre staff', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru suspect', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'De ce il raportezi?', required: true }] },
        { name: 'afk', description: 'Te seteaza ca fiind plecat de la tastatura', options: [{ name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motivul afk', required: false }] },
        { name: 'remind', description: 'Iti seteaza un memento personal', options: [{ name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Peste cate minute?', required: true }, { name: 'mesaj', type: ApplicationCommandOptionType.String, description: 'Textul mementoului', required: true }] },
        { name: 'history', description: 'Afiseaza istoricul complet de sanctiuni al unui membru', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: true }] },
        { name: 'slowmode', description: 'Seteaza slowmode pe canalul curent', options: [{ name: 'secunde', type: ApplicationCommandOptionType.Integer, description: 'Secunde', required: true }] },
        { name: 'gstart', description: 'Porneste un giveaway rapid', options: [{ name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Durata in minute', required: true }, { name: 'premiu', type: ApplicationCommandOptionType.String, description: 'Ce se castiga?', required: true }] },
        { name: 'setwallet', description: 'Salveaza adresele tale oficiale crypto', options: [{ name: 'tip', type: ApplicationCommandOptionType.String, description: 'Moneda', required: true, choices: [{ name: 'Litecoin (LTC)', value: 'ltc' }, { name: 'Bitcoin (BTC)', value: 'btc' }, { name: 'Tether (USDT)', value: 'usdt' }] }, { name: 'adresa', type: ApplicationCommandOptionType.String, description: 'Adresa portofel', required: true }] },
        { name: 'wallet', description: 'Vizualizeaza portofelul crypto al unui membru', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: true }] },
        { name: 'daily', description: 'Colecteaza recompensa ta zilnica de Visium Coins' },
        { name: 'work', description: 'Lucreaza pentru a castiga monede Visium' },
        { name: 'balance', description: 'Verifica balanta ta de monede', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: false }] },
        { name: 'coinflip', description: 'Pariaza monede la datul cu banul', options: [{ name: 'suma', type: ApplicationCommandOptionType.Integer, description: 'Suma pariu', required: true }, { name: 'alegere', type: ApplicationCommandOptionType.String, description: 'Cap sau Pajura', required: true, choices: [{ name: 'Cap', value: 'cap' }, { name: 'Pajura', value: 'pajura' }] }] },
        { name: 'convert', description: 'Convertor valutar si crypto instant', options: [{ name: 'suma', type: ApplicationCommandOptionType.Number, description: 'Suma', required: true }, { name: 'din', type: ApplicationCommandOptionType.String, description: 'Din ce moneda', required: true }, { name: 'in', type: ApplicationCommandOptionType.String, description: 'In ce moneda', required: true }] },
        { name: 'shop', description: 'Vizualizeaza magazinul oficial interactiv' },
        { name: 'buy', description: 'Cumpara un articol exclusiv din shop', options: [{ name: 'articol', type: ApplicationCommandOptionType.String, description: 'Articol', required: true, choices: [{ name: 'Custom Name Color (5000 Coins)', value: 'color' }, { name: 'Vouch Badge VIP (10000 Coins)', value: 'badge' }] }] },
        { name: 'rate', description: 'Lasa o recenzie unui membru din staff', options: [{ name: 'staff', type: ApplicationCommandOptionType.User, description: 'Staff', required: true }, { name: 'stele', type: ApplicationCommandOptionType.Integer, description: 'Stele', required: true, choices: [{ name: '⭐', value: 1 }, { name: '⭐⭐', value: 2 }, { name: '⭐⭐⭐', value: 3 }, { name: '⭐⭐⭐⭐', value: 4 }, { name: '⭐⭐⭐⭐⭐', value: 5 }] }, { name: 'comentariu', type: ApplicationCommandOptionType.String, description: 'Comentariu', required: true }] },
        { name: 'stafflb', description: 'Afiseaza clasamentul staff' },
        { name: 'auction', description: 'Scoate un bun la licitatie (Staff)', options: [{ name: 'obiect', type: ApplicationCommandOptionType.String, description: 'Obiect', required: true }, { name: 'pornire', type: ApplicationCommandOptionType.Integer, description: 'Pret pornire', required: true }, { name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Minute', required: true }] },
        { name: 'bid', description: 'Pluseaza in licitatia activa', options: [{ name: 'suma', type: ApplicationCommandOptionType.Integer, description: 'Suma', required: true }] },
        { name: 'trivia', description: 'Lanseaza o intrebare Trivia cu premii' },
        { name: 'invites', description: 'Verifică numărul total de utilizatori reali invitați' },
        { name: 'avatar', description: 'Arata avatarul unui utilizator', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: false }] },
        { name: 'serverinfo', description: 'Afiseaza detalii complete despre server' },
        { name: 'userinfo', description: 'Afiseaza detalii despre un membru', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: false }] },
        { name: 'pay', description: 'Trimite Visium Coins unui prieten', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Cui trimiti', required: true }, { name: 'suma', type: ApplicationCommandOptionType.Integer, description: 'Suma de bani', required: true }] },
        { name: 'rob', description: 'Incearca sa jefuiesti un alt utilizator', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'Membru', required: true }] },
        { name: 'dice', description: 'Da cu zarul pentru un numar norocos' },
        { name: 'roulette', description: '🎰 Joacă la Ruleta adevărată a cazinoului!', options: [{ name: 'suma', type: ApplicationCommandOptionType.Integer, description: 'Suma de pariat', required: true }, { name: 'culoare', type: ApplicationCommandOptionType.String, description: 'Alege culoarea pe care pariezi', required: true, choices: [{ name: 'Roșu (Red - 2x)', value: 'rosu' }, { name: 'Negru (Black - 2x)', value: 'negru' }, { name: 'Verde (Green - 14x)', value: 'verde' }] }] },
        { name: 'crime', description: '🥷 Comite o infracțiune majoră! Risc mare de amendă' },
        { name: 'fish', description: '🎣 Mergi la pescuit pentru a prinde pești valoroși' },
        { name: 'hunt', description: '🏹 Mergi la vânătoare în pădurea Visium' },
        { name: 'richest', description: '🏆 Vezi topul celor mai bogați utilizatori de pe server' }
    ];
    await client.application.commands.set(commands);
});

// INTERACTION CREATE (BUTOANE, SELECTURI ȘI SLASHE-URI)
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
            const isUser = interaction.user.id === CONFIG.ALLOWED_CLOSE_ID;
            if (!isUser && !interaction.member.roles.cache.has(CONFIG.STAFF_ROLE_ID)) return interaction.reply({ content: `❌ Nu ai permisiunea sa inchizi acest ticket!`, ephemeral: true });
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
                await interaction.update({ content: `✅ Vouch-ul trimis de **${data.authorName}** a fost **ACCEPTAT**. Total approved: \`${acceptedCount}\`.`, embeds: [], components: [] });
            } else {
                await interaction.update({ content: `❌ Vouch-ul trimis de **${data.authorName}** a fost **RESPINS**.`, embeds: [], components: [] });
            }
            pendingVouches.delete(interaction.message.id); return;
        }

        // CASINO: BLACKJACK BUTTONS
        if (interaction.customId.startsWith('bj_hit_') || interaction.customId.startsWith('bj_stand_')) {
            const isHit = interaction.customId.startsWith('bj_hit_'); const userId = interaction.customId.replace(isHit ? 'bj_hit_' : 'bj_stand_', '');
            if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Acesta nu este jocul tău!', ephemeral: true });
            if (!activeBlackjack.has(userId)) return interaction.reply({ content: '❌ Acest joc a expirat.', ephemeral: true });
            const game = activeBlackjack.get(userId);

            if (isHit) {
                game.pHand.push(drawCard()); const pScore = getScore(game.pHand);
                if (pScore > 21) {
                    addBalance(userId, -game.bet); addBalance(CONFIG.OWNER_ID, game.bet); // 🏛️ PIERDERE -> Banii merg la tine
                    activeBlackjack.delete(userId);
                    return interaction.update({ embeds: [new EmbedBuilder().setTitle('💥 Blackjack - BUST!').setColor(0xFF0000).setDescription(`Ai depășit 21! Ai pierdut **${game.bet} Coins**.\nMâna ta: [${game.pHand.join(', ')}] (Scor: **${pScore}**)`)], components: [] });
                }
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('🃏 Blackjack Table').setColor(0x2ECC71).addFields({ name: '🫵 Mâna Ta', value: `Carduri: [${game.pHand.join(', ')}]\nScor: **${pScore}**`, inline: true }, { name: '🤖 Dealer', value: `Carduri: [${game.dHand[0]}, ?]`, inline: true })] });
            } else {
                let dScore = getScore(game.dHand); while (dScore < 17) { game.dHand.push(drawCard()); dScore = getScore(game.dHand); }
                const pScore = getScore(game.pHand); let msg = ''; let color = 0x34495E;
                if (dScore > 21 || pScore > dScore) { addBalance(userId, game.bet); msg = `🎉 **Ai câștigat!** Dealerul a făcut ${dScore > 21 ? 'BUST' : dScore}. Ai primit **${game.bet} Coins**!`; color = 0x2ECC71; }
                else if (pScore < dScore) { addBalance(userId, -game.bet); addBalance(CONFIG.OWNER_ID, game.bet); msg = `😭 **Ai pierdut!** Dealerul are **${dScore}**. Ai pierdut **${game.bet} Coins**.`; color = 0xFF0000; }
                else { msg = `🤝 **Egalitate!** Monedele tale au fost returnate.`; color = 0xF1C40F; }
                activeBlackjack.delete(userId);
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('🏁 Rezultat Blackjack').setColor(color).setDescription(msg).addFields({ name: '🫵 Mâna Ta', value: `Carduri: [${game.pHand.join(', ')}]\nScor: **${pScore}**`, inline: true }, { name: '🤖 Mâna Dealerului', value: `Carduri: [${game.dHand.join(', ')}]\nScor: **${dScore}**`, inline: true })], components: [] });
            }
        }
    }
    
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const ticketType = interaction.values[0]; await interaction.reply({ content: '⏳ Creez ticketul...', ephemeral: true });
        try {
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`, type: 0, parent: CONFIG.TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: ['ViewChannel'] },
                    { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    { id: CONFIG.STAFF_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
                ]
            });
            const embed = new EmbedBuilder().setTitle(`🎫 Ticket - ${ticketType}`).setColor(0x1ABC9C).setDescription(`Salut ${interaction.user}! Un membru staff te va ajutor în curând.\nCategorie: **${ticketType.toUpperCase()}**`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Închide Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
            await channel.send({ content: `<@${interaction.user.id}> | <@&${CONFIG.STAFF_ROLE_ID}>`, embeds: [embed], components: [row] });
            return interaction.editReply({ content: `✅ Ticket deschis: ${channel}` });
        } catch { return interaction.editReply({ content: '❌ Eroare la deschiderea ticketului.' }); }
    }

    if (!interaction.isChatInputCommand()) return;
        const { commandName, options } = interaction;

    // 🎰 ROULETTE
    if (commandName === 'roulette') {
        const suma = options.getInteger('suma'); const alegere = options.getString('culoare');
        if (suma <= 0) return interaction.reply({ content: '❌ Introdu o sumă pozitivă!', ephemeral: true });
        if (getBalance(interaction.user.id) < suma) return interaction.reply({ content: '❌ Bani insuficienți!', ephemeral: true });
        
        const r = Math.random();
        let castigatoare = '';
        if (r < 0.47) castigatoare = 'rosu';
        else if (r < 0.94) castigatoare = 'negru';
        else castigatoare = 'verde';

        if (alegere === castigatoare) {
            let mult = castigatoare === 'verde' ? 14 : 2;
            const profit = suma * (mult - 1); addBalance(interaction.user.id, profit);
            return interaction.reply(`🎰 **[RULETĂ]** Bila s-a oprit pe **${castigatoare.toUpperCase()}**! 🎉 Felicitări! Ai câștigat **${suma * mult} Coins**.`);
        } else {
            addBalance(interaction.user.id, -suma); addBalance(CONFIG.OWNER_ID, suma);
            return interaction.reply(`🎰 **[RULETĂ]** Bila s-a oprit pe **${castigatoare.toUpperCase()}**... 😭 Ai pierdut **${suma} Coins**. Banii au fost colectați de cazinou.`);
        }
    }

    // 🥷 CRIME (High risk, amenzi mari)
    if (commandName === 'crime') {
        const cd = 45 * 60 * 1000; const last = lastCrime.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Ești căutat de poliție! Poți comite o nouă crimă în <t:${Math.floor((last + cd)/1000)}:R>.`, ephemeral: true });
        lastCrime.set(interaction.user.id, Date.now());

        const succes = Math.random() < 0.35; 
        if (succes) {
            const prf = Math.floor(Math.random() * 800) + 300; addBalance(interaction.user.id, prf);
            return interaction.reply(`🥷 **[CRIMĂ REUȘITĂ]** Ai spart un seif securizat și ai strâns **${prf} Visium Coins** fără să fii văzut!`);
        } else {
            const amenda = Math.floor(Math.random() * 400) + 200; 
            addBalance(interaction.user.id, -amenda); addBalance(CONFIG.OWNER_ID, amenda);
            return interaction.reply(`🚨 **[PRINS DE POLIȚIE]** Planul tău a eșuat mizerabil! Ai fost reținut și amendat cu **${amenda} Visium Coins**. Suma a fost retrasă automat de fisc.`);
        }
    }

    // 🎣 FISH
    if (commandName === 'fish') {
        const cd = 5 * 60 * 1000; const last = lastFish.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Peștii s-au speriat. Încearcă din nou în <t:${Math.floor((last + cd)/1000)}:R>.`, ephemeral: true });
        lastFish.set(interaction.user.id, Date.now());
        const pesti = ['🐟 Pește mic', '🐠 Pește tropical', '🐡 Pește balon', '🦈 Rechin de Aur!'];
        const r = Math.random();
        let idx = r < 0.5 ? 0 : (r < 0.8 ? 1 : (r < 0.97 ? 2 : 3));
        const sume = [60, 120, 250, 800]; addBalance(interaction.user.id, sume[idx]);
        return interaction.reply(` 🎣 ${interaction.user} a aruncat undița în lac și a prins un **${pesti[idx]}** vândut instant cu **${sume[idx]} Coins**!`);
    }

    // 🏹 HUNT
    if (commandName === 'hunt') {
        const cd = 7 * 60 * 1000; const last = lastHunt.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Nu ai muniție! Mergi la vânătoare din nou în <t:${Math.floor((last + cd)/1000)}:R>.`, ephemeral: true });
        lastHunt.set(interaction.user.id, Date.now());
        const animale = ['⚰️ Nimic (ai ratat)', '🐇 Iepure sălbatic', '🐗 Porc mistreț', '🐻 Urs Brun Carpatin'];
        const r = Math.random();
        let idx = r < 0.3 ? 0 : (r < 0.65 ? 1 : (r < 0.92 ? 2 : 3));
        const sume = [0, 90, 200, 650]; if (sume[idx] > 0) addBalance(interaction.user.id, sume[idx]);
        return interaction.reply(`🏹 ${interaction.user} a mers în pădure cu arcul și a vânat un **${animale[idx]}** aducându-i profit de **${sume[idx]} Coins**!`);
    }

    // 🏆 RICHEST
    if (commandName === 'richest') {
        const arr = []; for (const [uid, bal] of economy.entries()) { if (bal > 0) arr.push({ uid, bal }); }
        arr.sort((a, b) => b.bal - a.bal);
        let txt = `# 👛 Top 10 Cei Mai Bogați Membri\n\n`;
        if (arr.length === 0) txt += `*Sărăcie totală, nimeni nu are monede.*`;
        else arr.slice(0, 10).forEach((u, i) => { txt += `**#${i+1}** <@${u.uid}> — \`${u.bal} Coins\`\n`; });
        return interaction.reply({ content: txt });
    }

    if (commandName === 'avatar') {
        const user = options.getUser('utilizator') || interaction.user;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🖼️ Avatarul lui ${user.username}`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(0x3498DB)] });
    }
    if (commandName === 'serverinfo') {
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🏰 ${interaction.guild.name}`).setThumbnail(interaction.guild.iconURL({ dynamic: true })).setColor(0x9B59B6).addFields({ name: '👑 Proprietar', value: `<@${interaction.guild.ownerId}>`, inline: true }, { name: '👥 Membri', value: `\`${interaction.guild.memberCount}\``, inline: true })] });
    }
    if (commandName === 'userinfo') {
        const user = options.getUser('utilizator') || interaction.user; const member = options.getMember('utilizator') || interaction.member;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Detalii Membru - ${user.username}`).setColor(0x2ECC71).addFields({ name: '🆔 ID Utilizator', value: `\`${user.id}\``, inline: true }, { name: '📆 Alăturat', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true })] });
    }
    if (commandName === 'pay') {
        const user = options.getUser('utilizator'); const suma = options.getInteger('suma');
        if (user.id === interaction.user.id || suma <= 0 || getBalance(interaction.user.id) < suma) return interaction.reply({ content: '❌ Eroare tranzacție!', ephemeral: true });
        addBalance(interaction.user.id, -suma); addBalance(user.id, suma); return interaction.reply(`💸 ${interaction.user} i-a trimis **${suma} Coins** lui ${user}!`);
    }
    if (commandName === 'rob') {
        const user = options.getUser('utilizator'); if (user.id === interaction.user.id || getBalance(user.id) < 200) return interaction.reply({ content: '❌ Imposibil de jefuit!', ephemeral: true });
        if (Math.random() < 0.45) {
            const furat = Math.floor(Math.random() * (getBalance(user.id) * 0.25)) + 50; addBalance(interaction.user.id, furat); addBalance(user.id, -furat);
            return interaction.reply(`🥷 **Jaf reușit!** ${interaction.user} a fugit cu **${furat} Coins** de la ${user}!`);
        } else {
            addBalance(interaction.user.id, -150); addBalance(CONFIG.OWNER_ID, 150); 
            return interaction.reply(`🚨 **Prins în fapt!** ${interaction.user} a fost reținut. Amenda de **150 Coins** pleacă la fisc.`);
        }
    }
    if (commandName === 'dice') {
        return interaction.reply(`🎲 Zaruri: **${Math.floor(Math.random() * 6) + 1}** și **${Math.floor(Math.random() * 6) + 1}**.`);
    }
    if (commandName === 'clear') {
        const amount = options.getInteger('cantitate'); await interaction.channel.bulkDelete(amount, true); return interaction.reply({ content: `🧹 Am sters ${amount} mesaje.`, ephemeral: true });
    }
    if (commandName === 'lock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }); return interaction.reply('🔒 Canal blocat.'); }
    if (commandName === 'unlock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }); return interaction.reply('🔓 Canal deblocat.'); }
    if (commandName === 'timeout') {
        const member = options.getMember('membru'); const minutes = options.getInteger('minute'); const reason = options.getString('motiv') || 'Fara motiv';
        await member.timeout(minutes * 60 * 1000, reason); addSanction(member.id, 'TIMEOUT', `${minutes}m - ${reason}`, interaction.user.tag); return interaction.reply({ content: `⏱️ ${member.user.tag} a primit timeout.` });
    }
    if (commandName === 'untimeout') { const member = options.getMember('membru'); await member.timeout(null); return interaction.reply({ content: `✅ Timeout scos.` }); }
    if (commandName === 'warn') { const member = options.getMember('membru'); addSanction(member.id, 'WARN', options.getString('motiv') || 'Fara motiv', interaction.user.tag); return interaction.reply({ content: `⚠️ Utilizator avertizat.` }); }
    if (commandName === 'kick') { const member = options.getMember('membru'); await member.kick(); return interaction.reply({ content: `👢 Membru dat afară.` }); }
    if (commandName === 'ban') { const user = options.getUser('membru'); await interaction.guild.members.ban(user); return interaction.reply({ content: `🛑 Ban permanent aplicat.` }); }
    
    if (commandName === 'mark') {
        const user = options.getUser('utilizator'); const member = interaction.guild.members.cache.get(user.id); if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(() => {});
        addSanction(user.id, 'MARK SCAMMER', options.getString('motiv'), interaction.user.tag); return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`# 🚨 Scammer Marcat: ${user}`)] });
    }
    if (commandName === 'suspect') {
        const user = options.getUser('utilizator'); const member = interaction.guild.members.cache.get(user.id); if (member) await member.roles.add(CONFIG.SUSPECT_ROLE_ID).catch(() => {});
        addSanction(user.id, 'SUSPECT HACK', options.getString('motiv'), interaction.user.tag); return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE67E22).setDescription(`# 🚨 Suspect Marcat: ${user}`)] });
    }
    if (commandName === 'supportpanel') {
        const embed = new EmbedBuilder().setTitle('⚔️ Visium Panel').setColor(0x1ABC9C).setDescription('Alege tipul ticketului din meniul de mai jos:');
        const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Alege >').addOptions([{ label: 'Support', value: 'support', emoji: '🎒' }, { label: 'Purchase', value: 'purchase', emoji: '💸' }]));
        await interaction.channel.send({ embeds: [embed], components: [row] }); return interaction.reply({ content: '✅ Panou generat!', ephemeral: true });
    }
    if (commandName === 'check') {
        const targetUser = options.getUser('utilizator'); const totalVouches = (vouches.get(targetUser.id) || []).filter(v => v.status === 'accepted').length;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🛡️ Verificare Securitate`).setColor(0x2ECC71).addFields({ name: '👤 Cont', value: `${targetUser}`, inline: true }, { name: '📈 Vouch-uri aprobate', value: `\`${totalVouches}\``, inline: true })] });
    }
    if (commandName === 'daily') {
        const cd = 24 * 60 * 60 * 1000; const last = lastDaily.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Cooldown activ!`, ephemeral: true });
        lastDaily.set(interaction.user.id, Date.now()); addBalance(interaction.user.id, 500); return interaction.reply(`🪙 Ai primit **500 Visium Coins**!`);
    }
    if (commandName === 'work') {
        const cd = 30 * 60 * 1000; const last = lastWork.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Cooldown active!`, ephemeral: true });
        lastWork.set(interaction.user.id, Date.now()); const c = Math.floor(Math.random() * 200) + 50; addBalance(interaction.user.id, c); return interaction.reply(`💼 Ai muncit și ai primit **${c} Coins**!`);
    }
    if (commandName === 'balance') {
        const target = options.getUser('utilizator') || interaction.user; return interaction.reply(`👛 ${target} deține: **${getBalance(target.id)} Visium Coins**.`);
    }
    if (commandName === 'coinflip') {
        const suma = options.getInteger('suma'); const alegere = options.getString('alegere');
        if (suma <= 0 || getBalance(interaction.user.id) < suma) return interaction.reply({ content: '❌ Sumă invalidă!', ephemeral: true });
        const sause = Math.random() < 0.5 ? 'cap' : 'pajura';
        if (alegere === sause) { addBalance(interaction.user.id, suma); return interaction.reply(`🎰 A picat **${sause.toUpperCase()}**! Ai câștigat \`${suma * 2}\` monede!`); }
        else { addBalance(interaction.user.id, -suma); addBalance(CONFIG.OWNER_ID, suma); return interaction.reply(`🎰 A picat **${sause.toUpperCase()}**... Ai pierdut \`${suma}\` monede.`); }
    }
});

// MESSAGE CREATE (TAG/PING RESPONSES & PREFIX COMMANDS)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return;

    // 🎯 RĂSPUNS INSTANT LA TAG (PING)
    if (message.mentions.has(client.user) && !message.mentions.everyone) {
        if (!message.content.startsWith('+')) {
            return message.reply('hei,cu ce te pot ajuta?');
        }
    }

    // LOGICA AFK
    if (afkUsers.has(message.author.id)) { afkUsers.delete(message.author.id); message.reply('👋 Bine ai revenit! Starea AFK oprită.').then(m => setTimeout(() => m.delete().catch(() => {}), 4000)); }
    if (message.mentions.users.size > 0) { message.mentions.users.forEach(user => { if (afkUsers.has(user.id)) message.reply(`💤 **${user.username}** este AFK: *${afkUsers.get(user.id)}*`); }); }

    const args = message.content.split(' '); const cmd = args[0].toLowerCase();

    // COMÊNZI SOCIALE (HUG, KISS, SLAP)
    if (cmd === '+hug') {
        const target = message.mentions.users.first(); if (!target) return message.reply('❌ Menționează pe cineva pentru îmbrățișare!');
        return message.reply(`🤗 **${message.author.username}** l-a strâns puternic în brațe pe **${target.username}**! Ce drăguț! ❤️`);
    }
    if (cmd === '+kiss') {
        const target = message.mentions.users.first(); if (!target) return message.reply('❌ Menționează persoana pe care vrei să o săruți!');
        return message.reply(`💋 **${message.author.username}** i-a oferit un sărut dulce lui **${target.username}**! 💖`);
    }
    if (cmd === '+slap') {
        const target = message.mentions.users.first(); if (!target) return message.reply('❌ Menționează pe cineva pentru a-i da o palmă!');
        return message.reply(`💥 **${message.author.username}** i-a tras o palmă sonoră lui **${target.username}**! Auci! 💀`);
    }

    // RELAȚII
    if (cmd === '+marry') {
        const target = message.mentions.users.first(); if (!target || target.id === message.author.id || marriages.has(message.author.id) || marriages.has(target.id)) return message.reply('❌ Căsătorie imposibilă sau ești deja ocupat/ă!');
        marriages.set(message.author.id, target.id); marriages.set(target.id, message.author.id); return message.reply(`💖 **Căsătorie oficială!** ${message.author} s-a căsătorit cu ${target}! 🎉`);
    }
    if (cmd === '+divorce') {
        if (!marriages.has(message.author.id)) return message.reply('❌ Nu ești căsătorit/ă!');
        const ex = marriages.get(message.author.id); marriages.delete(message.author.id); marriages.delete(ex); return message.reply(`💔 Relația dintre ${message.author} și <@${ex}> s-a destrămat.`);
    }

    // CAZINO COMANDE PREFIX (+v slots / +v bj)
    if (cmd === '+v') {
        const subcmd = args[1]?.toLowerCase(); const suma = parseInt(args[2]);
        if (!subcmd || isNaN(suma) || suma <= 0 || getBalance(message.author.id) < suma) return message.reply('❌ Parametri invalizi cazinou sau bani insuficienți!');

        if (subcmd === 'slots') {
            const items = ['🍒', '🍋', '🍇', '💎', '🎰'];
            const r1 = items[Math.floor(Math.random() * items.length)]; const r2 = items[Math.floor(Math.random() * items.length)]; const r3 = items[Math.floor(Math.random() * items.length)];
            let mult = 0; if (r1 === r2 && r2 === r3) mult = r1 === '🎰' ? 5 : 3.5; else if (r1 === r2 || r2 === r3 || r1 === r3) mult = 1.5;

            if (mult > 0) { addBalance(message.author.id, Math.floor(suma * mult) - suma); return message.reply(`🎰 **[SLOTS]** | [ ${r1} | ${r2} | ${r3} ]\n🎉 Câștig! Ai primit **${Math.floor(suma * mult)} Coins**!`); }
            else { addBalance(message.author.id, -suma); addBalance(CONFIG.OWNER_ID, suma); return message.reply(`🎰 **[SLOTS]** | [ ${r1} | ${r2} | ${r3} ]\n😭 Pierdere! Ai pierdut **${suma} Coins**.`); }
        }

        if (subcmd === 'bj' || subcmd === 'blackjack') {
            if (activeBlackjack.has(message.author.id)) return message.reply('❌ Ai deja un meci activ!');
            const pHand = [drawCard(), drawCard()]; const dHand = [drawCard(), drawCard()];
            if (getScore(pHand) === 21) { addBalance(message.author.id, Math.floor(suma * 1.5)); return message.reply(`🃏 **[BLACKJACK]** Natural 21! Câștigat instant **${Math.floor(suma * 1.5)} Coins**!`); }
            activeBlackjack.set(message.author.id, { bet: suma, pHand, dHand });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`bj_hit_${message.author.id}`).setLabel('Hit').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`bj_stand_${message.author.id}`).setLabel('Stand').setStyle(ButtonStyle.Danger));
            return message.reply({ embeds: [new EmbedBuilder().setTitle('🃏 Blackjack Măsuță').setColor(0x2ECC71).setDescription(`Miză: **${suma}**`).addFields({ name: '🫵 Scor tău', value: `Carduri: [${pHand.join(', ')}]`, inline: true }, { name: '🤖 Dealer', value: `Card: [${dHand[0]}, ?]`, inline: true })], components: [row] });
        }
    }

    if (cmd === '+vouch') {
        const target = message.mentions.users.first(); if (!target || target.id === message.author.id) return message.reply('❌ User greșit!');
        const comment = args.slice(2).join(' ') || 'Fara comentariu'; const vc = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('vouch_accept').setLabel('Accept').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('vouch_reject').setLabel('Reject').setStyle(ButtonStyle.Danger));
        const m = await vc.send({ embeds: [new EmbedBuilder().setTitle('📩 Vouch Nou').setDescription(`De la: ${message.author}\nPentru: ${target}\nComentariu: ${comment}`)], components: [row] });
        pendingVouches.set(m.id, { targetId: target.id, authorName: message.author.username, comment: comment }); return message.reply(`📩 Trimis spre verificare staff.`);
    }

    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author; const acceptate = (vouches.get(target.id) || []).filter(v => v.status === 'accepted').length;
        return message.reply({ content: `# 👤 Profil - ${target.username}\n👛 Balanță: \`${getBalance(target.id)} Coins\`\n✅ Vouch-uri: \`${acceptate}\`\n💍 Căsătorit cu: ${marriages.has(target.id) ? `<@${marriages.get(target.id)}>` : 'Nimeni'}` });
    }
});

client.login(process.env.TOKEN);
    
