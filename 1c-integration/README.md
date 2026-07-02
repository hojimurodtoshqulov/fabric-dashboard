# 1C Enterprise 8.3 → Selxozmash CRM Integration

**Система:** 1С:Предприятие 8.3 (8.3.25.1374)  
**Конфигурация:** Бухгалтерия предприятия для Узбекистана, ред. 1.2 (Fides Solutions)

## Файлы

| Файл | Назначение |
|------|-----------|
| `CRMАПИСервер.bsl` | Общий модуль — авторизация, JSON, утилиты |
| `CRMAPI_HTTPСервис.bsl` | Модуль HTTP сервиса — все 6 эндпоинтов |
| `CRMAPI_Настройка.md` | Пошаговая настройка в Конфигураторе |

## Быстрый старт

1. Создать Общий модуль `CRMАПИСервер` — вставить код из `CRMАПИСервер.bsl`
2. Создать HTTP сервис `CRMAPI` по инструкции в `CRMAPI_Настройка.md`
3. Добавить Константы (логин, пароль, токен)
4. Опубликовать на веб-сервере
5. Проверить через cURL

## Эндпоинты

```
GET /hs/crm/v1/clients
GET /hs/crm/v1/contracts
GET /hs/crm/v1/invoices
GET /hs/crm/v1/payments
GET /hs/crm/v1/debts
GET /hs/crm/v1/client-financial-summary/{client_id}
```

Базовый URL: `http://<сервер>/<публикация>/hs/crm/v1/`
