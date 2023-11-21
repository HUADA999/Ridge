from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

# Register your models here.

from ridge.database.models import (
    RidgeUser,
    ChatModelOptions,
    OpenAIProcessorConversationConfig,
    OfflineChatProcessorConversationConfig,
    SearchModelConfig,
    Subscription,
)

admin.site.register(RidgeUser, UserAdmin)

admin.site.register(ChatModelOptions)
admin.site.register(OpenAIProcessorConversationConfig)
admin.site.register(OfflineChatProcessorConversationConfig)
admin.site.register(SearchModelConfig)
admin.site.register(Subscription)
