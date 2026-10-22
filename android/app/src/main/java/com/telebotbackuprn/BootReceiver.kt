package com.telebotbackuprn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * A reboot, a clock change or a timezone change drops or skews a pending alarm,
 * and the app is usually not running to notice. Re-arming from the hour stored
 * in the app's own prefs needs no JS, so the schedule survives without the user
 * opening the app — which on MIUI is not guaranteed either way, autostart is.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      -> ExactAlarm.rearm(context)
    }
  }
}