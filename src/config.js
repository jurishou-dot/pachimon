// Game System Configuration Ver 0.3

export const RANK_POINTS_THRESHOLDS = [
  { rank: '初心者', points: 0 },
  { rank: '見習い', points: 100 },
  { rank: '一般隊員', points: 300 },
  { rank: '上級調査員', points: 600 },
  { rank: '主任', points: 1000 },
  { rank: '博士代理', points: 1500 },
  { rank: '博士', points: 2500 }
];

export const AREAS = {
  FOREST: {
    id: 'FOREST',
    name: '森',
    emoji: '🌳',
    description: '木々が生い茂る静かな森。緑のパチモンが多く生息している。',
    weatherChance: { Sunny: 0.6, Rainy: 0.3, Foggy: 0.1 },
    spawnRates: {
      1: 0.20,  // タマネギマキ
      10: 0.20, // オワタロウ
      22: 0.20, // キャベツ太郎
      29: 0.15, // クマネコ
      15: 0.15, // ネコノテ
      3: 0.10   // たかし
    }
  },
  SHOPPING_STREET: {
    id: 'SHOPPING_STREET',
    name: '商店街',
    emoji: '🏙',
    description: '活気あふれる古い商店街。段ボールや食べ物系パチモンが潜む。',
    weatherChance: { Sunny: 0.7, Rainy: 0.2, Snowy: 0.1 },
    spawnRates: {
      3: 0.25,  // たかし
      8: 0.20,  // コインクイ
      12: 0.15, // サバカン
      15: 0.15, // ネコノテ
      25: 0.15, // タマゴヤキ
      27: 0.10  // メロンパン
    }
  },
  ABANDONED_FACTORY: {
    id: 'ABANDONED_FACTORY',
    name: '廃工場',
    emoji: '🏭',
    description: '錆びた機械が放置された工場。電気や鋼タイプのパチモンが住み着いている。',
    weatherChance: { Sunny: 0.5, Rainy: 0.3, Foggy: 0.2 },
    spawnRates: {
      2: 0.25,  // コンセントラ
      16: 0.25, // ポンコツ
      17: 0.20, // ゴミバコ
      23: 0.15, // セキュリティホイホイ
      30: 0.15  // キュウドウキ
    }
  },
  BEACH: {
    id: 'BEACH',
    name: '海岸',
    emoji: '🏖',
    description: '潮風が心地よい砂浜。水タイプや氷タイプのパチモンが打ち上げられている。',
    weatherChance: { Sunny: 0.6, Rainy: 0.2, Stormy: 0.2 },
    spawnRates: {
      5: 0.30,  // ミズモチ
      12: 0.25, // サバカン
      26: 0.25, // フグサシ
      3: 0.20   // たかし (漂流してきた？)
    }
  },
  MOUNTAIN: {
    id: 'MOUNTAIN',
    name: '山',
    emoji: '🏔',
    description: '険しい山道と冷たい空気。強力なパチモンや不思議な生命体が生息。',
    weatherChance: { Sunny: 0.4, Foggy: 0.3, Snowy: 0.3 },
    spawnRates: {
      4: 0.25,  // ニセゲンドウ
      14: 0.25, // メガホン
      18: 0.20, // ハシモト
      24: 0.15, // ニセドラ
      28: 0.15  // サンタモドキ
    }
  },
  UNDERGROUND: {
    id: 'UNDERGROUND',
    name: '地下施設',
    emoji: '🚇',
    description: '暗く湿った古い地下通路。ゴーストや謎のプログラム系パチモンが漂う。',
    weatherChance: { Foggy: 0.8, Rainy: 0.2 }, // 地下だが湿気表現
    spawnRates: {
      7: 0.30,  // コボルドモドキ
      9: 0.30,  // シャドウジジイ
      21: 0.20, // ぬるぽ
      23: 0.20  // セキュリティホイホイ
    }
  },
  CYBER_SPACE: {
    id: 'CYBER_SPACE',
    name: '電脳空間',
    emoji: '👾',
    description: 'データが飛び交う仮想世界。バグやサイバー系パチモンが潜む。',
    weatherChance: { Sunny: 0.5, Foggy: 0.5 },
    spawnRates: {
      21: 0.30, // ぬるぽ
      2: 0.25,  // コンセントラ
      14: 0.25, // のりお
      23: 0.20  // セキュリティホイホイ
    }
  },
  HOT_SPRING: {
    id: 'HOT_SPRING',
    name: '温泉街',
    emoji: '♨️',
    description: '湯気が立ち込めるのどかな温泉街。身も心も温まるパチモンが生息する。',
    weatherChance: { Sunny: 0.5, Rainy: 0.3, Foggy: 0.2 },
    spawnRates: {
      30: 0.30, // よしこ
      12: 0.25, // ひろし
      11: 0.20, // つよし
      5: 0.15,  // ミズモチ
      20: 0.10  // ちえこ
    }
  },
  MARKET: {
    id: 'MARKET',
    name: '怪しいマーケット',
    emoji: '🛒',
    description: '謎の露店が並ぶ市場。ワケありのパチモンや珍しい食べ物系が集まる。',
    weatherChance: { Sunny: 0.5, Foggy: 0.4, Stormy: 0.1 },
    spawnRates: {
      6: 0.20,  // クローナー
      11: 0.15, // つよし
      13: 0.15, // タピオカブラック
      19: 0.15, // ナンシー
      20: 0.15, // ちえこ
      25: 0.10, // まさる
      26: 0.10  // フグサシ
    }
  }
};

export const PERSONALITIES = [
  { name: 'おくびょう', bonus: { speed: 1.1, attack: 0.9 }, captureModifier: 0.8, desc: '逃げやすいが素早い' },
  { name: 'ゆうかん', bonus: { attack: 1.1, speed: 0.9 }, captureModifier: 1.0, desc: '攻撃的で捕まえやすい' },
  { name: 'のんき', bonus: { defense: 1.1, intelligence: 0.9 }, captureModifier: 1.2, desc: 'のんびりしていて警戒心が薄い' },
  { name: 'てれや', bonus: { charm: 1.1, defense: 0.9 }, captureModifier: 0.9, desc: '恥ずかしがり屋で隠れがち' },
  { name: 'おっとり', bonus: { intelligence: 1.1, attack: 0.9 }, captureModifier: 1.1, desc: '知性があり話し合いができる' }
];

export const WEATHERS = {
  Sunny: { name: '晴れ', emoji: '☀', captureModifier: 1.0 },
  Rainy: { name: '雨', emoji: '☔', captureModifier: 0.9 },
  Foggy: { name: '濃霧', emoji: '🌫', captureModifier: 0.8 },
  Snowy: { name: '雪', emoji: '❄', captureModifier: 0.95 },
  Stormy: { name: '嵐', emoji: '🌪', captureModifier: 0.7 }
};

export const ITEMS = {
  box_normal: { id: 'box_normal', name: '標準保護ボックス', price: 100, emoji: '📦', catchRate: 1.0, desc: '普通の保護用段ボール箱。' },
  box_super: { id: 'box_super', name: 'スーパー保護ボックス', price: 300, emoji: '🗃', catchRate: 1.5, desc: '少し頑丈な保護用コンテナ。' },
  box_master: { id: 'box_master', name: '特級保護ボックス', price: 1000, emoji: '🔒', catchRate: 3.0, desc: '絶対に逃がさない最新鋭の保護装置。' },
  food_standard: { id: 'food_standard', name: 'パチモンフード', price: 50, emoji: '🍖', effect: 'feed', val: 20, desc: '一般的なパチモンのエサ。お世話に使える。' },
  bait_cabbage: { id: 'bait_cabbage', name: '新鮮キャベツ', price: 80, emoji: '🥬', effect: 'bait', val: 0.3, desc: 'キャベツ太郎や草タイプが好むエサ。保護率アップ。' },
  bait_battery: { id: 'bait_battery', name: '単三乾電池', price: 80, emoji: '🔋', effect: 'bait', val: 0.3, desc: 'コンセントラや鋼タイプが好むエネルギー。保護率アップ。' },
  bait_yakitori: { id: 'bait_yakitori', name: 'ねぎま（タレ）', price: 100, emoji: '🍢', effect: 'bait', val: 0.4, desc: '美味しそうな焼き鳥。肉食系が激しく好む。' }
};

export const MONSTERS = {
  1: {
    no: 1,
    name: 'タマネギマキ',
    type: '草',
    description: '頭部のタマネギを剥くたびに涙を流す。本人もなぜ泣いているのか分かっていない。',
    classification: 'ネギ科',
    baseStats: { hp: 45, attack: 49, defense: 49, speed: 45, intelligence: 30, charm: 60 },
    favoriteFood: '新鮮キャベツ',
    spawnAreas: ['FOREST']
  },
  2: {
    no: 2,
    name: 'コンセントラ',
    type: '電気',
    description: '虎柄のコンセントプラグ。ケーブルの隙間で漏電しながら静電気を溜めている。',
    classification: 'コンセント科',
    baseStats: { hp: 35, attack: 55, defense: 30, speed: 90, intelligence: 40, charm: 50 },
    favoriteFood: '単三乾電池',
    spawnAreas: ['ABANDONED_FACTORY', 'SHOPPING_STREET']
  },
  3: {
    no: 3,
    name: 'たかし',
    type: 'ノーマル',
    description: '危険を感じると新しい段ボールへ引っ越す。中の本体を見た者はまだ誰もいない。',
    classification: 'ダンボール族',
    baseStats: { hp: 60, attack: 40, defense: 80, speed: 20, intelligence: 50, charm: 40 },
    favoriteFood: '高級段ボール',
    spawnAreas: ['SHOPPING_STREET', 'FOREST', 'BEACH']
  },
  4: {
    no: 4,
    name: 'テグミジジイ',
    type: 'エスパー',
    description: '常に腕を組み、何かを深く考えているポーズをとる。実はただ居眠りをしているだけ。',
    classification: 'ポーズ科',
    baseStats: { hp: 50, attack: 30, defense: 50, speed: 40, intelligence: 95, charm: 25 },
    favoriteFood: 'カツカレー',
    spawnAreas: ['MOUNTAIN']
  },
  5: {
    no: 5,
    name: 'ミズモチ',
    type: '水',
    description: '透き通った青いお餅のようなパチモン。つつくとぷるぷると震えて周りを水浸しにする。',
    classification: '粘土科',
    baseStats: { hp: 70, attack: 50, defense: 60, speed: 50, intelligence: 50, charm: 65 },
    favoriteFood: 'ラムネボトル',
    spawnAreas: ['BEACH']
  },
  6: {
    no: 6,
    name: 'クローナー',
    type: 'ノーマル',
    description: '自分の姿を適当に変形させて偽造するパチモン。よく見ると画質が荒い。',
    classification: '偽造生物',
    baseStats: { hp: 40, attack: 45, defense: 45, speed: 65, intelligence: 60, charm: 40 },
    favoriteFood: 'パチモンフード',
    spawnAreas: ['MARKET']
  },
  7: {
    no: 7,
    name: 'コボルドモドキ',
    type: '闘',
    description: 'ロールプレイングゲームの初期雑魚に似た見た目。棒切れを振り回して威嚇する。',
    classification: '亜人類型',
    baseStats: { hp: 55, attack: 65, defense: 45, speed: 55, intelligence: 20, charm: 35 },
    favoriteFood: 'ねぎま（タレ）',
    spawnAreas: ['UNDERGROUND']
  },
  8: {
    no: 8,
    name: 'じゅんいち',
    type: '電気',
    description: '常に気だるそうな顔をしている乾電池型パチモン。充電されると一時的にテンションが上がる。',
    classification: '乾電池科',
    baseStats: { hp: 50, attack: 35, defense: 90, speed: 30, intelligence: 45, charm: 45 },
    favoriteFood: '単三乾電池',
    spawnAreas: ['SHOPPING_STREET']
  },
  9: {
    no: 9,
    name: 'さとる',
    type: 'ゴースト',
    description: 'ジッパーで口を閉じた白い袋の人形のようなパチモン。ボタンの目でじっとこちらを見つめる。',
    classification: 'ぬいぐるみ科',
    baseStats: { hp: 40, attack: 60, defense: 40, speed: 70, intelligence: 70, charm: 10 },
    favoriteFood: 'お茶',
    spawnAreas: ['UNDERGROUND']
  },
  10: {
    no: 10,
    name: 'オワタロウ',
    type: 'ノーマル',
    description: '人生が終了したような顔文字の姿をしている。常に「＼(^o^)／」のポーズをとる。',
    classification: '顔文字',
    baseStats: { hp: 30, attack: 30, defense: 30, speed: 30, intelligence: 30, charm: 80 },
    favoriteFood: 'パチモンフード',
    spawnAreas: ['FOREST']
  },
  11: {
    no: 11,
    name: 'つよし',
    type: '炎',
    description: 'サングラスをかけた強気なカップラーメン型パチモン。お湯を入れて3分間だけ超人的なパワーを発揮する。',
    classification: 'インスタント科',
    baseStats: { hp: 50, attack: 65, defense: 40, speed: 60, intelligence: 40, charm: 60 },
    favoriteFood: '白ご飯',
    spawnAreas: ['MARKET']
  },
  12: {
    no: 12,
    name: 'ひろし',
    type: '水',
    description: 'アツアツのしょうゆラーメンの器に手足が生えたパチモン。スープが冷めると元気がなくなる。',
    classification: 'ラーメン科',
    baseStats: { hp: 45, attack: 40, defense: 85, speed: 45, intelligence: 30, charm: 40 },
    favoriteFood: '白ご飯',
    spawnAreas: ['BEACH', 'SHOPPING_STREET']
  },
  13: {
    no: 13,
    name: 'タピオカブラック',
    type: '悪',
    description: 'ストローに吸い込まれずコップの底でダーク化したタピオカの生き残り。苦味がある。',
    classification: '飲料系',
    baseStats: { hp: 50, attack: 55, defense: 50, speed: 80, intelligence: 65, charm: 30 },
    favoriteFood: 'グラニュー糖',
    spawnAreas: ['MARKET']
  },
  14: {
    no: 14,
    name: 'のりお',
    type: '電気',
    description: 'ブラウン管の画面に砂嵐を映し出す古いテレビ型パチモン。ときどき怪しい電波を受信する。',
    classification: 'テレビ科',
    baseStats: { hp: 55, attack: 50, defense: 40, speed: 75, intelligence: 35, charm: 50 },
    favoriteFood: '単三乾電池',
    spawnAreas: ['MOUNTAIN']
  },
  15: {
    no: 15,
    name: 'えみ',
    type: 'ノーマル',
    description: '鋭い三角形のシルエットを持つ黒猫型パチモン。オッドアイでこちらを観察してくる。',
    classification: 'ネコ科',
    baseStats: { hp: 40, attack: 45, defense: 35, speed: 60, intelligence: 25, charm: 85 },
    favoriteFood: 'ネコ缶',
    spawnAreas: ['SHOPPING_STREET', 'FOREST']
  },
  16: {
    no: 16,
    name: 'けんじ',
    type: '鋼',
    description: 'ネジを巻くとアヒルのようにおぼつかない足取りで歩く、ゼンマイ式パチモン。',
    classification: 'おもちゃ科',
    baseStats: { hp: 50, attack: 50, defense: 75, speed: 30, intelligence: 20, charm: 55 },
    favoriteFood: 'ガラクタ',
    spawnAreas: ['ABANDONED_FACTORY']
  },
  17: {
    no: 17,
    name: 'のりこ',
    type: '悪',
    description: 'ビニール袋の姿をしたパチモン。何でも袋の中に溜め込む癖があり、足のような紐をうねうね動かして歩く。',
    classification: 'ポリ袋科',
    baseStats: { hp: 65, attack: 45, defense: 70, speed: 25, intelligence: 40, charm: 30 },
    favoriteFood: '生ごみ',
    spawnAreas: ['ABANDONED_FACTORY', 'SHOPPING_STREET']
  },
  18: {
    no: 18,
    name: 'ゆうた',
    type: '地面',
    description: '走り回るのが大好きなスニーカー型パチモン。靴紐を器用に結び直してスピードを上げる。',
    classification: 'クツ科',
    baseStats: { hp: 55, attack: 55, defense: 60, speed: 45, intelligence: 50, charm: 45 },
    favoriteFood: 'ジャガイモ',
    spawnAreas: ['MOUNTAIN']
  },
  19: {
    no: 19,
    name: 'ナンシー',
    type: 'エスパー',
    description: '名前を呼ぶと念力でスプーンを曲げてくる。ただし自分のスプーンではなく他人の物。',
    classification: '超能力者風',
    baseStats: { hp: 45, attack: 35, defense: 45, speed: 70, intelligence: 85, charm: 50 },
    favoriteFood: 'いちごパフェ',
    spawnAreas: ['MARKET']
  },
  20: {
    no: 20,
    name: 'ちえこ',
    type: '炎',
    description: 'サクサクの衣をまとったエビフライ型パチモン。しっぽをパタパタ動かして、美味しそうな匂いを振りまく。',
    classification: '揚げ物科',
    baseStats: { hp: 40, attack: 60, defense: 35, speed: 65, intelligence: 30, charm: 60 },
    favoriteFood: 'ねぎま（タレ）',
    spawnAreas: ['SHOPPING_STREET', 'MARKET']
  },
  21: {
    no: 21,
    name: 'ぬるぽ',
    type: 'エスパー',
    description: 'この名前を聞いたシステムエンジニアは、反射的に「ガッ」と叩きたくなってしまう呪い。',
    classification: 'システムエラー',
    baseStats: { hp: 40, attack: 50, defense: 40, speed: 75, intelligence: 80, charm: 40 },
    favoriteFood: 'エラーログ',
    spawnAreas: ['UNDERGROUND']
  },
  22: {
    no: 22,
    name: 'しげる',
    type: '草',
    description: '生い茂る葉っぱの中に潜むダンディな茂みパチモン。立派なヒゲを蓄えている。',
    classification: '茂み科',
    baseStats: { hp: 45, attack: 45, defense: 40, speed: 50, intelligence: 35, charm: 70 },
    favoriteFood: '新鮮キャベツ',
    spawnAreas: ['FOREST']
  },
  23: {
    no: 23,
    name: 'たえこ',
    type: '地面',
    description: '象の姿をした掃除機型パチモン。長い鼻で落ちているゴミやホコリをダイナミックに吸い込む。',
    classification: '家電科',
    baseStats: { hp: 50, attack: 45, defense: 70, speed: 50, intelligence: 60, charm: 40 },
    favoriteFood: 'ガラクタ',
    spawnAreas: ['ABANDONED_FACTORY', 'UNDERGROUND']
  },
  24: {
    no: 24,
    name: 'ニセドラ',
    type: 'ドラゴン',
    description: 'ドラゴンを自称するトカゲ。紙で作った翼を背中に貼り付けて飛ぶ練習をしている。',
    classification: '自称竜族',
    baseStats: { hp: 60, attack: 70, defense: 55, speed: 55, intelligence: 40, charm: 45 },
    favoriteFood: 'トカゲのエサ',
    spawnAreas: ['MOUNTAIN']
  },
  25: {
    no: 25,
    name: 'まさる',
    type: 'ノーマル',
    description: '海苔のベストを粋に着こなすおにぎり型パチモン。中身が鮭なのか梅なのかは本人も知らない。',
    classification: 'おにぎり科',
    baseStats: { hp: 50, attack: 40, defense: 50, speed: 45, intelligence: 40, charm: 75 },
    favoriteFood: '白ご飯',
    spawnAreas: ['SHOPPING_STREET']
  },
  26: {
    no: 26,
    name: 'フグサシ',
    type: '氷',
    description: '皿の上に美しく並べられたフグの刺身が一枚に合体して飛び跳ねている姿。毒はない。',
    classification: '刺身',
    baseStats: { hp: 40, attack: 45, defense: 45, speed: 70, intelligence: 40, charm: 55 },
    favoriteFood: 'ポン酢',
    spawnAreas: ['BEACH']
  },
  27: {
    no: 27,
    name: 'あきお',
    type: '草',
    description: '哀愁漂う表情をした赤いきのこのパチモン。毒はないが、近づくと少し湿っぽい気持ちになる。',
    classification: 'キノコ科',
    baseStats: { hp: 50, attack: 40, defense: 50, speed: 40, intelligence: 35, charm: 80 },
    favoriteFood: '新鮮キャベツ',
    spawnAreas: ['SHOPPING_STREET']
  },
  28: {
    no: 28,
    name: 'サンタモドキ',
    type: '氷',
    description: '赤い帽子を被り、年中プレゼント袋を引きずっている。中身はただの石ころ。',
    classification: '擬似聖者',
    baseStats: { hp: 65, attack: 45, defense: 55, speed: 40, intelligence: 55, charm: 60 },
    favoriteFood: 'クッキー',
    spawnAreas: ['MOUNTAIN']
  },
  29: {
    no: 29,
    name: 'クマネコ',
    type: '格闘',
    description: 'パンダのようだが、非常に肉体派で笹の代わりに鉄柱をへし折るパワー系パチモン。',
    classification: '肉体派',
    baseStats: { hp: 70, attack: 80, defense: 60, speed: 45, intelligence: 30, charm: 50 },
    favoriteFood: '新鮮キャベツ',
    spawnAreas: ['FOREST']
  },
  30: {
    no: 30,
    name: 'よしこ',
    type: '炎',
    description: 'お湯が沸くと嬉しそうに甲高い声で鳴く、黄色いケトル型のパチモン。',
    classification: 'ヤカン科',
    baseStats: { hp: 55, attack: 65, defense: 75, speed: 30, intelligence: 30, charm: 40 },
    favoriteFood: 'お茶',
    spawnAreas: ['ABANDONED_FACTORY']
  },
};

export const EVOLUTIONS = {
  1: { level: 16, targetNo: 22 },  // タマネギマキ -> しげる
  22: { level: 32, targetNo: 29 }, // しげる -> クマネコ

  2: { level: 15, targetNo: 8 },   // コンセントラ -> じゅんいち
  8: { level: 30, targetNo: 14 },  // じゅんいち -> のりお

  5: { level: 15, targetNo: 12 },  // ミズモチ -> ひろし
  12: { level: 30, targetNo: 26 }, // ひろし -> フグサシ

  3: { level: 15, targetNo: 10 },  // たかし -> オワタロウ
  10: { level: 30, targetNo: 25 }  // オワタロウ -> まさる
};
