from rest_framework import serializers
from django.contrib.auth import get_user_model # Correct way to get the active user model
from .models import Item, ShoppingCart, CartItem, Order, OrderItem, Payment, PaymentMethod, Invoice, Receipt, PerformanceMetric, PaymentHistory # PaymentHistory added here

User = get_user_model()

# --- Catalogue and Items ---
class ItemSerializer(serializers.ModelSerializer):
    """
    Serializer for the Item model (Product Catalogue).
    Handles exposing item details.
    """
    class Meta:
        model = Item
        fields = '__all__' 
        # Example for specific fields:
        # fields = ['item_id', 'item_name', 'item_short_description', 'item_type',
        #           'unit_price', 'quantity_available', 'is_available', 'image_url']

# --- User related (simplified for API, for admin/self-management) ---
class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the custom User model.
    Exposes user details, suitable for profile viewing or admin management.
    """
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'delivery_address', 'user_type'
        ]
        read_only_fields = ['user_type'] # User type is usually managed by the system/admin, not user input via this API
        extra_kwargs = {
            'password': {'write_only': True, 'required': False} # Password should not be read and is not always required for update
        }

    def create(self, validated_data):
        # Handle password creation for new users
        user = User.objects.create_user(**validated_data)
        return user

    def update(self, instance, validated_data):
        # Handle password update separately if provided
        if 'password' in validated_data:
            instance.set_password(validated_data.pop('password'))
        return super().update(instance, validated_data)


# --- Shopping Cart ---
class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for items within a shopping cart.
    Allows adding/updating quantity of a specific item in a cart.
    Includes read-only fields for item details for convenience.
    """
    # These fields provide details about the item directly from the related Item model
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    unit_price = serializers.DecimalField(source='item.unit_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'item', 'item_name', 'unit_price', 'quantity']
        # 'item' field is writeable (for adding/updating a cart item entry)
        # 'item_name' and 'unit_price' are read-only for display purposes

class ShoppingCartSerializer(serializers.ModelSerializer):
    """
    Serializer for the ShoppingCart model.
    Includes nested serialization for CartItems, showing content of the cart.
    """
    # 'items' corresponds to the related_name='items' in CartItem model
    items = CartItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = ShoppingCart
        fields = ['id', 'customer', 'customer_username', 'created_date', 'items']
        read_only_fields = ['customer', 'created_date'] # Customer is typically associated automatically (e.g., by request.user)

# --- Orders ---
class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for individual items within an order.
    Captures the price at the time of order for historical accuracy.
    """
    item_name = serializers.CharField(source='item.item_name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'item', 'item_name', 'quantity', 'unit_price_at_time_of_order']
        # 'unit_price_at_time_of_order' is set by the system when the order is placed, not by client
        read_only_fields = ['unit_price_at_time_of_order']

class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for the Order model.
    Includes nested OrderItem serializers to show what's in the order.
    """
    # 'order_items' corresponds to the related_name='order_items' in OrderItem model
    order_items = OrderItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer', 'customer_username', 'order_date', 'total_amount', 'status', 'delivery_address', 'order_items']
        # These fields are typically set by the system during order creation/processing
        read_only_fields = ['customer', 'total_amount', 'order_date']

# --- Payments, Payment History, Receipts, Invoices ---
class PaymentMethodSerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentMethod.
    Often read-only as payment methods are predefined.
    """
    class Meta:
        model = PaymentMethod
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for Payment transactions.
    Details status and link to order.
    """
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'order_id', 'customer', 'customer_username',
            'payment_method', 'transaction_id', 'amount_paid', 'payment_date', 'status'
        ]
        # These fields are usually set by the payment gateway or system processes
        read_only_fields = ['transaction_id', 'amount_paid', 'payment_date', 'status', 'customer', 'order']

class PaymentHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentHistory records.
    Links to specific payments and customer.
    """
    payment_details = PaymentSerializer(read_only=True, source='payment')
    customer_username = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = PaymentHistory
        fields = ['id', 'customer', 'customer_username', 'payment', 'payment_details', 'transaction_date']
        read_only_fields = ['customer', 'payment', 'transaction_date']


class ReceiptSerializer(serializers.ModelSerializer):
    """
    Serializer for Receipts.
    Receipts are typically read-only via API after generation.
    """
    order_id = serializers.IntegerField(source='order.id', read_only=True)

    class Meta:
        model = Receipt
        fields = ['id', 'order', 'order_id', 'receipt_number', 'receipt_date', 'total_amount', 'pdf_url']
        read_only_fields = ['receipt_number', 'receipt_date', 'total_amount', 'pdf_url']

class InvoiceSerializer(serializers.ModelSerializer):
    """
    Serializer for Invoices.
    Invoices are typically read-only via API after generation.
    """
    order_id = serializers.IntegerField(source='order.id', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'order', 'order_id', 'invoice_number', 'invoice_date', 'due_date', 'total_amount', 'status', 'pdf_url']
        read_only_fields = ['invoice_number', 'invoice_date', 'due_date', 'total_amount', 'status', 'pdf_url']

# --- Performance Metrics ---
class PerformanceMetricSerializer(serializers.ModelSerializer):
    """
    Serializer for Performance Metrics.
    Often read-only, used for analytics display.
    """
    class Meta:
        model = PerformanceMetric
        fields = '__all__'
        read_only_fields = ['calculated_at']