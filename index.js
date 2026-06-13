const http = require('http');
// Render injectează portul în procesul.env.PORT
const port = process.env.PORT || 10000; 
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
}).listen(port, () => {
  console.log(`Server HTTP pornit pe portul ${port}`);
});
client.on('messageCreate', async (message) => {
    // 1. Ignoră mesajele boților și mesajele care nu încep cu "+"
    if (message.author.bot || !message.content.startsWith('+')) return;

    // 2. Prevenție: procesează doar dacă mesajul este exact comanda
    const args = message.content.trim().split(/ +/);
    const commandName = args[0].toLowerCase();

    // Folosim if-uri simple pentru a evita duplicarea
    if (commandName === '+p') {
        return message.reply(`Profilul lui ${args[1] || message.author.username} este gata! (Sistem Vouch activ)`);
    }
    
    if (commandName === '+vouch') {
        // ... logica ta de vouch
    }
    // ... restul comenzilor
});
