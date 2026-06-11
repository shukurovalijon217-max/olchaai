import { readFileSync, writeFileSync } from "fs";

const filePath = "artifacts/nexus/src/lib/i18n.ts";
let src = readFileSync(filePath, "utf8");

// New i18n sections per language. For languages not listed, English fallback is used.
const NEW_SECTIONS = {
  uz: {
    home: `home: {"for_you":"Siz uchun","create_post":"Post yaratish","trending":"Trend mavzular","suggested":"Siz uchun tavsiyalar","no_posts":"Hali postlar yo\\'q. Birinchi bo\\'ling!","follow":"Kuzatish","posts":"ta post"}`,
    msg: `msg: {"title":"Xabarlar","search_ph":"Xabar qidirish...","no_convs":"Suhbatlar yo\\'q","active":"Online","select_conv":"Suhbatni tanlang","say_hello":"Salom deng!","msg_ph":"Xabar...","start_conv":"Suhbat boshlash"}`,
    notif: `notif: {"title":"Bildirishnomalar","mark_read":"Barchasini o\\'qildi deb belgilash","all_caught":"Hammasi o\\'qildi!"}`,
    search: `search: {"tab_all":"Hammasi","tab_users":"Foydalanuvchilar","tab_posts":"Postlar","tab_reels":"Reels","tab_products":"Mahsulotlar","ph":"Qidirish... foydalanuvchilar, postlar, mahsulotlar","hint":"Qidirmoqchi bo\\'lgan narsangizni kiriting","no_results":"bo\\'yicha hech narsa topilmadi","verified":"Tasdiqlangan"}`,
    reels: `reels: {"ai_analyze":"AI Tahlil","video_na":"Video mavjud emas","comments":"ta izoh","no_comments":"Hali izoh yo\\'q. Birinchi bo\\'ling!","comment_ph":"Izoh yozing...","link_copied":"Havola nusxalandi","share":"Ulash"}`,
    groups: `groups: {"title":"Jamoalar","create":"Yaratish","search_ph":"Jamoalarni qidirish...","not_found":"Jamoalar topilmadi","private":"Maxsus","members":"a\\'zo","posts":"post","leave":"Chiqish","join":"Kirish"}`,
    sell: `sell: {"header":"Sotish e\\'loni","photos":"Rasmlar","photos_max":"maks. 6 ta","title_label":"Mahsulot nomi *","desc_label":"Tavsif","price_label":"Narx (so\\'m) *","orig_price":"Asl narx (ixtiyoriy)","category":"Kategoriya","condition":"Holati","stock":"Zaxira miqdori","location":"Joylashuv","location_ph":"Toshkent, Chilonzor","tags_label":"Teglar","tags_hint":"vergul bilan ajrating","tags_ph":"iphone, apple, smartfon","submit":"E\\'lon berish","submitting":"E\\'lon qo\\'shilmoqda...","success_title":"Mahsulot qo\\'shildi! \\uD83C\\uDF89","success_sub":"Mahsulot sahifasiga o\\'tilmoqda...","err_title":"Mahsulot nomini kiriting","err_price":"Narxni kiriting","err_max_img":"Maksimal 6 ta rasm","err_upload":"Rasm yuklashda xato","main":"Bosh","photo_btn":"Rasm","cond_new":"Yangi","cond_new_desc":"Hech ishlatilmagan, original qadoqlangan","cond_used":"Ishlatilgan","cond_used_desc":"Oldin ishlatilgan, yaxshi holda","cond_digital":"Raqamli","cond_digital_desc":"Elektron tovar, fayl yoki kod"}`,
    myshop: `myshop: {"title":"Mening Do\\'konim","add":"Qo\\'shish","tab_products":"Mahsulotlarim","tab_selling":"Buyurtmalar (sotuvchi)","tab_buying":"Buyurtmalarim (xaridor)","stat_active":"Faol e\\'lonlar","stat_sales":"Umumiy sotuv","stat_views":"Ko\\'rishlar","no_products":"Hali e\\'lonlar yo\\'q","no_products_sub":"Birinchi mahsulotingizni qo\\'shing va daromad oling","add_listing":"E\\'lon qo\\'shish","no_selling":"Hali buyurtmalar yo\\'q","no_buying":"Hali xaridlar yo\\'q","go_market":"Bozorga o\\'tish","buyer":"Xaridor:","seller":"Sotuvchi:","status_pending":"Kutilmoqda","status_paid":"To\\'langan","status_processing":"Tayyorlanmoqda","status_shipped":"Jo\\'natildi","status_delivered":"Yetkazildi \\u2713","status_cancelled":"Bekor qilindi","confirm":"Tasdiqlash","cancel_order":"Bekor qilish","mark_shipped":"Jo\\'natildi deb belgilash","mark_delivered":"Yetkazildi deb belgilash","edit":"Tahrirlash","delete":"O\\'chirish","delete_confirm":"Mahsulotni o\\'chirishni xohlaysizmi?","active_badge":"Faol","sold_badge":"Sotildi","draft_badge":"Saqlangan"}`,
    explore: `explore: {"search_ph":"Odamlar, postlar, guruhlarni qidirish...","trending":"Trend mavzular","explore_posts":"Postlarni kashf qilish","people_to_follow":"Kuzatish uchun odamlar","popular_communities":"Mashhur jamoalar","follow":"Kuzatish","join":"Kirish"}`,
    post_detail: `post_detail: {"title":"Post","comments_count":"ta izoh","voice_count":"ta ovozli izoh","comment_ph":"Izoh qo\\'shish...","no_comments":"Hali izoh yo\\'q. Birinchi bo\\'ling!","comment_error":"Izoh yuborishda xato"}`,
    product_detail: `product_detail: {"not_found":"Mahsulot topilmadi","reserve":"ta zaxira","views":"ko\\'rish","description":"Tavsif","reviews":"Sharhlar","safe_pay":"Xavfsiz to\\'lov","delivery":"Yetkazib berish","contact_seller":"Sotuvchi bilan","via_wallet":"Hamyon orqali","agreed":"Kelishiladi","chat":"Muloqot","seller_profile":"Sotuvchi profiliga o\\'tish","order_success":"Buyurtma muvaffaqiyatli!","order_accepted":"Buyurtma qabul qilindi. Sotuvchi bilan bog\\'laning yoki Do\\'kon bo\\'limidan kuzating.","buy_title":"Sotib olish","qty":"Miqdor","delivery_method":"Yetkazib berish usuli","pickup":"O\\'z qo\\'lga olish \\uD83E\\uDD1D","home_delivery":"Yetkazib berish \\uD83D\\uDE9A","total":"Jami","buying":"Sotib olinmoqda...","pay":"so\\'m to\\'lash","manage_shop":"Do\\'konimni boshqarish","contact_btn":"Sotuvchi","buy_btn":"Sotib olish","cond_new":"Yangi","cond_digital":"\\uD83D\\uDCBB Raqamli","cond_used":"Ishlatilgan","delivery_address_ph":"Yetkazib berish manzili..."}`,
    live_page: `live_page: {"live_badge":"JONLI EFIR","not_found":"Topilmadi","live_ended":"Jonli efir tugadi","back":"Orqaga","comment_ph":"Fikr yozing...","send_gift":"Sovg\\'a yuborish","wallet":"Hamyon:","gift_sent":"yubordi!","gift_error":"Sovg\\'a yuborishda xato","balance":"Balans"}`,
  },
  en: {
    home: `home: {"for_you":"For You","create_post":"Create Post","trending":"Trending Topics","suggested":"Suggested for You","no_posts":"No posts yet. Be the first!","follow":"Follow","posts":"posts"}`,
    msg: `msg: {"title":"Messages","search_ph":"Search messages...","no_convs":"No conversations yet","active":"Active now","select_conv":"Select a conversation","say_hello":"Say hello!","msg_ph":"Message...","start_conv":"Start a conversation"}`,
    notif: `notif: {"title":"Notifications","mark_read":"Mark all read","all_caught":"All caught up!"}`,
    search: `search: {"tab_all":"All","tab_users":"Users","tab_posts":"Posts","tab_reels":"Reels","tab_products":"Products","ph":"Search users, posts, products","hint":"Enter what you want to find","no_results":"No results found for","verified":"Verified"}`,
    reels: `reels: {"ai_analyze":"AI Analysis","video_na":"Video unavailable","comments":"comments","no_comments":"No comments yet. Be the first!","comment_ph":"Add a comment...","link_copied":"Link copied","share":"Share"}`,
    groups: `groups: {"title":"Communities","create":"Create","search_ph":"Search communities...","not_found":"No communities found","private":"Private","members":"members","posts":"posts","leave":"Leave","join":"Join"}`,
    sell: `sell: {"header":"Create Listing","photos":"Photos","photos_max":"max 6","title_label":"Product name *","desc_label":"Description","price_label":"Price *","orig_price":"Original price (optional)","category":"Category","condition":"Condition","stock":"Stock quantity","location":"Location","location_ph":"City, District","tags_label":"Tags","tags_hint":"separated by commas","tags_ph":"phone, apple, smartphone","submit":"Post listing","submitting":"Posting...","success_title":"Product added!","success_sub":"Redirecting to product page...","err_title":"Enter product name","err_price":"Enter price","err_max_img":"Maximum 6 photos","err_upload":"Error uploading photo","main":"Main","photo_btn":"Photo","cond_new":"New","cond_new_desc":"Never used, original packaging","cond_used":"Used","cond_used_desc":"Previously used, in good condition","cond_digital":"Digital","cond_digital_desc":"Digital product, file or code"}`,
    myshop: `myshop: {"title":"My Shop","add":"Add","tab_products":"My Products","tab_selling":"Orders (seller)","tab_buying":"My Orders (buyer)","stat_active":"Active listings","stat_sales":"Total sales","stat_views":"Views","no_products":"No listings yet","no_products_sub":"Add your first product and earn","add_listing":"Add listing","no_selling":"No orders yet","no_buying":"No purchases yet","go_market":"Go to Market","buyer":"Buyer:","seller":"Seller:","status_pending":"Pending","status_paid":"Paid","status_processing":"Processing","status_shipped":"Shipped","status_delivered":"Delivered \\u2713","status_cancelled":"Cancelled","confirm":"Confirm","cancel_order":"Cancel","mark_shipped":"Mark as shipped","mark_delivered":"Mark as delivered","edit":"Edit","delete":"Delete","delete_confirm":"Delete this product?","active_badge":"Active","sold_badge":"Sold","draft_badge":"Draft"}`,
    explore: `explore: {"search_ph":"Search people, posts, groups...","trending":"Trending Topics","explore_posts":"Explore Posts","people_to_follow":"People to Follow","popular_communities":"Popular Communities","follow":"Follow","join":"Join"}`,
    post_detail: `post_detail: {"title":"Post","comments_count":"comments","voice_count":"voice comments","comment_ph":"Add a comment...","no_comments":"No comments yet. Be the first!","comment_error":"Error posting comment"}`,
    product_detail: `product_detail: {"not_found":"Product not found","reserve":"in stock","views":"views","description":"Description","reviews":"Reviews","safe_pay":"Secure payment","delivery":"Delivery","contact_seller":"Contact seller","via_wallet":"Via wallet","agreed":"Negotiable","chat":"Chat","seller_profile":"Go to seller profile","order_success":"Order placed!","order_accepted":"Order received. Contact the seller or track in My Shop.","buy_title":"Buy now","qty":"Quantity","delivery_method":"Delivery method","pickup":"Pickup \\uD83E\\uDD1D","home_delivery":"Home delivery \\uD83D\\uDE9A","total":"Total","buying":"Buying...","pay":"Pay","manage_shop":"Manage my shop","contact_btn":"Seller","buy_btn":"Buy","cond_new":"New","cond_digital":"\\uD83D\\uDCBB Digital","cond_used":"Used","delivery_address_ph":"Delivery address..."}`,
    live_page: `live_page: {"live_badge":"LIVE","not_found":"Not found","live_ended":"Stream ended","back":"Back","comment_ph":"Write a comment...","send_gift":"Send a gift","wallet":"Wallet:","gift_sent":"sent!","gift_error":"Error sending gift","balance":"Balance"}`,
  },
  ru: {
    home: `home: {"for_you":"Для вас","create_post":"Создать пост","trending":"Тренды","suggested":"Рекомендации","no_posts":"Постов пока нет. Будьте первым!","follow":"Подписаться","posts":"постов"}`,
    msg: `msg: {"title":"Сообщения","search_ph":"Поиск сообщений...","no_convs":"Нет разговоров","active":"Онлайн","select_conv":"Выберите разговор","say_hello":"Скажите привет!","msg_ph":"Сообщение...","start_conv":"Начать разговор"}`,
    notif: `notif: {"title":"Уведомления","mark_read":"Отметить все прочитанными","all_caught":"Всё прочитано!"}`,
    search: `search: {"tab_all":"Все","tab_users":"Пользователи","tab_posts":"Посты","tab_reels":"Reels","tab_products":"Товары","ph":"Поиск пользователей, постов, товаров","hint":"Введите что хотите найти","no_results":"Ничего не найдено по запросу","verified":"Подтверждён"}`,
    reels: `reels: {"ai_analyze":"AI Анализ","video_na":"Видео недоступно","comments":"комм.","no_comments":"Комментариев нет. Будьте первым!","comment_ph":"Добавить комментарий...","link_copied":"Ссылка скопирована","share":"Поделиться"}`,
    groups: `groups: {"title":"Сообщества","create":"Создать","search_ph":"Поиск сообществ...","not_found":"Сообщества не найдены","private":"Приватное","members":"участников","posts":"постов","leave":"Выйти","join":"Вступить"}`,
    sell: `sell: {"header":"Создать объявление","photos":"Фотографии","photos_max":"макс. 6","title_label":"Название товара *","desc_label":"Описание","price_label":"Цена *","orig_price":"Первоначальная цена (необязательно)","category":"Категория","condition":"Состояние","stock":"Количество","location":"Местоположение","location_ph":"Ташкент, Чиланзар","tags_label":"Теги","tags_hint":"через запятую","tags_ph":"iphone, apple, смартфон","submit":"Опубликовать","submitting":"Публикация...","success_title":"Товар добавлен!","success_sub":"Переход на страницу товара...","err_title":"Введите название товара","err_price":"Введите цену","err_max_img":"Максимум 6 фото","err_upload":"Ошибка загрузки","main":"Главное","photo_btn":"Фото","cond_new":"Новый","cond_new_desc":"Не использовался, оригинальная упаковка","cond_used":"Б/у","cond_used_desc":"Был в употреблении, в хорошем состоянии","cond_digital":"Цифровой","cond_digital_desc":"Цифровой товар, файл или код"}`,
    myshop: `myshop: {"title":"Мой магазин","add":"Добавить","tab_products":"Мои товары","tab_selling":"Заказы (продавец)","tab_buying":"Мои заказы (покупатель)","stat_active":"Активных объявлений","stat_sales":"Всего продаж","stat_views":"Просмотры","no_products":"Объявлений ещё нет","no_products_sub":"Добавьте первый товар и начните зарабатывать","add_listing":"Добавить объявление","no_selling":"Заказов ещё нет","no_buying":"Покупок ещё нет","go_market":"Перейти на рынок","buyer":"Покупатель:","seller":"Продавец:","status_pending":"Ожидает","status_paid":"Оплачено","status_processing":"Обрабатывается","status_shipped":"Отправлено","status_delivered":"Доставлено \\u2713","status_cancelled":"Отменено","confirm":"Подтвердить","cancel_order":"Отменить","mark_shipped":"Отметить как отправленное","mark_delivered":"Отметить как доставленное","edit":"Редактировать","delete":"Удалить","delete_confirm":"Удалить этот товар?","active_badge":"Активен","sold_badge":"Продано","draft_badge":"Черновик"}`,
    explore: `explore: {"search_ph":"Поиск людей, постов, групп...","trending":"Тренды","explore_posts":"Посты","people_to_follow":"Рекомендуемые","popular_communities":"Популярные сообщества","follow":"Подписаться","join":"Вступить"}`,
    post_detail: `post_detail: {"title":"Пост","comments_count":"комм.","voice_count":"голос. комм.","comment_ph":"Добавить комментарий...","no_comments":"Комментариев нет. Будьте первым!","comment_error":"Ошибка отправки комментария"}`,
    product_detail: `product_detail: {"not_found":"Товар не найден","reserve":"в наличии","views":"просмотров","description":"Описание","reviews":"Отзывы","safe_pay":"Безопасная оплата","delivery":"Доставка","contact_seller":"Связаться","via_wallet":"Через кошелёк","agreed":"Договорная","chat":"Чат","seller_profile":"Перейти к продавцу","order_success":"Заказ оформлен!","order_accepted":"Заказ принят. Свяжитесь с продавцом или отслеживайте в Магазине.","buy_title":"Купить","qty":"Количество","delivery_method":"Способ доставки","pickup":"Самовывоз \\uD83E\\uDD1D","home_delivery":"Доставка \\uD83D\\uDE9A","total":"Итого","buying":"Покупка...","pay":"Оплатить","manage_shop":"Управление магазином","contact_btn":"Продавец","buy_btn":"Купить","cond_new":"Новый","cond_digital":"\\uD83D\\uDCBB Цифровой","cond_used":"Б/у","delivery_address_ph":"Адрес доставки..."}`,
    live_page: `live_page: {"live_badge":"ПРЯМОЙ ЭФИР","not_found":"Не найдено","live_ended":"Трансляция завершена","back":"Назад","comment_ph":"Написать комментарий...","send_gift":"Отправить подарок","wallet":"Кошелёк:","gift_sent":"отправил!","gift_error":"Ошибка отправки подарка","balance":"Баланс"}`,
  },
  zh: {
    home: `home: {"for_you":"为你推荐","create_post":"创建帖子","trending":"热门话题","suggested":"为你推荐","no_posts":"还没有帖子，来第一个！","follow":"关注","posts":"帖子"}`,
    msg: `msg: {"title":"消息","search_ph":"搜索消息...","no_convs":"还没有对话","active":"在线","select_conv":"选择对话","say_hello":"打个招呼！","msg_ph":"消息...","start_conv":"开始对话"}`,
    notif: `notif: {"title":"通知","mark_read":"全部标为已读","all_caught":"全部已读！"}`,
    search: `search: {"tab_all":"全部","tab_users":"用户","tab_posts":"帖子","tab_reels":"Reels","tab_products":"商品","ph":"搜索用户、帖子、商品","hint":"输入您想查找的内容","no_results":"未找到相关结果","verified":"已认证"}`,
    reels: `reels: {"ai_analyze":"AI分析","video_na":"视频不可用","comments":"评论","no_comments":"暂无评论，来第一个！","comment_ph":"添加评论...","link_copied":"链接已复制","share":"分享"}`,
    groups: `groups: {"title":"社区","create":"创建","search_ph":"搜索社区...","not_found":"未找到社区","private":"私密","members":"成员","posts":"帖子","leave":"退出","join":"加入"}`,
    sell: `sell: {"header":"发布商品","photos":"照片","photos_max":"最多6张","title_label":"商品名称 *","desc_label":"描述","price_label":"价格 *","orig_price":"原价（可选）","category":"类别","condition":"状态","stock":"库存","location":"地点","location_ph":"城市","tags_label":"标签","tags_hint":"用逗号分隔","tags_ph":"手机, 苹果","submit":"发布","submitting":"发布中...","success_title":"商品已添加！","success_sub":"正在跳转...","err_title":"请输入商品名称","err_price":"请输入价格","err_max_img":"最多6张照片","err_upload":"上传失败","main":"主图","photo_btn":"照片","cond_new":"全新","cond_new_desc":"从未使用，原装包装","cond_used":"二手","cond_used_desc":"使用过，状态良好","cond_digital":"数字","cond_digital_desc":"数字商品、文件或代码"}`,
    myshop: `myshop: {"title":"我的店铺","add":"添加","tab_products":"我的商品","tab_selling":"订单（卖家）","tab_buying":"我的订单（买家）","stat_active":"在售商品","stat_sales":"总销量","stat_views":"浏览量","no_products":"暂无商品","no_products_sub":"添加第一个商品并开始销售","add_listing":"添加商品","no_selling":"暂无订单","no_buying":"暂无购买记录","go_market":"去市场","buyer":"买家:","seller":"卖家:","status_pending":"待处理","status_paid":"已付款","status_processing":"处理中","status_shipped":"已发货","status_delivered":"已送达 \\u2713","status_cancelled":"已取消","confirm":"确认","cancel_order":"取消","mark_shipped":"标记为已发货","mark_delivered":"标记为已送达","edit":"编辑","delete":"删除","delete_confirm":"删除此商品？","active_badge":"在售","sold_badge":"已售","draft_badge":"草稿"}`,
    explore: `explore: {"search_ph":"搜索人物、帖子、群组...","trending":"热门话题","explore_posts":"探索帖子","people_to_follow":"推荐关注","popular_communities":"热门社区","follow":"关注","join":"加入"}`,
    post_detail: `post_detail: {"title":"帖子","comments_count":"评论","voice_count":"语音评论","comment_ph":"添加评论...","no_comments":"暂无评论，来第一个！","comment_error":"发送评论失败"}`,
    product_detail: `product_detail: {"not_found":"商品未找到","reserve":"库存","views":"浏览","description":"描述","reviews":"评价","safe_pay":"安全支付","delivery":"配送","contact_seller":"联系卖家","via_wallet":"通过钱包","agreed":"可议","chat":"聊天","seller_profile":"查看卖家","order_success":"下单成功！","order_accepted":"订单已接收。","buy_title":"购买","qty":"数量","delivery_method":"配送方式","pickup":"自取 \\uD83E\\uDD1D","home_delivery":"送货上门 \\uD83D\\uDE9A","total":"合计","buying":"购买中...","pay":"支付","manage_shop":"管理店铺","contact_btn":"卖家","buy_btn":"购买","cond_new":"全新","cond_digital":"\\uD83D\\uDCBB 数字","cond_used":"二手","delivery_address_ph":"配送地址..."}`,
    live_page: `live_page: {"live_badge":"直播","not_found":"未找到","live_ended":"直播已结束","back":"返回","comment_ph":"发表评论...","send_gift":"送礼物","wallet":"钱包:","gift_sent":"送出！","gift_error":"送礼失败","balance":"余额"}`,
  },
  ar: {
    home: `home: {"for_you":"لك","create_post":"إنشاء منشور","trending":"المواضيع الرائجة","suggested":"مقترح لك","no_posts":"لا توجد منشورات بعد. كن الأول!","follow":"متابعة","posts":"منشورات"}`,
    msg: `msg: {"title":"الرسائل","search_ph":"البحث في الرسائل...","no_convs":"لا توجد محادثات","active":"نشط الآن","select_conv":"اختر محادثة","say_hello":"قل مرحبا!","msg_ph":"رسالة...","start_conv":"بدء محادثة"}`,
    notif: `notif: {"title":"الإشعارات","mark_read":"تعيين الكل كمقروء","all_caught":"تم قراءة الكل!"}`,
    search: `search: {"tab_all":"الكل","tab_users":"المستخدمون","tab_posts":"المنشورات","tab_reels":"ريلز","tab_products":"المنتجات","ph":"ابحث عن مستخدمين، منشورات، منتجات","hint":"أدخل ما تريد البحث عنه","no_results":"لا توجد نتائج لـ","verified":"موثّق"}`,
    reels: `reels: {"ai_analyze":"تحليل AI","video_na":"الفيديو غير متاح","comments":"تعليقات","no_comments":"لا تعليقات بعد. كن الأول!","comment_ph":"أضف تعليقاً...","link_copied":"تم نسخ الرابط","share":"مشاركة"}`,
    groups: `groups: {"title":"المجتمعات","create":"إنشاء","search_ph":"ابحث في المجتمعات...","not_found":"لا توجد مجتمعات","private":"خاص","members":"أعضاء","posts":"منشورات","leave":"مغادرة","join":"انضمام"}`,
    sell: `sell: {"header":"نشر إعلان","photos":"الصور","photos_max":"حد أقصى 6","title_label":"اسم المنتج *","desc_label":"الوصف","price_label":"السعر *","orig_price":"السعر الأصلي (اختياري)","category":"الفئة","condition":"الحالة","stock":"الكمية","location":"الموقع","location_ph":"المدينة","tags_label":"الوسوم","tags_hint":"مفصولة بفواصل","tags_ph":"هاتف، أبل","submit":"نشر","submitting":"جارٍ النشر...","success_title":"تم إضافة المنتج!","success_sub":"جارٍ التوجيه...","err_title":"أدخل اسم المنتج","err_price":"أدخل السعر","err_max_img":"الحد الأقصى 6 صور","err_upload":"خطأ في الرفع","main":"رئيسي","photo_btn":"صورة","cond_new":"جديد","cond_new_desc":"لم يُستخدم، تغليف أصلي","cond_used":"مستعمل","cond_used_desc":"استُخدم سابقاً، حالة جيدة","cond_digital":"رقمي","cond_digital_desc":"منتج رقمي، ملف أو كود"}`,
    myshop: `myshop: {"title":"متجري","add":"إضافة","tab_products":"منتجاتي","tab_selling":"الطلبات (بائع)","tab_buying":"طلباتي (مشترٍ)","stat_active":"إعلانات نشطة","stat_sales":"إجمالي المبيعات","stat_views":"المشاهدات","no_products":"لا إعلانات بعد","no_products_sub":"أضف منتجك الأول وابدأ الربح","add_listing":"إضافة إعلان","no_selling":"لا طلبات بعد","no_buying":"لا مشتريات بعد","go_market":"الذهاب للسوق","buyer":"المشتري:","seller":"البائع:","status_pending":"قيد الانتظار","status_paid":"مدفوع","status_processing":"قيد المعالجة","status_shipped":"تم الشحن","status_delivered":"تم التسليم \\u2713","status_cancelled":"ملغى","confirm":"تأكيد","cancel_order":"إلغاء","mark_shipped":"وضع علامة كمشحون","mark_delivered":"وضع علامة كمسلَّم","edit":"تعديل","delete":"حذف","delete_confirm":"حذف هذا المنتج؟","active_badge":"نشط","sold_badge":"مباع","draft_badge":"مسودة"}`,
    explore: `explore: {"search_ph":"ابحث عن أشخاص، منشورات، مجموعات...","trending":"المواضيع الرائجة","explore_posts":"استكشاف المنشورات","people_to_follow":"أشخاص للمتابعة","popular_communities":"مجتمعات شائعة","follow":"متابعة","join":"انضمام"}`,
    post_detail: `post_detail: {"title":"منشور","comments_count":"تعليقات","voice_count":"تعليقات صوتية","comment_ph":"أضف تعليقاً...","no_comments":"لا تعليقات بعد. كن الأول!","comment_error":"خطأ في إرسال التعليق"}`,
    product_detail: `product_detail: {"not_found":"المنتج غير موجود","reserve":"في المخزون","views":"مشاهدات","description":"الوصف","reviews":"التقييمات","safe_pay":"دفع آمن","delivery":"التوصيل","contact_seller":"اتصل بالبائع","via_wallet":"عبر المحفظة","agreed":"قابل للتفاوض","chat":"محادثة","seller_profile":"صفحة البائع","order_success":"تم الطلب!","order_accepted":"تم استلام الطلب.","buy_title":"شراء","qty":"الكمية","delivery_method":"طريقة التوصيل","pickup":"الاستلام \\uD83E\\uDD1D","home_delivery":"التوصيل للمنزل \\uD83D\\uDE9A","total":"المجموع","buying":"جارٍ الشراء...","pay":"ادفع","manage_shop":"إدارة المتجر","contact_btn":"البائع","buy_btn":"شراء","cond_new":"جديد","cond_digital":"\\uD83D\\uDCBB رقمي","cond_used":"مستعمل","delivery_address_ph":"عنوان التوصيل..."}`,
    live_page: `live_page: {"live_badge":"بث مباشر","not_found":"غير موجود","live_ended":"انتهى البث","back":"رجوع","comment_ph":"اكتب تعليقاً...","send_gift":"إرسال هدية","wallet":"المحفظة:","gift_sent":"أرسل!","gift_error":"خطأ في الإرسال","balance":"الرصيد"}`,
  },
};

// All 40 language codes from the file
const ALL_LANGS = [
  "uz","en","ru","zh","ar","es","fr","hi","pt","de",
  "ja","ko","it","tr","nl","pl","fa","bn","id","vi",
  "th","uk","sv","no","da","fi","el","cs","hu","ro",
  "he","ms","sw","tl","az","kk","ky","tk","tg","mn"
];

// Language-specific translations (fallback to English)
const getLangSections = (lang) => {
  if (NEW_SECTIONS[lang]) return NEW_SECTIONS[lang];
  // Use English as fallback for remaining languages
  return NEW_SECTIONS.en;
};

// For each language, find its block and append the new sections after the premium line
for (const lang of ALL_LANGS) {
  const sections = getLangSections(lang);
  const sectionKeys = Object.keys(sections);
  
  // Build the insertion string - each section on its own line
  const insertLines = sectionKeys.map(k => `    ${sections[k]},`).join("\n");
  
  // Find the premium line for this language block
  // The pattern: lines between `  uz: {` and `  },` (or `  en: {` etc.)
  // We look for `premium: {` within the language block and insert after it
  
  // Strategy: find `    premium: {` and then find the next line that starts with `  },`
  // Insert the new sections between them
  
  // Build regex to find the premium section line within this language's block
  // We'll use a simple approach: find the language block, then find premium: within it
  
  // Check if sections already exist (idempotent)
  const firstKey = sectionKeys[0]; // "home"
  const checkPattern = new RegExp(`home: \\{[^}]*"for_you"`);
  
  // Find where to insert: after the premium section of this language
  // The premium section for this lang ends at the line containing `premium: {`
  // followed by `  },` (the language close) or another section
  
  // Simple approach: find the pattern `    premium: {...},\n  },` and replace with
  // `    premium: {...},\n${insertLines}\n  },`
  
  // But this needs to be done per-language. Let's find the language block boundaries.
  
  // Pattern: `  ${lang}: {` ... `  },`
  // We'll use a state machine approach via line-by-line processing
  const lines = src.split("\n");
  let inLangBlock = false;
  let langBlockStart = -1;
  let langBlockEnd = -1;
  let premiumLineIdx = -1;
  let depth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inLangBlock) {
      if (line.trim() === `${lang}: {` || line.trim() === `${lang}: {`) {
        // Match exact pattern "  uz: {" or "uz: {"
        if (line.match(new RegExp(`^\\s{2}${lang}:\\s*\\{\\s*$`))) {
          inLangBlock = true;
          langBlockStart = i;
          depth = 1;
        }
      }
    } else {
      // Count depth
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      depth += opens - closes;
      
      if (depth === 0) {
        langBlockEnd = i;
        inLangBlock = false;
        break;
      }
      
      // Look for the premium line (last section before the block closes)
      if (line.includes('premium: {') && depth === 1) {
        premiumLineIdx = i;
      }
    }
  }
  
  if (premiumLineIdx === -1 || langBlockEnd === -1) {
    console.log(`Warning: Could not find premium section for lang ${lang}`);
    continue;
  }
  
  // Check if already added (idempotency)
  if (lines.slice(premiumLineIdx, langBlockEnd).some(l => l.includes('home: {'))) {
    console.log(`Skipping ${lang} - already has home section`);
    continue;
  }
  
  // Insert the new sections after the premium line
  lines.splice(premiumLineIdx + 1, 0, insertLines);
  src = lines.join("\n");
  
  console.log(`✅ Added sections to ${lang}`);
}

writeFileSync(filePath, src, "utf8");
console.log(`\nDone! File updated: ${filePath}`);
console.log(`Lines: ${src.split("\n").length}`);
