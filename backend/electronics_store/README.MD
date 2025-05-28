# AWE-electronics store

Follow the steps below to set up the backend and start developing locally.

---

## 1. Install PostgreSQL & pgAdmin

- Download and install PostgreSQL and pgAdmin from:  
  [https://www.enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)

---

## 2. Install Python Requirements

Navigate to the `electronics_store` folder and install dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Set Up the Database

After installing PostgreSQL and pgAdmin, you need to create the database tables:

```bash
python manage.py makemigrations shop
python manage.py migrate
```

> **Note:**  
> Run these commands any time you are notified that a model has changed.

---

## 4. Create an Admin User

To create a superuser for your local admin interface:

```bash
python manage.py createsuperuser
```

- When prompted, set a username and password (using `admin` for both is fine, and you can skip the email).

---

## 5. Start the Development Server

Run the server with:

```bash
python manage.py runserver
```

---

Let your team know if you change any models so they can re-run migrations!

---
