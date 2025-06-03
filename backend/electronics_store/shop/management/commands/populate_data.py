from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model
# Ensure all necessary models are imported
from shop.models import ItemCategory, Item, PaymentMethod, ShoppingCart, CartItem, Order, OrderItem, Payment, PaymentHistory, Invoice, Receipt

class Command(BaseCommand):
    help = 'Populates the database with sample data for ItemCategories, Items, Users, and PaymentMethods.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting database population...'))

        # Ensure we have a User model accessible
        CustomUser = get_user_model()

        try:
            with transaction.atomic():
                # --- Clear existing data (optional, but good for clean testing) ---
                # Clear in reverse order of dependencies to avoid integrity errors
                self.stdout.write('Clearing existing data...')
                Receipt.objects.all().delete()
                Invoice.objects.all().delete()
                PaymentHistory.objects.all().delete()
                Payment.objects.all().delete()
                OrderItem.objects.all().delete()
                Order.objects.all().delete()
                CartItem.objects.all().delete()
                ShoppingCart.objects.all().delete() # Clear shopping carts
                Item.objects.all().delete()
                ItemCategory.objects.all().delete()
                PaymentMethod.objects.all().delete()
                CustomUser.objects.filter(username__in=['test_customer', 'test_admin']).delete() # Only delete sample users
                self.stdout.write(self.style.SUCCESS('Existing data cleared.'))


                # --- 1. Create Item Categories ---
                self.stdout.write('Creating Item Categories...')
                electronics = ItemCategory.objects.create(name='Electronics', description='General electronic gadgets.')
                laptops = ItemCategory.objects.create(name='Laptops', description='Portable computers.')
                smartphones = ItemCategory.objects.create(name='Smartphones', description='Mobile phones with advanced capabilities.')
                accessories = ItemCategory.objects.create(name='Accessories', description='Various electronic accessories.')
                self.stdout.write(self.style.SUCCESS('Item Categories created.'))

                # --- 2. Create Items ---
                self.stdout.write('Creating Items...')
                item1 = Item.objects.create(
                    item_name="Dell XPS 15",
                    item_short_description="High-performance laptop for professionals.",
                    item_type=laptops,
                    unit_price=1500.00,
                    quantity_available=50,
                    is_available=True,
                    is_featured=True,                     # ★ FEATURED
                    image_url="https://placehold.co/400x300/E0E0E0/333333?text=Dell+XPS+15"
                )
                item2 = Item.objects.create(
                    item_name="iPhone 15 Pro",
                    item_short_description="Latest iPhone with advanced camera and A17 Bionic chip.",
                    item_type=smartphones,
                    unit_price=1200.00,
                    quantity_available=100,
                    is_available=True,
                    is_featured=True,                     # ★ FEATURED
                    image_url="https://placehold.co/400x300/E0E0E0/333333?text=iPhone+15+Pro"
                )
                item3 = Item.objects.create(
                    item_name="Sony WH-1000XM5 Headphones",
                    item_short_description="Industry-leading noise-canceling headphones.",
                    item_type=accessories,
                    unit_price=350.00,
                    quantity_available=200,
                    is_available=True,
                    is_featured=True,                     # ★ FEATURED
                    image_url="https://placehold.co/400x300/E0E0E0/333333?text=Sony+Headphones"
                )
                item4 = Item.objects.create(
                    item_name="Samsung 4K Smart TV",
                    item_short_description="55-inch UHD Smart TV with vibrant colors.",
                    item_type=electronics,
                    unit_price=800.00,
                    quantity_available=30,
                    is_available=True,
                    is_featured=True,                     # ★ FEATURED
                    image_url="https://placehold.co/400x300/E0E0E0/333333?text=Samsung+TV"
                )
                # Non-featured examples
                item5 = Item.objects.create(
                    item_name="Apple Watch Series 9",
                    item_short_description="Advanced smartwatch for health and fitness.",
                    item_type=accessories,
                    unit_price=400.00,
                    quantity_available=75,
                    is_available=True,
                    is_featured=False,                    # not featured
                    image_url="https://placehold.co/400x300/E0E0E0/333333?text=Apple+Watch"
                )
                item6 = Item.objects.create(
                    item_name="MacBook Air M3",
                    item_short_description="Thin, light, and powerful laptop for everyday use.",
                    item_type=laptops,
                    unit_price=1100.00,
                    quantity_available=40,
                    is_available=True,
                    is_featured=False,
                    image_url="https://placehold.co/400x300/E0E0E0/333333?text=MacBook+Air"
                )
                item7 = Item.objects.create(
                    item_name="Google Pixel 8",
                    item_short_description="Smart and secure smartphone with Tensor G3.",
                    item_type=smartphones,
                    unit_price=700.00,
                    quantity_available=90,
                    is_available=True,
                    is_featured=False,
                    image_url="https://placehold.co/400x300/E0E0E0/333333?text=Google+Pixel"
                )
                item8 = Item.objects.create(
                    item_name="Logitech MX Master 3S",
                    item_short_description="Advanced wireless mouse for productivity.",
                    item_type=accessories,
                    unit_price=100.00,
                    quantity_available=150,
                    is_available=True,
                    is_featured=False,
                    image_url="https://placehold.co/400x300/E0E0E0/333333?text=Logitech+Mouse"
                )
                self.stdout.write(self.style.SUCCESS('Items created.'))


                # --- 3. Create Users (Customer & Admin) ---
                self.stdout.write('Creating Users...')
                # Get or create a regular customer user
                customer_user, created = CustomUser.objects.get_or_create(username='test_customer', defaults={
                    'email': 'customer@example.com',
                    'first_name': 'Test',
                    'last_name': 'Customer',
                    'phone_number': '0412345678',
                    'delivery_address': '101 Customer St, Sample City',
                    'user_type': 'customer',
                })
                if created:
                    customer_user.set_password('customerpass') # Set a password
                    customer_user.save()
                    self.stdout.write(f'Created customer user: {customer_user.username}')
                else:
                    self.stdout.write(f'Customer user "{customer_user.username}" already exists. Skipping creation.')

                # Get or create an admin user (if not already a superuser)
                admin_user, created = CustomUser.objects.get_or_create(username='test_admin', defaults={
                    'email': 'admin@example.com',
                    'first_name': 'Test',
                    'last_name': 'Admin',
                    'phone_number': '0498765432',
                    'delivery_address': '202 Admin Ave, Admin Town',
                    'user_type': 'admin',
                    'is_staff': True,
                    'is_superuser': True,
                })
                if created:
                    admin_user.set_password('adminpass') # Set a password
                    admin_user.save()
                    self.stdout.write(f'Created admin user: {admin_user.username}')
                else:
                    self.stdout.write(f'Admin user "{admin_user.username}" already exists. Skipping creation.')

                self.stdout.write(self.style.SUCCESS('Users created/checked.'))

                # --- 4. Create Payment Methods ---
                self.stdout.write('Creating Payment Methods...')
                # Corrected: Use 'name' field as per models.py
                PaymentMethod.objects.create(name='Credit Card', description='Visa/MasterCard/Amex')
                PaymentMethod.objects.create(name='PayPal', description='Online payment gateway')
                PaymentMethod.objects.create(name='Bank Transfer', description='Direct bank transfer')
                self.stdout.write(self.style.SUCCESS('Payment Methods created.'))

                self.stdout.write(self.style.SUCCESS('Database population complete!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'An error occurred: {e}'))
            raise CommandError('Database population failed.')
