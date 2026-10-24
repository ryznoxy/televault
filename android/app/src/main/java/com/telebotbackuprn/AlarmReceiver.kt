package com.telebotbackuprn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Fires at the user's scheduled time and starts the run's foreground service.
 * An exact alarm is one of the few exemptions Android 12+ grants a background
 * app for starting a foreground service, so this receiver exists instead of
 * letting a JobScheduler wake-up try and fail.
 */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      ContextCompat.startForegroundService(
        context,
        Intent(context, ScheduledRunService::class.java),
      )
    } catch (error: Exception) {
      // The alarm normally buys the exemption, but a manufacturer can still
      // refuse the start. Refusing must not crash the receiver, and it must not
      // lose tomorrow's wake either: the JS side re-arms only when its task
      // runs, and this is exactly the case where it never got to run.
      Log.w(TAG, "Scheduled run start refused; alarm re-armed", error)
      ExactAlarm.rearm(context)
    }
  }

  private companion object {
    const val TAG = "AlarmReceiver"
  }
}
