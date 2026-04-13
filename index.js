const { Telegraf, Markup } = require('telegraf');
const http = require('http');

// Render Status 1 Error Fix - এটি ডিলিট করবেন না
http.createServer((req, res) => {
  res.write("Bot is running perfectly and securely!");
  res.end();
}).listen(process.env.PORT || 8080);

// --- কনফিগারেশন (আপনার নতুন টোকেন এখানে আপডেট করা হয়েছে) ---
const BOT_TOKEN = '7793480093:AAGGYBDV6zBOr5k2Z-HkdWqYGZDUQGId0G8'; 
const ADMIN_ID = 8534308595; 
const BKASH_NUMBER = '01741374715'; 
const NAGAD_NUMBER = '01741374715'; 

const bot = new Telegraf(BOT_TOKEN);

// ডাটাবেস (মেমোরি)
let users = {}; 
let products = []; 
let photos = []; 
let videos = []; 

// অ্যাডমিন স্টেট ম্যানেজমেন্ট
let adminState = { type: null, fileId: null };

// --- মেইন মেনু UI ---
function getMainMenu(u) {
  const msg = `╔════════════════════╗\n` +
              `       🏪 **গ্রুপ কিনার শপ**\n` +
              `╚════════════════════╝\n\n` +
              `👋 **স্বাগতম,** ${u.name}!\n\n` +
              `👤 **আইডি:** \`${u.id}\`\n` +
              `💰 **ব্যালেন্স:** ${u.balance.toFixed(2)} TK\n` +
              `💸 **মোট খরচ:** ${u.spent.toFixed(2)} TK\n\n` +
              `📢 **নিচের বাটন থেকে আপনার সেবাটি বেছে নিন:**`;
  
  return {
    text: msg,
    extra: Markup.inlineKeyboard([
      [Markup.button.callback('👉🏻 গ্রুপ কিনুন 👈🏻', 'shop')],
      [Markup.button.callback('💳 টাকা অ্যাড করুন', 'deposit'), Markup.button.callback('👤 প্রোফাইল', 'profile')],
      [Markup.button.callback('🎁 রেফার', 'refer'), Markup.button.callback('📊 হিস্টোরি', 'history')],
      [Markup.button.url('📞 সাপোর্ট টিম', 'https://t.me/mdnahidranaa')],
      [Markup.button.callback('🥵 ফটো কালেকশন 🥵', 'photo_collection')],
      [Markup.button.callback('💋 প্রিমিয়াম ভিডিও 💋', 'video_collection')]
    ])
  };
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  if (!users[userId]) {
    users[userId] = { id: userId, name: ctx.from.first_name, balance: 0.0, spent: 0.0, state: null };
  }
  const menu = getMainMenu(users[userId]);
  await ctx.replyWithMarkdown(menu.text, menu.extra);
});

// --- ফাইল আপলোড এবং দাম সেট করা (অ্যাডমিন) ---
bot.on(['photo', 'video'], async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    if (ctx.message.photo) {
        adminState.fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        adminState.type = 'photo';
    } else {
        adminState.fileId = ctx.message.video.file_id;
        adminState.type = 'video';
    }
    
    await ctx.reply(`📩 আপনি একটি ${adminState.type} পাঠিয়েছেন। এটার দাম কত টাকা হবে? শুধু সংখ্যাটি লিখুন।`);
});

bot.on('text', async (ctx) => {
    const u = users[ctx.from.id];
    if (!u) return;

    // অ্যাডমিন দ্বারা দাম সেট করা
    if (ctx.from.id === ADMIN_ID && adminState.fileId) {
        const price = parseFloat(ctx.message.text);
        if (isNaN(price)) return ctx.reply('❌ সঠিক দাম লিখুন।');
        
        const newItem = { id: Math.floor(100 + Math.random() * 899), fileId: adminState.fileId, price: price };
        
        if (adminState.type === 'photo') photos.push(newItem);
        else videos.push(newItem);
        
        ctx.reply(`✅ সফলভাবে ${price} টাকায় ${adminState.type} অ্যাড হয়েছে!`);
        adminState = { type: null, fileId: null };
        return;
    }

    // অ্যাডমিন কমান্ড: ইউজার প্রোফাইল চেক
    if (ctx.message.text.startsWith('/user') && ctx.from.id === ADMIN_ID) {
        const targetId = ctx.message.text.split(' ')[1];
        if (users[targetId]) {
            const info = users[targetId];
            return ctx.reply(`👤 **ইউজার প্রোফাইল**\n\n📝 নাম: ${info.name}\n🆔 আইডি: \`${info.id}\`\n💰 ব্যালেন্স: ${info.balance.toFixed(2)} TK\n💸 মোট খরচ: ${info.spent.toFixed(2)} TK`);
        } else {
            return ctx.reply('❌ ইউজার পাওয়া যায়নি।');
        }
    }

    // প্রোডাক্ট অ্যাড কমান্ড
    if (ctx.message.text.startsWith('/addproduct') && ctx.from.id === ADMIN_ID) {
        const args = ctx.message.text.split(' ');
        if (args.length < 4) return ctx.reply('সঠিক নিয়ম: /addproduct নাম দাম লিঙ্ক');
        const name = args[1].replace(/_/g, ' '); 
        const price = parseFloat(args[2]);
        const content = args[3];
        const newId = Math.floor(1000 + Math.random() * 9000);
        products.push({ id: newId, name, price, content });
        return ctx.reply(`✅ গ্রুপ অ্যাড হয়েছে। ID: ${newId}`);
    }

    // ডিপোজিট রিকোয়েস্ট হ্যান্ডেলার
    if (u.state === 'waiting_deposit_amount') {
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) return ctx.reply('❌ সঠিক সংখ্যা লিখুন।');
        u.state = null;
        await bot.telegram.sendMessage(ADMIN_ID, `🆕 **ডিপোজিট রিকোয়েস্ট!**\n🆔 আইডি: \`${ctx.from.id}\`\n💰 পরিমাণ: ${amount} TK`, {
            ...Markup.inlineKeyboard([[Markup.button.callback('✅ Approve', `app_${ctx.from.id}_${amount}`)], [Markup.button.callback('❌ Reject', `rej_${ctx.from.id}`)]])
        });
        return ctx.reply('✅ রিকোয়েস্ট পাঠানো হয়েছে।');
    }
});

// --- কালেকশন ডিসপ্লে ---
bot.action('photo_collection', (ctx) => {
    if (photos.length === 0) return ctx.answerCbQuery('❌ বর্তমানে কোনো ফটো নেই!', {show_alert: true});
    let btns = photos.map(p => [Markup.button.callback(`🖼️ ফটো #${p.id} ➥ ${p.price} TK`, `buyf_photo_${p.id}`)]);
    btns.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    ctx.editMessageText('🥵 **ফটো কালেকশন** 🥵', Markup.inlineKeyboard(btns));
});

bot.action('video_collection', (ctx) => {
    if (videos.length === 0) return ctx.answerCbQuery('❌ বর্তমানে কোনো ভিডিও নেই!', {show_alert: true});
    let btns = videos.map(v => [Markup.button.callback(`📽️ ভিডিও #${v.id} ➥ ${v.price} TK`, `buyf_video_${v.id}`)]);
    btns.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    ctx.editMessageText('💋 **প্রিমিয়াম ভিডিও** 💋', Markup.inlineKeyboard(btns));
});

// --- কেনা এবং সেল নোটিশ লজিক ---
bot.action(/buyf_(photo|video)_(\d+)/, async (ctx) => {
    const type = ctx.match[1];
    const id = parseInt(ctx.match[2]);
    const list = type === 'photo' ? photos : videos;
    const item = list.find(i => i.id === id);
    const u = users[ctx.from.id];

    if (u && item && u.balance >= item.price) {
        u.balance -= item.price;
        u.spent += item.price;
        if (type === 'photo') await ctx.replyWithPhoto(item.fileId, { caption: "✅ আপনার কেনা ফটো!" });
        else await ctx.replyWithVideo(item.fileId, { caption: "✅ আপনার কেনা ভিডিও!" });
        
        ctx.answerCbQuery('কেনা সফল!');
        // সুন্দর সেল নোটিশ
        const adminMsg = `💰 **নতুন সেল! (${type})**\n👤 ইউজার: ${u.name}\n🆔 আইডি: \`${u.id}\`\n💸 দাম: ${item.price} TK`;
        bot.telegram.sendMessage(ADMIN_ID, adminMsg, { parse_mode: 'Markdown' });
    } else {
        ctx.answerCbQuery('❌ পর্যাপ্ত ব্যালেন্স নেই!', {show_alert: true});
    }
});

bot.action(/buy_(\d+)/, async (ctx) => {
  const pId = parseInt(ctx.match[1]);
  const product = products.find(p => p.id === pId);
  const u = users[ctx.from.id];
  if (u && product && u.balance >= product.price) {
    u.balance -= product.price;
    u.spent += product.price;
    await ctx.reply(`🎉 **কেনা সফল!**\n🎁 লিঙ্ক: ${product.content}`);
    const adminMsg = `💰 **নতুন সেল!**\n👤 ইউজার: ${u.name}\n🆔 আইডি: \`${u.id}\`\n📦 প্রোডাক্ট: ${product.name}\n💸 দাম: ${product.price} TK`;
    bot.telegram.sendMessage(ADMIN_ID, adminMsg, { parse_mode: 'Markdown' });
  } else {
    await ctx.answerCbQuery('❌ ব্যালেন্স নেই!', { show_alert: true });
  }
});

// --- অন্যান্য বাটন লজিক ---
bot.action('shop', async (ctx) => {
    if (products.length === 0) return ctx.answerCbQuery('❌ কোনো প্রোডাক্ট নেই!');
    let buttons = products.map(p => [Markup.button.callback(`🔹 ${p.name} ➥ ${p.price} TK`, `confirm_${p.id}`)]);
    buttons.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    await ctx.editMessageText('🛍️ আমাদের গ্রুপ কালেকশন:', Markup.inlineKeyboard(buttons));
});

bot.action(/confirm_(\d+)/, async (ctx) => {
    const pId = ctx.match[1];
    await ctx.editMessageText('⚠️ আপনি কি নিশ্চিত?', Markup.inlineKeyboard([[Markup.button.callback('✅ হ্যাঁ', `buy_${pId}`)], [Markup.button.callback('❌ না', 'shop')]]));
});

bot.action('deposit', (ctx) => ctx.editMessageText(`💰 পেমেন্ট মেথড:\nবিকাশ/নগদ: ${BKASH_NUMBER}`, Markup.inlineKeyboard([[Markup.button.callback('📩 রিকোয়েস্ট পাঠান', 'req_deposit')], [Markup.button.callback('🔙 মেনু', 'main_menu')]])));
bot.action('req_deposit', (ctx) => { users[ctx.from.id].state = 'waiting_deposit_amount'; ctx.reply('💰 কত টাকা পাঠিয়েছেন?'); });
bot.action('main_menu', async (ctx) => { const u = users[ctx.from.id]; const menu = getMainMenu(u); await ctx.editMessageText(menu.text, { parse_mode: 'Markdown', ...menu.extra }); });
bot.action('profile', async (ctx) => { const u = users[ctx.from.id]; await ctx.editMessageText(`👤 **প্রোফাইল**\n\n🆔 আইডি: \`${u.id}\`\n💰 ব্যালেন্স: ${u.balance.toFixed(2)} TK`, Markup.inlineKeyboard([[Markup.button.callback('🔙 ফিরে যান', 'main_menu')]])); });

bot.launch();
console.log("বটটি নতুন টোকেন সহ পুরোপুরি সচল!");
