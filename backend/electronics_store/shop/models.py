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
        choices=USER_TYPE_CHOICES, # Corrected typo: 'CHOICES' instead of 'CHOult'
        default='customer'
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        db_table = 'auth_user_custom'

    def __str__(self):
        return self.username


class ItemCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Item Categories"

    def __str__(self):
        return self.name

class Item(models.Model):
    """
    Represents a product in the online store's catalogue.
    """
    item_id = models.AutoField(primary_key=True)
    item_name = models.CharField(max_length=200)
    item_short_description = models.CharField(max_length=500, blank=True, null=True)
    item_long_description = models.TextField(blank=True, null=True)
    item_type = models.ForeignKey(ItemCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_available = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    image_url = models.URLField(max_length=500, blank=True, null=True) # URL to product image
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ['item_name']

    def __str__(self):
        return self.item_name


class ShoppingCart(models.Model):
    """
    Represents a user's shopping cart.
    Can be associated with a registered User or exist for an anonymous session.
    """
    # Make customer nullable for anonymous carts
    customer = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='shopping_cart')
    # Use session_key to link anonymous carts
    session_key = models.CharField(max_length=40, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Shopping Cart"
        verbose_name_plural = "Shopping Carts"

    def __str__(self):
        if self.customer:
            return f"Cart for {self.customer.username}"
        elif self.session_key:
            return f"Anonymous Cart (Session: {self.session_key[:8]}...)"
        return "Empty Cart"


class CartItem(models.Model):
    """
    Represents an individual item within a shopping cart.
    """
    cart = models.ForeignKey(ShoppingCart, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    # Store unit price at the time of adding to cart for historical accuracy
    # Added default=0.00 to allow migrations to proceed for existing data
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('cart', 'item') # An item can only be once in a given cart

    def save(self, *args, **kwargs):
        # Set unit_price from the Item if not already set (or if it's the default 0.00)
        if (self.unit_price is None or self.unit_price == 0.00) and self.item:
            self.unit_price = self.item.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} x {self.item.item_name} in Cart {self.cart.id}"


class Order(models.Model):
    """
    Represents a customer's order.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('paid', 'Paid'), # Added 'paid' status for clarity
    )

    order_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    # New field to store email for anonymous orders
    customer_email = models.EmailField(blank=True, null=True)
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    delivery_address = models.TextField(blank=True, null=True) # Final delivery address for the order
    session_key = models.CharField(max_length=40, blank=True, null=True, db_index=True)

    class Meta:
        ordering = ['-order_date']

    def __str__(self):
        if self.customer:
            return f"Order {self.order_id} by {self.customer.username}"
        if self.customer_email:
            return f"Order {self.order_id} by {self.customer_email}"
        if self.session_key:
            return f"Order {self.order_id} (Session {self.session_key[:8]})"
        return f"Order {self.order_id} (Anonymous)"



class OrderItem(models.Model):
    """
    Represents an individual item within an order.
    Stores the price at the time of order to prevent historical discrepancies.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.PROTECT) # PROTECT to prevent deleting item if it's in an order
    quantity = models.IntegerField()
    unit_price_at_time_of_order = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('order', 'item')

    def __str__(self):
        return f"{self.quantity} x {self.item.item_name} in Order {self.order.order_id}"


class PaymentMethod(models.Model):
    """
    Represents available payment methods (e.g., Credit Card, PayPal).
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Payment(models.Model):
    """
    Records a payment transaction for an order.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    transaction_id = models.CharField(max_length=255, unique=True, blank=True, null=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_details = models.JSONField(blank=True, null=True) # For storing gateway response, last 4 digits of card, etc.

    def __str__(self):
        return f"Payment for Order {self.order.order_id} - {self.status}"


class PaymentHistory(models.Model):
    """
    Logs historical payment attempts or status changes for an order.
    """
    # Made 'order' field nullable to allow migration for existing data
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payment_history', null=True, blank=True)
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    # Store customer username/email at time of transaction for history
    customer_username = models.CharField(max_length=150, blank=True, null=True)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    payment_details = models.JSONField(blank=True, null=True) # Snapshot of payment details at that time
    transaction_date = models.DateTimeField(auto_now_add=True)
    # Made 'status_change' field nullable to allow migration for existing data
    status_change = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return f"Payment History for Order {self.order.order_id} - {self.status_change}"


class Invoice(models.Model):
    """
    Represents an invoice generated for an order.
    """
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=100, unique=True)
    invoice_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES, default='pending') # Can mirror order status
    pdf_url = models.URLField(blank=True, null=True) # URL to the generated PDF invoice

    def __str__(self):
        return f"Invoice {self.invoice_number} for Order {self.order.order_id}"


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
        return f"Receipt {self.receipt_number} for Order {self.order.order_id}"


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

    def __str__(self):
        return f"{self.metric_type}: {self.value} at {self.calculated_at.strftime('%Y-%m-%d %H:%M')}"
