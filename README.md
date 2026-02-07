# TAYN POS Desktop

Electron.js da yozilgan offline POS tizimi.

## Xususiyatlari

- **Offline ishlash**: Local PostgreSQL bilan ishlaydi
- **Sinxronizatsiya**: Internet yongan vaqt server bilan ma'lumotlarni sinxronizatsiya qiladi
- **Mahalliy ma'lumotlar bazasi**: Dasturga kirgan vaqt serverdan kerakli ma'lumotlarni yuklab oladi
- **To'liq funksional POS**: Mahsulot qidirish, savat, to'lov, mijoz boshqaruvi

## Talablar

- Node.js 16+
- PostgreSQL 12+
- Internet (sinxronizatsiya uchun)

## O'rnatish

```bash
# Papkaga o'tish
cd desktop

# Package'lar o'rnatish
npm install

# PostgreSQL da bazani yaratish
createdb tayn_pos_local
```

## Ishga tushirish

```bash
# Development rejimida
npm run dev

# Production uchun build
npm run build

# Applicationni ishga tushirish
npm start
```

## Ma'lumotlar bazasi sozlamalari

Ma'lumotlar bazasi sozlamalari `src/services/database.js` da o'zgartirilishi mumkin:

```javascript
connection: {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'tayn_pos_local'
}
```

## Server sozlamalari

Server URL `src/services/sync.js` da o'zgartirilishi mumkin:

```javascript
this.serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
```

## Build

```bash
# Mac uchun
npm run build

# Windows uchun
npm run build:win

# Linux uchun
npm run build:linux
```

## Struktura

```
desktop/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Preload script
│   ├── services/
│   │   ├── database.js      # Local PostgreSQL service
│   │   └── sync.js          # Sync service
│   └── renderer/
│       ├── App.jsx          # Main React app
│       ├── index.js         # React entry point
│       └── components/      # POS components
├── public/
│   └── index.html           # HTML template
├── webpack.renderer.config.js # Webpack config
└── package.json
```

## Sinxronizatsiya jarayoni

1. Dastur ishga tushganda internet borligini tekshiradi
2. Internet bo'lsa, serverdan ma'lumotlarni yuklab local ga saqlaydi
3. Offline rejimda faqat local ma'lumotlar bazasi bilan ishlaydi
4. Internet yangan vaqt local'dagi o'zgarishlarni serverga yuboradi
# tayn_desktop
