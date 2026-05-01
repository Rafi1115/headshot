from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# CSRF endpoint — GET this first before any POST to receive the csrftoken cookie
# ─────────────────────────────────────────────────────────────────────────────
@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set"})


# ─────────────────────────────────────────────────────────────────────────────
# Login — accepts email (resolves to Django username) + password
# Only staff users are allowed into the admin dashboard
# ─────────────────────────────────────────────────────────────────────────────
class AdminLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")

        if not email or not password:
            return Response({"error": "Email and password are required."}, status=400)

        # Resolve email → username (Django's authenticate uses username by default)
        try:
            db_user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid credentials."}, status=401)

        user = authenticate(request, username=db_user.username, password=password)

        if user is None:
            return Response({"error": "Invalid credentials."}, status=401)

        if not user.is_staff:
            return Response({"error": "Admin access required."}, status=403)

        login(request, user)
        return Response({
            "message": "Logged in successfully.",
            "user": {
                "username": user.username,
                "email": user.email,
                "name": user.get_full_name() or user.username,
            },
        })


# ─────────────────────────────────────────────────────────────────────────────
# Logout
# ─────────────────────────────────────────────────────────────────────────────
class AdminLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully."})


# ─────────────────────────────────────────────────────────────────────────────
# Change Password — requires the user to be authenticated
# ─────────────────────────────────────────────────────────────────────────────
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password", "")
        new_password = request.data.get("new_password", "")

        if not old_password or not new_password:
            return Response({"error": "Both old and new passwords are required."}, status=400)

        if not request.user.check_password(old_password):
            return Response({"error": "Current password is incorrect."}, status=400)

        if len(new_password) < 8:
            return Response({"error": "New password must be at least 8 characters."}, status=400)

        request.user.set_password(new_password)
        request.user.save()
        # Re-authenticate so the session stays valid after password change
        login(request, request.user)
        return Response({"message": "Password updated successfully."})


# ─────────────────────────────────────────────────────────────────────────────
# Session check — lets the frontend verify if the user is still logged in
# ─────────────────────────────────────────────────────────────────────────────
class SessionCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "authenticated": True,
            "user": {
                "username": request.user.username,
                "email": request.user.email,
                "name": request.user.get_full_name() or request.user.username,
            },
        })
