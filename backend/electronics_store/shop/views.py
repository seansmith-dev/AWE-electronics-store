from rest_framework import viewsets
from rest_framework import permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError

from django.db import transaction # For atomic operations
from django.db.models import Sum # For aggregation in ItemViewSet
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate, login, logout # IMPORTANT: Import Django's auth functions
from django.db.models import Q # For complex lookups in Order and Payment ViewSets

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

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        - 'create' (signup) and 'login' actions: AllowAny
        - 'current_user' and 'logout' actions: IsAuthenticated
        - 'retrieve', 'update', 'partial_update', 'destroy' for specific user: IsAuthenticated (ideally IsOwnerOrAdmin)
        - 'list' (all users): IsAdminUser
        """
        if self.action == 'create' or self.action == 'login':
            permission_classes = [permissions.AllowAny]
        elif self.action == 'current_user' or self.action == 'logout':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            # For individual user actions, ensure authenticated.
            # In a real app, you'd add a custom permission to ensure user can only modify their own profile.
            permission_classes = [permissions.IsAuthenticated]
        else: # Default for 'list' (all users)
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Custom action to handle user login and set session cookies.
        """
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user) # This sets the session cookie
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post']) # permission_classes handled by get_permissions
    def logout(self, request):
        """
        Custom action to handle user logout and clear session.
        Requires authentication (handled by get_permissions).
        """
        logout(request)
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get']) # permission_classes handled by get_permissions
    def current_user(self, request):
        """
        Returns the currently authenticated user's details.
        Requires authentication (handled by get_permissions).
        """
        if request.user.is_authenticated:
            serializer = self.get_serializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # This branch should ideally not be reached if get_permissions works correctly,
            # but it's a good fallback for explicit clarity.
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)


# --- Catalogue and Items ---
class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows items (products) to be viewed or edited.
    Scenario 1: Customer Browses Catalogue.
    Scenario 2: Admin Updates Stockroom and Catalogue.
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'highest_selling', 'featured']:
            permission_classes = [permissions.AllowAny] # Publicly accessible for browsing
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
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        featured_qs = Item.objects.filter(is_featured=True, is_available=True)
        serializer = self.get_serializer(featured_qs, many=True)
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
    permission_classes = [permissions.AllowAny] # Allow unauthenticated users to create/retrieve their own cart based on session

    def get_queryset(self):
        """
        Allow authenticated users to see their cart,
        and anonymous users to see their cart based on session_key.
        Admins can see all carts.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return ShoppingCart.objects.all()
        
        if self.request.user.is_authenticated:
            return ShoppingCart.objects.filter(customer=self.request.user)
        else:
            # For anonymous users, try to find cart by session key
            session_key = self.request.session.session_key
            if session_key:
                return ShoppingCart.objects.filter(session_key=session_key, customer__isnull=True)
            return ShoppingCart.objects.none() # No session key, no cart

    def perform_create(self, serializer):
        """
        When creating a new cart, associate it with the current authenticated user
        or the current session for anonymous users.
        """
        if self.request.user.is_authenticated:
            serializer.save(customer=self.request.user)
        else:
            # Ensure a session exists for anonymous users
            if not self.request.session.session_key:
                self.request.session.save() # Generate a session key if it doesn't exist
            serializer.save(session_key=self.request.session.session_key, customer=None) # Ensure customer is None for anonymous


class CartItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing individual items within a shopping cart.
    This is where users add, update, or remove items from their cart.
    Scenario 1: Customer Adds Items to Shopping Cart.
    """
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [permissions.AllowAny] # Allow unauthenticated users to modify cart items

    def get_queryset(self):
        """
        Ensure users can only see/manage items in their own cart.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return CartItem.objects.all()
        
        if self.request.user.is_authenticated:
            return CartItem.objects.filter(cart__customer=self.request.user)
        else:
            session_key = self.request.session.session_key
            if session_key:
                return CartItem.objects.filter(cart__session_key=session_key, cart__customer__isnull=True)
            return CartItem.objects.none()

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
            # Use the imported ValidationError from rest_framework.exceptions
            raise ValidationError(
                f"Not enough stock for {item.item_name}. Available: {item.quantity_available}, Requested: {quantity}"
            )

        # Determine the cart based on authentication status
        if request.user.is_authenticated:
            cart, created_cart = ShoppingCart.objects.get_or_create(customer=request.user)
        else:
            # Ensure a session exists for anonymous users
            if not request.session.session_key:
                request.session.save() # Generate a session key if it doesn't exist
            session_key = request.session.session_key
            cart, created_cart = ShoppingCart.objects.get_or_create(
                session_key=session_key, customer__isnull=True, # Ensure we only get/create anonymous carts
                defaults={'session_key': session_key, 'customer': None} # Ensure customer is None for new anonymous cart
            )
            # IMPORTANT: If a cart exists for this session but has a customer, it means the user logged in
            # and this anonymous cart should ideally be merged or ignored.
            # For now, we assume anonymous carts are separate and this logic prevents adding to a logged-in cart via anonymous session.
            if cart.customer:
                return Response({"detail": "This session is associated with a logged-in user's cart. Please log in to manage your cart."}, status=status.HTTP_400_BAD_REQUEST)


        cart_item_qs = CartItem.objects.filter(cart=cart, item=item)
        if cart_item_qs.exists():
            # If item exists, update its quantity
            cart_item = cart_item_qs.first()
            cart_item.quantity += quantity
            cart_item.save()
            status_code = status.HTTP_200_OK # Updated
        else:
            # If item does not exist, create a new CartItem
            cart_item = CartItem.objects.create(cart=cart, item=item, quantity=quantity, unit_price=item.unit_price) # Set unit_price explicitly
            status_code = status.HTTP_201_CREATED # Created

        serializer = self.get_serializer(cart_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_quantity = instance.quantity
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        new_quantity = serializer.validated_data.get('quantity', old_quantity)

        if new_quantity <= 0:
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        item = instance.item
        quantity_difference = new_quantity - old_quantity

        if item.quantity_available < quantity_difference:
            raise ValidationError(
                f"Not enough stock for {item.item_name}. Available: {item.quantity_available}, Cannot add {quantity_difference}"
            )
        
        self.perform_update(serializer)
        return Response(serializer.data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# --- Orders ---
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-order_date')
    serializer_class = OrderSerializer
    permission_classes = [permissions.AllowAny] # Allow unauthenticated users to place orders via place_order_from_cart

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Order.objects.all().order_by('-order_date')
        
        if self.request.user.is_authenticated:
            return Order.objects.filter(customer=self.request.user).order_by('-order_date')
        else:
            # For anonymous users, filter orders by session_key or customer_email
            session_key = self.request.session.session_key
            customer_email = self.request.query_params.get('customer_email') # Allow filtering by email
            # Use Q objects for OR conditions
            if session_key or customer_email:
                return Order.objects.filter(
                    Q(customer__isnull=True, customer_email=customer_email) | 
                    Q(customer__isnull=True, shoppingcart__session_key=session_key)
                ).distinct().order_by('-order_date')
            return Order.objects.none()


    def create(self, request, *args, **kwargs):
        return Response({"detail": "Use /api/orders/place_order_from_cart/ to create an order."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def place_order_from_cart(self, request):
        customer_email = request.data.get('customer_email') # Get email for anonymous checkout

        # Determine the cart based on authentication status
        if request.user.is_authenticated:
            user_cart = ShoppingCart.objects.filter(customer=request.user).first()
            customer_instance = request.user
        else:
            # For anonymous users, get cart by session_key
            session_key = request.session.session_key
            if not session_key:
                return Response({"detail": "Session not found. Please add items to your cart first."}, status=status.HTTP_400_BAD_REQUEST)
            user_cart = ShoppingCart.objects.filter(session_key=session_key, customer__isnull=True).first()
            customer_instance = None # No User instance for anonymous
            if not customer_email:
                 return Response({"customer_email": "This field is required for anonymous checkout."}, status=status.HTTP_400_BAD_REQUEST)


        if not user_cart or not user_cart.items.exists():
            return Response({"detail": "Shopping cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = 0
        order_items_to_create = []

        for cart_item in user_cart.items.all():
            item = cart_item.item
            if item.quantity_available < cart_item.quantity:
                raise ValidationError(
                    f"Not enough stock for {item.item_name}. Available: {item.quantity_available}, Requested: {cart_item.quantity}"
                )
            total_amount += item.unit_price * cart_item.quantity
            order_items_to_create.append({
                'item': item,
                'quantity': cart_item.quantity,
                'unit_price_at_time_of_order': item.unit_price
            })

        order = Order.objects.create(
            customer=customer_instance, # Will be None for anonymous
            customer_email=customer_email, # Set email for anonymous
            total_amount=total_amount,
            session_key=request.session.session_key,
            # For anonymous users, delivery_address might come from the request body
            # For authenticated users, it might come from request.user.delivery_address
            delivery_address=request.data.get('delivery_address', customer_instance.delivery_address if customer_instance else None)
        )

        for item_data in order_items_to_create:
            OrderItem.objects.create(order=order, **item_data)

        # Clear the shopping cart
        user_cart.items.all().delete()
        user_cart.delete() # Delete the anonymous cart after order is placed

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# --- Payments, Invoices, Receipts ---
class PaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.AllowAny]

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.AllowAny] # Allow unauthenticated users to initiate payments for their anonymous orders

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Payment.objects.all()
        
        if self.request.user.is_authenticated:
            return Payment.objects.filter(customer=self.request.user)
        else:
            # For anonymous users, filter payments by order associated with session_key or customer_email
            session_key = self.request.session.session_key
            customer_email = self.request.query_params.get('customer_email')
            if session_key or customer_email:
                return Payment.objects.filter(
                    Q(order__customer__isnull=True, order__customer_email=customer_email) |
                    Q(order__customer__isnull=True, order__session_key=session_key)
                ).distinct().order_by('-transaction_date')
            return Payment.objects.none()


    @action(detail=True, methods=['post'])
    @transaction.atomic
    def initiate_payment(self, request, pk=None):
        try:
            payment_instance = self.get_object()
            order = payment_instance.order
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        if payment_instance.status != 'pending':
            return Response({"detail": f"Payment already {payment_instance.status}."}, status=status.HTTP_400_BAD_REQUEST)

        # Check permission: if authenticated, user must own payment. If anonymous, order must match session/email.
        if request.user.is_authenticated:
            if not (request.user == payment_instance.customer or request.user.is_staff or request.user.is_superuser):
                return Response({"detail": "You do not have permission to initiate this payment."}, status=status.HTTP_403_FORBIDDEN)
        else:  # anonymous
            session_key = request.session.session_key
            if not session_key:
                return Response({"detail": "Session not found."},
                                status=status.HTTP_400_BAD_REQUEST)

            is_authorized = (
                (order.customer_email and
                order.customer_email == request.data.get('customer_email')) or
                (order.session_key == session_key)
            )
            if not is_authorized:
                return Response({"detail": "You do not have permission to initiate this payment."},
                                status=status.HTTP_403_FORBIDDEN)



        payment_instance.status = 'completed'
        payment_instance.transaction_id = f"TXN-{order.order_id}-{request.user.id if request.user.is_authenticated else 'anon'}-{payment_instance.id}"
        payment_instance.amount_paid = order.total_amount
        payment_instance.save()
        order.status = 'paid'
        order.save()

        receipt, created_receipt = Receipt.objects.get_or_create(order=order, defaults={
            'receipt_number': f"REC-{order.order_id}",
            'total_amount': order.total_amount,
            'pdf_url': f"/media/receipts/{order.order_id}.pdf"
        })
        invoice, created_invoice = Invoice.objects.get_or_create(order=order, defaults={
            'invoice_number': f"INV-{order.order_id}",
            'total_amount': order.total_amount,
            'status': 'paid',
            'pdf_url': f"/media/invoices/{order.order_id}.pdf"
        })

        serializer = self.get_serializer(payment_instance)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PaymentHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentHistory.objects.all().order_by('-transaction_date')
    serializer_class = PaymentHistorySerializer
    permission_classes = [permissions.AllowAny] # Allow anonymous to view their history if identifiable

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return PaymentHistory.objects.all().order_by('-transaction_date')
        
        if self.request.user.is_authenticated:
            return PaymentHistory.objects.filter(customer=self.request.user).order_by('-transaction_date')
        else:
            customer_email = self.request.query_params.get('customer_email')
            if customer_email:
                return PaymentHistory.objects.filter(order__customer_email=customer_email).order_by('-transaction_date')
            return PaymentHistory.objects.none()


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.all().order_by('-invoice_date')
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.AllowAny] # Allow anonymous to view their invoices if identifiable

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Invoice.objects.all().order_by('-invoice_date')
        
        if self.request.user.is_authenticated:
            return Invoice.objects.filter(order__customer=self.request.user).order_by('-invoice_date')
        else:
            customer_email = self.request.query_params.get('customer_email')
            if customer_email:
                return Invoice.objects.filter(order__customer_email=customer_email).order_by('-invoice_date')
            return Invoice.objects.none()

class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Receipt.objects.all().order_by('-receipt_date')
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.AllowAny] # Allow anonymous to view their receipts if identifiable

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Receipt.objects.all().order_by('-receipt_date')
        
        if self.request.user.is_authenticated:
            return Receipt.objects.filter(order__customer=self.request.user).order_by('-receipt_date')
        else:
            customer_email = self.request.query_params.get('customer_email')
            if customer_email:
                return Receipt.objects.filter(order__customer_email=customer_email).order_by('-receipt_date')
            return Receipt.objects.none()

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        receipt = self.get_object()
        if receipt.pdf_url:
            return Response({'message': 'Simulated download link', 'url': receipt.pdf_url}, status=status.HTTP_200_OK)
        return Response({'message': 'PDF receipt not available for download.'}, status=status.HTTP_404_NOT_FOUND)


# --- Performance Metrics (Admin-only) ---
class PerformanceMetricViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PerformanceMetric.objects.all().order_by('-calculated_at')
    serializer_class = PerformanceMetricSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=['get'])
    def profitability(self, request):
        profitability_metrics = PerformanceMetric.objects.filter(metric_type='profitability')
        serializer = self.get_serializer(profitability_metrics, many=True)
        return Response(serializer.data)
