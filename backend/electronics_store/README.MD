install postgres https://www.enterprisedb.com/downloads/postgres-postgresql-downloads


run pip install -r requirements.txt while inside "electronics_store" folder


the setup installs pgAdmin as well, but to get the tables created inside your local database you must run the following

python manage.py makemigrations shop

python manage.py migrate

this is to be done anytime a model changes too, i will keep you updated anytime a model was changed


after running both commands and everything saying OK, run this:

python manage.py createsuperuser

then fill in the username and password for your local admin user (email not necessary and admin for both is fine after all)


then you can start the server with

python manage.py runserver
