// ... (restul importurilor și definirea clientului)

client.on('messageCreate', async (message) => {
    // 1. Prevenție: procesează doar dacă mesajul începe cu '+'
    if (message.author.bot || !message.content.startsWith('+')) return;
    
    // 2. Prevenție duplicare: folosim un singur bloc pentru +p
    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        
        const profileEmbed = new EmbedBuilder()
            .setTitle(`Profilul lui ${user.username}`)
            .setColor("#0099ff")
            .setDescription(`**ID:** ${user.id}\n**Creat:** 3 luni în urmă`) // Aici poți adăuga logica reală de calcul
            .addFields(
                { name: "ℹ️ Informații Vouch", value: "🟢 Vouch-uri acceptate: 0\n🔴 Vouch-uri refuzate: 0\n⏳ Ultimele 7 zile: 0\n✅ Total exchanged: 0€\n🏆 Leaderboard: #23" },
                { name: "🏅 Badge-uri", value: "❌ Fără badge-uri încă" },
                { name: "📝 Ultimele comentarii", value: "❌ Nu există comentarii încă." }
            )
            .setFooter({ text: "Siropel bot" });

        // Folosim reply o singură dată
        return message.reply({ embeds: [profileEmbed] });
    }
    
    // ... (restul comenzilor +vouch, etc.)
});
