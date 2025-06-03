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
            'id', 'username', 'email','password', 'first_name', 'last_name',
            'phone_number', 'delivery_address', 'user_type'
        ]
        read_only_fields = ['user_type'] # User type is usually managed by the system/admin, not user input via this API
        extra_kwargs = {
            'password': {'write_only': True} # Allow password to be written, but not read
        }

    def create(self, validated_data):
        # Custom create method to handle password hashing
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        # Custom update method to handle password hashing if provided
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password is not None:
            instance.set_password(password)
        instance.save()
        return instance


# --- Shopping Cart ---
class CartItemNestedSerializer(serializers.ModelSerializer):
    """
    Nested serializer for CartItem, used within ShoppingCartSerializer.
    Includes details of the associated Item.
    """
    item_id = serializers.IntegerField(source='item.item_id', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    item_short_description = serializers.CharField(source='item.item_short_description', read_only=True)
    image_url = serializers.URLField(source='item.image_url', read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'item', 'item_id', 'item_name', 'item_short_description', 'quantity', 'unit_price', 'image_url']
        read_only_fields = ['unit_price'] # unit_price is set automatically on save of CartItem


class ShoppingCartSerializer(serializers.ModelSerializer):
    """
    Serializer for the ShoppingCart model.
    Includes nested CartItemSerializer to show items in the cart.
    """
    items = CartItemNestedSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    # Add session_key for anonymous carts
    session_key = serializers.CharField(read_only=True)

    class Meta:
        model = ShoppingCart
        # Include session_key in fields
        fields = ['id', 'customer', 'customer_username', 'session_key', 'items', 'created_at', 'updated_at']
        read_only_fields = ['customer', 'session_key'] # Customer and session_key are set by the view


class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for individual CartItem operations (add, update, delete).
    """
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    # Ensure cart is writable for creation, but can be read-only for updates
    cart = serializers.PrimaryKeyRelatedField(queryset=ShoppingCart.objects.all(), required=False)


    class Meta:
        model = CartItem
        fields = ['id', 'cart', 'item', 'item_name', 'quantity', 'unit_price']
        read_only_fields = ['unit_price'] # unit_price is set automatically on save of CartItem


# --- Orders ---
class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for OrderItem, used nested within OrderSerializer.
    """
    item_name = serializers.CharField(source='item.item_name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'item', 'item_name', 'quantity', 'unit_price_at_time_of_order']


class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for the Order model.
    Includes nested OrderItemSerializer to show items in the order.
    """
    items = OrderItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    # Include customer_email for anonymous orders
    customer_email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = Order
        # Include customer_email in fields
        fields = ['order_id', 'customer', 'customer_username', 'customer_email', 'order_date', 'total_amount', 'status', 'delivery_address', 'items']
        read_only_fields = ['customer', 'order_date', 'total_amount', 'status', 'items'] # customer can be null, but not directly set by API for creation


# --- Payments, Invoices, Receipts ---
class PaymentMethodSerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentMethod.
    """
    class Meta:
        model = PaymentMethod
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for Payment transactions.
    """
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'order', 'order_id', 'customer', 'customer_username', 'payment_method', 'transaction_id', 'amount_paid', 'transaction_date', 'status', 'payment_details']
        read_only_fields = ['transaction_id', 'transaction_date', 'status', 'payment_details']


class PaymentHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentHistory.
    """
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True) # Expose customer username

    class Meta:
        model = PaymentHistory
        fields = ['id', 'order', 'order_id', 'customer', 'customer_username', 'payment', 'payment_details', 'transaction_date', 'status_change']
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
    """
    class Meta:
        model = PerformanceMetric
        fields = '__all__'
