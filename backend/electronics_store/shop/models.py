from django.db import models
from django.contrib.auth.models import AbstractUser # For custom User model

# Using AbstractUser for extensibility, as Person is a base class in your design
# 1. Users (Customers, Staff, Admins)
class User(AbstractUser):
    # Common fields for all user types
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    delivery_address = models.TextField(blank=True, null=True)

    USER_TYPE_CHOICES = (
        ('customer', 'Customer'),
        ('staff', 'Staff'),
        ('admin', 'Admin'),
    )
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='customer')

    # FIX: Add unique related_name for groups and user_permissions
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name="shop_user_set", 
        related_query_name="shop_user",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="shop_user_permissions_set", 
        related_query_name="shop_user_permission",
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)

class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)

class AdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    # Add admin-specific fields

# 2. Items (Products/Catalogue)
class Item(models.Model): 
    item_id = models.CharField(max_length=50, unique=True, primary_key=True) 
    item_name = models.CharField(max_length=255)
    item_short_description = models.TextField(blank=True)
    item_type = models.CharField(max_length=100) # e.g., 'Electronics', 'Gadgets'
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    # quantity_available will be managed externally via API but can be cached here
    quantity_available = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    image_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.item_name

# 3. Shopping Cart
class ShoppingCart(models.Model): 
    customer = models.OneToOneField(User, on_delete=models.CASCADE) # One cart per customer
    created_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart for {self.customer.username}"

class CartItem(models.Model): # Corresponds to items within the shopping cart
    cart = models.ForeignKey(ShoppingCart, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'item') # A customer can only have one of each item in their cart

    def __str__(self):
        return f"{self.quantity} x {self.item.item_name} in {self.cart.customer.username}'s cart"

# 4. Orders
class Order(models.Model): 
    customer = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True) # Null for guest orders
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    delivery_address = models.TextField() # Can be pulled from customer or entered for guest

    def __str__(self):
        return f"Order {self.id} by {self.customer.username if self.customer else 'Guest'}"

class OrderItem(models.Model): # Corresponds to items within an order
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price_at_time_of_order = models.DecimalField(max_digits=10, decimal_places=2) # Price can change

    def __str__(self):
        return f"{self.quantity} x {self.item.item_name} for Order {self.order.id}"

# 5. Payments, Payment History, Receipts, Invoices
class PaymentMethod(models.Model): 
    method_name = models.CharField(max_length=50, unique=True) # e.g., 'Card', 'Digital Wallet', 'Bank Transfer'

    def __str__(self):
        return self.method_name

class Payment(models.Model): # Corresponds to your 'Payment' class
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT) # Don't delete method if used
    transaction_id = models.CharField(max_length=255, unique=True) # ID from external gateway
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"Payment for Order {self.order.id} - {self.status}"

class PaymentHistory(models.Model): 
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE) # Link to the actual payment
    transaction_date = models.DateTimeField(auto_now_add=True)
    # Other fields like amount, method are available via the 'payment' foreign key

    class Meta:
        verbose_name_plural = "Payment History"

    def __str__(self):
        return f"History for {self.customer.username}: Payment {self.payment.transaction_id}"


class Receipt(models.Model): # Corresponds to 'Receipts' class
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    receipt_number = models.CharField(max_length=100, unique=True)
    receipt_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    pdf_url = models.URLField(blank=True, null=True) # Link to generated PDF receipt

    def __str__(self):
        return f"Receipt {self.receipt_number} for Order {self.order.id}"

class Invoice(models.Model): # Corresponds to 'Invoices' class
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    invoice_number = models.CharField(max_length=100, unique=True)
    invoice_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    STATUS_CHOICES = (
        ('issued', 'Issued'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='issued')
    pdf_url = models.URLField(blank=True, null=True) # Link to generated PDF invoice

    def __str__(self):
        return f"Invoice {self.invoice_number} for Order {self.order.id}"

# 6. Performance Metrics (for analytics)
class PerformanceMetric(models.Model): # Corresponds to 'PerformanceMetrics' and 'Profitability Metric'
    METRIC_TYPE_CHOICES = (
        ('profitability', 'Profitability'),
        ('total_sales', 'Total Sales'),
        ('items_sold', 'Items Sold'),
        # Add other metrics as needed
    )
    metric_type = models.CharField(max_length=50, choices=METRIC_TYPE_CHOICES)
    value = models.DecimalField(max_digits=15, decimal_places=2) # Can be currency, count, etc.
    calculated_at = models.DateTimeField(auto_now_add=True)
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.metric_type}: {self.value} ({self.calculated_at.date()})"