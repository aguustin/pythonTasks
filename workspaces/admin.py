from django.contrib import admin

from workspaces.models import Invitation, Membership, Organization


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    autocomplete_fields = ['user']


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'created_by', 'created_at']
    search_fields = ['name']
    inlines = [MembershipInline]


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ['id', 'organization', 'user', 'role', 'joined_at']
    list_filter = ['role']
    search_fields = ['organization__name', 'user__email']


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['id', 'organization', 'email', 'role', 'status', 'created_at', 'expires_at']
    search_fields = ['organization__name', 'email']
    readonly_fields = ['token']
