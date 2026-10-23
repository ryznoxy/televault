package com.telebotbackuprn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * The one place that builds the low-priority TeleVault notifications: the
 * ongoing status line and the scheduled run's own progress line. Both are
 * `setOngoing(true)` so they cannot be swiped away while they claim to be true.
 */
internal object StatusNotification {
  const val CHANNEL_ID = "televault_status"
  const val STATUS_ID = 4101
  const val RUN_ID = 4102
  private const val STOP_REQUEST = 4104

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Status TeleVault",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Menampilkan bahwa backup otomatis TeleVault aktif"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  fun build(context: Context, title: String, text: String, withStop: Boolean = false): Notification {
    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_vault)
      .setColor(0xFF2AABEE.toInt())
      .setContentTitle(title)
      .setContentText(text)
      .setStyle(NotificationCompat.BigTextStyle().bigText(text))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(launchIntent(context))
    if (withStop) {
      // The run is in another JS runtime, so the tap cannot reach it directly:
      // it leaves the stop request where the runner polls for it.
      builder.addAction(
        R.drawable.ic_stat_vault,
        "Hentikan",
        PendingIntent.getBroadcast(
          context,
          STOP_REQUEST,
          Intent(context, RunStopReceiver::class.java),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
    }
    return builder.build()
  }

  private fun launchIntent(context: Context): PendingIntent? =
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      PendingIntent.getActivity(
        context,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

  fun show(context: Context, id: Int, title: String, text: String, withStop: Boolean = false) {
    ensureChannel(context)
    val notification = build(context, title, text, withStop)
    try {
      NotificationManagerCompat.from(context).notify(id, notification)
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS denied: background work still runs, just silently.
    }
  }

  fun cancel(context: Context, id: Int) {
    try {
      NotificationManagerCompat.from(context).cancel(id)
    } catch (_: SecurityException) {
      // Same as above: nothing to do when notifications are blocked.
    }
  }
}
