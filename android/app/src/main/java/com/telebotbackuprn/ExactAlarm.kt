package com.telebotbackuprn

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/**
 * The scheduled run's wake-up, in the strongest form Android offers.
 *
 * `setAlarmClock` is the alarm type alarm-clock apps use: it is the one alarm
 * Doze will not shuffle, and OEM battery managers (MIUI and friends) treat it as
 * user-visible instead of deferring it until the phone is picked up. It plays no
 * sound by itself and rings nothing — it only wakes us at the requested minute.
 * The trade is the system alarm icon in the status bar while a schedule exists,
 * and it needs the exact-alarm permission (Android 12+), so a device without it
 * still falls back to an inexact wake rather than never running.
 *
 * The hour is kept here, in the app's own prefs, so [BootReceiver] can re-arm
 * the alarm after a reboot or a clock/timezone change without waking any JS.
 */
internal object ExactAlarm {
  private const val PREFS = "televault_alarm"
  private const val KEY_HOUR = "hour"
  private const val REQUEST = 4103

  /** Points the next wake-up at the given hour, today if it has not passed yet. */
  fun schedule(context: Context, hour: Int) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putInt(KEY_HOUR, hour)
      .apply()
    arm(context, hour)
  }

  fun cancel(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_HOUR).apply()
    context.getSystemService(AlarmManager::class.java)?.cancel(pendingIntent(context))
  }

  /** After a reboot or a clock change: same hour, new absolute time. */
  fun rearm(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.contains(KEY_HOUR)) {
      return
    }
    arm(context, prefs.getInt(KEY_HOUR, 0))
  }

  private fun arm(context: Context, hour: Int) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    val at = nextOccurrence(hour)
    val pending = pendingIntent(context)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
        // Exact alarms need "Alarms & reminders". Degrade to a wake that still
        // escapes Doze rather than never running at all.
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        return
      }
      manager.setAlarmClock(AlarmManager.AlarmClockInfo(at, showIntent(context)), pending)
    } catch (_: SecurityException) {
      // Permission revoked between the check and the call.
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
    }
  }

  private fun nextOccurrence(hour: Int): Long {
    val next = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    if (next.timeInMillis <= System.currentTimeMillis()) {
      next.add(Calendar.DAY_OF_YEAR, 1)
    }
    return next.timeInMillis
  }

  private fun pendingIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
    context,
    REQUEST,
    Intent(context, AlarmReceiver::class.java),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  /** Tapping the status-bar alarm icon opens the app, not a settings screen. */
  private fun showIntent(context: Context): PendingIntent? =
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      PendingIntent.getActivity(
        context,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
}