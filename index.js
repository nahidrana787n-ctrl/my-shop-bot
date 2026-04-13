const { Telegraf, Markup } = require('telegraf');
const http = require('http');

// Render Status 1 Error Fix - এটি ডিলিট করবেন না
http.createServer((req, res) => {
  res.write("Bot is running perfectly and securely!");
  res.end();
}).listen(process.env.PORT || 8080);

// --- কনফিগারেশন ---
const BOT_TOKEN = '7793480093:AAGGYBDV6zBOr5k2Z-HkdWqYGZDUQGId0G8'; 
const ADMIN_ID = 8534308595; 
const BKASH_NUMBER = '01741374715'; 
const NAGAD_NUMBER = '01741374715'; 
const REFER_BONUS = 5.0; // প্রতি রেফারে ৫ টাকা বোনাস

const bot = new Telegraf(BOT_TOKEN);

// ডাটাবেস (মেমোরি)
let users = {}; 
let products = []; 
let photos = []; 
let videos = []; 

// অ্যাডমিন স্টেট ম্যানেজমেন্ট
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

// স্টার্ট হ্যান্ডেলার (রেফার সিস্টেম সহ)
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const referrerId = ctx.startPayload; 

  if (!users[userId]) {
    users[userId] = { 
        id: userId, 
        name: ctx.from.first_name, 
        balance: 0.0, 
        spent: 0.0, 
        state: null, 
        history: [], 
        referredBy: null 
    };

    if (referrerId && users[referrerId] && referrerId != userId) {
        users[userId].referredBy = referrerId;
        users[referrerId].balance += REFER_BONUS;
        users[referrerId].history.push(`🎁 রেফার বোনাস: +${REFER_BONUS} TK`);
        bot.telegram.sendMessage(referrerId, `🎉 নতুন ইউজার যোগ হয়েছে! আপনি ${REFER_BONUS} TK রেফার বোনাস পেয়েছেন।`);
    }
  }
  
  const menu = getMainMenu(users[userId]);
  await ctx.replyWithMarkdown(menu.text, menu.extra);
});

// --- অ্যাডমিন ফাইল আপলোড (১০ সেকেন্ড লজিক) ---
bot.on(['photo', 'video'], async (ctx) => {
    if (ctx.from.id !== ADMIN_ID || noticeState.waiting) return;
    const fileId = ctx.message.photo ? ctx.message.photo[ctx.message.photo.length - 1].file_id : ctx.message.video.file_id;
    const type = ctx.message.photo ? 'photo' : 'video';

    if (adminUploads.timer) clearTimeout(adminUploads.timer);
    adminUploads.type = type;
    adminUploads.files.push(fileId);

    adminUploads.timer = setTimeout(async () => {
        await ctx.reply(`📩 আপনি ${adminUploads.files.length}টি ${adminUploads.type} পাঠিয়েছেন।\n\nসবগুলো মিলে একসাথ করে প্যাকের দাম কত হবে? শুধু সংখ্যা লিখুন।`);
        adminUploads.waitingPrice = true;
    }, 10000);
});

bot.on('text', async (ctx) => {
    const u = users[ctx.from.id];
    if (!u) return;

    if (ctx.from.id === ADMIN_ID && noticeState.waiting) {
        noticeState.waiting = false;
        Object.keys(users).forEach(id => bot.telegram.copyMessage(id, ctx.from.id, ctx.message.message_id).catch(()=>{}));
        return ctx.reply(`✅ নোটিশ পাঠানো হয়েছে।`);
    }

    if (ctx.from.id === ADMIN_ID && adminUploads.waitingPrice) {
        const price = parseFloat(ctx.message.text);
        if (isNaN(price)) return ctx.reply('❌ সঠিক দাম লিখুন।');
        const newItem = { id: Math.floor(100 + Math.random() * 899), files: [...adminUploads.files], price: price, type: adminUploads.type };
        if (adminUploads.type === 'photo') photos.push(newItem); else videos.push(newItem);
        ctx.reply(`✅ সফলভাবে অ্যাড হয়েছে!`);
        adminUploads = { type: null, files: [], timer: null, waitingPrice: false };
        return;
    }

    if (u.state === 'waiting_deposit_amount') {
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) return ctx.reply('❌ সঠিক সংখ্যা লিখুন।');
        u.state = null;
        await bot.telegram.sendMessage(ADMIN_ID, `🆕 **ডিপোজিট রিকোয়েস্ট!**\n🆔 আইডি: \`${ctx.from.id}\`\n💰 পরিমাণ: ${amount} TK`, {
            ...Markup.inlineKeyboard([[Markup.button.callback('✅ Approve', `app_${ctx.from.id}_${amount}`)], [Markup.button.callback('❌ Reject', `rej_${ctx.from.id}`)]])
        });
        return ctx.reply('✅ রিকোয়েস্ট পাঠানো হয়েছে।');
    }

    if (ctx.message.text === '/sendnotice' && ctx.from.id === ADMIN_ID) { noticeState.waiting = true; return ctx.reply('📢 নোটিশ হিসেবে যা পাঠাতে চান তা দিন:'); }
});

// --- ফটো ও ভিডিও কালেকশন (ফাইলের সংখ্যা সহ) ---
bot.action('photo_collection', (ctx) => {
    if (photos.length === 0) return ctx.answerCbQuery('খালি!', {show_alert: true});
    let btns = photos.map(p => [Markup.button.callback(`🖼️ ${p.files.length} টি ফটো ➥ ${p.price} TK`, `buyf_photo_${p.id}`)]);
    btns.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    ctx.editMessageText('🥵 **ফটো কালেকশন** 🥵', Markup.inlineKeyboard(btns));
});

bot.action('video_collection', (ctx) => {
    if (videos.length === 0) return ctx.answerCbQuery('খালি!', {show_alert: true});
    let btns = videos.map(v => [Markup.button.callback(`📽️ ${v.files.length} টি ভিডিও ➥ ${v.price} TK`, `buyf_video_${v.id}`)]);
    btns.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    ctx.editMessageText('💋 **প্রিমিয়াম ভিডিও** 💋', Markup.inlineKeyboard(btns));
});

// --- হিস্টোরি ও রেফার পেজ ---
bot.action('history', (ctx) => {
    const u = users[ctx.from.id];
    let h = u.history && u.history.length > 0 ? u.history.slice(-10).join('\n') : "কোনো হিস্টোরি নেই।";
    ctx.editMessageText(`📊 **আপনার শেষ ১০টি লেনদেন:**\n\n${h}`, Markup.inlineKeyboard([[Markup.button.callback('🔙 ফিরে যান', 'main_menu')]]));
});

bot.action('refer', (ctx) => {
    const link = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.editMessageText(`🎁 **রেফার ইনকাম**\n\nপ্রতি রেফারে পাবেন **${REFER_BONUS} TK**।\n\nআপনার লিংক:\n\`${link}\``, {
        parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 ফিরে যান', 'main_menu')]])
    });
});

// --- পেমেন্ট ও কনফার্মেশন (আগের স্টাইল অক্ষত) ---
bot.action('deposit', async (ctx) => {
  const depMsg = `💎 **পেমেন্ট মেথড সিলেক্ট করুন** 💎\n\n📣 **বিকাশ (Personal):**\n└─ \`${BKASH_NUMBER}\` 📲\n\n📣 **নগদ (Personal):**\n└─ \`${NAGAD_NUMBER}\` 📲\n\n🆔 আপনার আইডি: \`${ctx.from.id}\``;
  await ctx.editMessageText(depMsg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('📩 ডিপোজিট রিকোয়েস্ট পাঠান', 'req_deposit')], [Markup.button.callback('🔙 ফিরে যান', 'main_menu')]]) });
});

bot.action(/confirm_(\d+)/, async (ctx) => {
    const pId = ctx.match[1];
    const product = products.find(p => p.id == pId);
    await ctx.editMessageText(`⚠️ **আপনি কি নিশ্চিত?**\n\n📦 গ্রুপ: ${product.name}\n💰 মূল্য: ${product.price} TK`, {
        parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('✅ হ্যাঁ, কিনব', `buy_${pId}`)], [Markup.button.callback('❌ না, বাতিল', 'shop')]])
    });
});

// --- কেনা ও অ্যাপ্রুভ লজিক ---
bot.action(/buy_(\d+)/, async (ctx) => {
  const pId = parseInt(ctx.match[1]);
  const product = products.find(p => p.id === pId);
  const u = users[ctx.from.id];
  if (u && product && u.balance >= product.price) {
    u.balance -= product.price; u.spent += product.price;
    u.history.push(`💸 কেনা: ${product.name} (-${product.price} TK)`);
    await ctx.reply(`🎉 **কেনা সফল!**\n🎁 লিঙ্ক: ${product.content}`);
    bot.telegram.sendMessage(ADMIN_ID, `💰 **নতুন সেল!**\n👤 ইউজার: ${u.name}\n📦 প্রোডাক্ট: ${product.name}\n💸 দাম: ${product.price} TK`, { parse_mode: 'Markdown' });
  } else { await ctx.answerCbQuery('❌ ব্যালেন্স নেই!', { show_alert: true }); }
});

bot.action(/app_(\d+)_([\d.]+)/, async (ctx) => {
    const tId = ctx.match[1]; const amt = parseFloat(ctx.match[2]);
    if (users[tId]) {
        users[tId].balance += amt;
        users[tId].history.push(`💰 ডিপোজিট: +${amt} TK`);
        bot.telegram.sendMessage(tId, `🎉 অভিনন্দন! ${amt} TK ডিপোজিট অ্যাপ্রুভ হয়েছে।`);
        ctx.editMessageText(`✅ আইডি ${tId} এর জন্য ${amt} TK অ্যাপ্রুভ হয়েছে।`);
    }
});

// --- ফাইল প্যাক কেনা ---
bot.action(/buyf_(photo|video)_(\d+)/, async (ctx) => {
    const type = ctx.match[1];
    const item = (type === 'photo' ? photos : videos).find(i => i.id == ctx.match[2]);
    const u = users[ctx.from.id];
    if (u && item && u.balance >= item.price) {
        u.balance -= item.price; u.spent += item.price;
        u.history.push(`💸 কেনা: ${item.files.length} টি ${type} (-${item.price} TK)`);
        for (const fId of item.files) {
            if (type === 'photo') await ctx.replyWithPhoto(fId).catch(()=>{});
            else await ctx.replyWithVideo(fId).catch(()=>{});
        }
        ctx.answerCbQuery('সফল!');
        bot.telegram.sendMessage(ADMIN_ID, `💰 নতুন সেল: ${item.price} TK (ID: ${u.id})`);
    } else { ctx.answerCbQuery('❌ ব্যালেন্স নেই!', { show_alert: true }); }
});

// অন্যান্য (অক্ষত)
bot.action('shop', async (ctx) => {
    let buttons = products.map(p => [Markup.button.callback(`🔹 ${p.name} ➥ ${p.price} TK`, `confirm_${p.id}`)]);
    buttons.push([Markup.button.callback('🔙 ফিরে যান', 'main_menu')]);
    await ctx.editMessageText('🛍️ আমাদের গ্রুপ কালেকশন:', Markup.inlineKeyboard(buttons));
});
bot.action('req_deposit', (ctx) => { users[ctx.from.id].state = 'waiting_deposit_amount'; ctx.reply('💰 কত টাকা পাঠিয়েছেন?'); });
bot.action('main_menu', async (ctx) => { const u = users[ctx.from.id]; const menu = getMainMenu(u); await ctx.editMessageText(menu.text, { parse_mode: 'Markdown', ...menu.extra }); });
bot.action('profile', async (ctx) => { const u = users[ctx.from.id]; await ctx.editMessageText(`👤 **প্রোফাইল**\n\n🆔 আইডি: \`${u.id}\`\n💰 ব্যালেন্স: ${u.balance.toFixed(2)} TK`, Markup.inlineKeyboard([[Markup.button.callback('🔙 ফিরে যান', 'main_menu')]])); });

bot.launch();
