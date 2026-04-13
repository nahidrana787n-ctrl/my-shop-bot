const { Telegraf, Markup } = require('telegraf');
const http = require('http');

// Render Status 1 Error Fix
http.createServer((req, res) => {
  res.write("Bot is running perfectly and securely!");
  res.end();
}).listen(process.env.PORT || 8080);

// --- কনফিগারেশন ---
const BOT_TOKEN = '7793480093:AAGGYBDV6zBOr5k2Z-HkdWqYGZDUQGId0G8'; 
const ADMIN_ID = 8534308595; 
const BKASH_NUMBER = '01741374715'; 
const NAGAD_NUMBER = '01741374715'; 

const bot = new Telegraf(BOT_TOKEN);

// ডাটাবেস
let users = {}; 
let products = []; 
let photos = []; 
let videos = []; 

// অ্যাডমিন স্টেট
let adminUploads = { type: null, files: [], timer: null, waitingPrice: false };
let noticeState = { waiting: false };

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
      [Markup.button.callback('🥵 ফটো কালেকশন 🥵', 'photo_collection')],
      [Markup.button.callback('💋 প্রিমিয়াম ভিডিও 💋', 'video_collection')],
      [Markup.button.url('📞 সাপোর্ট টিম', 'https://t.me/mdnahidranaa')]
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

// --- অ্যাডমিন ফাইল আপলোড লজিক (১০ সেকেন্ড) ---
bot.on(['photo', 'video'], async (ctx) => {
    if (ctx.from.id !== ADMIN_ID || noticeState.waiting) return;

    const fileId = ctx.message.photo ? ctx.message.photo[ctx.message.photo.length - 1].file_id : ctx.message.video.file_id;
    const type = ctx.message.photo ? 'photo' : 'video';

    if (adminUploads.timer) clearTimeout(adminUploads.timer);
    adminUploads.type = type;
    adminUploads.files.push(fileId);

    adminUploads.timer = setTimeout(async () => {
        await ctx.reply(`📩 আপনি ${adminUploads.files.length}টি ${adminUploads.type} পাঠিয়েছেন।\n\nসবগুলো মিলে একসাথ করে একটি প্যাকের দাম কত হবে? শুধু সংখ্যা লিখুন।`);
        adminUploads.waitingPrice = true;
    }, 10000);
});

bot.on('text', async (ctx) => {
    const u = users[ctx.from.id];
    if (!u) return;

    // ১ ক্লিকে নোটিশ পাঠানো
    if (ctx.from.id === ADMIN_ID && ctx.message.text === '/sendnotice') {
        noticeState.waiting = true;
        return ctx.reply('📢 সব ইউজারকে কি পাঠাতে চান? (মেসেজ/ফটো/ভিডিও দিন)');
    }
    if (ctx.from.id === ADMIN_ID && noticeState.waiting) {
        noticeState.waiting = false;
        const allUsers = Object.keys(users);
        allUsers.forEach(userId => {
            bot.telegram.copyMessage(userId, ctx.from.id, ctx.message.message_id).catch(() => {});
        });
        return ctx.reply(`✅ নোটিশ পাঠানো হয়েছে।`);
    }

    // দাম সেট করা
    if (ctx.from.id === ADMIN_ID && adminUploads.waitingPrice) {
        const price = parseFloat(ctx.message.text);
        if (isNaN(price)) return ctx.reply('❌ সঠিক দাম লিখুন।');
        const newItem = { id: Math.floor(100 + Math.random() * 899), files: [...adminUploads.files], price: price, type: adminUploads.type };
        if (adminUploads.type === 'photo') photos.push(newItem);
        else videos.push(newItem);
        ctx.reply(`✅ ${price} টাকায় প্যাকটি অ্যাড হয়েছে!`);
        adminUploads = { type: null, files: [], timer: null, waitingPrice: false };
        return;
    }

    // অ্যাডমিন কমান্ড: ইউজার চেক
    if (ctx.message.text.startsWith('/user') && ctx.from.id === ADMIN_ID) {
        const targetId = ctx.message.text.split(' ')[1];
        if (users[targetId]) {
            const info = users[targetId];
            return ctx.reply(`👤 **ইউজার প্রোফাইল**\n\n📝 নাম: ${info.name}\n🆔 আইডি: \`${info.id}\`\n💰 ব্যালেন্স: ${info.balance.toFixed(2)} TK\n💸 মোট খরচ: ${info.spent.toFixed(2)} TK`);
        }
    }

    // প্রোডাক্ট অ্যাড কমান্ড
    if (ctx.message.text.startsWith('/addproduct') && ctx.from.id === ADMIN_ID) {
        const args = ctx.message.text.split(' ');
        if (args.length < 4) return ctx.reply('সঠিক নিয়ম: /addproduct নাম দাম লিঙ্ক');
        const name = args[1].replace(/_/g, ' '); 
        const price = parseFloat(args[2]);
        const content = args[3];
        products.push({ id: Math.floor(1000 + Math.random() * 9000), name, price, content });
        return ctx.reply(`✅ '${name}' অ্যাড হয়েছে।`);
    }

    // ডিপোজিট রিকোয়েস্ট
    if (u.state === 'waiting_deposit_amount') {
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) return ctx.reply('❌ সঠিক সংখ্যা লিখুন।');
        u.state = null;
        await bot.telegram.sendMessage(ADMIN_ID, `🆕 **ডিপোজিট রিকোয়েস্ট!**\n🆔 আইডি: \`${ctx.from.id}\`\n💰 পরিমাণ: ${amount} TK`, {
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Approve', `app_${ctx.from.id}_${amount}`)],
                [Markup.button.callback('❌ Reject', `rej_${ctx.from.id}`)]
            ])
        });
        return ctx.reply('✅ রিকোয়েস্ট পাঠানো হয়েছে।');
    }
});

// --- পেমেন্ট পেজ (আগের ডিজাইন) ---
bot.action('deposit', async (ctx) => {
  const depMsg = `💎 **পেমেন্ট মেথড সিলেক্ট করুন** 💎\n\n` +
                 `📣 **বিকাশ (Personal):**\n` +
                 `└─ \`${BKASH_NUMBER}\` 📲\n\n` +
                 `📣 **নগদ (Personal):**\n` +
                 `└─ \`${NAGAD_NUMBER}\` 📲\n\n` +
                 `🆔 আপনার আইডি: \`${ctx.from.id}\``;
  await ctx.editMessageText(depMsg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('📩 ডিপোজিট রিকোয়েস্ট পাঠান', 'req_deposit')], [Markup.button.callback('🔙 ফিরে যান', 'main_menu')]]) });
});

// --- প্রোডাক্ট কনফার্মেশন পেজ (আগের ডিজাইন) ---
bot.action(/confirm_(\d+)/, async (ctx) => {
  const pId = parseInt(ctx.match[1]);
  const product = products.find(p => p.id === pId);
  if (!product) return;
  await ctx.editMessageText(`⚠️ **আপনি কি নিশ্চিত?**\n\n📦 গ্রুপ: ${product.name}\n💰 মূল্য: ${product.price} TK`, {
    parse_mode: 'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ হ্যাঁ, কিনব', `buy_${pId}`)],
      [Markup.button.callback('❌ না, বাতিল', 'shop')]
    ])
  });
});

// --- কেনা ও সেল নোটিশ লজিক ---
bot.action(/buy_(\d+)/, async (ctx) => {
  const pId = parseInt(ctx.match[1]);
  const product = products.find(p => p.id === pId);
  const u = users[ctx.from.id];
  if (u && product && u.balance >= product.price) {
    u.balance -= product.price; u.spent += product.price;
    await ctx.reply(`🎉 **কেনা সফল!**\n🎁 লিঙ্ক: ${product.content}`);
    bot.telegram.sendMessage(ADMIN_ID, `💰 **নতুন সেল!**\n👤 ইউজার: ${u.name}\n🆔 আইডি: \`${u.id}\`\n📦 প্রোডাক্ট: ${product.name}\n💸 দাম: ${product.price} TK`, { parse_mode: 'Markdown' });
  } else { await ctx.answerCbQuery('❌ পর্যাপ্ত ব্যালেন্স নেই!', { show_alert: true }); }
});

bot.action(/buyf_(photo|video)_(\d+)/, async (ctx) => {
    const type = ctx.match[1];
    const id = parseInt(ctx.match[2]);
    const list = type === 'photo' ? photos : videos;
    const item = list.find(i => i.id === id);
    const u = users[ctx.from.id];
    if (u && item && u.balance >= item.price) {
        u.balance -= item.price; u.spent += item.price;
        for (const fId of item.files) {
            if (type === 'photo') await ctx.replyWithPhoto(fId).catch(()=>{});
            else await ctx.replyWithVideo(fId).catch(()=>{});
        }
        ctx.answerCbQuery('সফল!');
        bot.telegram.sendMessage(ADMIN_ID, `💰 **নতুন সেল! (${type})**\n👤 ইউজার: ${u.name}\n💸 দাম: ${item.price} TK`, { parse_mode: 'Markdown' });
    } else { ctx.answerCbQuery('❌ ব্যালেন্স নেই!', { show_alert: true }); }
});

// --- মেনু বাটন লজিক ---
bot.action('shop', async (ctx) => {
    if (products.length === 0) return ctx.answerCbQuery('খালি!', {show_alert: true});
    let buttons = products.map(p => [Markup.button.callback(`🔹 ${p.name} ➥ ${p.price} TK`, `confirm_${p.id}`)]);
    buttons.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    await ctx.editMessageText('🛍️ আমাদের গ্রুপ কালেকশন:', Markup.inlineKeyboard(buttons));
});

bot.action('photo_collection', (ctx) => {
    if (photos.length === 0) return ctx.answerCbQuery('খালি!', {show_alert: true});
    let btns = photos.map(p => [Markup.button.callback(`🖼️ ফটো প্যাক #${p.id} ➥ ${p.price} TK`, `buyf_photo_${p.id}`)]);
    btns.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    ctx.editMessageText('🥵 **ফটো কালেকশন** 🥵', Markup.inlineKeyboard(btns));
});

bot.action('video_collection', (ctx) => {
    if (videos.length === 0) return ctx.answerCbQuery('খালি!', {show_alert: true});
    let btns = videos.map(v => [Markup.button.callback(`📽️ ভিডিও প্যাক #${v.id} ➥ ${v.price} TK`, `buyf_video_${v.id}`)]);
    btns.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    ctx.editMessageText('💋 **প্রিমিয়াম ভিডিও** 💋', Markup.inlineKeyboard(btns));
});

// ডিপোজিট রিকোয়েস্ট স্টার্ট
bot.action('req_deposit', (ctx) => { users[ctx.from.id].state = 'waiting_deposit_amount'; ctx.reply('💰 কত টাকা পাঠিয়েছেন? শুধু সংখ্যা লিখুন।'); });

// অ্যাডমিন অ্যাপ্রুভ লজিক (আগের মতো)
bot.action(/app_(\d+)_([\d.]+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const amount = parseFloat(ctx.match[2]);
    if (users[targetId]) {
        users[targetId].balance += amount;
        bot.telegram.sendMessage(targetId, `🎉 অভিনন্দন! ${amount} TK ডিপোজিট অ্যাপ্রুভ হয়েছে।`);
        ctx.editMessageText(`✅ আইডি ${targetId} এর জন্য ${amount} TK অ্যাপ্রুভ হয়েছে।`);
    }
});

bot.action('main_menu', async (ctx) => { const u = users[ctx.from.id]; const menu = getMainMenu(u); await ctx.editMessageText(menu.text, { parse_mode: 'Markdown', ...menu.extra }); });
bot.action('profile', async (ctx) => { const u = users[ctx.from.id]; await ctx.editMessageText(`👤 **প্রোফাইল**\n\n🆔 আইডি: \`${u.id}\`\n💰 ব্যালেন্স: ${u.balance.toFixed(2)} TK`, Markup.inlineKeyboard([[Markup.button.callback('🔙 ফিরে যান', 'main_menu')]])); });

bot.launch();
console.log("বটটি আগের সব লজিক ও স্টাইল সহ সচল আছে!");
