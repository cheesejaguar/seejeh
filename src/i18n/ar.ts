// FILE: src/i18n/ar.ts
//
// Typed as `Catalogue`, so this file cannot compile with a missing or
// misspelled key. Terminology follows living usage rather than literal
// translation: capture is «الأكل» (what players actually say), not the bookish
// «الأسر» the previous version used; the centre keeps its Upper-Egyptian name
// «عين الدَّك»; stones are «حجارة» with the folk term «كلاب» surfaced in About.

import type { Catalogue } from './en';

export const ar: Catalogue = {
  // --- Shell ---------------------------------------------------------------
  'app.title': 'السِّيجة',
  'error.title': 'حدث خلل',
  'error.body':
    'واجهت اللعبة خطأً غير متوقع فتوقفت. مبارياتك وسجلّك المحفوظة سليمة، ويمكنك البدء من جديد بأمان.',
  'error.retry': 'أعد المحاولة',
  'error.reload': 'إعادة التحميل',
  'app.subtitle': 'شطرنج العرب — لعبة حصار ومحاورة على رقعة ٧×٧',
  'app.boardName': 'سبعاوية · ٧×٧',

  'nav.play': 'اللعب',
  'nav.leaderboard': 'الترتيب',
  'nav.about': 'عن اللعبة',
  'nav.settings': 'الإعدادات',
  'nav.language': 'English',
  'nav.languageLabel': 'تغيير اللغة',
  'nav.theme': 'تبديل المظهر',
  'nav.close': 'إغلاق',

  // --- Players and pieces --------------------------------------------------
  'player.Light': 'الفاتحة',
  'player.Dark': 'الداكنة',
  'player.Light.long': 'الحجارة الفاتحة',
  'player.Dark.long': 'الحجارة الداكنة',
  'player.you': 'أنت',
  'player.opponent': 'الخصم',

  // --- Phases and turn state ----------------------------------------------
  'phase.placement': 'مرحلة التوزيع',
  'phase.movement': 'المحاوَرة',
  'phase.chain': 'الأكل المتتابع',
  'phase.blockadeRemoval': 'افتح له الطريق',
  'phase.gameOver': 'انتهت اللعبة',

  'turn.yours': 'دورك',
  'turn.opponent': 'دور الخصم',
  'turn.thinking': 'يفكّر…',

  'status.placement': 'رصّ حجرين. تبقى عين الدكّ في الوسط خالية.',
  'status.placementOne': 'رصّ حجرًا واحدًا آخر.',
  'status.movement': 'حرّك حجرًا خانة واحدة. احصر حجر الخصم بين حجرين لك لتأكله.',
  'status.openingForced': 'العين وحدها خالية، فأول حركة تكون إليها.',
  'status.chain': 'تستطيع الأكل مرة أخرى بالحجر نفسه، أو تكتفي.',
  'status.blockadeOpen': 'خصمك محصور. حرّك حجرًا يفتح له الطريق.',
  'status.blockadeRemove': 'اسحب أحد حجارتك لتفتح له الطريق.',
  'status.blocked': 'أنت محصور. على خصمك أن يفتح لك الطريق.',

  // --- Actions -------------------------------------------------------------
  'action.newGame': 'لعبة جديدة',
  'action.endChain': 'اكتفِ',
  'action.resign': 'استسلام',
  'action.offerDraw': 'اعرض التعادل',
  'action.acceptDraw': 'اقبل التعادل',
  'action.declineDraw': 'ارفض',
  'action.confirmResign': 'تستسلم في هذه اللعبة؟',
  'action.confirmResignBody': 'يفوز خصمك وتُسجَّل النتيجة.',
  'action.cancel': 'إلغاء',
  'action.confirm': 'تأكيد',

  'draw.sent': 'عُرض التعادل. في انتظار الرد.',
  'draw.declined': 'رُفض التعادل، واللعب مستمر.',

  // --- Counters ------------------------------------------------------------
  'count.stones': 'الحجارة',

  // --- Events --------------------------------------------------------------
  'event.captured.zero': 'لم تأكل شيئًا.',
  'event.captured.one': 'أكلتَ حجرًا.',
  'event.captured.two': 'أكلتَ حجرين.',
  'event.captured.few': 'أكلتَ {{count}} حجارة.',
  'event.captured.many': 'أكلتَ {{count}} حجرًا.',
  'event.captured.other': 'أكلتَ {{count}} حجر.',
  'event.blockadeOpponent': 'خصمك لا يستطيع الحركة. عليك أن تفتح له الطريق.',
  'event.blockadeYou': 'لا تستطيع الحركة. على خصمك أن يفتح لك الطريق.',

  // --- Rejections ----------------------------------------------------------
  'reject.gameOver': 'انتهت هذه اللعبة.',
  'reject.wrongPhase': 'لا يمكنك فعل ذلك الآن.',
  'reject.outOfBounds': 'هذه الخانة خارج الرقعة.',
  'reject.cellOccupied': 'الخانة مشغولة.',
  'reject.cellEmpty': 'لا يوجد حجر هناك.',
  'reject.centerReserved': 'تبقى العين خالية أثناء التوزيع.',
  'reject.noStonesInHand': 'لم يبقَ لديك حجارة للرصّ.',
  'reject.notYourStone': 'هذا ليس حجرك.',
  'reject.notAdjacent': 'الحجر يتحرك خانة واحدة مستقيمة، لا قُطريًا.',
  'reject.destinationOccupied': 'الخانة مشغولة.',
  'reject.mustMoveChainStone': 'أكمل بالحجر نفسه.',
  'reject.chainMoveMustCapture': 'حركة المتابعة لا بد أن تأكل حجرًا.',
  'reject.chainIsMandatory': 'عليك مواصلة الأكل ما دام ممكنًا.',
  'reject.notInChain': 'لا توجد متابعة لإنهائها.',
  'reject.mustRemoveOwnStone': 'اسحب حجرًا من حجارتك أنت.',
  'reject.removalMustFreeOpponent': 'هذا لا يفتح الطريق. اختر حجرًا آخر.',
  'reject.mustOpenPath': 'حرّك حجرًا يفتح لخصمك الطريق.',
  'reject.notYourTurn': 'ليس دورك.',

  // --- Outcomes ------------------------------------------------------------
  'outcome.youWin': 'فُزت',
  'outcome.youLose': 'خسرت',
  'outcome.draw': 'تعادل',
  'outcome.winnerIs': 'فاز {{player}}',

  'outcome.elimination': 'أُكلت جميع حجارة الخصم.',
  'outcome.loneStone': 'بقي حجر واحد، ولا يستطيع حجر واحد أن يحصر غيره.',
  'outcome.immobilized': 'لم تبقَ حركة ممكنة.',
  'outcome.resignation': 'استسلم {{player}}.',
  'outcome.material': 'حُسمت بعدد الحجارة الباقية.',
  'outcome.agreement': 'اتُّفق على التعادل.',
  'outcome.repetition': 'تكرّرت الوضعية نفسها ثلاث مرات.',
  'outcome.noProgress': 'مضى شوط طويل دون أكل أي حجر.',
  'outcome.mutualBlockade': 'لم يعد أيٌّ من اللاعبين يستطيع الحركة.',

  'outcome.ratingChange': 'التصنيف {{delta}}',
  'outcome.playAgain': 'العب مرة أخرى',
  'outcome.viewLeaderboard': 'انظر الترتيب',

  // --- Settings ------------------------------------------------------------
  'settings.title': 'الإعدادات',
  'settings.opponent': 'الخصم',
  'settings.difficulty': 'المستوى',
  'settings.difficulty.beginner': 'مبتدئ',
  'settings.difficulty.easy': 'سهل',
  'settings.difficulty.medium': 'متمكّن',
  'settings.difficulty.hard': 'لا يرحم',
  'settings.difficulty.beginnerHint': 'يلعب على غير هدى ويغفل عن الفخاخ.',
  'settings.difficulty.easyHint': 'يرى حركة واحدة قادمة.',
  'settings.difficulty.mediumHint': 'يحسب عدة حركات قادمة.',
  'settings.difficulty.hardHint': 'يبحث عميقًا وقلّما يخطئ.',
  'settings.yourColourLocked': 'مقفل أثناء اللعب. ابدأ لعبة جديدة لتبديل الحجارة.',
  'settings.yourColour': 'حجارتك',

  'settings.presentation': 'العرض',
  'settings.sound': 'الصوت',
  'settings.volume': 'مستوى الصوت',
  'settings.showCaptures': 'إظهار ما سيُؤكل',
  'settings.showCapturesHint': 'يبرز الحجارة التي ستأكلها الحركة.',
  'settings.animations': 'الحركة',
  'settings.animations.full': 'كاملة',
  'settings.animations.reduced': 'مخفّفة',

  'settings.rules': 'القواعد',

  'variant.centerIsSafe': 'العين تحمي',
  'variant.centerIsSafe.hint': 'الحجر في المربع الأوسط محصَّن من الأكل، لكنه يشارك في الأكل.',
  'variant.chainCaptures': 'الأكل المتتابع',
  'variant.chainCaptures.hint': 'بعد الأكل يجوز للحجر نفسه أن يأكل مرة أخرى.',
  'variant.chainMustContinue': 'المتابعة إلزامية',
  'variant.chainMustContinue.hint': 'عليك مواصلة الأكل ما دام هناك أكل ممكن.',
  'variant.loneStoneLoses': 'الحجر الواحد يخسر',
  'variant.loneStoneLoses.hint': 'الحجر الواحد لا يستطيع حصر غيره، فتنتهي اللعبة.',
  'variant.blockade': 'إذا حُصر أحد اللاعبين',
  'variant.blockade.opponentMovesAgain': 'الخصم يفتح له الطريق',
  'variant.blockade.opponentRemovesOwnStone': 'الخصم يسحب أحد حجارته',
  'variant.blockade.blockedPlayerLoses': 'المحصور يخسر',
  'variant.firstMover': 'من يبدأ الحركة',
  'variant.firstMover.firstPlacer': 'من رصّ أولًا',
  'variant.firstMover.secondPlacer': 'من رصّ ثانيًا',
  'variant.noProgressLimit': 'حدّ الحركات بلا أكل',
  'variant.noProgressLimit.hint': 'عدد الحركات دون أكل قبل أن تُحسم اللعبة بالعدد. الصفر يعطّلها.',
  'variant.repetitionDraw': 'تكرار الوضعية ثلاثًا تعادل',

  'settings.data': 'بياناتك',
  'settings.export': 'تصدير',
  'settings.import': 'استيراد',
  'settings.clear': 'حذف كل شيء',
  'settings.clearHint': 'يمسح كل اللاعبين والمباريات والتصنيفات من هذا الجهاز.',
  'settings.imported': 'تم الاستيراد.',
  'settings.importFailed': 'تعذّرت قراءة هذا الملف.',
  'settings.exported': 'تم التصدير.',

  // --- Leaderboard ---------------------------------------------------------
  'board.title': 'الترتيب',
  'board.subtitle': 'أنت في مواجهة الخصوم الأربعة',
  'board.rank': 'المركز',
  'board.player': 'اللاعب',
  'board.rating': 'التصنيف',
  'board.games': 'المباريات',
  'board.record': 'فوز / تعادل / خسارة',
  'board.winRate': 'نسبة الفوز',
  'board.you': 'أنت',
  'board.aiRung': 'خصم',

  'stats.title': 'سجلّك',
  'stats.rating': 'التصنيف',
  'stats.games': 'المباريات',
  'stats.winRate': 'نسبة الفوز',
  'stats.streak': 'سلسلة الفوز الحالية',
  'stats.bestStreak': 'أطول سلسلة',
  'stats.avgLength': 'متوسط زمن اللعبة',
  'stats.avgMoves': 'متوسط الحركات',
  'stats.captured': 'حجارة أكلتها',
  'stats.lost': 'حجارة خسرتها',
  'stats.byDifficulty': 'حسب الخصم',
  'stats.records': 'أفضل ما حققت',
  'stats.fastestWin': 'أسرع فوز',
  'stats.fewestMoves': 'أقل حركات في فوز',
  'stats.largestCapture': 'أكبر أكل في حركة',
  'stats.mostRemaining': 'أكثر حجارة باقية في فوز',
  'stats.highestRating': 'أعلى تصنيف',
  'stats.none': '—',

  'title.novice': 'مبتدئ',
  'title.apprentice': 'متدرّب',
  'title.skilled': 'ماهر',
  'title.expert': 'خبير',
  'title.master': 'أستاذ',
  'title.grandmaster': 'أستاذ كبير',

  'history.title': 'آخر المباريات',
  'history.empty': 'لا شيء هنا بعد.',
  'history.won': 'فوز',
  'history.lost': 'خسارة',
  'history.drew': 'تعادل',
  'history.moves.zero': 'بلا حركات',
  'history.moves.one': 'حركة واحدة',
  'history.moves.two': 'حركتان',
  'history.moves.few': '{{count}} حركات',
  'history.moves.many': '{{count}} حركة',
  'history.moves.other': '{{count}} حركة',

  'profile.title': 'الملف',
  'profile.name': 'الاسم',
  'profile.guest': 'ضيف',
  'profile.namePlaceholder': 'بماذا نناديك؟',
  'profile.save': 'حفظ',

  // --- About ---------------------------------------------------------------
  'about.title': 'عن السِّيجة',
  'about.heritage': 'التراث',
  'about.heritageBody':
    'السِّيجة لعبة قديمة تُلعب في مصر والسودان وبلاد الشام. تُخطّ الرقعة عادةً على التراب المرصوص، وتكون الحجارة حصى أو نوى بلح أو كِسَر فخّار. في صعيد مصر تُسمّى القطع «كلابًا»، وتُسمّى الحفرة الوسطى الخالية «عين الدَّك». تبدأ اللعبة حين يدخل أحد الكلاب إلى العين، وما يليها يُسمّى «المحاورة».',
  'about.rules': 'كيف تُلعب',
  'about.rule.layout': 'يتناوب اللاعبان على رصّ حجرين في كل دور حتى تُوضع الحجارة الثمانية والأربعون. وتبقى العين في الوسط خالية.',
  'about.rule.opening': 'العين هي الخانة الخالية الوحيدة، فتكون أول حركة إليها.',
  'about.rule.move': 'يتحرك الحجر خانة واحدة مستقيمة، لا قُطريًا.',
  'about.rule.capture':
    'إذا حصرتَ حجرًا واحدًا للخصم بين حجرين لك أكلتَه. الحجر الذي تحرّكه هو وحده الذي يحصر، والدخول بين حجرين للخصم آمن.',
  'about.rule.chain': 'إذا أكلت حركتُك حجرًا، جاز للحجر نفسه أن يتحرك ويأكل مرة أخرى.',
  'about.rule.win': 'تفوز إذا أكلت جميع حجارة الخصم أو لم تُبقِ له إلا حجرًا واحدًا.',
  'about.notes': 'ملاحظة على القواعد',
  'about.notesBody':
    'تختلف المصادر في مسائل عدة، فجُعل المختلَف فيه خيارات لا افتراضات. والأكل يأخذ حجرًا واحدًا في كل اتجاه، أما كنس صفٍّ كامل فقاعدة لعبة أخرى. ولا وجود لقاعدة «تقليل الخصم إلى سبعة أحجار» في أي مصدر بأي لغة.',
  'about.sources': 'المصادر',
  'about.sourcesBody':
    'لين (١٨٣٦)، وبولتون (١٨٩٠)، وفوكنر (١٨٩٢)، وموراي (١٩٥٢)، وبِل (١٩٧٩)، ومجموعة قواعد مشروع لودي، وروايات اللعب الحيّ من مصر وفلسطين والأردن وبلاد المغرب.',

  // --- Accessibility -------------------------------------------------------
  'a11y.board': 'رقعة السيجة، سبعة في سبعة',
  'a11y.cell': 'الصف {{row}}، العمود {{col}}',
  'a11y.cellEye': 'الصف {{row}}، العمود {{col}}، العين',
  'a11y.empty': 'خالية',
  'a11y.stone': 'حجر {{player}}',
  'a11y.selected': 'مختار',
  'a11y.canPlace': 'يمكن الرصّ هنا',
  'a11y.canMove': 'يمكن التحرك إلى هنا',
  'a11y.wouldTake': 'هذه الحركة تأكل حجرًا',
  'a11y.wouldBeTaken': 'سيُؤكل',
  'a11y.canBeRemoved': 'يمكن سحبه',
  'a11y.movable': 'يمكن تحريكه',
  'a11y.boardHelp': 'استخدم مفاتيح الأسهم للتنقل في الرقعة، ثم Enter أو المسافة لاختيار خانة.',
  'a11y.liveRegion': 'وصف مجريات اللعبة',
};
