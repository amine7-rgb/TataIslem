# TataIslem

Official Tata Islem project repository.

## Structure

- `backend/`: Node.js + Express API, authentication, Stripe, email workflows, calendar sync and admin logic
- `Tataislem/`: React + Vite frontend, showcase website, dashboards and client experience

## Local development

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd Tataislem
npm install
npm run dev
```

## Notes

- Use `backend/.env.example` and `Tataislem/.env.example` as templates for local configuration.
- Do not commit real `.env` files or local Stripe / Google secrets.
