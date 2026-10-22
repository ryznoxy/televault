package com.telebotbackuprn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Fires at the user's scheduled time and starts the run's foreground service.
 * An exact alarm is one of the few exemptions Android 12+ grants a background
 * app for starting a foreground service, so this receiver exists instead of
 * letting a JobScheduler wake-up try and fail.
 */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    ContextCompat.startForegroundService(
      context,
      Intent(context, ScheduledRunService::class.java),
    )
  }
}
