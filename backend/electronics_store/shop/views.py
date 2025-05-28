from rest_framework import viewsets
from rest_framework import permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from rest_framework import status
from django.db import transaction # For atomic operations
from django.db.models import Sum # For aggregation in ItemViewSet
from django.contrib.auth import get_user_model

# PaymentHistory added to the import list here
from .models import Item, ShoppingCart, CartItem, Order, OrderItem, Payment, PaymentMethod, Invoice, Receipt, PerformanceMetric, PaymentHistory

from .serializers import ItemSerializer, UserSerializer, ShoppingCartSerializer, CartItemSerializer, OrderSerializer, \
                        OrderItemSerializer, PaymentSerializer, PaymentMethodSerializer, InvoiceSerializer, ReceiptSerializer, \
                        PerformanceMetricSerializer, PaymentHistorySerializer

# Get the custom User model
User = get_user_model()

# --- User Management (e.g., for Admin/Self-management) ---
class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    Includes basic user registration/management capabilities.
    Permissions will need to be refined: e.g., IsAdminUser for full management,
    IsOwnerOrAdmin for self-management.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    # Example permission: Only admins can manage users (for production, refine this)
    # permission_classes = [permissions.IsAdminUser] # You'd likely add CustomIsOwnerOrAdmin permission

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        Example: allow anyone to create (register), but only owners/admins to update/delete.
        """
        if self.action == 'create':
            permission_classes = [permissions.AllowAny] # Allow anyone to register
        elif self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            # For retrieve, update, delete, ensure only the user itself or an admin can act
            permission_classes = [permissions.IsAuthenticated] # + CustomIsOwner permission
        else:
            permission_classes = [permissions.IsAdminUser] # For list view, etc.
        return [permission() for permission in permission_classes]


# --- Catalogue and Items ---
class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows items (products) to be viewed or edited.
    Scenario 1: Customer Browses Catalogue.
    Scenario 2: Admin Updates Stockroom and Catalogue.
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    # Only authenticated users can write (update/create/delete), anyone can read.
    # For a real store, 'staff' or 'admin' users would have write permissions.
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'highest_selling']:
            permission_classes = [permissions.AllowAny] # Publicly accessible for Browse
        else:
            permission_classes = [permissions.IsAdminUser] # Only admins can create/update/delete items
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def highest_selling(self, request):
        """
        Custom action to get the highest selling items.
        (Analytic/Performance Metric related, Scenario 5).
        """
        # This aggregates quantities from all historical OrderItems for each item
        # and orders them by total quantity sold.
        highest_selling_items = Item.objects.annotate(
            total_sold=Sum('orderitem__quantity')
        ).order_by('-total_sold').exclude(total_sold__isnull=True)[:10] # Get top 10, exclude items never sold
        serializer = self.get_serializer(highest_selling_items, many=True)
        return Response(serializer.data)

# --- Shopping Cart ---
class ShoppingCartViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing shopping carts.
    Users can retrieve their own cart.
    Scenario 1: Customer Adds Items to Shopping Cart. (Handled more specifically by CartItemViewSet)
    """
    queryset = ShoppingCart.objects.all()
    serializer_class = ShoppingCartSerializer
    permission_classes = [permissions.IsAuthenticated] # Only authenticated users have carts

    def get_queryset(self):
        """
        Ensure users can only see/manage their own cart.
        Admins can see all carts.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return ShoppingCart.objects.all()
        return ShoppingCart.objects.filter(customer=self.request.user)

    def perform_create(self, serializer):
        """
        When creating a new cart, automatically associate it with the current authenticated user.
        (A user typically has only one cart, managed by get_or_create logic in CartItemViewSet)
        """
        serializer.save(customer=self.request.user)


class CartItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing individual items within a shopping cart.
    This is where users add, update, or remove items from their cart.
    Scenario 1: Customer Adds Items to Shopping Cart.
    """
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated] # Only authenticated users can modify cart items

    def get_queryset(self):
        """
        Ensure users can only see/manage items in their own cart.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return CartItem.objects.all()
        # Filter cart items belonging to the current user's cart
        return CartItem.objects.filter(cart__customer=self.request.user)

    @transaction.atomic # Ensures all database operations are completed or rolled back
    def create(self, request, *args, **kwargs):
        """
        Custom logic for adding an item to the cart.
        If item exists, update quantity; otherwise, create new cart item.
        Also, ensure item availability before adding.
        """
        item_id = request.data.get('item')
        quantity = int(request.data.get('quantity', 1)) # Default to 1 if not provided

        if not item_id:
            return Response({"item": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
        if quantity <= 0:
            return Response({"quantity": "Quantity must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = Item.objects.get(item_id=item_id, is_available=True)
        except Item.DoesNotExist:
            return Response({"detail": "Item not found or not available."}, status=status.HTTP_404_NOT_FOUND)

        if item.quantity_available < quantity:
            return Response(
                {"detail": f"Not enough stock for {item.item_name}. Available: {item.quantity_available}, Requested: {quantity}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create the shopping cart for the current user
        # Note: A user should ideally have only one cart. If not, this logic might need refinement.
        cart, created_cart = ShoppingCart.objects.get_or_create(customer=self.request.user)

        # Check if the item already exists in this cart
        cart_item_qs = CartItem.objects.filter(cart=cart, item=item)
        if cart_item_qs.exists():
            # If item exists, update its quantity
            cart_item = cart_item_qs.first()
            cart_item.quantity += quantity
            cart_item.save()
            status_code = status.HTTP_200_OK # Updated
        else:
            # If item does not exist, create a new CartItem
            cart_item = CartItem.objects.create(cart=cart, item=item, quantity=quantity)
            status_code = status.HTTP_201_CREATED # Created

        # Optionally, you might update the item's quantity_available (local cache) here if managing stock directly
        # item.quantity_available -= quantity
        # item.save()
        # However, your A2 states stock management is external, so this might be for display only.

        serializer = self.get_serializer(cart_item)
        return Response(serializer.data, status=status_code)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Custom logic for updating an item's quantity in the cart.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object() # This is the CartItem instance being updated
        old_quantity = instance.quantity
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        new_quantity = serializer.validated_data.get('quantity', old_quantity)

        if new_quantity <= 0: # If quantity is 0 or less, delete the item from cart
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        item = instance.item
        quantity_difference = new_quantity - old_quantity

        if item.quantity_available < quantity_difference: # Check if enough stock for *additional* quantity
            return Response(
                {"detail": f"Not enough stock for {item.item_name}. Available: {item.quantity_available}, Cannot add {quantity_difference}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_update(serializer) # This saves the new quantity

        # Optionally update item's quantity_available if managing stock directly
        # item.quantity_available -= quantity_difference
        # item.save()

        return Response(serializer.data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """
        Custom logic for deleting an item from the cart.
        """
        instance = self.get_object()
        # Optionally, refund stock if managing quantity_available locally
        # instance.item.quantity_available += instance.quantity
        # instance.item.save()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# --- Orders ---
class OrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing orders.
    Scenario 3: Customer Places Order and Makes Payment.
    """
    queryset = Order.objects.all().order_by('-order_date')
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Allow admins/staff to see all orders, customers only their own.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Order.objects.all().order_by('-order_date')
        return Order.objects.filter(customer=self.request.user).order_by('-order_date')

    # Disable default creation as order creation is via place_order_from_cart action
    def create(self, request, *args, **kwargs):
        return Response({"detail": "Use /api/orders/place_order_from_cart/ to create an order."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def place_order_from_cart(self, request):
        """
        Custom action for customers to place an order from their shopping cart.
        This handles validation, order creation, order item creation, and cart clearing.
        """
        user_cart = ShoppingCart.objects.filter(customer=request.user).first()

        if not user_cart or not user_cart.items.exists():
            return Response({"detail": "Shopping cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = 0
        order_items_to_create = [] # Collect data for OrderItem creation

        # Validate item availability and calculate total
        for cart_item in user_cart.items.all():
            item = cart_item.item
            if item.quantity_available < cart_item.quantity:
                # Rollback transaction if any item is out of stock
                raise ValidationError(
                    f"Not enough stock for {item.item_name}. Available: {item.quantity_available}, Requested: {cart_item.quantity}"
                )
            total_amount += item.unit_price * cart_item.quantity
            order_items_to_create.append({
                'item': item,
                'quantity': cart_item.quantity,
                'unit_price_at_time_of_order': item.unit_price
            })

        # Create the Order
        order = Order.objects.create(
            customer=request.user,
            total_amount=total_amount,
            delivery_address=request.user.delivery_address # Assuming delivery address is on user profile
        )

        # Create OrderItems for the new order
        for item_data in order_items_to_create:
            OrderItem.objects.create(order=order, **item_data)
            # Potentially reduce item stock here if managing locally
            # item_data['item'].quantity_available -= item_data['quantity']
            # item_data['item'].save()

        # Clear the shopping cart
        user_cart.items.all().delete() # Delete all CartItem instances associated with this cart

        # Serialize and return the newly created order
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# --- Payments, Invoices, Receipts ---
class PaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint to list available payment methods.
    """
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.AllowAny] # Payment methods are generally public knowledge

class PaymentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for payment transactions.
    Scenario 3: Customer Makes Payment.
    Note: Payment initiation would typically involve external gateway integration.
    """
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Allow admins/staff to see all payments, customers only their own.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Payment.objects.all()
        return Payment.objects.filter(customer=self.request.user)

    # Custom action to initiate payment for an order
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def initiate_payment(self, request, pk=None):
        """
        Simulates initiating a payment for a specific order.
        In a real system, this would integrate with a payment gateway.
        """
        try:
            payment_instance = self.get_object() # This is fetching the Payment model instance
            order = payment_instance.order
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        if payment_instance.status != 'pending':
            return Response({"detail": f"Payment already {payment_instance.status}."}, status=status.HTTP_400_BAD_REQUEST)

        # Basic check to ensure the user owns the payment or is admin
        if not (self.request.user == payment_instance.customer or self.request.user.is_staff or self.request.user.is_superuser):
             return Response({"detail": "You do not have permission to initiate this payment."}, status=status.HTTP_403_FORBIDDEN)

        # --- Simulate Payment Gateway Integration ---
        # In a real system, you would make an API call to Stripe, PayPal, etc.
        # This might involve redirecting the user or handling a webhook response.
        # For assignment purposes, we'll just simulate a successful initiation.

        # Update payment status to processing or similar
        payment_instance.status = 'completed' # Or 'processing', then 'completed' via webhook
        payment_instance.transaction_id = f"TXN-{order.id}-{self.request.user.id}-{payment_instance.id}" # Generate a mock transaction ID
        payment_instance.amount_paid = order.total_amount # Assuming full payment
        payment_instance.save()
        order.status = 'paid' # Update order status to paid
        order.save()

        # After successful payment, generate receipt and invoice
        # These methods would ideally be called by a post-payment signal or background task
        receipt, created_receipt = Receipt.objects.get_or_create(order=order, defaults={
            'receipt_number': f"REC-{order.id}",
            'total_amount': order.total_amount,
            'pdf_url': f"/media/receipts/{order.id}.pdf" # Placeholder URL
        })
        invoice, created_invoice = Invoice.objects.get_or_create(order=order, defaults={
            'invoice_number': f"INV-{order.id}",
            'total_amount': order.total_amount,
            'status': 'paid', # Or 'issued' depending on workflow
            'pdf_url': f"/media/invoices/{order.id}.pdf" # Placeholder URL
        })

        serializer = self.get_serializer(payment_instance)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PaymentHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing payment history.
    Scenario 4: Customer Views Payment History.
    """
    queryset = PaymentHistory.objects.all().order_by('-transaction_date')
    serializer_class = PaymentHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Allow admins/staff to see all history, customers only their own.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return PaymentHistory.objects.all().order_by('-transaction_date')
        return PaymentHistory.objects.filter(customer=self.request.user).order_by('-transaction_date')


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing invoices.
    """
    queryset = Invoice.objects.all().order_by('-invoice_date')
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Allow admins/staff to see all invoices, customers only their own.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Invoice.objects.all().order_by('-invoice_date')
        return Invoice.objects.filter(order__customer=self.request.user).order_by('-invoice_date')

class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing and downloading receipts.
    Scenario 4: Customer Downloads Receipt.
    """
    queryset = Receipt.objects.all().order_by('-receipt_date')
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Allow admins/staff to see all receipts, customers only their own.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Receipt.objects.all().order_by('-receipt_date')
        return Receipt.objects.filter(order__customer=self.request.user).order_by('-receipt_date')

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Custom action to simulate downloading a receipt PDF.
        In a real app, this would serve the actual file.
        """
        receipt = self.get_object()
        if receipt.pdf_url:
            # In a real application, you would serve the file:
            # from django.http import FileResponse
            # return FileResponse(open(receipt.pdf_url, 'rb'), content_type='application/pdf')
            return Response({'message': 'Simulated download link', 'url': receipt.pdf_url}, status=status.HTTP_200_OK)
        return Response({'message': 'PDF receipt not available for download.'}, status=status.HTTP_404_NOT_FOUND)


# --- Performance Metrics (Admin-only) ---
class PerformanceMetricViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing performance metrics.
    Scenario 5: Analyze Online Store Operations.
    """
    queryset = PerformanceMetric.objects.all().order_by('-calculated_at')
    serializer_class = PerformanceMetricSerializer
    permission_classes = [permissions.IsAdminUser] # Only admins can view metrics

    @action(detail=False, methods=['get'])
    def profitability(self, request):
        """
        Custom action to return profitability metrics.
        """
        profitability_metrics = PerformanceMetric.objects.filter(metric_type='profitability')
        serializer = self.get_serializer(profitability_metrics, many=True)
        return Response(serializer.data)

    # You could add other actions for specific metrics:
    # @action(detail=False, methods=['get'])
    # def total_sales_report(self, request):
    #     # Logic to calculate and return total sales
    #     pass