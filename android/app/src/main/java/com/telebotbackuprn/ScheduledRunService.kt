package com.telebotbackuprn

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * The scheduled run's own foreground service, started by [AlarmReceiver].
 *
 * react-native-background-actions cannot be used here: it starts its service
 * from the JS side, which on Android 12+ is refused when the app is in the
 * background. This service is started from an exact alarm instead, and the JS
 * task it runs calls `runBackup` directly, so no second service is ever started.
 *
 * React Native stops the service when the last JS task finishes.
 */
class ScheduledRunService : HeadlessJsTaskService() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    StatusNotification.ensureChannel(this)
    startForeground(
      StatusNotification.RUN_ID,
      StatusNotification.build(this, "Backup terjadwal", "Menyiapkan\u2026"),
    )
    return super.onStartCommand(intent, flags, startId)
  }

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
    HeadlessJsTaskConfig(TASK_KEY, Arguments.createMap(), 0, true)

  companion object {
    const val TASK_KEY = "TelevaultScheduledRun"
  }
}
