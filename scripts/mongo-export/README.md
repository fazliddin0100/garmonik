Mongo export fayllarni shu papkaga joylang:

- `clinic-json-resources.json`
- `staff-portal-users.json`

Ixtiyoriy:
- `admin-user.json` (bo‘lmasa admin env orqali yaratiladi)

Yoki `.env.local` orqali custom yo‘l bering:

- `MONGO_ADMIN_JSON_PATH=...`
- `MONGO_CLINIC_RESOURCES_JSON_PATH=...`
- `MONGO_STAFF_JSON_PATH=...`

Import:

`npm run db:import:mongo-export`

