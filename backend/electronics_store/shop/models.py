from django.db import models
from django.contrib.auth.models import AbstractUser # Import AbstractUser

# --- Custom User Model ---
class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser to add
    additional fields like phone number, delivery address, and user type.
    """
    USER_TYPE_CHOICES = (
        ('customer', 'Customer'),
        ('admin', 'Admin'),
        ('staff', 'Staff'), # e.g., for warehouse staff, delivery drivers
    )

    phone_number = models.CharField(max_length=20, blank=True, null=True)
    delivery_address = models.TextField(blank=True, null=True)
    user_type = models.CharField(
        max_length=10,
        choices=USER_TYPE_CHOICES,
        default='customer'
    )

    class Meta:
        # Add a related_name to avoid clashes if you also have a default User model somewhere
        # This is good practice when overriding the default user model
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        db_table = 'auth_user_custom' # Optional: name your database table if you want

    def __str__(self):
        return self.username

# --- Remainder of your models.py (existing models) ---

# Item Category for better organization (optional, but good practice)
class ItemCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Item Categories"

    def __str__(self):
        return self.name

class Item(models.Model):
    """
    Represents an item/product in the online electronics store catalogue.
    """
    item_id = models.AutoField(primary_key=True)
    item_name = models.CharField(max_length=255)
    item_short_description = models.TextField(blank=True, null=True)
    item_type = models.CharField(max_length=100) # e.g., 'Laptop', 'Smartphone', 'Headphones'
    category = models.ForeignKey(ItemCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_available = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    image_url = models.URLField(blank=True, null=True) # URL to product image

    def __str__(self):
        return self.item_name


class ShoppingCart(models.Model):
    """
    Represents a customer's shopping cart.
    One-to-one relationship with the custom User model.
    """
    customer = models.OneToOneField(User, on_delete=models.CASCADE, related_name='shopping_cart')
    created_date = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.customer.username}"

class CartItem(models.Model):
    """
    Represents an individual item within a shopping cart.
    """
    cart = models.ForeignKey(ShoppingCart, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'item') # A specific item can only appear once in a cart

    def __str__(self):
        return f"{self.quantity} x {self.item.item_name} in {self.cart.customer.username}'s cart"


class Order(models.Model):
    """
    Represents a customer's order.
    """
    ORDER_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )

    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    delivery_address = models.TextField() # Redundant with User.delivery_address but good for historical order data if user address changes

    def __str__(self):
        return f"Order {self.id} by {self.customer.username}"

class OrderItem(models.Model):
    """
    Represents an individual item within an order.
    Captures the price at the time of order for historical accuracy.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    item = models.ForeignKey(Item, on_delete=models.PROTECT) # Protect from item deletion if part of an order
    quantity = models.PositiveIntegerField()
    unit_price_at_time_of_order = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('order', 'item')

    def __str__(self):
        return f"{self.quantity} x {self.item.item_name} for Order {self.order.id}"


class PaymentMethod(models.Model):
    """
    Defines available payment methods (e.g., Credit Card, PayPal).
    """
    method_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.method_name

class Payment(models.Model):
    """
    Records a payment transaction for an order.
    """
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT) # Protect if method is in use
    transaction_id = models.CharField(max_length=255, unique=True, blank=True, null=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.id} - {self.status}"


class PaymentHistory(models.Model):
    """
    Logs historical payment transactions for a customer.
    """
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_history')
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='history_records')
    transaction_date = models.DateTimeField(auto_now_add=True)
    # You might add a field for payment_status_at_time_of_record if you want to track status changes

    class Meta:
        verbose_name_plural = "Payment Histories"
        ordering = ['-transaction_date'] # Order by most recent first

    def __str__(self):
        return f"History for {self.customer.username}: Payment {self.payment.id} on {self.transaction_date.strftime('%Y-%m-%d %H:%M')}"


class Invoice(models.Model):
    """
    Represents an invoice generated for an order.
    """
    INVOICE_STATUS_CHOICES = (
        ('issued', 'Issued'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    )

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=100, unique=True)
    invoice_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=INVOICE_STATUS_CHOICES, default='issued')
    pdf_url = models.URLField(blank=True, null=True) # URL to the generated PDF invoice

    def __str__(self):
        return f"Invoice {self.invoice_number} for Order {self.order.id}"


class Receipt(models.Model):
    """
    Represents a receipt generated for a completed payment.
    """
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='receipt')
    receipt_number = models.CharField(max_length=100, unique=True)
    receipt_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    pdf_url = models.URLField(blank=True, null=True) # URL to the generated PDF receipt

    def __str__(self):
        return f"Receipt {self.receipt_number} for Order {self.order.id}"


class PerformanceMetric(models.Model):
    """
    Stores various performance metrics for the online store.
    """
    METRIC_TYPE_CHOICES = (
        ('sales', 'Sales Volume'),
        ('profitability', 'Profitability'),
        ('customer_satisfaction', 'Customer Satisfaction'),
        ('stock_level', 'Stock Level'),
        ('order_fulfillment_time', 'Order Fulfillment Time'),
    )

    metric_type = models.CharField(max_length=50, choices=METRIC_TYPE_CHOICES)
    value = models.DecimalField(max_digits=15, decimal_places=2)
    calculated_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-calculated_at'] # Most recent metrics first

    def __str__(self):
        return f"{self.metric_type}: {self.value} at {self.calculated_at.strftime('%Y-%m-%d %H:%M')}"