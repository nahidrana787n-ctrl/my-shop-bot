const { Telegraf, Markup } = require('telegraf');
const http = require('http');

// --- Render Status 1 Error Fix (এটি ডিলিট করবেন না) ---
http.createServer((req, res) => {
  res.write("Bot is running perfectly!");
  res.end();
}).listen(process.env.PORT || 8080);

// --- কনফিগারেশন ---
const BOT_TOKEN = '7793480093:AAF9WPdjr8TqP-y3pU8nv3ZKnwuDbALwW2k'; 
const ADMIN_ID = 8534308595; 
const BKASH_NUMBER = '01741374715'; 
const NAGAD_NUMBER = '01741374715'; 

const bot = new Telegraf(BOT_TOKEN);

// ডাটাবেস
let users = {}; 
let products = []; 

// --- মেসেজ ডিলিট ফাংশন ---
async function safeDelete(ctx) {
    try { await ctx.deleteMessage(); } catch (e) {}
}

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

bot.action('shop', async (ctx) => {
  if (products.length === 0) return ctx.answerCbQuery('❌ বর্তমানে কোনো প্রোডাক্ট নেই!', {show_alert: true});
  const shopHeader = `┏━━━━━━━🛍️━━━━━━━┓\n      **আমাদের গ্রুপ কালেকশন**\n┗━━━━━━━🛍️━━━━━━━┛`;
  let buttons = products.map(p => [Markup.button.callback(`🔹 [ID:${p.id}] ${p.name} ➥ ${p.price} TK`, `confirm_${p.id}`)]);
  buttons.push([Markup.button.callback('🔙 মেইন মেনু', 'main_menu')]);
  await ctx.editMessageText(shopHeader, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.action('deposit', async (ctx) => {
  const depMsg = `💎 **পেমেন্ট মেথড সিলেক্ট করুন** 💎\n\n` +
                 `📣 **বিকাশ (Personal):**\n` +
                 `└─ \`${BKASH_NUMBER}\` 📲\n\n` +
                 `📣 **নগদ (Personal):**\n` +
                 `└─ \`${NAGAD_NUMBER}\` 📲\n\n` +
                 `🆔 আপনার আইডি: \`${ctx.from.id}\``;
  await ctx.editMessageText(depMsg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📩 ডিপোজিট রিকোয়েস্ট পাঠান', 'req_deposit')],
      [Markup.button.callback('🔙 ফিরে যান', 'main_menu')]
    ])
  });
});

bot.action('req_deposit', async (ctx) => {
    users[ctx.from.id].state = 'waiting_deposit_amount';
    await ctx.reply('💰 কত টাকা পাঠিয়েছেন? শুধু সংখ্যাটি লিখুন।');
});

bot.on('text', async (ctx) => {
    const u = users[ctx.from.id];
    if (!u) return;

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

    if (ctx.message.text.startsWith('/addproduct') && ctx.from.id === ADMIN_ID) {
        const args = ctx.message.text.split(' ');
        if (args.length < 4) return ctx.reply('সঠিক নিয়ম: /addproduct নাম দাম লিঙ্ক');
        const name = args[1].replace(/_/g, ' '); 
        const price = parseFloat(args[2]);
        const content = args[3];
        const newId = Math.floor(1000 + Math.random() * 9000);
        products.push({ id: newId, name, price, content });
        return ctx.reply(`✅ '${name}' অ্যাড হয়েছে। ID: ${newId}`);
    }

    if (ctx.message.text.startsWith('/delproduct') && ctx.from.id === ADMIN_ID) {
        const args = ctx.message.text.split(' ');
        const pId = parseInt(args[1]);
        const index = products.findIndex(p => p.id === pId);
        if (index !== -1) {
            products.splice(index, 1);
            return ctx.reply('✅ রিমুভ সফল।');
        }
    }
});

bot.action(/app_(\d+)_([\d.]+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const amount = parseFloat(ctx.match[2]);
    if (users[targetId]) {
        users[targetId].balance += amount;
        bot.telegram.sendMessage(targetId, `🎉 অভিনন্দন! ${amount} TK ডিপোজিট অ্যাপ্রুভ হয়েছে।`);
        await ctx.editMessageText(`✅ ইউজার ${targetId} এর পেমেন্ট অ্যাপ্রুভ হয়েছে।`);
    }
});

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

bot.action(/buy_(\d+)/, async (ctx) => {
  const pId = parseInt(ctx.match[1]);
  const product = products.find(p => p.id === pId);
  const u = users[ctx.from.id];
  if (u.balance >= product.price) {
    u.balance -= product.price;
    u.spent += product.price;
    await safeDelete(ctx);
    await ctx.reply(`🎉 **কেনা সফল!**\n🎁 লিঙ্ক: ${product.content}`);
    bot.telegram.sendMessage(ADMIN_ID, `💰 নতুন সেল! ইউজার: ${u.name}, গ্রুপ: ${product.name}`);
  } else {
    await ctx.answerCbQuery('❌ ব্যালেন্স নেই!', { show_alert: true });
  }
});

bot.action('main_menu', async (ctx) => {
  const u = users[ctx.from.id];
  const menu = getMainMenu(u);
  await ctx.editMessageText(menu.text, { parse_mode: 'Markdown', ...menu.extra });
});

bot.action('profile', async (ctx) => {
    const u = users[ctx.from.id];
    await ctx.editMessageText(`👤 **প্রোফাইল**\n\n🆔 আইডি: \`${u.id}\`\n💰 ব্যালেন্স: ${u.balance.toFixed(2)} TK`, {
        parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 ফিরে যান', 'main_menu')]])
    });
});

bot.action('history', (ctx) => ctx.answerCbQuery('হিস্টোরি আপাতত খালি।', {show_alert: true}));
bot.action('refer', (ctx) => ctx.reply(`🎁 রেফার লিঙ্ক: https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));

bot.launch();
console.log("বট রেন্ডারে সচল আছে...");
