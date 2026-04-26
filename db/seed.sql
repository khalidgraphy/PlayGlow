-- WordGlow seed: 50 starter words across 5 categories
-- Difficulty 1 = simplest (concrete nouns), 2 = slightly harder
-- emoji column lets us launch without uploading 50 images to R2

INSERT INTO words (word_en, word_ar, word_ur, category, difficulty, image_filename, emoji) VALUES
-- Animals (12)
('cat',      'قطة',     'بلی',    'animal', 1, 'cat.jpg',     '🐱'),
('dog',      'كلب',     'کتا',    'animal', 1, 'dog.jpg',     '🐶'),
('cow',      'بقرة',    'گائے',   'animal', 1, 'cow.jpg',     '🐄'),
('horse',    'حصان',    'گھوڑا',  'animal', 1, 'horse.jpg',   '🐴'),
('sheep',    'خروف',    'بھیڑ',   'animal', 1, 'sheep.jpg',   '🐑'),
('lion',     'أسد',     'شیر',    'animal', 1, 'lion.jpg',    '🦁'),
('elephant', 'فيل',     'ہاتھی',  'animal', 2, 'elephant.jpg','🐘'),
('monkey',   'قرد',     'بندر',   'animal', 1, 'monkey.jpg',  '🐵'),
('bird',     'طائر',    'پرندہ',  'animal', 1, 'bird.jpg',    '🐦'),
('fish',     'سمكة',    'مچھلی',  'animal', 1, 'fish.jpg',    '🐟'),
('rabbit',   'أرنب',    'خرگوش',  'animal', 1, 'rabbit.jpg', '🐰'),
('mouse',    'فأر',     'چوہا',   'animal', 1, 'mouse.jpg',   '🐭'),

-- Colors (8)
('red',    'أحمر',  'سرخ',  'color', 1, 'red.jpg',    '🔴'),
('blue',   'أزرق',  'نیلا', 'color', 1, 'blue.jpg',   '🔵'),
('green',  'أخضر',  'ہرا',  'color', 1, 'green.jpg',  '🟢'),
('yellow', 'أصفر',  'پیلا', 'color', 1, 'yellow.jpg', '🟡'),
('black',  'أسود',  'کالا', 'color', 1, 'black.jpg',  '⚫'),
('white',  'أبيض',  'سفید', 'color', 1, 'white.jpg',  '⚪'),
('orange', 'برتقالي','نارنجی','color',1,'orange.jpg', '🟠'),
('purple', 'بنفسجي','جامنی','color', 2, 'purple.jpg', '🟣'),

-- Food (12)
('apple',      'تفاحة',  'سیب',    'food', 1, 'apple.jpg',     '🍎'),
('banana',     'موز',    'کیلا',   'food', 1, 'banana.jpg',    '🍌'),
('orange_fruit','برتقال','مالٹا',  'food', 1, 'orange_fruit.jpg','🍊'),
('grapes',     'عنب',    'انگور',  'food', 1, 'grapes.jpg',    '🍇'),
('mango',      'مانجو',  'آم',     'food', 1, 'mango.jpg',     '🥭'),
('bread',      'خبز',    'روٹی',   'food', 1, 'bread.jpg',     '🍞'),
('rice',       'أرز',    'چاول',   'food', 1, 'rice.jpg',      '🍚'),
('milk',       'حليب',   'دودھ',   'food', 1, 'milk.jpg',      '🥛'),
('water',      'ماء',    'پانی',   'food', 1, 'water.jpg',     '💧'),
('egg',        'بيضة',   'انڈا',   'food', 1, 'egg.jpg',       '🥚'),
('cheese',     'جبن',    'پنیر',   'food', 2, 'cheese.jpg',    '🧀'),
('cake',       'كعكة',   'کیک',    'food', 1, 'cake.jpg',      '🍰'),

-- Body parts (8)
('eye',   'عين',  'آنکھ', 'body', 1, 'eye.jpg',   '👁️'),
('ear',   'أذن',  'کان',  'body', 1, 'ear.jpg',   '👂'),
('nose',  'أنف',  'ناک',  'body', 1, 'nose.jpg',  '👃'),
('mouth', 'فم',   'منہ',  'body', 1, 'mouth.jpg', '👄'),
('hand',  'يد',   'ہاتھ', 'body', 1, 'hand.jpg',  '✋'),
('foot',  'قدم',  'پاؤں', 'body', 1, 'foot.jpg',  '🦶'),
('hair',  'شعر',  'بال',  'body', 1, 'hair.jpg',  '💇'),
('tooth', 'سن',   'دانت', 'body', 2, 'tooth.jpg', '🦷'),

-- Actions / common (10)
('run',   'يجري',  'دوڑنا',  'action', 2, 'run.jpg',   '🏃'),
('jump',  'يقفز',  'کودنا',  'action', 2, 'jump.jpg',  '🤸'),
('eat',   'يأكل',  'کھانا',  'action', 1, 'eat.jpg',   '🍽️'),
('drink', 'يشرب',  'پینا',   'action', 1, 'drink.jpg', '🥤'),
('sleep', 'ينام',  'سونا',   'action', 2, 'sleep.jpg', '😴'),
('sun',   'شمس',   'سورج',   'nature', 1, 'sun.jpg',   '☀️'),
('moon',  'قمر',   'چاند',   'nature', 1, 'moon.jpg',  '🌙'),
('star',  'نجمة',  'ستارہ',  'nature', 1, 'star.jpg',  '⭐'),
('tree',  'شجرة',  'درخت',   'nature', 1, 'tree.jpg',  '🌳'),
('car',   'سيارة', 'گاڑی',   'object', 1, 'car.jpg',   '🚗');
