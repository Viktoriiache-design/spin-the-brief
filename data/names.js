/* Назви компаній за мовами.
   Для японської та корейської кожен запис — об'єкт:
   { orig: оригінал, latin: латинська транскрипція, meaning: зміст назви українською }.
   Для інших мов — просто рядок. */
window.SPIN_DATA = window.SPIN_DATA || {};

window.SPIN_DATA.names = [
  {
    code: "uk", flag: "🇺🇦", label: "українська",
    names: [
      "Перелесник", "Ліхтарня", "Тиха Гавань", "Лелека", "Зерно", "Глина й Вогонь",
      "Вишневий Сад", "Ковила", "Мавка Студіо", "Дніпрова Хвиля", "Рута", "Чорнобривці",
      "Медова Хата", "Зоряне Поле", "Полин", "Вітрило", "Буревій", "Сорока Лаб",
      "Дивосвіт", "Тепла Ковдра", "Смерека", "Їжак у Тумані", "Берегиня", "Кавова Гуща",
      "Синиця", "Золота Нитка", "Камінь і Мох", "Квасоля", "Гречка Груп", "Добрий Ранок",
      "Соняшник і Ко", "Світанкова", "Морквяна Лабораторія", "Криниця"
    ]
  },
  {
    code: "en", flag: "🇬🇧", label: "англійська",
    names: [
      "Northbound Studio", "Halfmoon Supply Co.", "Brightwell", "Copper & Fern", "Quietly",
      "Larkspur Labs", "Tidewater", "Oddfellow Goods", "Kindred Thread", "Bramblewood",
      "Little Harbor", "Saltmarsh", "Fieldwise", "Wildgrain", "Ironbark", "Hollow Pine",
      "Meadowlark & Co.", "Paper Kite", "Blue Hour Co.", "Silverline Works", "Mossgrove",
      "Lantern & Key", "Goodfolk", "Sundown Atelier", "Driftwood Collective", "Foxglove",
      "Thistle & Thorn", "Ember Hall", "Otterly", "Highwater", "Cloudberry", "Ninth Wave"
    ]
  },
  {
    code: "fr", flag: "🇫🇷", label: "французька",
    names: [
      "Maison Lunelle", "Atelier Brume", "Le Petit Phare", "Clair de Lune Studio",
      "Les Grains d'Or", "Belle Écorce", "Maison Ciel", "Plume & Sel", "Le Jardin Secret",
      "Atelier Coquelicot", "Douce Rive", "La Fabrique Bleue", "Rêve d'Ambre",
      "Maison Velours", "L'Heure Dorée", "Bonne Étoile", "Les Petites Mains",
      "Sous le Tilleul", "Pain & Poésie", "Maison Mirabelle", "Écume", "Fil d'Ariane",
      "Tournesol", "Ricochet", "Vent du Nord", "Chez Margot", "Calme Plat",
      "Les Belles Heures", "Ombre & Lin", "Pomme de Pin", "Brin de Folie"
    ]
  },
  {
    code: "it", flag: "🇮🇹", label: "італійська",
    names: [
      "Casa Lucciola", "Bottega Salvia", "Officina Aurora", "Vento d'Oro", "Studio Girasole",
      "Il Melograno", "Terra Chiara", "Luna Piena", "Fiordaliso", "Atelier Brezza",
      "La Corte Antica", "Ponte Rosso", "Dolce Riva", "Pietra Viva", "Ulivo & Co.",
      "Nuvola Bianca", "Il Faro Blu", "Casa Mirtillo", "Bottega del Sole", "Onda Lenta",
      "Fuoco Lento", "Selva Scura", "Prato Fiorito", "Gelsomina", "Lanterna Magica",
      "La Rondine", "Ombra Lunga", "Cielo Terso", "Filo d'Erba", "Sale & Pepe",
      "Alba Nuova", "Granello"
    ]
  },
  {
    code: "es", flag: "🇪🇸", label: "іспанська",
    names: [
      "Casa Colibrí", "El Faro Azul", "Tierra Roja", "Brisa Marina", "Rincón Dorado",
      "Agua Clara", "La Huerta Viva", "Sol y Sombra", "Taller Amapola", "Cielo Abierto",
      "Mar de Fondo", "Pequeño Bosque", "El Tintero", "Alma Salvaje", "La Ola Lenta",
      "Barro & Fuego", "Nube Naranja", "Casa Jacarandá", "Lucero", "El Molinillo",
      "Raíz Profunda", "Viento Sur", "Hoja Nueva", "La Linterna", "Puerto Quieto",
      "Flor de Sal", "Duende Lab", "Mariposa Negra", "Arena Blanca", "Siete Lunas",
      "Cardo & Miel"
    ]
  },
  {
    code: "pl", flag: "🇵🇱", label: "польська",
    names: [
      "Wrzos", "Leśna Polana", "Bursztynowy Brzeg", "Pracownia Jaskółka", "Złota Nić",
      "Cisza Studio", "Kawka i Spółka", "Jodła", "Mglisty Poranek", "Szuwary", "Rumianek",
      "Biały Kruk", "Zielony Mostek", "Czereśnia", "Pod Lipą", "Dziki Ogród", "Wiatrak",
      "Słoneczny Stok", "Kłos", "Modraszek", "Borówka Lab", "Iskra", "Szpak", "Puszcza",
      "Ciepłe Kąty", "Rzeczka", "Mak i Len", "Zorza", "Sowa i Spółka", "Jarzębina",
      "Pracownia Sikorka"
    ]
  },
  {
    code: "ja", flag: "🇯🇵", label: "японська",
    names: [
      { orig: "月灯舎", latin: "Tsukiakari-sha", meaning: "Дім місячного світла" },
      { orig: "木漏れ日工房", latin: "Komorebi Kōbō", meaning: "Майстерня сонця крізь листя" },
      { orig: "青嵐堂", latin: "Seiran-dō", meaning: "Зала свіжого літнього вітру" },
      { orig: "小春屋", latin: "Koharu-ya", meaning: "Крамниця «бабиного літа»" },
      { orig: "白波商会", latin: "Shiranami Shōkai", meaning: "Торговий дім «Білі хвилі»" },
      { orig: "星屑デザイン", latin: "Hoshikuzu Dezain", meaning: "Дизайн «Зоряний пил»" },
      { orig: "風見鶏", latin: "Kazamidori", meaning: "Флюгер-півник" },
      { orig: "朝凪", latin: "Asanagi", meaning: "Ранкове затишшя на морі" },
      { orig: "花筏", latin: "Hanaikada", meaning: "Пліт із пелюсток на воді" },
      { orig: "灯台舎", latin: "Tōdai-sha", meaning: "Дім маяка" },
      { orig: "銀杏堂", latin: "Ichō-dō", meaning: "Зала гінкго" },
      { orig: "雪見工房", latin: "Yukimi Kōbō", meaning: "Майстерня споглядання снігу" },
      { orig: "夕凪", latin: "Yūnagi", meaning: "Вечірнє безвітря" },
      { orig: "紬屋", latin: "Tsumugi-ya", meaning: "Крамниця шовкової пряжі" },
      { orig: "蛍火", latin: "Hotarubi", meaning: "Світло світлячків" },
      { orig: "千鳥", latin: "Chidori", meaning: "Тисяча пташок (зграя куликів)" },
      { orig: "森のしずく", latin: "Mori no Shizuku", meaning: "Краплина лісу" },
      { orig: "和み庵", latin: "Nagomi-an", meaning: "Хатинка спокою" },
      { orig: "空色舎", latin: "Sorairo-sha", meaning: "Дім небесного кольору" },
      { orig: "紅葉堂", latin: "Momiji-dō", meaning: "Зала осіннього клена" },
      { orig: "波音", latin: "Namioto", meaning: "Шум хвиль" },
      { orig: "茜屋", latin: "Akane-ya", meaning: "Крамниця вечірньої заграви" },
      { orig: "宵月", latin: "Yoizuki", meaning: "Вечірній місяць" },
      { orig: "鈴蘭", latin: "Suzuran", meaning: "Конвалія" },
      { orig: "灯り家", latin: "Akari-ya", meaning: "Дім світла" },
      { orig: "山吹工房", latin: "Yamabuki Kōbō", meaning: "Майстерня жовтої керрії" },
      { orig: "渚", latin: "Nagisa", meaning: "Морський берег" },
      { orig: "藍染工房", latin: "Aizome Kōbō", meaning: "Майстерня фарбування індиго" },
      { orig: "晴れ間", latin: "Harema", meaning: "Прояснення між дощами" },
      { orig: "ひだまり", latin: "Hidamari", meaning: "Сонячна плямка" },
      { orig: "結び", latin: "Musubi", meaning: "Вузлик, що поєднує" },
      { orig: "竹とんぼ", latin: "Taketonbo", meaning: "Бамбукова бабка (іграшка)" }
    ]
  },
  {
    code: "ko", flag: "🇰🇷", label: "корейська",
    names: [
      { orig: "달빛공방", latin: "Dalbit Gongbang", meaning: "Майстерня місячного світла" },
      { orig: "하늘정원", latin: "Haneul Jeongwon", meaning: "Небесний сад" },
      { orig: "소나무집", latin: "Sonamu-jip", meaning: "Дім під сосною" },
      { orig: "바람길", latin: "Baramgil", meaning: "Стежка вітру" },
      { orig: "꽃잎상회", latin: "Kkochip Sanghoe", meaning: "Торговий дім «Пелюстка»" },
      { orig: "온새미로", latin: "Onsaemiro", meaning: "Завжди таким, як є" },
      { orig: "윤슬", latin: "Yunseul", meaning: "Сонячні відблиски на воді" },
      { orig: "다온", latin: "Daon", meaning: "Добро, що приходить" },
      { orig: "미리내", latin: "Mirinae", meaning: "Чумацький Шлях" },
      { orig: "노을빛", latin: "Noeulbit", meaning: "Світло заходу сонця" },
      { orig: "새벽별", latin: "Saebyeokbyeol", meaning: "Світанкова зірка" },
      { orig: "가람", latin: "Garam", meaning: "Річка" },
      { orig: "아라", latin: "Ara", meaning: "Море" },
      { orig: "솔빛", latin: "Solbit", meaning: "Світло сосни" },
      { orig: "도담", latin: "Dodam", meaning: "Рости здоровим і гарним" },
      { orig: "숲속상점", latin: "Supsok Sangjeom", meaning: "Крамниця в лісі" },
      { orig: "별누리", latin: "Byeolnuri", meaning: "Світ зірок" },
      { orig: "마루", latin: "Maru", meaning: "Вершина; дерев'яна підлога" },
      { orig: "해오름", latin: "Haeoreum", meaning: "Схід сонця" },
      { orig: "그린나래", latin: "Geurinnare", meaning: "Намальовані крила" },
      { orig: "여울", latin: "Yeoul", meaning: "Перекат на річці" },
      { orig: "이슬방울", latin: "Iseulbangul", meaning: "Росинка" },
      { orig: "봄내음", latin: "Bomnaeeum", meaning: "Запах весни" },
      { orig: "고운결", latin: "Goungyeol", meaning: "Ніжна фактура" },
      { orig: "단비", latin: "Danbi", meaning: "Довгоочікуваний дощ" },
      { orig: "담다", latin: "Damda", meaning: "Наповнювати, вкладати" },
      { orig: "나린", latin: "Narin", meaning: "Та, що зійшла з неба" },
      { orig: "비움", latin: "Bium", meaning: "Спорожнення, вільний простір" },
      { orig: "모아", latin: "Moa", meaning: "Зібрати разом" },
      { orig: "초롱", latin: "Chorong", meaning: "Ліхтарик" },
      { orig: "은하수랩", latin: "Eunhasu Lab", meaning: "Лабораторія «Галактика»" },
      { orig: "꿈마루", latin: "Kkummaru", meaning: "Вершина мрії" }
    ]
  }
];
