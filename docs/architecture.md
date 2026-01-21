# Минимальная архитектура проекта

## Текущая структура (анализ)

```
src/
├── __tests__/              # Корневые тесты
├── bootstrap/              # Загрузчики/инициализация
├── composers/             # Композеры (DI-композиция)
├── config/                # Конфигурация
├── domain/                # Доменная логика
│   ├── errors/           # Доменные ошибки
│   └── services/         # Доменные сервисы
├── entities/             # Сущности БД
├── infrastructure/       # Инфраструктура
│   ├── featureFlags/     # Хранилища флагов
│   └── session/         # Сессии (БД/в памяти)
├── migrations/          # Миграции БД
├── presentation/        # Презентационный слой
│   └── bot/           # Telegram-бот
│       ├── __tests__/
│       ├── handlers/
│       └── middleware/
├── qBittorrent/       # Клиент qBittorrent
├── searchEngines/      # Поисковые движки
├── scripts/           # Скрипты миграций
├── utils/             # Утилиты
└── [файлы в корне]   # index.ts, di.ts, logger.ts, etc.
```

## Предлагаемая минимальная архитектура

```
src/
├── config/                      # Конфигурация приложения
│   ├── env.schema.ts           # Схема окружения (в camelCase: envSchema.ts)
│   └── app.config.ts          # Конфиг приложения (в camelCase: appConfig.ts)
│
├── domain/                      # Доменная логика (чистая)
│   ├── entities/              # Сущности (ChatSession.ts, User.ts, etc.)
│   ├── errors/                # Доменные ошибки (AppError.ts)
│   └── services/              # Доменные сервисы (TorrentService.ts, etc.)
│
├── infrastructure/              # Внешние зависимости
│   ├── persistence/           # Доступ к данным
│   │   ├── migrations/        # Миграции БД
│   │   ├── repositories/      # Репозитории (TorrentMetaRepository.ts)
│   │   └── orm.ts           # ORM конфигурация
│   ├── session/              # Управление сессиями
│   │   ├── stores/          # Хранилища (DbSessionStore.ts, InMemorySessionStore.ts)
│   │   └── cleanup.ts       # Очистка сессий
│   ├── featureFlags/         # Флаги функций
│   │   └── stores/          # (InMemoryFeatureFlagStore.ts)
│   ├── qBittorrent/         # Клиент qBittorrent
│   │   ├── QBittorrentClient.ts
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   └── models.ts
│   └── searchEngines/        # Поисковые движки
│       ├── SearchEngine.ts
│       ├── RutrackerSearchEngine.ts
│       └── schemas.ts
│
├── presentation/               # Презентационный слой
│   └── bot/                  # Telegram-бот
│       ├── handlers/         # Обработчики команд
│       ├── middleware/       # Middleware
│       └── CommandsRegistry.ts
│
├── application/                # Прикладной слой (композеры)
│   └── composers/           # DI-композиция
│       └── AuthComposer.ts
│
├── bootstrap/                  # Загрузчики
│   └── [инициализация DI, сервера]
│
├── shared/                     # Общие утилиты и типы
│   ├── utils/                # Утилиты (formatBytes.ts, formatDuration.ts)
│   ├── types/                # Общие типы (types.ts)
│   ├── logger.ts             # Логирование
│   └── dayjs.ts             # Расширения dayjs
│
└── [точки входа]               # index.ts, di.ts, orm.ts
```

## Обязанности папок

### config/
Конфигурация приложения — переменные окружения, настройки.

### domain/
Чистая доменная логика без зависимостей от внешних систем.

#### domain/entities/
Сущности домена (ORM-модели).

#### domain/errors/
Кастомные ошибки домена.

#### domain/services/
Бизнес-логика, оперирующая сущностями.

### infrastructure/
Внешние зависимости и адаптеры.

#### infrastructure/persistence/
Доступ к данным: репозитории, миграции, ORM.

#### infrastructure/session/
Управление сессиями пользователей.

#### infrastructure/featureFlags/
Хранилища флагов функций.

#### infrastructure/qBittorrent/
Клиент для работы с qBittorrent.

#### infrastructure/searchEngines/
Реализации поисковых движков.

### presentation/
Слой взаимодействия с внешним миром (Telegram-бот).

### application/
Композеры и оркестрация зависимостей (DI).

### shared/
Общие утилиты, типы, логирование — всё, что не относится к конкретному слою.

## Точки входа

- `index.ts` — основной вход приложения
- `di.ts` — DI-контейнер
- `orm.ts` — ORM инициализация

## План миграции

1. Переместить `entities/` → `domain/entities/`
2. Переместить `domain/errors/` — оставить в `domain/errors/`
3. Переместить `domain/services/` — оставить в `domain/services/`
4. Переместить `infrastructure/featureFlags/` → `infrastructure/featureFlags/` (уже правильно)
5. Переместить `infrastructure/session/` → `infrastructure/session/` (уже правильно)
6. Переместить `migrations/` → `infrastructure/persistence/migrations/`
7. Переместить `qBittorrent/` → `infrastructure/qBittorrent/`
8. Переместить `searchEngines/` → `infrastructure/searchEngines/`
9. Переместить `composers/` → `application/composers/`
10. Переместить `utils/` → `shared/utils/`
11. Создать `shared/` и перенести туда `logger.ts`, `dayjs.ts`, `fluent.ts`, `types.ts`
12. Оставить `bootstrap/` как есть

## Зачем эта структура?

- **Чистое разделение слоёв** — домен не зависит от инфраструктуры
- **Минимальная глубина** — максимум 3-4 уровня вложенности
- **Ясная ответственность** — каждая папка имеет понятную цель
- **Удобное масштабирование** — легко добавлять новые сущности/сервисы
