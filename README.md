# Серверная часть EDF web_adapter
Данная сборка представляет собой серверную часть ВЕБ-модуля для системы EDF, написанная на JavaScript (node.js)
на базе веб-сервера express.js. Служит прослойкой для формирования корректных запросов к EDF API и подготовки данных
для FRONTEND.

## Используемые технологии и модули

 - Node.js v8 and up
 - Vanilla javascript
 - Express.js 4.0
 - axios
 - winston.js 3.0 (логирование)


## Требования

 - [Node v8+](https://nodejs.org/en/download/current/)
 - [Yarn](https://yarnpkg.com/en/docs/install)
 - [pm2](http://pm2.keymetrics.io/)

## Установка и развертование

Устанавливаем зависимости:

```bash
yarn
```

Устанавливаем переменные окружения:

```bash
cp .env.example .env
```

При необходимости меняем в файле окружения .env переменную EDF_URI на адрес EDF API, к которому будет обращаться система

## Запуск для локальных тестов

```bash
yarn dev
```

## Запуск сервера в Development

```bash
yarn pmstart
```

## Запуск сервера в Production

```bash
yarn start
```


## Документация

```bash
# Генерирует open api documentation
yarn docs
```

