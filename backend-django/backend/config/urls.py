
from django.contrib import admin
from django.urls import include, path
# For urlPatters these libs are needed:
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('jobs/', include('jobs.urls')),
    path('payments/', include("payments.urls")), # All payment endpoints except webhook
    

    # Auth: CSRF, login, logout, change-password, session-check
    path("auth/", include("auth_app.urls")),

    # Admin API: protected endpoints for the Next.js admin dashboard
    path("admin-api/", include("jobs.urls_admin")),
]

#* This line is REQUIRED for serving uploaded images in development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
