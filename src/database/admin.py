from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

# Register your models here.

from database.models import RidgeUser

admin.site.register(RidgeUser, UserAdmin)
