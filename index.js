const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738'; // Canalul unde se trimit cererile
const STAFF_ROLE_ID = '1490701828831052027';

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Sistem Vouch
    if (message.content.startsWith('+vouch')) {
        const args = message.content.split(' ');
        const destinatar = message.mentions.users.first();
        const comentariu = args.slice(2).join(' ');

        // Verifică dacă există destinatar și comentariu
        if (!destinatar || !comentariu) {
            return message.reply({
                content: "↗️ Scrie și comentariul vouch-ului.\nExemplu: `+vouch @user 24€ LTC to MM`"
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("🔔 Vouch Nou")
            .setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${destinatar}\n\n**Comentariu:**\n\`${comentariu}\``)
            .setColor("#FFD700");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_deny').setLabel('Respinge').setStyle(ButtonStyle.Danger)
        );

        const logChannel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
        if (logChannel) {
            await logChannel.send({ embeds: [embed], components: [row] });
            await message.reply("🟢 Vouch-ul a fost primit și așteaptă să fie acceptat de un owner/admin.");
        }
    }
});

client.on('interactionCreate', async i => {
    if (i.isButton()) {
        if (i.customId === 'v_accept' || i.customId === 'v_deny') {
            // Verificare permisiuni
            if (!i.member.roles.cache.has(STAFF_ROLE_ID)) {
                return i.reply({ content: "Nu ai permisiuni!", ephemeral: true });
            }

            const embedVechi = i.message.embeds[0];
            const esteAcceptat = i.customId === 'v_accept';
            
            const embedNou = new EmbedBuilder()
                .setTitle(esteAcceptat ? "✅ Vouch Aprobat" : "❌ Vouch Respins")
                .setDescription(`${embedVechi.description}\n\n**Statut:**\nAcceptat de: ${i.user}`)
                .setColor(esteAcceptat ? "#00FF00" : "#FF0000");

            await i.update({ embeds: [embedNou], components: [] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
