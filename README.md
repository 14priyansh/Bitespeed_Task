The link after hosting it on render---https://bitespeed-task-9g3n.onrender.com/

To check the project u can use this link in postman add identify to ....com/(to the link pasted )

# Bitespeed Identity Reconciliation API

This project is a RESTful API built with **Node.js**, **Express**, **TypeScript**, and **Prisma** (PostgreSQL) for identity reconciliation.  
It exposes a `/identify` endpoint to manage and consolidate user contact information.

---

## Features

- REST API with `/identify` POST endpoint
- Identity reconciliation logic for emails and phone numbers
- Built with TypeScript, Express, and Prisma ORM
- PostgreSQL database support

---

## Getting Started

### 1. Clone the Repository

```sh
git clone https://github.com/your-username/Bitespeed_Task.git
cd Bitespeed_Task
```

---

### 2. Install Dependencies

```sh
npm install
```

---

### 3. Set Up Environment Variables

- Copy `.env.example` to `.env`:

  ```sh
  cp .env.example .env
  ```

- Edit `.env` and set your PostgreSQL `DATABASE_URL` (you can use [Render.com](https://render.com/) or a local Postgres instance):

  ```
  DATABASE_URL=your_postgres_connection_string
  PORT=3000
  ```

---

### 4. Run Database Migrations

```sh
npx prisma migrate dev --name init
```

---

### 5. Generate Prisma Client

```sh
npx prisma generate
```

---

### 6. Build and Start the Server

```sh
npm run build
npm start
```

The server will run at `http://localhost:3000`.

---

## Testing the API Locally with Postman

1. **Open Postman**.
2. **Create a new POST request** to:  
   ```
   http://localhost:3000/identify
   ```
3. **Set the request body** to `raw` and select `JSON`.
4. **Example JSON body:**
   ```json
   {
     "email": "test@example.com",
     "phoneNumber": "1234567890"
   }
   ```
5. **Send the request** and view the response.

---

## Deploying on Render.com

1. **Push your code to GitHub** (if not already done).
2. **Create a PostgreSQL database** on Render and copy the `DATABASE_URL`.
3. **Create a new Web Service** on Render:
    - Connect your GitHub repo.
    - Set the build command:
      ```
      npm install && npm run build && npx prisma generate && npx prisma migrate deploy
      ```
    - Set the start command:
      ```
      npm start
      ```
    - Add environment variables:
      - `DATABASE_URL` (from your Render Postgres instance)
      - `PORT` (optional, default is 3000)
4. **Deploy the service**. Render will give you a public URL like:
   ```
   https://your-app-name.onrender.com
   ```

---

## Testing the API on Render with Postman

1. **Open Postman**.
2. **Create a new POST request** to:
   ```
   https://your-app-name.onrender.com/identify
   ```
3. **Set the request body** to `raw` and select `JSON`.
4. **Example JSON body:**
   ```json
   {
     "email": "test@example.com",
     "phoneNumber": "1234567890"
   }
   ```
5. **Send the request** and view the response.

---

## Project Structure

```
/src
  server.ts
/prisma
  schema.prisma
/dist
  (compiled JS files)
/node_modules
.gitignore
.env.example
package.json
tsconfig.json
```

---

## Notes

- **Do not commit your `.env` file**. Use `.env.example` for reference.
- The `/identify` endpoint only supports POST requests with a JSON body.
- For any issues, check your Render logs or local terminal output.

---

## License

MIT
