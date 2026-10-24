# Valery's Calculator

A responsive five-operation calculator built with React + TypeScript, an ASP.NET Core .NET 10 API, and a Supabase PostgreSQL history table. Saved calculations are scoped to the browser that created them.

## Live site

Try the calculator at <https://valery2492.github.io/calculator/>. Calculations work in the browser and history is saved in that browser. Database-backed history requires a hosted .NET API with the Supabase connection configured.

## Operations

- Addition, subtraction, multiplication, division
- Percentage of a number (for example, 15% of 200 = 30)

## Run locally

1. Install Node.js and the .NET 10 SDK.
2. In `server/Calculator.Api`, set `ConnectionStrings:Supabase` (or `SUPABASE_DB_CONNECTION`) to a Supabase Postgres connection string.
3. Run the SQL in `database/migrations/001_calculation_history.sql` in the Supabase SQL Editor.
4. Start the API with `dotnet run --project server/Calculator.Api` (local URL: `http://localhost:5000`).
5. In the project root, run `npm install` and `npm run dev`.

The Vite preview works without the API and saves a temporary history in browser local storage. When the local API is running, Vite proxies `/api` requests to it. With Supabase configured, calculations and history are stored in Supabase.

## Configuration

- `VITE_API_URL`: deployed .NET API base URL. Leave blank for the local Vite + API proxy/origin setup.
- `SUPABASE_DB_CONNECTION`: server-only Supabase PostgreSQL connection string.
- `FRONTEND_ORIGIN`: allowed browser origin for API CORS.

The database credential belongs only on the API host. Do not put it in React environment variables or commit it.
